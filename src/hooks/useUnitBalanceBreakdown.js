import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Returns the line items that make up a unit's cash and reserve balances, so
// the Házipénztár balance card can show "what is this made of": daily
// closings, transfers and approved opening-balance revisions.
//
// The math mirrors useUnitBalance:
//   cash    = sum(per-day register cash) - official cash expenses
//             - cash transfers out + cash transfers in
//   reserve = sum(per-day software-vs-register diff) - non-official expenses
//             - reserve transfers out + reserve transfers in
// Approved opening-balance revisions are surfaced as informational entries.
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
      const [revenuesRes, expensesRes, transfersOutRes, transfersInRes, revisionsRes] = await Promise.all([
        supabase
          .from('daily_revenue')
          .select('date, total_revenue, cash_register_revenue(cash_payment, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent)')
          .eq('unit_id', unitId)
          .order('date', { ascending: false }),
        supabase
          .from('expenses')
          .select('invoice_date, supplier_name, amount, is_official, payment_method')
          .eq('unit_id', unitId)
          .order('invoice_date', { ascending: false }),
        supabase
          .from('cash_transfers')
          .select('amount, transfer_type, created_at')
          .eq('source_unit_id', unitId)
          .eq('status', 'approved'),
        supabase
          .from('cash_transfers')
          .select('amount, transfer_type, created_at')
          .eq('destination_unit_id', unitId)
          .eq('status', 'approved'),
        supabase
          .from('opening_balance_revisions')
          .select('target_date, proposed_opening_balance, current_opening_balance, pocket, reviewed_at, reason')
          .eq('unit_id', unitId)
          .eq('status', 'approved'),
      ]);

      const list = [];

      if (pocket === 'cash') {
        // Per-day cash register cash (income)
        (revenuesRes.data || []).forEach((rev) => {
          const cash = (rev.cash_register_revenue || []).reduce(
            (s, cr) => s + (parseFloat(cr.cash_payment) || 0), 0
          );
          if (cash !== 0) {
            list.push({ date: rev.date, label: 'Napi készpénz forgalom (pénztárgép)', amount: cash, type: 'income' });
          }
        });
        // Official cash expenses (out)
        (expensesRes.data || [])
          .filter((e) => e.is_official && e.payment_method === 'cash')
          .forEach((e) => {
            list.push({ date: e.invoice_date, label: `Hivatalos kp kifizetés - ${e.supplier_name}`, amount: -(parseFloat(e.amount) || 0), type: 'expense' });
          });
        // Transfers
        (transfersOutRes.data || []).filter((t) => t.transfer_type === 'cash').forEach((t) => {
          list.push({ date: t.created_at, label: 'Átküldés (készpénz) - kimenő', amount: -(parseFloat(t.amount) || 0), type: 'transfer' });
        });
        (transfersInRes.data || []).filter((t) => t.transfer_type === 'cash').forEach((t) => {
          list.push({ date: t.created_at, label: 'Átküldés (készpénz) - bejövő', amount: parseFloat(t.amount) || 0, type: 'transfer' });
        });
        // Revisions (informational)
        (revisionsRes.data || []).filter((r) => (r.pocket || 'official') === 'official').forEach((r) => {
          list.push({
            date: r.reviewed_at || r.target_date,
            label: `Revízió: nyitó ${r.target_date} (${r.reason || 'nincs indok'})`,
            amount: (parseFloat(r.proposed_opening_balance) || 0) - (parseFloat(r.current_opening_balance) || 0),
            type: 'revision',
          });
        });
      } else {
        // Reserve: per-day software-vs-register difference (income/loss)
        (revenuesRes.data || []).forEach((rev) => {
          const registerRevenue = (rev.cash_register_revenue || []).reduce(
            (s, cr) => s +
              (parseFloat(cr.vat_0_percent) || 0) +
              (parseFloat(cr.vat_5_percent) || 0) +
              (parseFloat(cr.vat_18_percent) || 0) +
              (parseFloat(cr.vat_27_percent) || 0), 0
          );
          const diff = (parseFloat(rev.total_revenue) || 0) - registerRevenue;
          if (diff !== 0) {
            list.push({ date: rev.date, label: 'Szoftver - pénztárgép különbség', amount: diff, type: 'income' });
          }
        });
        // Non-official expenses (out)
        (expensesRes.data || [])
          .filter((e) => !e.is_official)
          .forEach((e) => {
            list.push({ date: e.invoice_date, label: `Nem számlás kifizetés - ${e.supplier_name}`, amount: -(parseFloat(e.amount) || 0), type: 'expense' });
          });
        // Reserve transfers
        (transfersOutRes.data || []).filter((t) => t.transfer_type === 'reserve').forEach((t) => {
          list.push({ date: t.created_at, label: 'Átküldés (tartalék) - kimenő', amount: -(parseFloat(t.amount) || 0), type: 'transfer' });
        });
        (transfersInRes.data || []).filter((t) => t.transfer_type === 'reserve').forEach((t) => {
          list.push({ date: t.created_at, label: 'Átküldés (tartalék) - bejövő', amount: parseFloat(t.amount) || 0, type: 'transfer' });
        });
        (revisionsRes.data || []).filter((r) => r.pocket === 'reserve').forEach((r) => {
          list.push({
            date: r.reviewed_at || r.target_date,
            label: `Revízió: tartalék nyitó ${r.target_date} (${r.reason || 'nincs indok'})`,
            amount: (parseFloat(r.proposed_opening_balance) || 0) - (parseFloat(r.current_opening_balance) || 0),
            type: 'revision',
          });
        });
      }

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
