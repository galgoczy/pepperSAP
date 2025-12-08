import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useEvents(unitId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          units (
            id,
            name
          )
        `)
        .order('event_date', { ascending: false });

      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data: eventsData, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      // Fetch totals for each event
      const eventsWithTotals = await Promise.all(
        (eventsData || []).map(async (event) => {
          const [revenuesResult, expensesResult] = await Promise.all([
            supabase
              .from('event_revenues')
              .select('amount')
              .eq('event_id', event.id),
            supabase
              .from('event_expenses')
              .select('amount')
              .eq('event_id', event.id),
          ]);

          const totalRevenue = (revenuesResult.data || []).reduce(
            (sum, r) => sum + (parseFloat(r.amount) || 0),
            0
          );
          const totalExpenses = (expensesResult.data || []).reduce(
            (sum, e) => sum + (parseFloat(e.amount) || 0),
            0
          );

          return {
            ...event,
            total_revenue: totalRevenue,
            total_expenses: totalExpenses,
          };
        })
      );

      setEvents(eventsWithTotals);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Hiba a rendezvények betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (eventData) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select(`
          *,
          units (
            id,
            name
          )
        `)
        .single();

      if (error) throw error;

      setEvents((prev) => [{ ...data, total_revenue: 0, total_expenses: 0 }, ...prev]);
      toast.success('Rendezvény sikeresen létrehozva!');
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Hiba a rendezvény létrehozásakor');
      throw error;
    }
  };

  return {
    events,
    loading,
    refetch: fetchEvents,
    createEvent,
  };
}

export function useEvent(eventId) {
  const [event, setEvent] = useState(null);
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvent = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      const [eventResult, revenuesResult, expensesResult] = await Promise.all([
        supabase
          .from('events')
          .select(`
            *,
            units (
              id,
              name
            )
          `)
          .eq('id', eventId)
          .single(),
        supabase
          .from('event_revenues')
          .select('*')
          .eq('event_id', eventId)
          .order('invoice_date', { ascending: false }),
        supabase
          .from('event_expenses')
          .select('*')
          .eq('event_id', eventId)
          .order('invoice_date', { ascending: false }),
      ]);

      if (eventResult.error) throw eventResult.error;

      setEvent(eventResult.data);
      setRevenues(revenuesResult.data || []);
      setExpenses(expensesResult.data || []);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Hiba a rendezvény betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const updateEvent = async (eventData) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', eventId)
        .select(`
          *,
          units (
            id,
            name
          )
        `)
        .single();

      if (error) throw error;

      setEvent(data);
      toast.success('Rendezvény sikeresen frissítve!');
      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Hiba a rendezvény frissítésekor');
      throw error;
    }
  };

  const deleteEvent = async () => {
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;

      toast.success('Rendezvény sikeresen törölve!');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Hiba a rendezvény törlésekor');
      throw error;
    }
  };

  const createRevenue = async (revenueData) => {
    try {
      const { data, error } = await supabase
        .from('event_revenues')
        .insert([{ ...revenueData, event_id: eventId }])
        .select()
        .single();

      if (error) throw error;

      setRevenues((prev) => [data, ...prev]);
      toast.success('Bevétel sikeresen rögzítve!');
      return data;
    } catch (error) {
      console.error('Error creating revenue:', error);
      toast.error('Hiba a bevétel rögzítésekor');
      throw error;
    }
  };

  const updateRevenue = async (id, revenueData) => {
    try {
      const { data, error } = await supabase
        .from('event_revenues')
        .update(revenueData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setRevenues((prev) => prev.map((r) => (r.id === id ? data : r)));
      toast.success('Bevétel sikeresen frissítve!');
      return data;
    } catch (error) {
      console.error('Error updating revenue:', error);
      toast.error('Hiba a bevétel frissítésekor');
      throw error;
    }
  };

  const deleteRevenue = async (id) => {
    try {
      const { error } = await supabase.from('event_revenues').delete().eq('id', id);
      if (error) throw error;

      setRevenues((prev) => prev.filter((r) => r.id !== id));
      toast.success('Bevétel sikeresen törölve!');
    } catch (error) {
      console.error('Error deleting revenue:', error);
      toast.error('Hiba a bevétel törlésekor');
      throw error;
    }
  };

  const createExpense = async (expenseData) => {
    try {
      const { data, error } = await supabase
        .from('event_expenses')
        .insert([{ ...expenseData, event_id: eventId }])
        .select()
        .single();

      if (error) throw error;

      setExpenses((prev) => [data, ...prev]);
      toast.success('Költség sikeresen rögzítve!');
      return data;
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Hiba a költség rögzítésekor');
      throw error;
    }
  };

  const updateExpense = async (id, expenseData) => {
    try {
      const { data, error } = await supabase
        .from('event_expenses')
        .update(expenseData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)));
      toast.success('Költség sikeresen frissítve!');
      return data;
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Hiba a költség frissítésekor');
      throw error;
    }
  };

  const deleteExpense = async (id) => {
    try {
      const { error } = await supabase.from('event_expenses').delete().eq('id', id);
      if (error) throw error;

      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success('Költség sikeresen törölve!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Hiba a költség törlésekor');
      throw error;
    }
  };

  return {
    event,
    revenues,
    expenses,
    loading,
    refetch: fetchEvent,
    updateEvent,
    deleteEvent,
    createRevenue,
    updateRevenue,
    deleteRevenue,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
