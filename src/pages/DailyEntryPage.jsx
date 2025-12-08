import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { Card, Button, Select, LoadingSpinner } from '../components/common';
import DailyRevenueForm from '../components/daily/DailyRevenueForm';
import HouseCashForm from '../components/daily/HouseCashForm';
import DailyReport from '../components/daily/DailyReport';
import ExpenseForm from '../components/expenses/ExpenseForm';
import { getToday } from '../lib/utils';
import { CalendarDays, Printer, Plus, Receipt } from 'lucide-react';

const tabs = [
  { id: 'all', label: 'Minden adat' },
  { id: 'revenue', label: 'Napi forgalom' },
  { id: 'cash', label: 'Házipénztár' },
  { id: 'expenses', label: 'Kifizetések' },
  { id: 'report', label: 'Napi riport' },
];

export default function DailyEntryPage() {
  const { isAdmin, unitId, profile } = useAuth();
  const { units, loading: unitsLoading } = useUnits();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedUnit, setSelectedUnit] = useState(unitId || '');
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Get restaurant units only
  const restaurantUnits = units.filter(u => u.type === 'restaurant');

  // Auto-select first unit for admin if none selected
  useEffect(() => {
    if (isAdmin && !selectedUnit && restaurantUnits.length > 0) {
      setSelectedUnit(restaurantUnits[0].id);
    }
  }, [isAdmin, selectedUnit, restaurantUnits]);

  // Use user's unit if not admin
  const effectiveUnitId = isAdmin ? selectedUnit : unitId;

  // Get selected unit name
  const selectedUnitName = units.find(u => u.id === effectiveUnitId)?.name || '';

  if (unitsLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Napi adatrögzítés</h1>
          <p className="text-gray-500 mt-1">
            {selectedUnitName && `${selectedUnitName} - `}{selectedDate}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={getToday()}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-transparent"
            />
          </div>

          {activeTab === 'report' && (
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="no-print"
            >
              <Printer className="h-4 w-4" />
              Nyomtatás
            </Button>
          )}
        </div>
      </div>

      {/* Unit selector for admin */}
      {isAdmin && (
        <Card padding={false} className="p-4">
          <Select
            label="Egység kiválasztása"
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            options={restaurantUnits.map(u => ({ value: u.id, label: u.name }))}
            placeholder="Válassz egységet..."
          />
        </Card>
      )}

      {/* Tab navigation */}
      <div className="border-b border-gray-200 no-print overflow-x-auto">
        <nav className="flex gap-4 md:gap-8 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? 'border-pepper-red text-pepper-red'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {/* ALL - Combined view */}
        {activeTab === 'all' && (
          <div className="space-y-8">
            {/* Revenue Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold">1</span>
                Napi forgalom
              </h2>
              <DailyRevenueForm
                date={selectedDate}
                unitId={effectiveUnitId}
              />
            </div>

            {/* House Cash Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
                Házipénztár
              </h2>
              <HouseCashForm
                date={selectedDate}
                unitId={effectiveUnitId}
              />
            </div>

            {/* Expenses Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">3</span>
                Napi kifizetések
                <Button
                  size="sm"
                  onClick={() => setShowExpenseForm(!showExpenseForm)}
                  className="ml-auto"
                >
                  <Plus className="h-4 w-4" />
                  Új kifizetés
                </Button>
              </h2>

              {showExpenseForm && (
                <Card className="mb-4">
                  <ExpenseForm
                    unitId={effectiveUnitId}
                    onSuccess={() => setShowExpenseForm(false)}
                    onCancel={() => setShowExpenseForm(false)}
                  />
                </Card>
              )}

              <DailyExpensesList unitId={effectiveUnitId} date={selectedDate} />
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <DailyRevenueForm
            date={selectedDate}
            unitId={effectiveUnitId}
          />
        )}

        {activeTab === 'cash' && (
          <HouseCashForm
            date={selectedDate}
            unitId={effectiveUnitId}
          />
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowExpenseForm(!showExpenseForm)}>
                <Plus className="h-4 w-4" />
                Új kifizetés
              </Button>
            </div>

            {showExpenseForm && (
              <Card>
                <ExpenseForm
                  unitId={effectiveUnitId}
                  onSuccess={() => setShowExpenseForm(false)}
                  onCancel={() => setShowExpenseForm(false)}
                />
              </Card>
            )}

            <DailyExpensesList unitId={effectiveUnitId} date={selectedDate} />
          </div>
        )}

        {activeTab === 'report' && (
          <DailyReport
            date={selectedDate}
            unitId={effectiveUnitId}
          />
        )}
      </div>
    </div>
  );
}

// Component to show daily expenses
function DailyExpensesList({ unitId, date }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExpenses() {
      if (!unitId || !date) {
        setExpenses([]);
        setLoading(false);
        return;
      }

      try {
        const { supabase } = await import('../lib/supabase');
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('unit_id', unitId)
          .eq('invoice_date', date)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setExpenses(data || []);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchExpenses();
  }, [unitId, date]);

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">
          <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Ezen a napon még nincs rögzített kifizetés</p>
        </div>
      </Card>
    );
  }

  const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  return (
    <Card>
      <div className="space-y-3">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
          >
            <div>
              <p className="font-medium text-gray-900">{expense.supplier_name}</p>
              <p className="text-sm text-gray-500">
                {expense.item_description || 'Nincs leírás'} • {expense.payment_method}
              </p>
            </div>
            <p className="font-semibold text-red-600">
              -{new Intl.NumberFormat('hu-HU', { style: 'currency', currency: expense.currency || 'HUF', minimumFractionDigits: 0 }).format(expense.amount)}
            </p>
          </div>
        ))}

        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <p className="font-semibold text-gray-700">Összesen:</p>
          <p className="font-bold text-red-600 text-lg">
            -{new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', minimumFractionDigits: 0 }).format(total)}
          </p>
        </div>
      </div>
    </Card>
  );
}
