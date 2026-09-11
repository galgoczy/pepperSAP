import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { previousDayGate } from '../lib/dayStatus';
import { isBlankClosure } from '../lib/validations';

// A göngyölt lánc ellenőrzéséhez az előző napok is kellenek; ennyi napra
// nézünk vissza. Ha egy egység ennél régebben rögzített utoljára, a kapu nem
// talál előző napot, és nem tilt.
const LOOKBACK_DAYS = 45;

// Ugyanezek a mezők kellenek a nap kiértékeléséhez, mint a jelentésekben.
const CLOSURE_SELECT =
  'date, cash_register_revenue(cash_register_id, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, szep_card_payment, terminal_card, terminal_discrepancy_note, closure_number, closure_sequence, cumulative_revenue, discrepancies, discrepancy_note, discrepancy_amount, software_revenue, guest_count, terminal_card_total, terminal_szep, cash_registers(id, ap_number, name))';

const shiftDate = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EMPTY = { loading: false, blocked: false, prevDate: null, issues: [], rows: [], hasLaterDataDay: false };

// A szigorú elszámolás kapuja: az egység `date` előtti utolsó, adatot tartalmazó
// napja rendben van-e. Emellett visszaadja az előző napok sorait (rows), hogy a
// mentés előtt az adott nap is kiértékelhető legyen ugyanazzal a lánccal, és
// azt, hogy van-e a `date` UTÁN már rögzített nap (hasLaterDataDay) – ilyenkor
// az adott nap csak rendezett állapotban menthető. Csak akkor kérdez le, ha a
// mód be van kapcsolva.
export function usePreviousDayGate(unitId, date, { enabled, since } = {}) {
  const [state, setState] = useState(EMPTY);

  const evaluate = useCallback(async () => {
    if (!enabled || !unitId || !date) {
      setState(EMPTY);
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const from = shiftDate(date, -LOOKBACK_DAYS);
    const fromDate = since && since > from ? since : from;

    let rows = [];
    let gate = { blocked: false, prevDate: null, issues: [] };
    try {
      const { data, error } = await supabase
        .from('daily_revenue')
        .select(CLOSURE_SELECT)
        .eq('unit_id', unitId)
        .gte('date', fromDate)
        .lt('date', date)
        .order('date', { ascending: true });
      if (error) throw error;
      rows = data || [];
      gate = previousDayGate(rows, date, since);
    } catch (error) {
      // Ha a kapu nem tud dönteni, NEM tiltunk: egy hálózati hiba ne állítsa
      // meg a rögzítést.
      console.error('Error evaluating previous-day gate:', error);
    }

    // Van-e a nap után már érdemi (nem üres) rögzítés? Ha ez sem dönthető el,
    // úgy vesszük, hogy nincs – vagyis a nap a megszokott módon menthető.
    let hasLaterDataDay = false;
    try {
      const { data, error } = await supabase
        .from('daily_revenue')
        .select(CLOSURE_SELECT)
        .eq('unit_id', unitId)
        .gt('date', date)
        .order('date', { ascending: true })
        .limit(60);
      if (error) throw error;
      hasLaterDataDay = (data || []).some((row) =>
        (row.cash_register_revenue || []).some((cr) => !isBlankClosure(cr))
      );
    } catch (error) {
      console.error('Error checking later data days:', error);
    }

    setState({ loading: false, ...gate, rows, hasLaterDataDay });
  }, [enabled, unitId, date, since]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  return { ...state, refetch: evaluate };
}
