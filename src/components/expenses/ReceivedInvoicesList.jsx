import { useState, useEffect, useCallback } from 'react';
import { Receipt, Check } from 'lucide-react';
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
} from '../common';
import { formatCurrency, formatDate, PAYMENT_METHODS } from '../../lib/utils';
import toast from 'react-hot-toast';

// Admin view of official (számlás) cash/card payments, where the physical
// invoice arrival can be checked off. A "hiányzók mutatása" toggle narrows the
// list to invoices not yet received.
export default function ReceivedInvoicesList({ unitId, isAdmin, startDate, endDate }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [missingOnly, setMissingOnly] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select('*, units (id, name)')
        .eq('is_official', true)
        .in('payment_method', ['cash', 'card'])
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

  const toggleReceived = async (item, nextReceived) => {
    setSavingId(item.id);
    // Optimistic update.
    setItems((prev) =>
      prev.map((e) => (e.id === item.id ? { ...e, received: nextReceived } : e))
    );
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          received: nextReceived,
          received_at: nextReceived ? new Date().toISOString() : null,
          received_by: nextReceived ? user?.id || null : null,
        })
        .eq('id', item.id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating received state:', error);
      toast.error('Hiba a beérkezés mentésekor');
      // Revert.
      setItems((prev) =>
        prev.map((e) => (e.id === item.id ? { ...e, received: !nextReceived } : e))
      );
    } finally {
      setSavingId(null);
    }
  };

  const visibleItems = missingOnly ? items.filter((i) => !i.received) : items;
  const missingCount = items.filter((i) => !i.received).length;
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
        {/* "Hiányzók mutatása" toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={missingOnly}
          onClick={() => setMissingOnly((v) => !v)}
          className="flex items-center gap-2 text-sm text-gray-700"
        >
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              missingOnly ? 'bg-pepper-red' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                missingOnly ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </span>
          Hiányzók mutatása
          {missingCount > 0 && (
            <span className="ml-1 text-xs font-semibold text-pepper-red">({missingCount})</span>
          )}
        </button>

        <div className="ml-auto text-sm text-gray-500">
          Összesen: <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
          <span className="ml-2">({visibleItems.length} számla)</span>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={missingOnly ? 'Nincs hiányzó számla' : 'Nincsenek számlák'}
          description={
            missingOnly
              ? 'A megadott időszakban minden hivatalos készpénzes/kártyás számla beérkezett'
              : 'A megadott időszakban nincs hivatalos készpénzes/kártyás számla'
          }
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Név</TableHeader>
              <TableHeader>Tétel</TableHeader>
              {isAdmin && <TableHeader>Egység</TableHeader>}
              <TableHeader>Dátum</TableHeader>
              <TableHeader>Fizetés</TableHeader>
              <TableHeader align="right">Összeg</TableHeader>
              <TableHeader align="center">Beérkezett</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleItems.map((item) => (
              <TableRow key={item.id} className={item.received ? 'bg-green-50/40' : ''}>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{item.supplier_name}</p>
                    {item.invoice_number && (
                      <p className="text-xs text-gray-500">{item.invoice_number}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate">
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
                <TableCell align="center">
                  <button
                    type="button"
                    onClick={() => toggleReceived(item, !item.received)}
                    disabled={savingId === item.id}
                    title={item.received ? 'Beérkezett' : 'Még nem érkezett be'}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded border transition-colors disabled:opacity-50 ${
                      item.received
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {item.received && <Check className="h-4 w-4" />}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
