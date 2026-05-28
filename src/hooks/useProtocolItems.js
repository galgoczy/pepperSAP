import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useProtocolItems(initialDailyRevenueId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyRevenueId, setDailyRevenueId] = useState(initialDailyRevenueId);

  // Update internal state when prop changes
  useEffect(() => {
    if (initialDailyRevenueId && initialDailyRevenueId !== dailyRevenueId) {
      setDailyRevenueId(initialDailyRevenueId);
    }
  }, [initialDailyRevenueId]);

  const fetchItems = useCallback(async () => {
    if (!dailyRevenueId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('protocol_items')
        .select('*')
        .eq('daily_revenue_id', dailyRevenueId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching protocol items:', error);
    } finally {
      setLoading(false);
    }
  }, [dailyRevenueId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (itemData) => {
    if (!dailyRevenueId) {
      throw new Error('Daily revenue ID required');
    }

    try {
      const { data, error } = await supabase
        .from('protocol_items')
        .insert([{ ...itemData, daily_revenue_id: dailyRevenueId }])
        .select()
        .single();

      if (error) throw error;

      setItems((prev) => [...prev, data]);

      // Update project number usage if provided
      if (itemData.project_number) {
        await supabase.rpc('upsert_project_number', {
          p_number: itemData.project_number,
        });
      }

      return data;
    } catch (error) {
      console.error('Error creating protocol item:', error);
      toast.error('Hiba a tétel mentésekor');
      throw error;
    }
  };

  const updateItem = async (id, itemData) => {
    try {
      const { data, error } = await supabase
        .from('protocol_items')
        .update(itemData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setItems((prev) => prev.map((item) => (item.id === id ? data : item)));

      // Update project number usage if provided
      if (itemData.project_number) {
        await supabase.rpc('upsert_project_number', {
          p_number: itemData.project_number,
        });
      }

      return data;
    } catch (error) {
      console.error('Error updating protocol item:', error);
      toast.error('Hiba a tétel frissítésekor');
      throw error;
    }
  };

  const deleteItem = async (id) => {
    try {
      const { error } = await supabase
        .from('protocol_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting protocol item:', error);
      toast.error('Hiba a tétel törlésekor');
      throw error;
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  return {
    items,
    loading,
    totalAmount,
    createItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
    setDailyRevenueId,
  };
}

export function useProjectNumberSuggestions() {
  const [suggestions, setSuggestions] = useState([]);

  const fetchSuggestions = useCallback(async (search = '') => {
    try {
      let query = supabase
        .from('protocol_project_numbers')
        .select('project_number, description, usage_count')
        .order('usage_count', { ascending: false })
        .limit(10);

      if (search) {
        query = query.ilike('project_number', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching project number suggestions:', error);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return { suggestions, fetchSuggestions };
}
