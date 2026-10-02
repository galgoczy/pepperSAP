import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Whether the DB error means the register_cumulative_checks table does not
// exist yet (migration 20260902 not applied). The report must keep working
// without it — the checkbox is simply not offered.
const isMissingTable = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /register_cumulative_checks/.test(error.message || ''));

// The "göngyölt ellenőrizve" ticks of one report period, keyed by
// cash_register_id. Shared by every admin (stored in the DB), scoped to the
// exact period the report was run for.
export function useCumulativeChecks(startDate, endDate) {
  const [checks, setChecks] = useState({});
  const [available, setAvailable] = useState(true);

  const fetchChecks = useCallback(async () => {
    if (!startDate || !endDate) return;
    const { data, error } = await supabase
      .from('register_cumulative_checks')
      .select('id, cash_register_id, checked_at')
      .eq('period_start', startDate)
      .eq('period_end', endDate);
    if (error) {
      if (isMissingTable(error)) setAvailable(false);
      else console.error('Error fetching cumulative checks:', error);
      return;
    }
    const map = {};
    (data || []).forEach((c) => {
      map[c.cash_register_id] = { id: c.id, checkedAt: c.checked_at };
    });
    setChecks(map);
    setAvailable(true);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const setChecked = async (registerId, checked) => {
    if (!registerId || !startDate || !endDate) return;
    if (checked) {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('register_cumulative_checks')
        .upsert(
          {
            cash_register_id: registerId,
            period_start: startDate,
            period_end: endDate,
            checked_by: authData?.user?.id || null,
            checked_at: new Date().toISOString(),
          },
          { onConflict: 'cash_register_id,period_start,period_end' }
        );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('register_cumulative_checks')
        .delete()
        .eq('cash_register_id', registerId)
        .eq('period_start', startDate)
        .eq('period_end', endDate);
      if (error) throw error;
    }
    await fetchChecks();
  };

  return { checks, available, setChecked, refetch: fetchChecks };
}

// One-shot fetch for the exports: cash_register_id -> true for the period.
export async function fetchCumulativeCheckSet(startDate, endDate) {
  const { data, error } = await supabase
    .from('register_cumulative_checks')
    .select('cash_register_id')
    .eq('period_start', startDate)
    .eq('period_end', endDate);
  if (error) return new Set();
  return new Set((data || []).map((c) => c.cash_register_id));
}
