import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { previousDayGate } from '../lib/dayStatus';

// A göngyölt lánc ellenőrzéséhez az előző napok is kellenek; ennyi napra
// nézünk vissza. Ha egy egység ennél régebben rögzített utoljára, a kapu nem
// talál előző napot, és nem tilt.
const LOOKBACK_DAYS = 45;

const shiftDate = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// A szigorú elszámolás kapuja: az egység `date` előtti utolsó, adatot tartalmazó
// napja rendben van-e. Csak akkor kérdez le, ha a mód be van kapcsolva.
export function usePreviousDayGate(unitId, date, { enabled, since } = {}) {
  const [state, setState] = useState({ loading: false, blocked: false, prevDate: null, issues: [] });

  const evaluate = useCallback(async () => {
    if (!enabled || !unitId || !date) {
      setState({ loading: false, blocked: false, prevDate: null, issues: [] });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const from = shiftDate(date, -LOOKBACK_DAYS);
    const fromDate = since && since > from ? since : from;
    try {
      const { data, error } = await supabase
        .from('daily_revenue')
        .select(
          'date, cash_register_revenue(cash_register_id, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, szep_card_payment, terminal_card, terminal_discrepancy_note, closure_number, closure_sequence, cumulative_revenue, discrepancies, discrepancy_note, discrepancy_amount, software_revenue, guest_count, terminal_card_total, terminal_szep, cash_registers(id, ap_number, name))'
        )
        .eq('unit_id', unitId)
        .gte('date', fromDate)
        .lt('date', date)
        .order('date', { ascending: true });
      if (error) throw error;
      const gate = previousDayGate(data || [], date, since);
      setState({ loading: false, ...gate });
    } catch (error) {
      // Ha a kapu nem tud dönteni, NEM tiltunk: egy hálózati hiba ne állítsa
      // meg a rögzítést.
      console.error('Error evaluating previous-day gate:', error);
      setState({ loading: false, blocked: false, prevDate: null, issues: [] });
    }
  }, [enabled, unitId, date, since]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  return { ...state, refetch: evaluate };
}
