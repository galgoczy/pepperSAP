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
