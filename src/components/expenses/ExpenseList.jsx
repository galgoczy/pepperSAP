import { useState } from 'react';
import { Receipt, Filter } from 'lucide-react';
import { useExpenses } from '../../hooks/useExpenses';
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

  const { expenses, loading } = useExpenses(unitId, startDate, endDate);

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    if (paymentFilter && expense.payment_method !== paymentFilter) {
      return false;
    }
    return true;
  });

  // Calculate totals
  const totalAmount = filteredExpenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
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
          <span className="ml-2">({filteredExpenses.length} tétel)</span>
        </div>
      </div>

      {/* Table */}
      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nincsenek kifizetések"
          description="A megadott időszakban nem találhatók kifizetések"
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Szállító</TableHeader>
              <TableHeader>Tétel</TableHeader>
              {isAdmin && <TableHeader>Egység</TableHeader>}
              <TableHeader>Dátum</TableHeader>
              <TableHeader>Fizetés</TableHeader>
              <TableHeader>Típus</TableHeader>
              <TableHeader align="right">Összeg</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredExpenses.map((expense) => (
              <TableRow
                key={expense.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onEdit(expense)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">
                      {expense.supplier_name}
                    </p>
                    {expense.invoice_number && (
                      <p className="text-xs text-gray-500">
                        {expense.invoice_number}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {expense.item_description || '-'}
                </TableCell>
                {isAdmin && (
                  <TableCell>{expense.units?.name || '-'}</TableCell>
                )}
                <TableCell>{formatDate(expense.invoice_date)}</TableCell>
                <TableCell>
                  <Badge variant="info" size="sm">
                    {PAYMENT_METHODS[expense.payment_method]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={expense.is_official ? 'success' : 'warning'}
                    size="sm"
                  >
                    {expense.is_official ? 'Hivatalos' : 'Egyéb'}
                  </Badge>
                </TableCell>
                <TableCell align="right" className="font-semibold text-red-600">
                  -{formatCurrency(expense.amount, expense.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
