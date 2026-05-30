import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Display metadata for the different kinds of payments that share the
// "kifizetések" lists. Variants map to the common <Badge> component.
export const PAYMENT_KIND_META = {
  expense: { label: 'Számla', variant: 'default' },
  efo: { label: 'EFO', variant: 'info' },
  wage: { label: 'Heti bér', variant: 'primary' },
};

function normalizeExpense(e) {
  return {
    id: `expense-${e.id}`,
    rawId: e.id,
    kind: 'expense',
    name: e.supplier_name,
    reference: e.invoice_number || null,
    description: e.item_description || '',
    amount: parseFloat(e.amount) || 0,
    currency: e.currency || 'HUF',
    payment_method: e.payment_method || null,
    is_official: e.is_official,
    date: e.invoice_date,
    created_at: e.created_at,
    units: e.units || null,
    editable: true,
    raw: e,
  };
}

function normalizeEfo(p) {
  return {
    id: `efo-${p.id}`,
    rawId: p.id,
    kind: 'efo',
    name: p.employee_name,
    reference: null,
    description: p.notes || '',
    amount: parseFloat(p.total_amount) || 0,
    currency: 'HUF',
    payment_method: p.payment_method || null,
    is_official: null,
    date: p.payment_date,
    created_at: p.created_at,
    units: p.units || null,
    editable: true,
    raw: p,
  };
}

function normalizeWage(p) {
  return {
    id: `wage-${p.id}`,
    rawId: p.id,
    kind: 'wage',
    name: p.worker_name,
    reference: null,
    description: p.notes || '',
    amount: parseFloat(p.total_amount) || 0,
    currency: 'HUF',
    payment_method: null,
    is_official: null,
    date: p.payment_date,
    created_at: p.created_at,
    units: p.units || null,
    editable: true,
    raw: p,
  };
}

// Fetches expenses, EFO payments and wage payments for the given unit/date
// range and returns them as a single, normalized list so the daily report,
// the daily "Kifizetések" tab and the Kifizetések menu can all show every
// payment type together, each tagged with its kind.
//
// `unitId` null/undefined means "all units" (admin). Each table is queried
// independently and a failure on one (e.g. a table that doesn't exist yet on
// a given environment) is logged but does not break the others.
export function usePaymentItems(unitId, startDate, endDate) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const applyRange = (query, dateColumn) => {
        let q = query;
        if (unitId) q = q.eq('unit_id', unitId);
        if (startDate) q = q.gte(dateColumn, startDate);
        if (endDate) q = q.lte(dateColumn, endDate);
        return q;
      };

      const [expensesRes, efoRes, wageRes] = await Promise.all([
        applyRange(supabase.from('expenses').select('*, units (id, name)'), 'invoice_date'),
        applyRange(supabase.from('efo_payments').select('*, units (id, name)'), 'payment_date'),
        applyRange(supabase.from('wage_payments').select('*, units (id, name)'), 'payment_date'),
      ]);

      if (expensesRes.error) console.error('Error fetching expenses:', expensesRes.error);
      if (efoRes.error) console.warn('Error fetching EFO payments:', efoRes.error);
      if (wageRes.error) console.warn('Error fetching wage payments:', wageRes.error);

      const merged = [
        ...(expensesRes.data || []).map(normalizeExpense),
        ...(efoRes.data || []).map(normalizeEfo),
        ...(wageRes.data || []).map(normalizeWage),
      ].sort((a, b) => {
        // Newest first by payment date, then by creation time.
        if (a.date !== b.date) return (b.date || '').localeCompare(a.date || '');
        return (b.created_at || '').localeCompare(a.created_at || '');
      });

      setItems(merged);
    } catch (error) {
      console.error('Error fetching payment items:', error);
    } finally {
      setLoading(false);
    }
  }, [unitId, startDate, endDate]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, refetch: fetchItems };
}
