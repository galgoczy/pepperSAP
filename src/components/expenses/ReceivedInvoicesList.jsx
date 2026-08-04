import { useState, useEffect, useCallback } from 'react';
import { Receipt } from 'lucide-react';
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
    row: 'bg-[#FA8072]/10',
    text: 'text-[#B4483C]',
    atField: 'received_at',
    byField: 'received_by',
  },
  {
    key: 'scanned',
    label: 'Szkennelt',
    dot: 'bg-green-500 border-green-500',
    row: 'bg-green-500/10',
    text: 'text-green-700',
    atField: 'scanned_at',
    byField: 'scanned_by',
  },
  {
    key: 'paid',
    label: 'Fizetett',
    dot: 'bg-yellow-400 border-yellow-400',
    row: 'bg-yellow-400/10',
    text: 'text-yellow-700',
    atField: 'paid_at',
    byField: 'paid_by',
    transferOnly: true,
  },
];

// Admin view of official (számlás) payments, where the invoice's handling can be
// tracked: received / scanned / paid.
export default function ReceivedInvoicesList({ unitId, isAdmin, startDate, endDate }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [stateFilter, setStateFilter] = useState('');

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

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
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
    setSavingId(`${item.id}-${state.key}`);
    setItems((prev) =>
      prev.map((e) => (e.id === item.id ? { ...e, [state.key]: nextValue } : e))
    );
    try {
      const { error } = await supabase
        .from('expenses')
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
        prev.map((e) => (e.id === item.id ? { ...e, [state.key]: !nextValue } : e))
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
    if (stateFilter === 'not_received') return !item.received;
    if (stateFilter === 'not_scanned') return !item.scanned;
    if (stateFilter === 'not_paid') return item.payment_method === 'transfer' && !item.paid;
    return true;
  });

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
              <TableHeader>Állapot</TableHeader>
              <TableHeader>Név</TableHeader>
              <TableHeader>Tétel</TableHeader>
              {isAdmin && <TableHeader>Egység</TableHeader>}
              <TableHeader>Dátum</TableHeader>
              <TableHeader>Fizetés</TableHeader>
              <TableHeader align="right">Összeg</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleItems.map((item) => {
              const rs = rowState(item);
              return (
                <TableRow key={item.id} className={rs ? rs.row : ''}>
                  {/* Status dots: only the dot shows until it is active, then the
                      label appears next to it. Clicking toggles the state. */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {statesFor(item).map((s) => {
                        const active = !!item[s.key];
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => toggleState(item, s, !active)}
                            disabled={savingId === `${item.id}-${s.key}`}
                            title={active ? s.label : `Jelölés: ${s.label}`}
                            className="inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <span
                              className={`h-3 w-3 rounded-full border transition-colors ${
                                active ? s.dot : 'bg-white border-gray-300 hover:border-gray-500'
                              }`}
                            />
                            {active && (
                              <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
                            )}
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
                  <TableCell align="right" className="font-semibold text-red-600">
                    -{formatCurrency(item.amount, item.currency)}
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
