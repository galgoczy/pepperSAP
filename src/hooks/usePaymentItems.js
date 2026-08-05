import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Display metadata for the different kinds of payments that share the
// "kifizetések" lists. Variants map to the common <Badge> component.
export const PAYMENT_KIND_META = {
  expense: { label: 'Számla', variant: 'default' },
  efo: { label: 'EFO', variant: 'info' },
  wage: { label: 'Heti bér', variant: 'primary' },
  central: { label: 'Központ', variant: 'warning' },
};

// Central (Központ) costs live in their own table and have no unit; they are
// shown as their own kind so the Központ's costs appear alongside the units'.
function normalizeCentralPayment(p) {
  return {
    id: `central-${p.id}`,
    rawId: p.id,
    kind: 'central',
    name: p.supplier_name || p.item_description || 'Központi kifizetés',
    reference: p.invoice_number || null,
    description: p.item_description || p.notes || '',
    amount: parseFloat(p.amount) || 0,
    currency: 'HUF',
    payment_method: 'cash',
    // 'cash' = számlás központi kifizetés, 'reserve' = számla nélküli.
    is_official: p.payment_type === 'cash',
    date: p.payment_date,
    fulfillment_date: null,
    created_at: p.created_at,
    units: { name: 'Központ' },
    editable: false,
    raw: p,
  };
}

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
    // Alternative date basis for transfer invoices (list can switch to it).
    fulfillment_date: e.fulfillment_date || null,
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

      // Central payments have no unit_id, so they are only included when the
      // caller is not narrowing to one unit (i.e. the admin "all units" view).
      let centralQuery = null;
      if (!unitId) {
        centralQuery = supabase.from('central_payments').select('*');
        if (startDate) centralQuery = centralQuery.gte('payment_date', startDate);
        if (endDate) centralQuery = centralQuery.lte('payment_date', endDate);
      }

      const [expensesRes, efoRes, wageRes, centralRes] = await Promise.all([
        applyRange(supabase.from('expenses').select('*, units (id, name)'), 'invoice_date'),
        applyRange(supabase.from('efo_payments').select('*, units (id, name)'), 'payment_date'),
        applyRange(supabase.from('wage_payments').select('*, units (id, name)'), 'payment_date'),
        centralQuery || Promise.resolve({ data: [], error: null }),
      ]);

      if (expensesRes.error) console.error('Error fetching expenses:', expensesRes.error);
      if (efoRes.error) console.warn('Error fetching EFO payments:', efoRes.error);
      if (wageRes.error) console.warn('Error fetching wage payments:', wageRes.error);
      if (centralRes.error) console.warn('Error fetching central payments:', centralRes.error);

      const merged = [
        ...(expensesRes.data || []).map(normalizeExpense),
        ...(efoRes.data || []).map(normalizeEfo),
        ...(wageRes.data || []).map(normalizeWage),
        ...(centralRes.data || []).map(normalizeCentralPayment),
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
