import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getToday, addDays } from '../lib/utils';
import toast from 'react-hot-toast';

// Hook for fetching and managing units
export function useUnits() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Hiba az egységek betöltésekor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const createUnit = async (unitData) => {
    const { data, error } = await supabase
      .from('units')
      .insert([unitData])
      .select()
      .single();

    if (error) throw error;
    setUnits((prev) => [...prev, data]);
    return data;
  };

  const updateUnit = async (id, unitData) => {
    const { data, error } = await supabase
      .from('units')
      .update(unitData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setUnits((prev) => prev.map((u) => (u.id === id ? data : u)));
    return data;
  };

  const deleteUnit = async (id) => {
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) throw error;
    setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  return {
    units,
    loading,
    refetch: fetchUnits,
    createUnit,
    updateUnit,
    deleteUnit,
  };
}

// Hook for fetching and managing users
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          units (
            id,
            name
          )
        `)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Hiba a felhasználók betöltésekor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (id, userData) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(userData)
      .eq('id', id)
      .select(`
        *,
        units (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;
    setUsers((prev) => prev.map((u) => (u.id === id ? data : u)));
    return data;
  };

  const deleteUser = async (id) => {
    const { error } = await supabase.from('user_profiles').delete().eq('id', id);
    if (error) throw error;
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return {
    users,
    loading,
    refetch: fetchUsers,
    updateUser,
    deleteUser,
  };
}

