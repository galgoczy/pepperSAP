import { useState, useEffect, useCallback } from 'react';
import { Receipt, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  Badge,
  EmptyState,
  LoadingSpinner,
  Select,
} from '../common';
import { formatCurrency, formatDate, PAYMENT_METHODS } from '../../lib/utils';
import toast from 'react-hot-toast';

// The three admin-side states an official invoice can be marked with. These are
// bookkeeping flags only — they never affect the units' data entry or the
// amounts. "paid" only applies to transfer invoices.
// Colours: received = salmon, scanned = green, paid = yellow.
const STATES = [
  {
    key: 'received',
    label: 'Beérkezett',
    dot: 'bg-[#FA8072] border-[#FA8072]',
    // Faint version shown before the mark is set, so the colour still identifies it.
    dotIdle: 'bg-[#FA8072]/25 border-[#FA8072]/50 hover:bg-[#FA8072]/50',
    row: 'bg-[#FA8072]/25',
    text: 'text-[#B4483C]',
    atField: 'received_at',
    byField: 'received_by',
  },
  {
    key: 'scanned',
    label: 'Szkennelt',
    dot: 'bg-green-500 border-green-500',
    dotIdle: 'bg-green-500/25 border-green-500/50 hover:bg-green-500/50',
    row: 'bg-green-500/25',
    text: 'text-green-700',
    atField: 'scanned_at',
    byField: 'scanned_by',
  },
  {
    key: 'paid',
    label: 'Fizetett',
    dot: 'bg-yellow-400 border-yellow-400',
    dotIdle: 'bg-yellow-400/25 border-yellow-400/50 hover:bg-yellow-400/50',
    row: 'bg-yellow-400/25',
    text: 'text-yellow-700',
    atField: 'paid_at',
    byField: 'paid_by',
    transferOnly: true,
  },
];

