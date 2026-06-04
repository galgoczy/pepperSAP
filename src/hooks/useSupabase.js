import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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

  const createCashRegister = async (registerData) => {
    const { data, error } = await supabase
      .from('cash_registers')
      .insert([{ ...registerData, unit_id: unitId }])
      .select()
      .single();

    if (error) throw error;
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

  const deactivateCashRegister = async (id) => {
    const { data, error } = await supabase
      .from('cash_registers')
      .update({ status: 'inactive', deactivated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
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
  // stays the same (single record). Past revenue is unaffected because it is
  // tied to daily_revenue.unit_id, not to the register's current unit_id.
  const moveCashRegister = async (id, toUnitId, effectiveDate) => {
    const register = cashRegisters.find((r) => r.id === id);
    const fromUnitId = register?.unit_id || unitId;

    const { error } = await supabase
      .from('cash_registers')
      .update({ unit_id: toUnitId })
      .eq('id', id);
    if (error) throw error;

    // Record the move in the history table (best-effort; don't fail the move
    // if history insert is unavailable).
    const { data: authData } = await supabase.auth.getUser();
    const { error: histError } = await supabase
      .from('cash_register_unit_history')
      .insert([{
        cash_register_id: id,
        from_unit_id: fromUnitId,
        to_unit_id: toUnitId,
        effective_date: effectiveDate,
        moved_by: authData?.user?.id || null,
      }]);
    if (histError) console.error('Register move history insert failed:', histError);

    // The register left this unit, so drop it from the local list.
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
