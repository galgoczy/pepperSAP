import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to validate event revenue against actual event expenses marked as "étel"
 * Checks if the event_revenue entered in daily report matches the sum of
 * food-related expenses from events where this unit is the cooking location
 */
export function useEventRevenueValidation(unitId, date) {
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const validateEventRevenue = useCallback(async (enteredAmount) => {
    if (!unitId || !date || !enteredAmount) {
      setValidationResult(null);
      return null;
    }

    setLoading(true);
    try {
      // Find events on this date where this unit is the cooking location
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          name,
          event_date,
          cooking_location_id
        `)
        .eq('event_date', date)
        .eq('cooking_location_id', unitId);

      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        setValidationResult({
          hasEvents: false,
          matches: true,
          message: 'Nincs rendezvény ezen a napon ezzel a főzőkonyhával.',
        });
        return validationResult;
      }

      // Get all expenses for these events that contain "étel" in description
      const eventIds = events.map((e) => e.id);
      const { data: expenses, error: expensesError } = await supabase
        .from('event_expenses')
        .select('id, event_id, item_description, amount')
        .in('event_id', eventIds);

      if (expensesError) throw expensesError;

      // Filter for food-related expenses (containing "étel" in description)
      const foodExpenses = (expenses || []).filter((exp) =>
        exp.item_description?.toLowerCase().includes('étel')
      );

      // Calculate total food amount
      const totalFoodAmount = foodExpenses.reduce(
        (sum, exp) => sum + (parseFloat(exp.amount) || 0),
        0
      );

      const enteredNum = parseFloat(enteredAmount) || 0;
      const matches = Math.abs(enteredNum - totalFoodAmount) < 1; // Allow 1 Ft difference for rounding

      const result = {
        hasEvents: true,
        eventCount: events.length,
        events: events.map((e) => e.name),
        foodExpenses: foodExpenses.length,
        totalFoodAmount,
        enteredAmount: enteredNum,
        matches,
        difference: enteredNum - totalFoodAmount,
        message: matches
          ? `Egyezik a ${events.length} rendezvény étel költségével.`
          : `Eltérés: ${formatDiff(enteredNum - totalFoodAmount)} Ft (Rendezvényeknél: ${totalFoodAmount.toLocaleString('hu-HU')} Ft)`,
      };

      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('Error validating event revenue:', error);
      setValidationResult({
        hasEvents: false,
        matches: true,
        error: true,
        message: 'Hiba a validáció során.',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [unitId, date]);

  return { validationResult, loading, validateEventRevenue };
}

function formatDiff(num) {
  const sign = num > 0 ? '+' : '';
  return sign + num.toLocaleString('hu-HU');
}
