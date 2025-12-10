import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Hook for fetching active cash registers for a unit
export function useActiveCashRegisters(unitId) {
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
        .in('status', ['active', 'suspended'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filter to only active registers for data entry
      const activeRegisters = (data || []).filter((r) => r.status === 'active');
      setCashRegisters(activeRegisters);
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
  const saveAllRevenues = async (revenuesByRegisterId) => {
    if (!dailyRevenueId) return;

    try {
      const promises = Object.entries(revenuesByRegisterId).map(
        async ([cashRegisterId, data]) => {
          const existingRevenue = revenues.find(
            (r) => r.cash_register_id === cashRegisterId
          );

          const dataToSave = {
            ...data,
            daily_revenue_id: dailyRevenueId,
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

      // Refetch to get updated data
      await fetchRevenues();

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
