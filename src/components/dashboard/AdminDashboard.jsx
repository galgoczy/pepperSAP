import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Building2,
  CalendarDays,
  Receipt,
  PartyPopper,
  ChevronRight,
} from 'lucide-react';
import { Card, Badge, LoadingSpinner } from '../common';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getToday } from '../../lib/utils';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    monthlyRevenue: 0,
    yesterdayDiscrepancies: [],
    missingData: [],
    houseCash: [],
    recentExpenses: [],
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const today = getToday();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Get first day of current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString().split('T')[0];

        // Fetch all units
        const { data: units } = await supabase
          .from('units')
          .select('*')
          .eq('is_active', true);

        // Fetch today's revenue for all units
        const { data: todayRevenues } = await supabase
          .from('daily_revenue')
          .select('*, units(name)')
          .eq('date', today);

        // Calculate total today revenue
        const todayTotal = (todayRevenues || []).reduce(
          (sum, r) => sum + (parseFloat(r.total_revenue) || 0),
          0
        );

        // Fetch monthly revenue
        const { data: monthlyRevenues } = await supabase
          .from('daily_revenue')
          .select('total_revenue')
          .gte('date', firstDayOfMonth)
          .lte('date', today);

        // Calculate monthly total
        const monthlyTotal = (monthlyRevenues || []).reduce(
          (sum, r) => sum + (parseFloat(r.total_revenue) || 0),
          0
        );

        // Check for discrepancies from yesterday
        const { data: yesterdayRevenues } = await supabase
          .from('daily_revenue')
          .select('*, units(name)')
          .eq('date', yesterdayStr)
          .gt('discrepancy_amount', 0);

        // Find units missing today's data
        const unitsWithData = new Set((todayRevenues || []).map((r) => r.unit_id));
        const restaurantUnits = (units || []).filter((u) => u.type === 'restaurant');
        const missingUnits = restaurantUnits.filter((u) => !unitsWithData.has(u.id));

        // Fetch house cash for all units
        const { data: houseCashData } = await supabase
          .from('house_cash')
          .select('*, units(name)')
          .eq('date', today);

        // Fetch recent expenses
        const { data: recentExpenses } = await supabase
          .from('expenses')
          .select('*, units(name)')
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          todayRevenue: todayTotal,
          monthlyRevenue: monthlyTotal,
          yesterdayDiscrepancies: yesterdayRevenues || [],
          missingData: missingUnits,
          houseCash: houseCashData || [],
          recentExpenses: recentExpenses || [],
          units: units || [],
          todayRevenues: todayRevenues || [],
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin vezérlőpult</h1>
        <p className="text-gray-500 mt-1">
          Üdvözöljük! Itt láthatja az összes egység összesített adatait.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-200 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Mai forgalom</p>
              <p className="text-2xl font-bold text-green-800">
                {formatCurrency(stats.todayRevenue)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-200 rounded-lg">
              <CalendarDays className="h-6 w-6 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Havi forgalom</p>
              <p className="text-2xl font-bold text-purple-800">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-200 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Aktív egységek</p>
              <p className="text-2xl font-bold text-blue-800">
                {stats.units?.length || 0}
              </p>
            </div>
          </div>
        </Card>

        {stats.yesterdayDiscrepancies.length > 0 && (
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-200 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">Tegnapi eltérések</p>
                <p className="text-2xl font-bold text-red-800">
                  {stats.yesterdayDiscrepancies.length}
                </p>
              </div>
            </div>
          </Card>
        )}

        {stats.missingData.length > 0 && (
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-200 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-700" />
              </div>
              <div>
                <p className="text-sm text-yellow-600 font-medium">Hiányzó adatok</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {stats.missingData.length} egység
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Warnings */}
      {stats.missingData.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Hiányzó mai adatok</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Az alábbi egységeknél még nem rögzítettek mai forgalmi adatokat:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {stats.missingData.map((unit) => (
                  <Badge key={unit.id} variant="warning">
                    {unit.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Unit revenues */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's revenue by unit */}
        <Card title="Mai forgalom egységenként">
          {stats.todayRevenues?.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Még nincsenek mai adatok
            </p>
          ) : (
            <div className="space-y-3">
              {stats.todayRevenues?.map((revenue) => (
                <div
                  key={revenue.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {revenue.units?.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(revenue.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(revenue.total_revenue)}
                    </p>
                    {revenue.discrepancy_amount > 0 && (
                      <Badge variant="danger" size="sm">
                        Eltérés: {formatCurrency(revenue.discrepancy_amount)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* House cash by unit */}
        <Card title="Házipénztár állások">
          {stats.houseCash?.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Még nincsenek házipénztár adatok
            </p>
          ) : (
            <div className="space-y-3">
              {stats.houseCash?.map((cash) => (
                <div
                  key={cash.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {cash.units?.name}
                    </p>
                    <p className="text-sm text-gray-500">Hivatalos zseb</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(cash.official_total || 0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/daily">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pepper-red bg-opacity-10 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-pepper-red" />
                </div>
                <span className="font-medium text-gray-900">Napi adatok</span>
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
                <span className="font-medium text-gray-900">Kifizetések</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Card>
        </Link>

        <Link to="/events">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pepper-red bg-opacity-10 rounded-lg">
                  <PartyPopper className="h-5 w-5 text-pepper-red" />
                </div>
                <span className="font-medium text-gray-900">Rendezvények</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent expenses */}
      <Card title="Legutóbbi kifizetések">
        {stats.recentExpenses?.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Még nincsenek kifizetések
          </p>
        ) : (
          <div className="space-y-3">
            {stats.recentExpenses?.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {expense.supplier_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {expense.units?.name} • {formatDate(expense.invoice_date)}
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
