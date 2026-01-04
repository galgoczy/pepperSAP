import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { Card, Button, Modal, Select } from '../components/common';
import ExpenseList from '../components/expenses/ExpenseList';
import ExpenseForm from '../components/expenses/ExpenseForm';
import { getFirstDayOfMonth, getLastDayOfMonth } from '../lib/utils';

// Get previous month's first and last day
function getPreviousMonthDates() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0],
  };
}

export default function ExpensesPage() {
  const { isAdmin, unitId } = useAuth();
  const { units } = useUnits();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());

  // Unit options for admin filter
  const unitOptions = [
    { value: 'all', label: 'Összes egység' },
    ...units
      .filter(u => u.type === 'restaurant')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(u => ({ value: u.id, label: u.name }))
  ];

  // Determine which unit ID to pass to ExpenseList
  const filterUnitId = isAdmin
    ? (selectedUnit === 'all' ? null : selectedUnit)
    : unitId;

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  const isCurrentMonth = startDate === getFirstDayOfMonth() && endDate === getLastDayOfMonth();

  const handlePreviousMonth = () => {
    const prev = getPreviousMonthDates();
    setStartDate(prev.start);
    setEndDate(prev.end);
  };

  const handleCurrentMonth = () => {
    setStartDate(getFirstDayOfMonth());
    setEndDate(getLastDayOfMonth());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kifizetések</h1>
          <p className="text-gray-500 mt-1">
            Számlák és kiadások nyilvántartása
          </p>
        </div>

        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Új kifizetés
        </Button>
      </div>

      {/* Filters row for admin */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            options={unitOptions}
            className="w-48"
          />

          {isCurrentMonth ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
              Előző hónap
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCurrentMonth}
            >
              Aktuális hónap
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Expense list */}
      <Card>
        <ExpenseList
          unitId={filterUnitId}
          onEdit={handleEdit}
          isAdmin={isAdmin}
          startDate={startDate}
          endDate={endDate}
          onDateChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
      </Card>

      {/* Expense form modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={handleClose}
        title={editingExpense ? 'Kifizetés szerkesztése' : 'Új kifizetés'}
        size="lg"
      >
        <ExpenseForm
          expense={editingExpense}
          unitId={isAdmin ? null : unitId}
          onSuccess={handleClose}
          onCancel={handleClose}
        />
      </Modal>
    </div>
  );
}
