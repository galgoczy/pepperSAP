import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Building2,
  CalendarDays,
  Receipt,
  PartyPopper,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Card, Badge, LoadingSpinner } from '../common';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getToday } from '../../lib/utils';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { MiniTrendChart } from '../charts/RevenueTrendChart';

// Animated currency display component
function AnimatedCurrency({ value }) {
  const animatedValue = useAnimatedNumber(value || 0, 1200);
  return formatCurrency(animatedValue);
}

// Color options for marking
const MARK_COLORS = {
  red: 'bg-red-100 border-l-4 border-l-red-500',
  yellow: 'bg-yellow-100 border-l-4 border-l-yellow-500',
  green: 'bg-green-100 border-l-4 border-l-green-500',
  blue: 'bg-blue-100 border-l-4 border-l-blue-500',
  purple: 'bg-purple-100 border-l-4 border-l-purple-500',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    yesterdayDiscrepancies: [],
    missingData: [],
    houseCash: [],
    recentExpenses: [],
    recentEntries: [],
    last5DaysRevenue: [],
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

        // Get Monday of current week (for weekly revenue)
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - diffToMonday);
        const mondayStr = monday.toISOString().split('T')[0];

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

        // Fetch weekly revenue (from Monday to today)
        const { data: weeklyRevenues } = await supabase
          .from('daily_revenue')
          .select('total_revenue')
          .gte('date', mondayStr)
          .lte('date', today);

        // Calculate weekly total
        const weeklyTotal = (weeklyRevenues || []).reduce(
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

        // Find units missing YESTERDAY's data (not today's)
        const { data: yesterdayData } = await supabase
          .from('daily_revenue')
          .select('unit_id')
          .eq('date', yesterdayStr);

        const unitsWithYesterdayData = new Set((yesterdayData || []).map((r) => r.unit_id));
        const restaurantUnits = (units || []).filter((u) => u.type === 'restaurant');
        const missingUnits = restaurantUnits.filter((u) => !unitsWithYesterdayData.has(u.id));

        // Fetch LATEST house cash for each unit (not just today's)
        const { data: latestHouseCash } = await supabase
          .from('house_cash')
          .select('*, units(name)')
          .order('date', { ascending: false });

        // Get only the latest entry per unit
        const latestHouseCashByUnit = {};
        (latestHouseCash || []).forEach((hc) => {
          if (!latestHouseCashByUnit[hc.unit_id]) {
            latestHouseCashByUnit[hc.unit_id] = hc;
          }
        });
        const houseCashData = Object.values(latestHouseCashByUnit);

        // Fetch recent expenses
        const { data: recentExpenses } = await supabase
          .from('expenses')
          .select('*, units(name)')
          .order('created_at', { ascending: false })
          .limit(5);

        // Fetch last 20 daily entries across all units
        const { data: recentEntries } = await supabase
          .from('daily_revenue')
          .select('*, units(name)')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20);

        // Fetch last 5 days revenue for chart
        const last5Days = [];
        for (let i = 4; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last5Days.push(d.toISOString().split('T')[0]);
        }

        const { data: last5DaysData } = await supabase
          .from('daily_revenue')
          .select('date, total_revenue')
          .gte('date', last5Days[0])
          .lte('date', last5Days[4]);

        // Aggregate by date
        const revenueByDate = {};
        (last5DaysData || []).forEach((r) => {
          revenueByDate[r.date] = (revenueByDate[r.date] || 0) + (parseFloat(r.total_revenue) || 0);
        });

        const last5DaysRevenue = last5Days.map((date) => {
          const d = new Date(date);
          const dayName = d.toLocaleDateString('hu-HU', { weekday: 'short' });
          return {
            label: `${dayName} ${d.getDate()}.`,
            value: revenueByDate[date] || 0,
            date,
          };
        });

        setStats({
          todayRevenue: todayTotal,
          weeklyRevenue: weeklyTotal,
          monthlyRevenue: monthlyTotal,
          yesterdayDiscrepancies: yesterdayRevenues || [],
          missingData: missingUnits,
          houseCash: houseCashData,
          recentExpenses: recentExpenses || [],
          recentEntries: recentEntries || [],
          units: units || [],
          todayRevenues: todayRevenues || [],
          last5DaysRevenue,
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-200 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Mai forgalom</p>
              <p className="text-2xl font-bold text-green-800">
                <AnimatedCurrency value={stats.todayRevenue} />
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-200 rounded-lg">
              <CalendarDays className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Heti forgalom</p>
              <p className="text-2xl font-bold text-blue-800">
                <AnimatedCurrency value={stats.weeklyRevenue} />
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
                <AnimatedCurrency value={stats.monthlyRevenue} />
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-200 rounded-lg">
              <Building2 className="h-6 w-6 text-gray-700" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Aktív egységek</p>
              <p className="text-2xl font-bold text-gray-800">
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

      {/* 5-day revenue trend chart */}
      {stats.last5DaysRevenue?.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Elmúlt 5 nap forgalma</h3>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <MiniTrendChart data={stats.last5DaysRevenue} height={100} />
        </Card>
      )}

      {/* Warnings */}
      {stats.missingData.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Hiányzó tegnapi adatok</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Az alábbi egységeknél még nem rögzítettek tegnapi forgalmi adatokat:
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
                    <p className="text-sm text-gray-500">Pénztár zseb</p>
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

      {/* Recent entries - last 20 days across all units */}
      <Card title="Legutóbbi 20 rögzítés">
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
            {stats.recentEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => navigate(`/daily?date=${entry.date}&unit=${entry.unit_id}`)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left group hover:bg-gray-100 ${
                  entry.mark_color ? MARK_COLORS[entry.mark_color] : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-pepper-red" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {entry.units?.name} - {formatDate(entry.date)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Forgalom: {formatCurrency(entry.total_revenue)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-gray-600">
                      KP: {formatCurrency(entry.cash_payment)} | Kártya: {formatCurrency(entry.card_payment)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-pepper-red" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

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