// Admin view of official (számlás) payments, where the invoice's handling can be
// tracked: received / scanned / paid.
export default function ReceivedInvoicesList({ unitId, isAdmin, startDate, endDate, onEdit }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [stateFilter, setStateFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select('*, units (id, name)')
        .eq('is_official', true)
        .in('payment_method', ['cash', 'card', 'mol_card', 'transfer'])
        .order('invoice_date', { ascending: false });

      if (unitId) query = query.eq('unit_id', unitId);
      if (startDate) query = query.gte('invoice_date', startDate);
      if (endDate) query = query.lte('invoice_date', endDate);

      // Central (Központ) costs live in their own table — they are the single
      // source for the central balance, so they are read here rather than
      // duplicated as expenses. Only the invoiced ones (payment_type 'cash';
      // 'reserve' is explicitly "számla nélkül") belong in the invoice list.
      // They are only relevant when not filtering to a specific unit.
      let centralQuery = null;
      if (!unitId) {
        centralQuery = supabase
          .from('central_payments')
          .select('*')
          .eq('payment_type', 'cash')
          .order('payment_date', { ascending: false });
        if (startDate) centralQuery = centralQuery.gte('payment_date', startDate);
        if (endDate) centralQuery = centralQuery.lte('payment_date', endDate);
      }

      const [expensesRes, centralRes] = await Promise.all([
        query,
        centralQuery || Promise.resolve({ data: [], error: null }),
      ]);

      if (expensesRes.error) throw expensesRes.error;
      if (centralRes.error) console.warn('Error fetching central payments:', centralRes.error);

      // Normalize central payments onto the same shape the table renders.
      const centralItems = (centralRes.data || []).map((p) => ({
        ...p,
        source: 'central',
        supplier_name: p.supplier_name || p.item_description || 'Központi kifizetés',
        invoice_date: p.payment_date,
        payment_method: 'cash',
        units: { name: 'Központ' },
      }));

      setItems([
        ...(expensesRes.data || []).map((e) => ({ ...e, source: 'expense' })),
        ...centralItems,
      ]);
    } catch (error) {
      console.error('Error fetching received invoices:', error);
      toast.error('Hiba a számlák betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, startDate, endDate]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Toggle one of the three states on an invoice (optimistic, reverts on error).
  const toggleState = async (item, state, nextValue) => {
    const rowKey = `${item.source}-${item.id}`;
    setSavingId(`${rowKey}-${state.key}`);
    const sameRow = (e) => e.id === item.id && e.source === item.source;
    setItems((prev) =>
      prev.map((e) => (sameRow(e) ? { ...e, [state.key]: nextValue } : e))
    );
    try {
      // Marks are stored on the row's own table (expenses or central_payments).
      const { error } = await supabase
        .from(item.source === 'central' ? 'central_payments' : 'expenses')
        .update({
          [state.key]: nextValue,
          [state.atField]: nextValue ? new Date().toISOString() : null,
          [state.byField]: nextValue ? user?.id || null : null,
        })
        .eq('id', item.id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating invoice state:', error);
      toast.error('Hiba a jelölés mentésekor');
      setItems((prev) =>
        prev.map((e) => (sameRow(e) ? { ...e, [state.key]: !nextValue } : e))
      );
    } finally {
      setSavingId(null);
    }
  };

  const statesFor = (item) =>
    STATES.filter((s) => !s.transferOnly || item.payment_method === 'transfer');

  // The furthest-along active state colours the row (paid > scanned > received).
  const rowState = (item) =>
    [...statesFor(item)].reverse().find((s) => item[s.key]) || null;

  const visibleItems = items.filter((item) => {
    // 'cash_card' is a combined option: cash and card payments together.
    if (methodFilter === 'cash_card') {
      if (item.payment_method !== 'cash' && item.payment_method !== 'card') return false;
    } else if (methodFilter && item.payment_method !== methodFilter) {
      return false;
    }
    if (stateFilter === 'not_received') return !item.received;
    if (stateFilter === 'not_scanned') return !item.scanned;
    if (stateFilter === 'not_paid') return item.payment_method === 'transfer' && !item.paid;
    return true;
  });

  // Sorting: click a header to sort by it, click again to flip the direction.
  // "Állapot" sorts by how far along the invoice is (fizetett > szkennelt > beérkezett).
  const SORTABLE = {
    state: (i) => (i.paid ? 3 : i.scanned ? 2 : i.received ? 1 : 0),
    name: (i) => (i.supplier_name || '').toLowerCase(),
    description: (i) => (i.item_description || '').toLowerCase(),
    unit: (i) => (i.units?.name || '').toLowerCase(),
    date: (i) => i.invoice_date || '',
    payment: (i) => PAYMENT_METHODS[i.payment_method] || i.payment_method || '',
    amount: (i) => parseFloat(i.amount) || 0,
  };

  const sortedItems = [...visibleItems].sort((a, b) => {
    const get = SORTABLE[sortKey] || SORTABLE.date;
    const va = get(a);
    const vb = get(b);
    const cmp = typeof va === 'number' && typeof vb === 'number'
      ? va - vb
      : String(va).localeCompare(String(vb), 'hu');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' || key === 'amount' || key === 'state' ? 'desc' : 'asc');
    }
  };

  const SortHeader = ({ sortId, children, align }) => (
    <TableHeader align={align}>
      <button
        type="button"
        onClick={() => toggleSort(sortId)}
        className={`inline-flex items-center gap-1 hover:text-gray-900 ${
          sortKey === sortId ? 'text-gray-900 font-semibold' : ''
        }`}
      >
        {children}
        {sortKey === sortId && (
          sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
      </button>
    </TableHeader>
  );

  const notReceivedCount = items.filter((i) => !i.received).length;
  const notPaidCount = items.filter((i) => i.payment_method === 'transfer' && !i.paid).length;
  const totalAmount = visibleItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          options={[
            { value: '', label: 'Minden számla' },
            { value: 'not_received', label: `Be nem érkezett${notReceivedCount ? ` (${notReceivedCount})` : ''}` },
            { value: 'not_scanned', label: 'Nem szkennelt' },
            { value: 'not_paid', label: `Nem fizetett – átutalás${notPaidCount ? ` (${notPaidCount})` : ''}` },
          ]}
          className="w-64"
        />

        <Select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          options={[
            { value: '', label: 'Minden fizetési mód' },
            { value: 'cash_card', label: 'Készpénz + bankkártya' },
            { value: 'transfer', label: 'Átutalás' },
            { value: 'card', label: 'Bankkártya' },
            { value: 'mol_card', label: 'MOL kártya' },
            { value: 'cash', label: 'Készpénz' },
          ]}
          className="w-52"
        />

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {STATES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-full border ${s.dot}`} />
              {s.label}
            </span>
          ))}
        </div>

        <div className="ml-auto text-sm text-gray-500">
          Összesen: <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
          <span className="ml-2">({visibleItems.length} számla)</span>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nincsenek számlák"
          description="A megadott időszakban és szűrésre nem található számla"
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <SortHeader sortId="state">Állapot</SortHeader>
              <SortHeader sortId="name">Név</SortHeader>
              <SortHeader sortId="description">Tétel</SortHeader>
              {isAdmin && <SortHeader sortId="unit">Egység</SortHeader>}
              <SortHeader sortId="date">Dátum</SortHeader>
              <SortHeader sortId="payment">Fizetés</SortHeader>
              <SortHeader sortId="amount" align="right">Összeg</SortHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((item) => {
              // An active mark tints the whole row; hover is disabled there so
              // the colour doesn't disappear under the cursor.
              const rs = rowState(item);
              // Központi kifizetések live in their own table and are managed on
              // the Házipénztár → Központ tab, so they open no editor here —
              // the same rule the Számlák áttekintése list already follows.
              const editable = item.source === 'expense' && !!onEdit;
              return (
                <TableRow
                  key={`${item.source}-${item.id}`}
                  hover={!rs}
                  className={rs ? rs.row : ''}
                  onClick={editable ? () => onEdit({ kind: 'expense', raw: item }) : undefined}
                  title={
                    editable
                      ? 'Kattints a szerkesztéshez'
                      : 'Központi kifizetés – a Házipénztár / Központ fülön szerkeszthető'
                  }
                >
                  {/* Status dots: only the dot shows until it is active, then the
                      label appears next to it. Clicking toggles the state.
                      The clicks stay in this cell so they never open the editor. */}
                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {statesFor(item).map((s) => {
                        const active = !!item[s.key];
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => toggleState(item, s, !active)}
                            disabled={savingId === `${item.source}-${item.id}-${s.key}`}
                            title={active ? s.label : `Jelölés: ${s.label}`}
                            className="inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <span
                              className={`h-3 w-3 rounded-full border transition-colors ${
                                active ? s.dot : s.dotIdle
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    <p className="font-medium text-gray-900 truncate">{item.supplier_name}</p>
                    {item.invoice_number && (
                      <p className="text-xs text-gray-500 truncate">{item.invoice_number}</p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">
                    {item.item_description || '-'}
                  </TableCell>
                  {isAdmin && <TableCell>{item.units?.name || '-'}</TableCell>}
                  <TableCell>{formatDate(item.invoice_date)}</TableCell>
                  <TableCell>
                    <Badge variant="info" size="sm">
                      {PAYMENT_METHODS[item.payment_method] || item.payment_method}
                    </Badge>
                  </TableCell>
                  {/* Invoices show a plain positive amount; a credit note
                      (jóváíró, negative) keeps its minus sign and is green. */}
                  <TableCell
                    align="right"
                    className={`font-semibold ${
                      (parseFloat(item.amount) || 0) < 0 ? 'text-green-600' : 'text-gray-900'
                    }`}
                  >
                    {formatCurrency(item.amount, item.currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
