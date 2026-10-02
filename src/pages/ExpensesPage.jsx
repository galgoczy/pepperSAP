import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Users, Banknote, CalendarDays } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { Card, Button, Modal, Select } from '../components/common';
import ExpenseList from '../components/expenses/ExpenseList';
import ReceivedInvoicesList from '../components/expenses/ReceivedInvoicesList';
import ExpenseForm from '../components/expenses/ExpenseForm';
import EfoPaymentForm from '../components/expenses/EfoPaymentForm';
import WagePaymentForm from '../components/expenses/WagePaymentForm';
import PaymentEditModal from '../components/expenses/PaymentEditModal';
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  formatDate,
  formatYearMonth,
  monthRange,
  shiftYearMonth,
  currentYearMonth,
} from '../lib/utils';

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
  // Every unit is selectable, not just the restaurants: costs can also be booked
  // on the events unit (Rendezvény) and the central one (Központ).
  const unitOptions = [
    { value: 'all', label: 'Összes egység' },
    ...[...units]
      .sort((a, b) => {
        const rank = (u) => (u.type === 'restaurant' ? 0 : 1);
        return rank(a) - rank(b) || (a.name || '').localeCompare(b.name || '', 'hu');
      })
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

  // Hónapléptetés. A megjelenített hónap a kezdő dátumból jön; a nyilak egész
  // hónapra állítják az időszakot, előre és hátra egyaránt. A Szűrők panelen a
  // dátumok szabadon is átállíthatók, ilyenkor "egyedi időszak" látszik, és a
  // nyíl a kezdő dátum hónapjából lép tovább.
  const shownMonth = String(startDate || '').slice(0, 7);
  const range = monthRange(shownMonth);
  const isWholeMonth = startDate === range.start && endDate === range.end;
  const isCurrentMonth = isWholeMonth && shownMonth === currentYearMonth();

  const goToMonth = (ym) => {
    const r = monthRange(ym);
    if (!r.start) return;
    setStartDate(r.start);
    setEndDate(r.end);
  };

  const stepMonth = (delta) => goToMonth(shiftYearMonth(shownMonth, delta));

  const handleCurrentMonth = () => {
    setStartDate(getFirstDayOfMonth());
    setEndDate(getLastDayOfMonth());
  };

  const periodLabel = isWholeMonth
    ? formatYearMonth(shownMonth)
    : `${formatDate(startDate)} – ${formatDate(endDate)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Számlák</h1>
          <p className="text-gray-500 mt-1">
            Számlák és kiadások nyilvántartása
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Számla / kifizetés
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
            label="Egység"
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            options={unitOptions}
            className="w-48"
          />
        )}

        {/* Hónapléptető: bármelyik korábbi vagy későbbi hónapra el lehet jutni,
            és mindig látszik, melyik időszakot nézzük. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => stepMonth(-1)}
            title="Előző hónap"
            aria-label="Előző hónap"
            className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="min-w-[168px] text-center">
            <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-900">
              <CalendarDays className="h-4 w-4 text-pepper-red" />
              {periodLabel}
            </div>
            {!isWholeMonth && (
              <div className="text-[11px] text-gray-500">egyedi időszak</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => stepMonth(1)}
            title="Következő hónap"
            aria-label="Következő hónap"
            className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <Button
          variant={isCurrentMonth ? 'primary' : 'secondary'}
          size="sm"
          onClick={handleCurrentMonth}
          disabled={isCurrentMonth}
          title="Ugrás az aktuális hónapra"
        >
          Aktuális hónap
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
              Számlák áttekintése
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
            onEdit={handleEdit}
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
        title="Számla / kifizetés"
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
