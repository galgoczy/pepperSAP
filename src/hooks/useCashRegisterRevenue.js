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
      registers.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
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

  // Save all cash register revenues at once
  // Can pass overrideDailyRevenueId for newly created daily_revenue entries
  const saveAllRevenues = async (revenuesByRegisterId, overrideDailyRevenueId = null) => {
    const effectiveId = overrideDailyRevenueId || dailyRevenueId;
    if (!effectiveId) {
      console.error('No dailyRevenueId available for saving cash register revenues');
      return;
    }

    try {
      const promises = Object.entries(revenuesByRegisterId).map(
        async ([cashRegisterId, data]) => {
          const existingRevenue = revenues.find(
            (r) => r.cash_register_id === cashRegisterId
          );

          // Clean data - convert empty strings to null for numeric fields
          const cleanedData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [
              key,
              value === '' ? null : value
            ])
          );

          const dataToSave = {
            ...cleanedData,
            daily_revenue_id: effectiveId,
            cash_register_id: cashRegisterId,
          };

          if (existingRevenue?.id) {
            return supabase
              .from('cash_register_revenue')
              .update(dataToSave)
              .eq('id', existingRevenue.id)
              .select()
              .single();
          } else {
            return supabase
              .from('cash_register_revenue')
              .insert([dataToSave])
              .select()
              .single();
          }
        }
      );

      const results = await Promise.all(promises);

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
