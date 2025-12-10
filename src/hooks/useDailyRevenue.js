import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useDailyRevenue(unitId, date) {
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = useCallback(async () => {
    if (!unitId || !date) {
      setRevenue(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('daily_revenue')
        .select('*')
        .eq('unit_id', unitId)
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setRevenue(data || null);
    } catch (error) {
      console.error('Error fetching daily revenue:', error);
      toast.error('Hiba a napi forgalom betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, date]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const saveRevenue = async (revenueData) => {
    // Remove mark_color if null to avoid errors when column doesn't exist
    const { mark_color, ...restData } = revenueData;

    // Convert empty strings to null for numeric fields
    const cleanedData = Object.fromEntries(
      Object.entries(restData).map(([key, value]) => [
        key,
        value === '' ? null : value
      ])
    );

    const dataToSave = {
      ...cleanedData,
      unit_id: unitId,
      date: date,
      ...(mark_color !== null && mark_color !== undefined && { mark_color }),
    };

    console.log('Attempting to save:', dataToSave);

    try {
      let result;
      if (revenue?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('daily_revenue')
          .update(dataToSave)
          .eq('id', revenue.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('daily_revenue')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      setRevenue(result);
      toast.success('Napi forgalom sikeresen mentve!');
      return result;
    } catch (error) {
      console.error('Error saving daily revenue:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Data attempted to save:', dataToSave);
      toast.error(`Hiba: ${error.message || error.code || 'Ismeretlen hiba'}`);
      throw error;
    }
  };

  return {
    revenue,
    loading,
    refetch: fetchRevenue,
    saveRevenue,
  };
}

export function useHouseCash(unitId, date) {
  const [houseCash, setHouseCash] = useState(null);
  const [previousDayClosing, setPreviousDayClosing] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHouseCash = useCallback(async () => {
    if (!unitId || !date) {
      setHouseCash(null);
      setPreviousDayClosing(null);
      setLoading(false);
      return;
    }

    try {
      // Calculate previous day
      const currentDate = new Date(date);
      currentDate.setDate(currentDate.getDate() - 1);
      const previousDay = currentDate.toISOString().split('T')[0];

      // Fetch both current day and previous day in parallel
      const [currentResult, previousResult] = await Promise.all([
        supabase
          .from('house_cash')
          .select('*')
          .eq('unit_id', unitId)
          .eq('date', date)
          .maybeSingle(),
        supabase
          .from('house_cash')
          .select('official_total')
          .eq('unit_id', unitId)
          .eq('date', previousDay)
          .maybeSingle(),
      ]);

      if (currentResult.error) throw currentResult.error;
      if (previousResult.error && previousResult.error.code !== 'PGRST116') {
        // Ignore "no rows" error for previous day
        console.error('Error fetching previous day:', previousResult.error);
      }

      setHouseCash(currentResult.data || null);
      setPreviousDayClosing(previousResult.data?.official_total || null);
    } catch (error) {
      console.error('Error fetching house cash:', error);
      toast.error('Hiba a házipénztár betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, date]);

  useEffect(() => {
    fetchHouseCash();
  }, [fetchHouseCash]);

  const saveHouseCash = async (cashData) => {
    try {
      const dataToSave = {
        ...cashData,
        unit_id: unitId,
        date: date,
      };

      let result;
      if (houseCash?.id) {
        const { data, error } = await supabase
          .from('house_cash')
          .update(dataToSave)
          .eq('id', houseCash.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('house_cash')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      setHouseCash(result);
      toast.success('Házipénztár sikeresen mentve!');
      return result;
    } catch (error) {
      console.error('Error saving house cash:', error);
      toast.error('Hiba a házipénztár mentésekor');
      throw error;
    }
  };

  return {
    houseCash,
    previousDayClosing,
    loading,
    refetch: fetchHouseCash,
    saveHouseCash,
  };
}

export function useDailyRevenueList(unitId, startDate, endDate) {
  const [revenues, setRevenues] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRevenues = useCallback(async () => {
    try {
      let query = supabase
        .from('daily_revenue')
        .select(`
          *,
          units (
            id,
            name
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRevenues(data || []);
    } catch (error) {
      console.error('Error fetching revenues:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, startDate, endDate]);

  useEffect(() => {
    fetchRevenues();
  }, [fetchRevenues]);

  return {
    revenues,
    loading,
    refetch: fetchRevenues,
  };
}
