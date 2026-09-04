import { useState, useEffect, useCallback } from 'react';
import { fetchHouseCashSeries } from '../lib/houseCashSeries';

// Returns the line items that make up a unit's cash or reserve balance, derived
// from the live daily house-cash series (the same single source of truth as the
// Házipénztár balance card and the daily report). Because both the card and this
// breakdown read the series, the sum of these items always equals the card's
// balance.
//
// Per day, the cash pocket moves by:
//   + napi készpénz bevétel (pénztárgép + egyéb hivatalos kp bevétel)
//   - elütések (HUF)
//   - hivatalos kp kifizetések, EFO és bér hivatalos része (itemized)
//   +/- készpénz átküldések
// and an approved opening-balance revision re-anchors the running balance (shown
// as a correction line). The reserve pocket works analogously.
export function useUnitBalanceBreakdown(unitId, pocket /* 'cash' | 'reserve' */) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBreakdown = useCallback(async () => {
    if (!unitId) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const series = await fetchHouseCashSeries(unitId, null);
      const isCash = pocket === 'cash';
      const list = [];
      let prevClosing = 0;

      series.orderedDates.forEach((d) => {
        const row = series.byDate.get(d);

        if (isCash) {
          // Opening-balance revision re-anchors the running balance.
          if (row.cashAnchor !== undefined) {
            const adj = row.cashAnchor - prevClosing;
            if (adj !== 0) {
              list.push({ date: d, label: 'Revízió (nyitó korrekció)', amount: adj, type: 'revision' });
            }
          }
          if (row.cashRevenue) {
            list.push({ date: d, label: 'Napi készpénz bevétel', amount: row.cashRevenue, type: 'income' });
          }
          if (row.cashDiscrepancies) {
            list.push({ date: d, label: 'Elütések', amount: -row.cashDiscrepancies, type: 'expense' });
          }
          (row.cashPaymentItems || []).forEach((it) => {
            list.push({ date: d, label: it.label, amount: -(parseFloat(it.amount) || 0), type: 'expense' });
          });
          if (row.cashTransfers) {
            list.push({
              date: d,
              label: row.cashTransfers > 0 ? 'Átküldés (készpénz) - bejövő' : 'Átküldés (készpénz) - kimenő',
              amount: row.cashTransfers,
              type: 'transfer',
            });
          }
          prevClosing = row.cashClosing;
        } else {
          if (row.reserveAnchor !== undefined) {
            const adj = row.reserveAnchor - prevClosing;
            if (adj !== 0) {
              list.push({ date: d, label: 'Revízió (tartalék nyitó korrekció)', amount: adj, type: 'revision' });
            }
          }
          if (row.reserveRevenue) {
            list.push({ date: d, label: 'Tartalék bevétel (szoftver-pénztárgép különbség + extra)', amount: row.reserveRevenue, type: 'income' });
          }
          (row.reservePaymentItems || []).forEach((it) => {
            list.push({ date: d, label: it.label, amount: -(parseFloat(it.amount) || 0), type: 'expense' });
          });
          if (row.reserveTransfers) {
            list.push({
              date: d,
              label: row.reserveTransfers > 0 ? 'Átküldés (tartalék) - bejövő' : 'Átküldés (tartalék) - kimenő',
              amount: row.reserveTransfers,
              type: 'transfer',
            });
          }
          prevClosing = row.reserveClosing;
        }
      });

      // Newest first
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setItems(list);
      setTotal(list.reduce((s, i) => s + i.amount, 0));
    } catch (error) {
      console.error('Error fetching balance breakdown:', error);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [unitId, pocket]);

  useEffect(() => {
    fetchBreakdown();
  }, [fetchBreakdown]);

  return { items, total, loading, refetch: fetchBreakdown };
}
