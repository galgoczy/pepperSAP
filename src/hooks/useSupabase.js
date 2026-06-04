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
  const [loading, setLoading] = useState(true);

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
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCashRegisters(data || []);
    } catch (error) {
      console.error('Error fetching cash registers:', error);
      toast.error('Hiba a pénztárgépek betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId]);

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
    return data;
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
    loading,
    refetch: fetchCashRegisters,
    createCashRegister,
    updateCashRegister,
    deactivateCashRegister,
    suspendCashRegister,
    moveCashRegister,
    getCashRegisterRevenueCount,
    deleteCashRegister,
  };
}
