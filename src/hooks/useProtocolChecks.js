import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Whether the DB error means the register_protocol_checks table does not exist
// yet (migration 20260906 not applied). The reports must keep working without
// it — the checkbox is simply not offered, the Jkv. column shows the automatic
// mark only.
const isMissingTable = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /register_protocol_checks/.test(error.message || ''));

// A "jegyzőkönyv ellenőrizve" pipák egy időszakra, a zárás
// (cash_register_revenue.id) szerint indexelve. Minden adminnak közös (DB).
export function useProtocolChecks(startDate, endDate) {
  const [checks, setChecks] = useState({});
  const [available, setAvailable] = useState(true);

  const fetchChecks = useCallback(async () => {
    if (!startDate || !endDate) return;
    const { data, error } = await supabase
      .from('register_protocol_checks')
      .select('id, cash_register_revenue_id, checked_at')
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) {
      if (isMissingTable(error)) setAvailable(false);
      else console.error('Error fetching protocol checks:', error);
      return;
    }
    const map = {};
    (data || []).forEach((c) => {
      map[c.cash_register_revenue_id] = { id: c.id, checkedAt: c.checked_at };
    });
    setChecks(map);
    setAvailable(true);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  // closure: { crId, registerId, date }
  const setChecked = async (closure, checked) => {
    if (!closure?.crId || !closure?.date) return;
    if (checked) {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('register_protocol_checks')
        .upsert(
          {
            cash_register_revenue_id: closure.crId,
            cash_register_id: closure.registerId || null,
            date: closure.date,
            checked_by: authData?.user?.id || null,
            checked_at: new Date().toISOString(),
          },
          { onConflict: 'cash_register_revenue_id' }
        );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('register_protocol_checks')
        .delete()
        .eq('cash_register_revenue_id', closure.crId);
      if (error) throw error;
    }
    await fetchChecks();
  };

  return { checks, available, setChecked, refetch: fetchChecks };
}

// One-shot fetch for the exports: Set of cash_register_revenue ids ticked in
// the period (empty if none / no table).
export async function fetchProtocolCheckSet(startDate, endDate) {
  const { data, error } = await supabase
    .from('register_protocol_checks')
    .select('cash_register_revenue_id')
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) return new Set();
  return new Set((data || []).map((c) => c.cash_register_revenue_id));
}
