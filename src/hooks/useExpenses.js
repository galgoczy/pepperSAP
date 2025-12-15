import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useExpenses(unitId, startDate, endDate) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          units (
            id,
            name
          )
        `)
        .order('invoice_date', { ascending: false });

      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      if (startDate) {
        query = query.gte('invoice_date', startDate);
      }

      if (endDate) {
        query = query.lte('invoice_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Hiba a kifizetések betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, startDate, endDate]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const createExpense = async (expenseData) => {
    try {
      // Convert empty strings to null for date fields
      const cleanedData = {
        ...expenseData,
        payment_deadline: expenseData.payment_deadline || null,
        fulfillment_date: expenseData.fulfillment_date || null,
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert([cleanedData])
        .select(`
          *,
          units (
            id,
            name
          )
        `)
        .single();

      if (error) throw error;

      setExpenses((prev) => [data, ...prev]);
      toast.success('Kifizetés sikeresen rögzítve!');
      return data;
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Hiba a kifizetés rögzítésekor');
      throw error;
    }
  };

  const updateExpense = async (id, expenseData) => {
    try {
      // Convert empty strings to null for date fields
      const cleanedData = {
        ...expenseData,
        payment_deadline: expenseData.payment_deadline || null,
        fulfillment_date: expenseData.fulfillment_date || null,
      };

      const { data, error } = await supabase
        .from('expenses')
        .update(cleanedData)
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

      setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)));
      toast.success('Kifizetés sikeresen frissítve!');
      return data;
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Hiba a kifizetés frissítésekor');
      throw error;
    }
  };

  const deleteExpense = async (id) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success('Kifizetés sikeresen törölve!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Hiba a kifizetés törlésekor');
      throw error;
    }
  };

  return {
    expenses,
    loading,
    refetch: fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
