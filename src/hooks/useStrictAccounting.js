import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const KEY = 'strict_accounting';
const DEFAULTS = { enabled: false, since: null };

const isMissingTable = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /system_settings/.test(error.message || ''));

// „Szigorú elszámolás mód” – rendszerszintű kapcsoló az adatbázisban, hogy minden
// egységnél ugyanaz legyen. Amíg a system_settings tábla nem létezik (migráció
// nem futott), a mód kikapcsoltnak számít, és a beállítás oldal ezt jelzi.
export function useStrictAccounting() {
  const [value, setValue] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  const fetchValue = useCallback(async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', KEY)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) setAvailable(false);
      else console.error('Error fetching strict accounting setting:', error);
      setLoading(false);
      return;
    }
    setAvailable(true);
    setValue({ ...DEFAULTS, ...(data?.value || {}) });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchValue();
  }, [fetchValue]);

  const update = async (next) => {
    const merged = { ...value, ...next };
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('system_settings')
      .upsert(
        {
          key: KEY,
          value: merged,
          updated_at: new Date().toISOString(),
          updated_by: authData?.user?.id || null,
        },
        { onConflict: 'key' }
      );
    if (error) throw error;
    setValue(merged);
  };

  return {
    enabled: !!value.enabled,
    since: value.since || null,
    loading,
    available,
    update,
    refetch: fetchValue,
  };
}
