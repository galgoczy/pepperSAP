import { useState, useEffect, useCallback } from 'react';
import { Calculator, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../common';
import toast from 'react-hot-toast';

// Lets a unit reorder how its cash registers appear (stacked) in the daily
// report. The order is stored per register (cash_registers.display_order) and is
// the same order admins see. Active + suspended registers are listed (the ones
// that can show up in data entry); decommissioned ones are excluded.
export default function CashRegisterOrderCard({ unitId }) {
  const [registers, setRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRegisters = useCallback(async () => {
    if (!unitId) {
      setRegisters([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('id, ap_number, name, status, display_order, created_at')
        .eq('unit_id', unitId)
        .in('status', ['active', 'suspended'])
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRegisters(data || []);
    } catch (error) {
      console.error('Error fetching cash registers for ordering:', error);
      toast.error('Hiba a pénztárgépek betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchRegisters();
  }, [fetchRegisters]);

  // Persist the given order: normalize display_order to 0..N-1 and update only
  // the registers whose stored order changed.
  const persist = async (list) => {
    setSaving(true);
    try {
      const changed = list
        .map((r, i) => ({ id: r.id, display_order: i, prev: r.display_order }))
        .filter((u) => u.prev !== u.display_order);

      const results = await Promise.all(
        changed.map((u) =>
          supabase.from('cash_registers').update({ display_order: u.display_order }).eq('id', u.id)
        )
      );
      if (results.some((r) => r.error)) throw results.find((r) => r.error).error;

      setRegisters(list.map((r, i) => ({ ...r, display_order: i })));
    } catch (error) {
      console.error('Error saving cash register order:', error);
      toast.error('Hiba a sorrend mentésekor');
      fetchRegisters(); // revert to server state
    } finally {
      setSaving(false);
    }
  };

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= registers.length) return;
    const list = [...registers];
    [list[index], list[target]] = [list[target], list[index]];
    setRegisters(list); // optimistic
    persist(list);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (registers.length === 0) {
    return <p className="text-sm text-gray-500">Ehhez az egységhez nincs pénztárgép.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-2">
        Állítsd be a sorrendet a fel/le nyilakkal. Ez a sorrend jelenik meg a napi
        jelentésben (egymás alatt), és az adminisztrátor is ezt látja.
      </p>
      {registers.map((register, index) => (
        <div
          key={register.id}
          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <GripVertical className="h-4 w-4 text-gray-300" />
            <span className="text-xs font-medium text-gray-400 w-5">{index + 1}.</span>
            <Calculator className="h-4 w-4 text-pepper-red" />
            <div>
              <span className="font-mono text-sm font-medium text-gray-900">
                {register.ap_number}
              </span>
              {register.name && (
                <span className="text-sm text-gray-500 ml-2">({register.name})</span>
              )}
              {register.status === 'suspended' && (
                <span className="text-xs text-yellow-600 ml-2">szüneteltetve</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0 || saving}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Feljebb"
            >
              <ChevronUp className="h-4 w-4 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === registers.length - 1 || saving}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Lejjebb"
            >
              <ChevronDown className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
