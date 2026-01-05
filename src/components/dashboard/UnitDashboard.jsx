import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Wallet,
  CalendarDays,
  Receipt,
  ChevronRight,
  Plus,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { Card, Button, LoadingSpinner } from '../common';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getToday } from '../../lib/utils';

// Color options for marking
const MARK_COLORS = {
  red: 'bg-red-100 border-l-4 border-l-red-500',
  yellow: 'bg-yellow-100 border-l-4 border-l-yellow-500',
  green: 'bg-green-100 border-l-4 border-l-green-500',
  blue: 'bg-blue-100 border-l-4 border-l-blue-500',
  purple: 'bg-purple-100 border-l-4 border-l-purple-500',
};

// Animated currency display component
function AnimatedCurrency({ value, hasData = true }) {
  const animatedValue = useAnimatedNumber(value || 0, 1200);

  if (!hasData) {
    return 'Nincs adat';
  }

  return formatCurrency(animatedValue);
}

export default function UnitDashboard() {
  const { unitId, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    previousDayRevenue: null,
    runningHouseCash: 0,
    weeklyRevenue: 0,
    recentExpenses: [],
    recentEntries: [],
  });

  useEffect(() => {
    async function fetchDashboardData() {
      if (!unitId) return;

      try {
        const today = getToday();
        const now = new Date();

        // Yesterday's date (data is entered at end of day)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Get Monday of current week (for weekly revenue)
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - diffToMonday);
        const mondayStr = monday.toISOString().split('T')[0];

        // Fetch all data in parallel for better performance
        const [
          previousDayRevenueResult,
          allCashRevenuesResult,
          cashExpensesResult,
          weeklyRevenuesResult,
          recentExpensesResult,
          recentEntriesResult,
        ] = await Promise.all([
          // Yesterday's revenue (data is entered at end of day)
          supabase
            .from('daily_revenue')
            .select('*')
            .eq('unit_id', unitId)
            .eq('date', yesterdayStr)
            .maybeSingle(),
          // All cash revenues for running house cash calculation
          supabase
            .from('daily_revenue')
            .select('cash_payment')
            .eq('unit_id', unitId)
            .lte('date', today),
          // All cash expenses for running house cash calculation
          supabase
            .from('expenses')
            .select('amount')
            .eq('unit_id', unitId)
            .eq('payment_method', 'cash'),
          // Weekly revenue (Monday to yesterday - not including today)
          supabase
            .from('daily_revenue')
            .select('total_revenue')
            .eq('unit_id', unitId)
            .gte('date', mondayStr)
            .lte('date', yesterdayStr),
          // Recent expenses
          supabase
            .from('expenses')
            .select('*')
            .eq('unit_id', unitId)
            .order('created_at', { ascending: false })
            .limit(5),
          // Last 10 daily entries with cash register data
          supabase
            .from('daily_revenue')
            .select('*, cash_register_revenue(cash_payment, card_payment)')
            .eq('unit_id', unitId)
            .order('date', { ascending: false })
            .limit(10),
        ]);

        const weeklyTotal = (weeklyRevenuesResult.data || []).reduce(
          (sum, r) => sum + (parseFloat(r.total_revenue) || 0),
          0
        );

        // Calculate running house cash: sum of cash revenues - cash expenses
        const totalCashRevenue = (allCashRevenuesResult.data || []).reduce(
          (sum, r) => sum + (parseFloat(r.cash_payment) || 0),
          0
        );
        const totalCashExpenses = (cashExpensesResult.data || []).reduce(
          (sum, r) => sum + (parseFloat(r.amount) || 0),
          0
        );
        const runningHouseCash = totalCashRevenue - totalCashExpenses;

        setStats({
          previousDayRevenue: previousDayRevenueResult.data,
          runningHouseCash,
          weeklyRevenue: weeklyTotal,
          recentExpenses: recentExpensesResult.data || [],
          // Filter out entries with 0 revenue and 0 cash register totals
          recentEntries: (recentEntriesResult.data || []).filter(entry => {
            const totalRevenue = parseFloat(entry.total_revenue) || 0;
            const cashRegisterTotal = (entry.cash_register_revenue || []).reduce(
              (sum, r) => sum + (parseFloat(r.cash_payment) || 0) + (parseFloat(r.card_payment) || 0),
              0
            );
            // Keep entry if it has any revenue or cash register data
            return totalRevenue > 0 || cashRegisterTotal > 0;
          }),
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [unitId]);

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.unit_name || 'Vezérlőpult'}
          </h1>
          <p className="text-gray-500 mt-1">
            Üdvözöljük! Itt láthatja az egység napi adatait.
          </p>
        </div>

        <Link to="/daily">
          <Button>
            <Plus className="h-4 w-4" />
            Napi adatok rögzítése
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-200 rounded-lg shrink-0">
              <TrendingUp className="h-6 w-6 text-green-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-green-600 font-medium">Tegnapi forgalom</p>
              <p className="text-xl font-bold text-green-800 break-words">
                <AnimatedCurrency
                  value={stats.previousDayRevenue?.total_revenue}
                  hasData={!!stats.previousDayRevenue}
                />
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-200 rounded-lg shrink-0">
              <Wallet className="h-6 w-6 text-blue-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-blue-600 font-medium">Házipénztár egyenleg</p>
              <p className="text-xl font-bold text-blue-800 break-words">
                <AnimatedCurrency value={stats.runningHouseCash} />
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-200 rounded-lg shrink-0">
              <TrendingUp className="h-6 w-6 text-purple-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-purple-600 font-medium">Heti forgalom</p>
              <p className="text-xl font-bold text-purple-800 break-words">
                <AnimatedCurrency value={stats.weeklyRevenue} />
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Yesterday's data status */}
      {!stats.previousDayRevenue && (
        <Card className="border-yellow-200 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">Tegnapi adat hiányzik</h3>
                <p className="text-sm text-yellow-700">
                  Még nem rögzített tegnapi forgalmi adatokat.
                </p>
              </div>
            </div>
            <Link to="/daily">
              <Button size="sm">Rögzítés</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Yesterday's details */}
      {stats.previousDayRevenue && (
        <Card title="Tegnapi adatok részletesen">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Pénztárgép forgalom</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">0% ÁFA</span>
                  <span>{formatCurrency(stats.previousDayRevenue.vat_0_percent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">5% ÁFA</span>
                  <span>{formatCurrency(stats.previousDayRevenue.vat_5_percent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">18% ÁFA</span>
                  <span>{formatCurrency(stats.previousDayRevenue.vat_18_percent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">27% ÁFA</span>
                  <span>{formatCurrency(stats.previousDayRevenue.vat_27_percent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Borravaló</span>
                  <span>{formatCurrency(stats.previousDayRevenue.tips)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Fizetési módok</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Készpénz</span>
                  <span>{formatCurrency(stats.previousDayRevenue.cash_payment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bankkártya</span>
                  <span>{formatCurrency(stats.previousDayRevenue.card_payment)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/daily">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pepper-red bg-opacity-10 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-pepper-red" />
                </div>
                <div>
                  <span className="font-medium text-gray-900">Napi adatok</span>
                  <p className="text-sm text-gray-500">Forgalom és házipénztár</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Card>
        </Link>

        <Link to="/expenses">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pepper-red bg-opacity-10 rounded-lg">
                  <Receipt className="h-5 w-5 text-pepper-red" />
                </div>
                <div>
                  <span className="font-medium text-gray-900">Kifizetések</span>
                  <p className="text-sm text-gray-500">Számlák és kiadások</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent entries - last 10 days */}
      <Card title="Legutóbbi 10 rögzítés">
        {stats.recentEntries.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Clock className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Még nincsenek rögzített napok</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">
              Kattints egy sorra a szerkesztéshez
            </p>
            {stats.recentEntries.map((entry) => {
              // Sum up cash and card from cash registers
              const totalCash = (entry.cash_register_revenue || []).reduce(
                (sum, r) => sum + (parseFloat(r.cash_payment) || 0),
                0
              );
              const totalCard = (entry.cash_register_revenue || []).reduce(
                (sum, r) => sum + (parseFloat(r.card_payment) || 0),
                0
              );
              return (
                <button
                  key={entry.id}
                  onClick={() => navigate(`/daily?date=${entry.date}`)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left group hover:bg-gray-100 ${
                    entry.mark_color ? MARK_COLORS[entry.mark_color] : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-pepper-red" />
                    <div>
                      <p className="font-medium text-gray-900">{formatDate(entry.date)}</p>
                      <p className="text-sm text-gray-500">
                        Forgalom: {formatCurrency(entry.total_revenue)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-gray-600">
                        KP: {formatCurrency(totalCash)} | Kártya: {formatCurrency(totalCard)}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-pepper-red" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent expenses */}
      <Card title="Legutóbbi kifizetések">
        {stats.recentExpenses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Még nincsenek kifizetések
          </p>
        ) : (
          <div className="space-y-3">
            {stats.recentExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {expense.supplier_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {expense.item_description || 'Nincs leírás'} •{' '}
                    {formatDate(expense.invoice_date)}
                  </p>
                </div>
                <p className="font-semibold text-red-600">
                  -{formatCurrency(expense.amount, expense.currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
