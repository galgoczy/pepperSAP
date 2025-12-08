import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Wallet,
  CalendarDays,
  Receipt,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, LoadingSpinner } from '../common';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getToday } from '../../lib/utils';

export default function UnitDashboard() {
  const { unitId, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: null,
    todayHouseCash: null,
    weeklyRevenue: 0,
    recentExpenses: [],
  });

  useEffect(() => {
    async function fetchDashboardData() {
      if (!unitId) return;

      try {
        const today = getToday();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];

        // Fetch today's revenue
        const { data: todayRevenue } = await supabase
          .from('daily_revenue')
          .select('*')
          .eq('unit_id', unitId)
          .eq('date', today)
          .single();

        // Fetch today's house cash
        const { data: todayHouseCash } = await supabase
          .from('house_cash')
          .select('*')
          .eq('unit_id', unitId)
          .eq('date', today)
          .single();

        // Fetch weekly revenue total
        const { data: weeklyRevenues } = await supabase
          .from('daily_revenue')
          .select('total_revenue')
          .eq('unit_id', unitId)
          .gte('date', weekAgoStr)
          .lte('date', today);

        const weeklyTotal = (weeklyRevenues || []).reduce(
          (sum, r) => sum + (parseFloat(r.total_revenue) || 0),
          0
        );

        // Fetch recent expenses
        const { data: recentExpenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('unit_id', unitId)
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          todayRevenue,
          todayHouseCash,
          weeklyRevenue: weeklyTotal,
          recentExpenses: recentExpenses || [],
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
            <div className="p-3 bg-green-200 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Mai forgalom</p>
              <p className="text-2xl font-bold text-green-800">
                {stats.todayRevenue
                  ? formatCurrency(stats.todayRevenue.total_revenue)
                  : 'Nincs adat'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-200 rounded-lg">
              <Wallet className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Házipénztár (hivatalos)</p>
              <p className="text-2xl font-bold text-blue-800">
                {stats.todayHouseCash
                  ? formatCurrency(stats.todayHouseCash.official_total)
                  : 'Nincs adat'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-200 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Heti forgalom</p>
              <p className="text-2xl font-bold text-purple-800">
                {formatCurrency(stats.weeklyRevenue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Today's data status */}
      {!stats.todayRevenue && (
        <Card className="border-yellow-200 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">Mai adat hiányzik</h3>
                <p className="text-sm text-yellow-700">
                  Még nem rögzített mai forgalmi adatokat.
                </p>
              </div>
            </div>
            <Link to="/daily">
              <Button size="sm">Rögzítés</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Today's details */}
      {stats.todayRevenue && (
        <Card title="Mai adatok részletesen">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Pénztárgép forgalom</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">0% ÁFA</span>
                  <span>{formatCurrency(stats.todayRevenue.vat_0_percent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">5% ÁFA</span>
                  <span>{formatCurrency(stats.todayRevenue.vat_5_percent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">18% ÁFA</span>
                  <span>{formatCurrency(stats.todayRevenue.vat_18_percent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">27% ÁFA</span>
                  <span>{formatCurrency(stats.todayRevenue.vat_27_percent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Borravaló</span>
                  <span>{formatCurrency(stats.todayRevenue.tips)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Fizetési módok</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Készpénz</span>
                  <span>{formatCurrency(stats.todayRevenue.cash_payment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bankkártya</span>
                  <span>{formatCurrency(stats.todayRevenue.card_payment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">SZÉP kártya</span>
                  <span>{formatCurrency(stats.todayRevenue.szep_card_payment)}</span>
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
