import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getToday } from '../lib/utils';
import toast from 'react-hot-toast';

// Hook for fetching the cash registers that belong to a unit on a given DATE.
//
// Which registers a unit has is date-driven: each register has one or more
// assignment periods (cash_register_assignments) describing when it belonged to
// which unit. For data entry we offer the registers whose assignment covers the
// selected date at this unit. This makes past-date editing and historical
// imports attach data to the correct registers, and prevents a freshly added
// register from retroactively appearing in earlier statistics.
export function useActiveCashRegisters(unitId, date) {
  const effectiveDate = date || getToday();
  const [cashRegisters, setCashRegisters] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCashRegisters = useCallback(async () => {
    if (!unitId) {
      setCashRegisters([]);
      setLoading(false);
      return;
    }

    try {
      // Assignments at this unit whose interval covers the selected date.
      const { data, error } = await supabase
        .from('cash_register_assignments')
        .select('start_date, cash_registers(*)')
        .eq('unit_id', unitId)
        .lte('start_date', effectiveDate)
        .or(`end_date.is.null,end_date.gte.${effectiveDate}`)
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Flatten to register rows, drop any without an embedded register,
      // dedupe by id, and keep only active ones for data entry.
      const seen = new Set();
      const registers = [];
      for (const row of data || []) {
        const reg = row.cash_registers;
        if (!reg || seen.has(reg.id)) continue;
        seen.add(reg.id);
        if (reg.status === 'active') registers.push(reg);
      }
      // Sort by the unit's configured display order, falling back to creation
      // time for any register without an explicit order.
      const orderVal = (r) => (r.display_order == null ? Number.MAX_SAFE_INTEGER : r.display_order);
      registers.sort(
        (a, b) => orderVal(a) - orderVal(b) || (a.created_at || '').localeCompare(b.created_at || '')
      );
      setCashRegisters(registers);
    } catch (error) {
      console.error('Error fetching cash registers:', error);
      toast.error('Hiba a pénztárgépek betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, effectiveDate]);

  useEffect(() => {
    fetchCashRegisters();
  }, [fetchCashRegisters]);

  return { cashRegisters, loading, refetch: fetchCashRegisters };
}

// Hook for managing cash register revenue data
export function useCashRegisterRevenue(dailyRevenueId, cashRegisterId) {
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = useCallback(async () => {
    if (!dailyRevenueId || !cashRegisterId) {
      setRevenueData(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cash_register_revenue')
        .select('*')
        .eq('daily_revenue_id', dailyRevenueId)
        .eq('cash_register_id', cashRegisterId)
        .maybeSingle();

      if (error) throw error;
      setRevenueData(data);
    } catch (error) {
      console.error('Error fetching cash register revenue:', error);
    } finally {
      setLoading(false);
    }
  }, [dailyRevenueId, cashRegisterId]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const saveRevenue = async (data) => {
    if (!dailyRevenueId || !cashRegisterId) return;

    const dataToSave = {
      ...data,
      daily_revenue_id: dailyRevenueId,
      cash_register_id: cashRegisterId,
    };

    try {
      let result;
      if (revenueData?.id) {
        const { data: updated, error } = await supabase
          .from('cash_register_revenue')
          .update(dataToSave)
          .eq('id', revenueData.id)
          .select()
          .single();

        if (error) throw error;
        result = updated;
      } else {
        const { data: inserted, error } = await supabase
          .from('cash_register_revenue')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        result = inserted;
      }

      setRevenueData(result);
      return result;
    } catch (error) {
      console.error('Error saving cash register revenue:', error);
      throw error;
    }
  };

  return {
    revenueData,
    loading,
    refetch: fetchRevenue,
    saveRevenue,
  };
}

// Hook for fetching all cash register revenues for a daily revenue entry
export function useAllCashRegisterRevenue(dailyRevenueId) {
  const [revenues, setRevenues] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRevenues = useCallback(async () => {
    if (!dailyRevenueId) {
      setRevenues([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cash_register_revenue')
        .select(`
          *,
          cash_registers (
            id,
            ap_number,
            name,
            terminal_number
          )
        `)
        .eq('daily_revenue_id', dailyRevenueId);

      if (error) throw error;
      setRevenues(data || []);
    } catch (error) {
      console.error('Error fetching cash register revenues:', error);
    } finally {
      setLoading(false);
    }
  }, [dailyRevenueId]);

  useEffect(() => {
    fetchRevenues();
  }, [fetchRevenues]);

  // Save all cash register closures at once.
  // `closures` is an array of objects, each carrying cash_register_id +
  // closure_number + the editable field data. `removedKeys` is the set of
  // "<cash_register_id>#<closure_number>" the user EXPLICITLY removed in the UI —
  // only those are deleted. (We must NOT infer deletions by diffing against the
  // submitted list: when the active-registers list is momentarily empty/partial,
  // that would silently wipe a whole day's register data.)
  // Can pass overrideDailyRevenueId for newly created daily_revenue entries.
  const saveAllRevenues = async (closures, overrideDailyRevenueId = null, removedKeys = null) => {
    const effectiveId = overrideDailyRevenueId || dailyRevenueId;
    if (!effectiveId) {
      console.error('No dailyRevenueId available for saving cash register revenues');
      return;
    }

    const list = Array.isArray(closures) ? closures : [];
    const removed = removedKeys instanceof Set ? removedKeys : new Set();

    // Nothing to upsert and nothing explicitly removed → do nothing. This guards
    // against an empty/incomplete submit (e.g. the active-registers list not yet
    // loaded) ever touching existing data.
    if (list.length === 0 && removed.size === 0) {
      return [];
    }

    try {
      // Delete ONLY the closures the user explicitly removed.
      const toDelete = revenues.filter(
        (r) => removed.has(`${r.cash_register_id}#${r.closure_number ?? 1}`)
      );
      const deletePromises = toDelete.map((r) =>
        supabase.from('cash_register_revenue').delete().eq('id', r.id)
      );

      const upsertPromises = list.map((closure) => {
        const { cash_register_id, closure_number = 1, ...data } = closure;

        // Clean data - convert empty strings to null for numeric fields
        const cleanedData = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, value === '' ? null : value])
        );

        const dataToSave = {
          ...cleanedData,
          daily_revenue_id: effectiveId,
          cash_register_id,
          closure_number,
        };

        // Upsert on the natural key so a stale `revenues` state (e.g. right after
        // the daily_revenue was just created) can't turn an update into a blind
        // INSERT that violates the (daily_revenue_id, cash_register_id,
        // closure_number) unique constraint and fails the whole save.
        return supabase
          .from('cash_register_revenue')
          .upsert(dataToSave, { onConflict: 'daily_revenue_id,cash_register_id,closure_number' })
          .select()
          .single();
      });

      const results = await Promise.all([...deletePromises, ...upsertPromises]);

      // Check for errors
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        console.error('Errors saving revenues:', errors);
        throw new Error('Hiba a pénztárgép adatok mentésekor');
      }

      // Refetch to get updated data (only if we have the original ID)
      if (dailyRevenueId) {
        await fetchRevenues();
      }

      return results.map((r) => r.data);
    } catch (error) {
      console.error('Error saving all cash register revenues:', error);
      throw error;
    }
  };

  return {
    revenues,
    loading,
    refetch: fetchRevenues,
    saveAllRevenues,
  };
}

// Fetch, for each register, the chronologically last closure strictly BEFORE
// `date` (across all days and units — a register's Z-counter is continuous even
// if it moves units). Used to validate the closure sequence number and the
// cumulative ("göngyölt") revenue of the first closure of the day.
export function useRegisterClosureBaselines(registerIds, date) {
  const idsKey = (registerIds || []).slice().sort().join(',');
  const [baselines, setBaselines] = useState({});

  const fetchBaselines = useCallback(async () => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0 || !date) {
      setBaselines({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cash_register_revenue')
        .select(
          'cash_register_id, closure_number, closure_sequence, cumulative_revenue, daily_revenue!inner(date)'
        )
        .in('cash_register_id', ids)
        .lt('daily_revenue.date', date)
        .order('date', { referencedTable: 'daily_revenue', ascending: false })
        .order('closure_number', { ascending: false });

      if (error) throw error;

      // First row per register is the most recent closure before `date`.
      // Normalize to number-or-null so that a missing sequence / cumulative on
      // the previous closure (common for older imported data) is treated as
      // "no baseline" and skips the check rather than flagging a false error.
      const toNumberOrNull = (v) =>
        v === null || v === undefined || v === '' || Number.isNaN(Number(v))
          ? null
          : Number(v);
      const map = {};
      for (const row of data || []) {
        if (map[row.cash_register_id]) continue;
        map[row.cash_register_id] = {
          sequence: toNumberOrNull(row.closure_sequence),
          cumulative: toNumberOrNull(row.cumulative_revenue),
          date: row.daily_revenue?.date,
        };
      }
      setBaselines(map);
    } catch (error) {
      console.error('Error fetching closure baselines:', error);
      setBaselines({});
    }
  }, [idsKey, date]);

  useEffect(() => {
    fetchBaselines();
  }, [fetchBaselines]);

  return { baselines, refetch: fetchBaselines };
}
