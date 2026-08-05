import { useState } from 'react';
import { Receipt, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { usePaymentItems, PAYMENT_KIND_META } from '../../hooks/usePaymentItems';
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
  Button,
  Select,
  DatePicker,
} from '../common';
import { formatCurrency, formatDate, PAYMENT_METHODS, getFirstDayOfMonth, getLastDayOfMonth } from '../../lib/utils';

// Which "pot" a payment comes out of:
//   bank      – anything paid from the bank account (card, MOL card, transfer, …)
//   house     – official cash (Házipénztár)
//   reserve   – non-official cash (Tartalék)
// EFO/wage items have no is_official flag; their official part moves the house
// cash, so they are grouped under Házipénztár.
function itemSource(item) {
  // Central costs come out of the central pénztár, not a unit's házipénztár.
  if (item.kind === 'central') return 'central';
  const pm = item.payment_method;
  if (pm && pm !== 'cash') return 'bank';
  if (item.is_official === false) return 'reserve';
  return 'house';
}

const SORTABLE = {
  kind: (i) => PAYMENT_KIND_META[i.kind]?.label || '',
  name: (i) => (i.name || '').toLowerCase(),
  description: (i) => (i.description || '').toLowerCase(),
  unit: (i) => (i.units?.name || '').toLowerCase(),
  date: (i, dateBasis) => effectiveDate(i, dateBasis) || '',
  amount: (i) => i.amount || 0,
};

// Transfer invoices can be listed by their issue date (kelt) or, optionally, by
// their fulfillment date (teljesítés). Everything else always uses its own date.
function effectiveDate(item, dateBasis) {
  if (dateBasis === 'fulfillment' && item.payment_method === 'transfer') {
    return item.fulfillment_date || item.date;
  }
  return item.date;
}

export default function ExpenseList({
  unitId,
  onEdit,
  isAdmin,
  startDate: propStartDate,
  endDate: propEndDate,
  onDateChange
}) {
  const [localStartDate, setLocalStartDate] = useState(getFirstDayOfMonth());
  const [localEndDate, setLocalEndDate] = useState(getLastDayOfMonth());
  const [paymentFilter, setPaymentFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateBasis, setDateBasis] = useState('invoice'); // 'invoice' | 'fulfillment'
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Use props if provided, otherwise use local state
  const startDate = propStartDate || localStartDate;
  const endDate = propEndDate || localEndDate;

  const setStartDate = (date) => {
    if (onDateChange) {
      onDateChange(date, endDate);
    } else {
      setLocalStartDate(date);
    }
  };

  const setEndDate = (date) => {
    if (onDateChange) {
      onDateChange(startDate, date);
    } else {
      setLocalEndDate(date);
    }
  };

  const { items, loading } = usePaymentItems(unitId, startDate, endDate);

  // Filter payment items
  const filteredItems = items.filter((item) => {
    if (kindFilter && item.kind !== kindFilter) {
      return false;
    }
    if (paymentFilter && item.payment_method !== paymentFilter) {
      return false;
    }
    if (sourceFilter && itemSource(item) !== sourceFilter) {
      return false;
    }
    return true;
  });

  // Sort: click a header to sort by it, click again to flip the direction.
  const sortedItems = [...filteredItems].sort((a, b) => {
    const get = SORTABLE[sortKey] || SORTABLE.date;
    const va = get(a, dateBasis);
    const vb = get(b, dateBasis);
    let cmp;
    if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
    else cmp = String(va).localeCompare(String(vb), 'hu');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' || key === 'amount' ? 'desc' : 'asc');
    }
  };

  // Clickable header cell with the sort indicator.
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

  // Calculate totals
  const totalAmount = filteredItems.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters: button + total on one row; the filter controls open on a
          separate row below so everything fits comfortably. */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Szűrők
          </Button>

          <div className="ml-auto text-sm text-gray-500">
            Összesen: <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
            <span className="ml-2">({filteredItems.length} tétel)</span>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <DatePicker
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-gray-400">-</span>
              <DatePicker
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>

            <Select
              label="Ktg fajtája"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              options={[
                { value: '', label: 'Minden fajta' },
                { value: 'expense', label: PAYMENT_KIND_META.expense.label },
                { value: 'efo', label: PAYMENT_KIND_META.efo.label },
                { value: 'wage', label: PAYMENT_KIND_META.wage.label },
                { value: 'central', label: PAYMENT_KIND_META.central.label },
              ]}
              className="w-40"
            />

            <Select
              label="Fiz. módja"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              options={[
                { value: '', label: 'Összes fizetési mód' },
                { value: 'cash', label: 'Készpénz' },
                { value: 'card', label: 'Bankkártya' },
                { value: 'mol_card', label: 'MOL kártya' },
                { value: 'transfer', label: 'Átutalás' },
                { value: 'clearing', label: 'Elszámoló' },
              ]}
              className="w-48"
            />

            <Select
              label="Típus"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              options={[
                { value: '', label: 'Minden típus' },
                { value: 'bank', label: 'Bankszámla' },
                { value: 'house', label: 'Házipénztár' },
                { value: 'reserve', label: 'Tartalék' },
                { value: 'central', label: 'Központi pénztár' },
              ]}
              className="w-44"
            />

            <Select
              label="Dátum alapja"
              value={dateBasis}
              onChange={(e) => setDateBasis(e.target.value)}
              options={[
                { value: 'invoice', label: 'Kelt' },
                { value: 'fulfillment', label: 'Teljesítés (átutalásnál)' },
              ]}
              className="w-52"
            />
          </div>
        )}
      </div>

      {/* Table */}
      {sortedItems.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nincsenek kifizetések"
          description="A megadott időszakban nem találhatók kifizetések"
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <SortHeader sortId="kind">Fajta</SortHeader>
              <SortHeader sortId="name">Név</SortHeader>
              <SortHeader sortId="description">Tétel</SortHeader>
              {isAdmin && <SortHeader sortId="unit">Egység</SortHeader>}
              <SortHeader sortId="date">Dátum</SortHeader>
              <TableHeader>Fizetés</TableHeader>
              <SortHeader sortId="amount" align="right">Összeg</SortHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((item) => {
              const kindMeta = PAYMENT_KIND_META[item.kind];
              return (
                <TableRow
                  key={item.id}
                  className={item.editable === false ? '' : 'cursor-pointer hover:bg-gray-50'}
                  onClick={item.editable === false ? undefined : () => onEdit(item)}
                >
                  <TableCell>
                    <Badge variant={kindMeta.variant} size="sm">
                      {kindMeta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.name}
                      </p>
                      {item.reference && (
                        <p className="text-xs text-gray-500">
                          {item.reference}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {item.description || '-'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>{item.units?.name || '-'}</TableCell>
                  )}
                  <TableCell>{formatDate(effectiveDate(item, dateBasis))}</TableCell>
                  <TableCell>
                    {item.payment_method ? (
                      <Badge variant="info" size="sm">
                        {PAYMENT_METHODS[item.payment_method] || item.payment_method}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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
