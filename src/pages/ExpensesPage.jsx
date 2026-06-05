import { useState } from 'react';
import { Plus, ChevronLeft, Users, Banknote } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { Card, Button, Modal, Select } from '../components/common';
import ExpenseList from '../components/expenses/ExpenseList';
import ReceivedInvoicesList from '../components/expenses/ReceivedInvoicesList';
import ExpenseForm from '../components/expenses/ExpenseForm';
import EfoPaymentForm from '../components/expenses/EfoPaymentForm';
import WagePaymentForm from '../components/expenses/WagePaymentForm';
import PaymentEditModal from '../components/expenses/PaymentEditModal';
import { getFirstDayOfMonth, getLastDayOfMonth } from '../lib/utils';

// Get previous month's first and last day (LOCAL components — toISOString()
// shifts back a day in timezones ahead of UTC like Hungary).
function getPreviousMonthDates() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    start: ymd(firstDay),
    end: ymd(lastDay),
  };
}

export default function ExpensesPage() {
  const { isAdmin, unitId } = useAuth();
  const { units } = useUnits();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEfoFormOpen, setIsEfoFormOpen] = useState(false);
  const [isWageFormOpen, setIsWageFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('expenses');

  const refreshList = () => setRefreshKey((k) => k + 1);

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

  const handleEdit = (item) => {
    setEditingItem(item);
  };

  const handleClose = () => {
    setIsFormOpen(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Kifizetések / számlák</h1>
          <p className="text-gray-500 mt-1">
            Számlák és kiadások nyilvántartása
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Új kifizetés
          </Button>
          <Button variant="secondary" onClick={() => setIsEfoFormOpen(true)}>
            <Users className="h-4 w-4" />
            Új EFO kifizetés
          </Button>
          <Button variant="secondary" onClick={() => setIsWageFormOpen(true)}>
            <Banknote className="h-4 w-4" />
            Új Heti bér
          </Button>
        </div>
      </div>

      {/* Filters row: unit selector (admin only) + month quick-select (everyone) */}
      <div className="flex flex-wrap items-center gap-4">
        {isAdmin && (
          <Select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            options={unitOptions}
            className="w-48"
          />
        )}

        <Button
          variant={isCurrentMonth ? 'primary' : 'secondary'}
          size="sm"
          onClick={handleCurrentMonth}
        >
          Aktuális hónap
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePreviousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
          Előző hónap
        </Button>
      </div>

      {/* Tabs (admin only) */}
      {isAdmin && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'expenses'
                  ? 'border-pepper-red text-pepper-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Kifizetések
            </button>
            <button
              onClick={() => setActiveTab('received')}
              className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'received'
                  ? 'border-pepper-red text-pepper-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Beérkezett számlák
            </button>
          </nav>
        </div>
      )}

      {/* Content */}
      <Card>
        {isAdmin && activeTab === 'received' ? (
          <ReceivedInvoicesList
            key={`received-${refreshKey}`}
            unitId={filterUnitId}
            isAdmin={isAdmin}
            startDate={startDate}
            endDate={endDate}
          />
        ) : (
          <ExpenseList
            key={refreshKey}
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
        )}
      </Card>

      {/* New expense form modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={handleClose}
        title="Új kifizetés"
        size="lg"
      >
        <ExpenseForm
          unitId={isAdmin ? null : unitId}
          onSuccess={() => {
            handleClose();
            refreshList();
          }}
          onCancel={handleClose}
        />
      </Modal>

      {/* EFO payment form modal */}
      <Modal
        isOpen={isEfoFormOpen}
        onClose={() => setIsEfoFormOpen(false)}
        title="Új EFO kifizetés"
        size="lg"
      >
        <EfoPaymentForm
          unitId={isAdmin ? null : unitId}
          onSuccess={() => {
            setIsEfoFormOpen(false);
            refreshList();
          }}
          onCancel={() => setIsEfoFormOpen(false)}
        />
      </Modal>

      {/* Wage payment form modal */}
      <Modal
        isOpen={isWageFormOpen}
        onClose={() => setIsWageFormOpen(false)}
        title="Új Heti bér fizetés"
        size="lg"
      >
        <WagePaymentForm
          unitId={isAdmin ? null : unitId}
          onSuccess={() => {
            setIsWageFormOpen(false);
            refreshList();
          }}
          onCancel={() => setIsWageFormOpen(false)}
        />
      </Modal>

      {/* Edit modal for any payment kind */}
      <PaymentEditModal
        item={editingItem}
        unitId={isAdmin ? null : unitId}
        onClose={() => setEditingItem(null)}
        onSaved={refreshList}
      />
    </div>
  );
}
