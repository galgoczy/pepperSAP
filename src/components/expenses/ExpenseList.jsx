import { useState } from 'react';
import { Receipt, Filter } from 'lucide-react';
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
    return true;
  });

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
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
          Szűrők
        </Button>

        {showFilters && (
          <>
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
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              options={[
                { value: '', label: 'Minden fajta' },
                { value: 'expense', label: PAYMENT_KIND_META.expense.label },
                { value: 'efo', label: PAYMENT_KIND_META.efo.label },
                { value: 'wage', label: PAYMENT_KIND_META.wage.label },
              ]}
              className="w-40"
            />

            <Select
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
          </>
        )}

        <div className="ml-auto text-sm text-gray-500">
          Összesen: <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
          <span className="ml-2">({filteredItems.length} tétel)</span>
        </div>
      </div>

      {/* Table */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nincsenek kifizetések"
          description="A megadott időszakban nem találhatók kifizetések"
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Fajta</TableHeader>
              <TableHeader>Név</TableHeader>
              <TableHeader>Tétel</TableHeader>
              {isAdmin && <TableHeader>Egység</TableHeader>}
              <TableHeader>Dátum</TableHeader>
              <TableHeader>Fizetés</TableHeader>
              <TableHeader>Számlás</TableHeader>
              <TableHeader align="right">Összeg</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => {
              const kindMeta = PAYMENT_KIND_META[item.kind];
              return (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onEdit(item)}
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
                  <TableCell>{formatDate(item.date)}</TableCell>
                  <TableCell>
                    {item.payment_method ? (
                      <Badge variant="info" size="sm">
                        {PAYMENT_METHODS[item.payment_method] || item.payment_method}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.kind === 'expense' ? (
                      <Badge
                        variant={item.is_official ? 'success' : 'warning'}
                        size="sm"
                      >
                        {item.is_official ? 'Hivatalos' : 'Egyéb'}
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