// Hook for fetching and managing cash registers per unit
export function useCashRegisters(unitId) {
  const [cashRegisters, setCashRegisters] = useState([]);
  // cash_register_id -> the OPEN assignment period at this unit ({ id, start_date }).
  // Its start_date is the "érvényes ettől" date: from when the register is
  // offered for data entry at this unit.
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    if (!unitId) {
      setAssignments({});
      return;
    }
    const { data, error } = await supabase
      .from('cash_register_assignments')
      .select('id, cash_register_id, start_date')
      .eq('unit_id', unitId)
      .is('end_date', null);
    if (error) {
      console.error('Error fetching register assignments:', error);
      return;
    }
    const map = {};
    (data || []).forEach((a) => {
      // If (unexpectedly) several open periods exist, keep the earliest start.
      if (!map[a.cash_register_id] || a.start_date < map[a.cash_register_id].start_date) {
        map[a.cash_register_id] = { id: a.id, start_date: a.start_date };
      }
    });
    setAssignments(map);
  }, [unitId]);

  const fetchCashRegisters = useCallback(async () => {
    if (!unitId) {
      setCashRegisters([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('unit_id', unitId)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCashRegisters(data || []);
      await fetchAssignments();
    } catch (error) {
      console.error('Error fetching cash registers:', error);
      toast.error('Hiba a pénztárgépek betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, fetchAssignments]);

  useEffect(() => {
    fetchCashRegisters();
  }, [fetchCashRegisters]);

  // Create a register at this unit. `validFrom` (YYYY-MM-DD, default today)
  // controls from when it belongs to the unit, i.e. from when it is offered for
  // data entry. A register added now does NOT appear in earlier statistics
  // unless an earlier validFrom is chosen (e.g. to import historical data).
  const createCashRegister = async (registerData, validFrom) => {
    const { data, error } = await supabase
      .from('cash_registers')
      .insert([{ ...registerData, unit_id: unitId }])
      .select()
      .single();

    if (error) throw error;

    const { error: assignError } = await supabase
      .from('cash_register_assignments')
      .insert([{
        cash_register_id: data.id,
        unit_id: unitId,
        start_date: validFrom || getToday(),
        end_date: null,
      }]);
    if (assignError) console.error('Register assignment insert failed:', assignError);

    setCashRegisters((prev) => [...prev, data]);
    await fetchAssignments();
    return data;
  };

  // Change from when the register belongs to this unit ("érvényes ettől"),
  // typically to move the start BACK so earlier days (e.g. zero Z-closures made
  // before the register was added to the system) can be entered. No revenue is
  // touched: it only widens/narrows the window in which the register is offered
  // for data entry. Refused if the new window would overlap a period the
  // register spent at another unit.
  const updateAssignmentStart = async (registerId, newStart) => {
    if (!newStart) throw new Error('Adj meg dátumot.');

    const { data: periods, error: fetchError } = await supabase
      .from('cash_register_assignments')
      .select('id, unit_id, start_date, end_date, units(name)')
      .eq('cash_register_id', registerId)
      .order('start_date', { ascending: true });
    if (fetchError) throw fetchError;

    const current = (periods || []).find((p) => p.unit_id === unitId && p.end_date == null);

    // Any OTHER period that reaches into [newStart, current end] is a conflict.
    const conflict = (periods || []).find((p) => {
      if (current && p.id === current.id) return false;
      const currentEnd = current?.end_date || '9999-12-31';
      return p.start_date <= currentEnd && (p.end_date == null || p.end_date >= newStart);
    });
    if (conflict) {
      throw new Error(
        `Ütközik a gép másik időszakával: ${conflict.units?.name || 'másik egység'} ` +
          `(${conflict.start_date} – ${conflict.end_date || 'nyitott'}). ` +
          'Az indulás nem nyúlhat bele abba az időszakba.'
      );
    }

    if (current) {
      const { error } = await supabase
        .from('cash_register_assignments')
        .update({ start_date: newStart })
        .eq('id', current.id);
      if (error) throw error;
    } else {
      // Registers created before the assignment periods existed may have no open
      // period at this unit — create it, so the date-driven entry list sees them.
      const { error } = await supabase
        .from('cash_register_assignments')
        .insert([{ cash_register_id: registerId, unit_id: unitId, start_date: newStart, end_date: null }]);
      if (error) throw error;
    }

    await fetchAssignments();
  };

  const updateCashRegister = async (id, registerData) => {
    const { data, error } = await supabase
      .from('cash_registers')
      .update(registerData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setCashRegisters((prev) => prev.map((r) => (r.id === id ? data : r)));
    return data;
  };

  const deactivateCashRegister = async (id, effectiveDate) => {
    const closeDate = effectiveDate || getToday();
    const { data, error } = await supabase
      .from('cash_registers')
      .update({ status: 'inactive', deactivated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Close the open assignment so the register stops being offered from the
    // scrap date onward (its history at the unit ends here).
    const { error: closeError } = await supabase
      .from('cash_register_assignments')
      .update({ end_date: closeDate })
      .eq('cash_register_id', id)
      .is('end_date', null);
    if (closeError) console.error('Closing register assignment failed:', closeError);

    setCashRegisters((prev) => prev.map((r) => (r.id === id ? data : r)));
    return data;
  };

  const suspendCashRegister = async (id, suspend = true) => {
    const { data, error } = await supabase
      .from('cash_registers')
      .update({ status: suspend ? 'suspended' : 'active' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setCashRegisters((prev) => prev.map((r) => (r.id === id ? data : r)));
    return data;
  };

  // Move a register to another unit, effective from a given date. The AP number
  // stays the same (single record, no unique conflict). Past revenue is
  // unaffected because it is tied to daily_revenue.unit_id, not to the
  // register's current unit_id. The assignment periods record that the register
  // belonged to the old unit until effectiveDate - 1, and to the new unit from
  // effectiveDate onward — this is what drives the date-aware entry list.
  const moveCashRegister = async (id, toUnitId, effectiveDate) => {
    const { data: authData } = await supabase.auth.getUser();

    // Close the current open assignment the day before the move takes effect.
    const { error: closeError } = await supabase
      .from('cash_register_assignments')
      .update({ end_date: addDays(effectiveDate, -1) })
      .eq('cash_register_id', id)
      .is('end_date', null);
    if (closeError) throw closeError;

    // Open a new assignment at the destination unit from the effective date.
    const { error: openError } = await supabase
      .from('cash_register_assignments')
      .insert([{
        cash_register_id: id,
        unit_id: toUnitId,
        start_date: effectiveDate,
        end_date: null,
        moved_by: authData?.user?.id || null,
      }]);
    if (openError) throw openError;

    // Keep the register's "current unit" pointer in sync with the open period.
    const { error } = await supabase
      .from('cash_registers')
      .update({ unit_id: toUnitId })
      .eq('id', id);
    if (error) throw error;

    // The register left this unit, so drop it from the local roster.
    setCashRegisters((prev) => prev.filter((r) => r.id !== id));
  };

  // Count of recorded revenue rows for a register (to decide if it can be
  // permanently deleted).
  const getCashRegisterRevenueCount = async (id) => {
    const { count, error } = await supabase
      .from('cash_register_revenue')
      .select('id', { count: 'exact', head: true })
      .eq('cash_register_id', id);
    if (error) {
      console.error('Error counting register revenue:', error);
      return null;
    }
    return count || 0;
  };

  const deleteCashRegister = async (id) => {
    const { error } = await supabase.from('cash_registers').delete().eq('id', id);
    if (error) throw error;
    setCashRegisters((prev) => prev.filter((r) => r.id !== id));
  };

  return {
    cashRegisters,
    assignments,
    loading,
    refetch: fetchCashRegisters,
    createCashRegister,
    updateCashRegister,
    updateAssignmentStart,
    deactivateCashRegister,
    suspendCashRegister,
    moveCashRegister,
    getCashRegisterRevenueCount,
    deleteCashRegister,
  };
}
