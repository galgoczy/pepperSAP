import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CalendarDays,
  Receipt,
  PartyPopper,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  Trophy,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, Badge, LoadingSpinner } from '../common';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';
import { getPreviousWorkingDay, isWorkingDay } from '../../lib/holidays';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { MiniTrendChart } from '../charts/RevenueTrendChart';

// Animated currency display component
function AnimatedCurrency({ value }) {
  const animatedValue = useAnimatedNumber(value || 0, 1200);
  return formatCurrency(animatedValue);
}

// "Fordított szervízdíj" (reverse service fee) for a month: 20% of the unit's
// GROSS cash-register revenue, reduced by 18.5% (i.e. 81.5% of it) —
// gross * 0.20 * 0.815. Gross = the 5/18/27% VAT buckets summed as-is; the 0%
// bucket is EXCLUDED (typically göngyöleg — only food & drink counts).
// Only Knorr 105 for now.
const RSF_GROSS_SHARE = 0.20;     // 20% of the gross revenue
const RSF_RETAINED_RATE = 0.815;  // reduced by 18.5% -> 81.5% retained
const RSF_UNITS = ['Knorr 105'];
const RSF_MONTH_NAMES = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December',
];

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function shiftYearMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, '0')}` };
}
function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${y}. ${RSF_MONTH_NAMES[m - 1]}`;
}

// Card shown on the admin dashboard next to the "missing data" block.
function ReverseServiceFeeCard() {
  const [ym, setYm] = useState(currentYearMonth());
  const [value, setValue] = useState(null);
  const [loading, setLoading] = useState(true);
  const current = currentYearMonth();
  // Single unit for now; the name is shown at the bottom.
  const unitName = RSF_UNITS[0];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data: unit } = await supabase
          .from('units').select('id').eq('name', unitName).maybeSingle();
        if (!unit?.id) { if (!cancelled) setValue(0); return; }
        const { start, end } = monthRange(ym);
        const { data } = await supabase
          .from('daily_revenue')
          .select('cash_register_revenue(vat_5_percent, vat_18_percent, vat_27_percent)')
          .eq('unit_id', unit.id)
          .gte('date', start)
          .lte('date', end);
        let gross = 0;
        (data || []).forEach((dr) => (dr.cash_register_revenue || []).forEach((cr) => {
          // 0% (göngyöleg) intentionally excluded — only food & drink counts.
          gross += (parseFloat(cr.vat_5_percent) || 0)
            + (parseFloat(cr.vat_18_percent) || 0)
            + (parseFloat(cr.vat_27_percent) || 0);
        }));
        if (!cancelled) setValue(gross * RSF_GROSS_SHARE * RSF_RETAINED_RATE);
      } catch (e) {
        console.error('Error loading reverse service fee:', e);
        if (!cancelled) setValue(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [ym, unitName]);

  const atCurrent = ym >= current;

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-indigo-700 font-medium">Fordított szervízdíj a hónapban</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setYm((p) => shiftYearMonth(p, -1))}
            title="Előző hónap"
            className="p-1 rounded text-indigo-500 hover:bg-indigo-200/60"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setYm(current)}
            disabled={ym === current}
            title="Aktuális hónap"
            className="p-1.5 rounded text-indigo-500 hover:bg-indigo-200/60 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <span className="block h-2 w-2 rounded-full bg-current" />
          </button>
          <button
            type="button"
            onClick={() => setYm((p) => shiftYearMonth(p, 1))}
            disabled={atCurrent}
            title="Következő hónap"
            className="p-1 rounded text-indigo-500 hover:bg-indigo-200/60 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-indigo-600 mt-1">{monthLabel(ym)}</p>
      <p className="text-2xl font-bold text-indigo-900 mt-1 break-words">
        {loading ? '…' : <AnimatedCurrency value={value} />}
      </p>
      <p className="text-xs text-indigo-400 mt-1">({unitName})</p>
    </Card>
  );
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
  const [viewMode, setViewMode] = useState('daily'); // daily, weekly, monthly
  const [stats, setStats] = useState({
    previousDayRevenue: 0,
    previousDayDate: null,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    previousDayDiscrepancies: [],
    missingData: [],
    houseCash: [],
    recentExpenses: [],
    recentEntries: [],
    last5DaysRevenue: [],
    weeklyChartData: [],
    monthlyChartData: [],
    // Sales pipeline stats
    openDeals: 0,
    weightedForecast: 0,
    wonDeals: 0,
    dealsClosingSoon: [],
    topDeals: [],
    // Budget comparison
    monthlyBudget: 0,
    budgetVariance: 0,
    budgetPercentage: 0,
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const now = new Date();

        // Get previous working day (skips weekends and Hungarian holidays)
        const previousWorkingDayStr = getPreviousWorkingDay(now);
        const previousWorkingDay = new Date(previousWorkingDayStr);

        // Get first day of current month
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

        // Fetch previous working day's revenue for all units (skips weekends/holidays)
        const { data: previousDayRevenues } = await supabase
          .from('daily_revenue')
          .select('*, units(name)')
          .eq('date', previousWorkingDayStr);

        // Calculate total previous day revenue
        const previousDayTotal = (previousDayRevenues || []).reduce(
          (sum, r) => sum + (parseFloat(r.total_revenue) || 0),
          0
        );

        // Fetch weekly revenue (from Monday to previous working day)
        const { data: weeklyRevenues } = await supabase
          .from('daily_revenue')
          .select('total_revenue')
          .gte('date', mondayStr)
          .lte('date', previousWorkingDayStr);

        // Calculate weekly total
        const weeklyTotal = (weeklyRevenues || []).reduce(
          (sum, r) => sum + (parseFloat(r.total_revenue) || 0),
          0
        );

        // Fetch monthly revenue (up to previous working day)
        const { data: monthlyRevenues } = await supabase
          .from('daily_revenue')
          .select('total_revenue')
          .gte('date', firstDayOfMonth)
          .lte('date', previousWorkingDayStr);

        // Calculate monthly total
        const monthlyTotal = (monthlyRevenues || []).reduce(
          (sum, r) => sum + (parseFloat(r.total_revenue) || 0),
          0
        );

        // Check for discrepancies from previous working day
        const { data: prevDayDiscrepancies } = await supabase
          .from('daily_revenue')
          .select('*, units(name)')
          .eq('date', previousWorkingDayStr)
          .gt('discrepancy_amount', 0);

        // Find units missing previous working day's data
        const { data: prevDayData } = await supabase
          .from('daily_revenue')
          .select('unit_id')
          .eq('date', previousWorkingDayStr);

        const unitsWithPrevDayData = new Set((prevDayData || []).map((r) => r.unit_id));
        const restaurantUnits = (units || []).filter((u) => u.type === 'restaurant');
        const missingUnits = restaurantUnits.filter((u) => !unitsWithPrevDayData.has(u.id));

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

        // Fetch last 20 daily entries across all units with cash register data
        const { data: recentEntries } = await supabase
          .from('daily_revenue')
          .select('*, units(name), cash_register_revenue(cash_payment, card_payment)')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20);

        // Fetch last 5 days revenue for chart (includes weekends)
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const last5Days = [];
        for (let i = 4; i >= 0; i--) {
          const d = new Date(yesterday);
          d.setDate(yesterday.getDate() - i);
          last5Days.push(d.toISOString().split('T')[0]);
        }

        const { data: last5DaysData } = await supabase
          .from('daily_revenue')
          .select('date, total_revenue')
          .in('date', last5Days);

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

        // Weekly chart data: Monday shows previous week, otherwise current week
        // Includes all days (weekends too) for the chart
        const isMonday = now.getDay() === 1;
        let weekStart, weekEnd;
        if (isMonday) {
          // Show previous week (Mon-Sun)
          const prevMonday = new Date(now);
          prevMonday.setDate(now.getDate() - 7);
          weekStart = prevMonday;
          weekEnd = new Date(prevMonday);
          weekEnd.setDate(prevMonday.getDate() + 6); // Sunday
        } else {
          // Show current week (from Monday to yesterday)
          weekStart = monday;
          weekEnd = yesterday;
        }

        const weekDays = [];
        const currentWeekDate = new Date(weekStart);
        while (currentWeekDate <= weekEnd) {
          weekDays.push(currentWeekDate.toISOString().split('T')[0]);
          currentWeekDate.setDate(currentWeekDate.getDate() + 1);
        }

        const { data: weeklyChartRaw } = weekDays.length > 0 ? await supabase
          .from('daily_revenue')
          .select('date, total_revenue')
          .gte('date', weekDays[0])
          .lte('date', weekDays[weekDays.length - 1]) : { data: [] };

        const weeklyRevenueByDate = {};
        (weeklyChartRaw || []).forEach((r) => {
          weeklyRevenueByDate[r.date] = (weeklyRevenueByDate[r.date] || 0) + (parseFloat(r.total_revenue) || 0);
        });

        const weeklyChartData = weekDays.map((date) => {
          const d = new Date(date);
          const dayName = d.toLocaleDateString('hu-HU', { weekday: 'short' });
          return {
            label: `${dayName} ${d.getDate()}.`,
            value: weeklyRevenueByDate[date] || 0,
            date,
          };
        });

        // Monthly chart data: current month, all days (including weekends)
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const monthDays = [];
        for (let i = 1; i <= Math.min(yesterday.getDate(), daysInMonth); i++) {
          const d = new Date(now.getFullYear(), now.getMonth(), i);
          monthDays.push(d.toISOString().split('T')[0]);
        }

        const firstDayOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const { data: monthlyChartRaw } = monthDays.length > 0 ? await supabase
          .from('daily_revenue')
          .select('date, total_revenue')
          .gte('date', firstDayOfMonthStr)
          .lte('date', yesterdayStr) : { data: [] };

        const monthlyRevenueByDate = {};
        (monthlyChartRaw || []).forEach((r) => {
          monthlyRevenueByDate[r.date] = (monthlyRevenueByDate[r.date] || 0) + (parseFloat(r.total_revenue) || 0);
        });

        const monthlyChartData = monthDays.map((date) => {
          const d = new Date(date);
          return {
            label: `${d.getDate()}.`,
            value: monthlyRevenueByDate[date] || 0,
            date,
          };
        });

        // Fetch deals for sales pipeline widget
        let dealsData = [];
        try {
          const { data, error } = await supabase
            .from('deals')
            .select(`
              *,
              company:companies!deals_company_id_fkey(id, name)
            `)
            .order('expected_value', { ascending: false });
          if (!error) {
            dealsData = data || [];
          }
        } catch {
          // deals table might not exist yet
        }

        // Calculate deals stats
        const openDealsData = dealsData.filter(d => !['won', 'lost'].includes(d.status));
        const wonDealsData = dealsData.filter(d => d.status === 'won');
        const openDealsCount = openDealsData.length;
        const weightedForecast = openDealsData.reduce((sum, d) => {
          const value = parseFloat(d.expected_value) || 0;
          const prob = (d.probability || 0) / 100;
          return sum + (value * prob);
        }, 0);
        const wonDealsValue = wonDealsData.reduce((sum, d) => sum + (parseFloat(d.expected_value) || 0), 0);

        // Deals closing within 7 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const closingSoon = openDealsData.filter(d => {
          if (!d.expected_close_date) return false;
          const closeDate = new Date(d.expected_close_date);
          const diffTime = closeDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 7;
        });

        // Top 3 deals by value
        const topDeals = openDealsData.slice(0, 3);

        // Fetch budget for current month
        let monthlyBudget = 0;
        try {
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();
          const { data: budgetData } = await supabase
            .from('budget_entries')
            .select('planned_revenue')
            .eq('month', currentMonth)
            .eq('year', currentYear);

          monthlyBudget = (budgetData || []).reduce(
            (sum, b) => sum + (parseFloat(b.planned_revenue) || 0),
            0
          );
        } catch {
          // budget_entries table might not exist
        }

        // Calculate variance
        const budgetVariance = monthlyTotal - monthlyBudget;
        const budgetPercentage = monthlyBudget > 0 ? (monthlyTotal / monthlyBudget) * 100 : 0;

        setStats({
          previousDayRevenue: previousDayTotal,
          previousDayDate: previousWorkingDayStr,
          weeklyRevenue: weeklyTotal,
          monthlyRevenue: monthlyTotal,
          previousDayDiscrepancies: prevDayDiscrepancies || [],
          missingData: missingUnits,
          houseCash: houseCashData,
          recentExpenses: recentExpenses || [],
          recentEntries: recentEntries || [],
          units: units || [],
          previousDayRevenues: previousDayRevenues || [],
          last5DaysRevenue,
          weeklyChartData,
          monthlyChartData,
          // Sales pipeline
          openDeals: openDealsCount,
          weightedForecast,
          wonDeals: wonDealsValue,
          dealsClosingSoon: closingSoon,
          topDeals,
          // Budget
          monthlyBudget,
          budgetVariance,
          budgetPercentage,
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

  // Get display value based on view mode
  const getDisplayRevenue = () => {
    switch (viewMode) {
      case 'weekly':
        return stats.weeklyRevenue;
      case 'monthly':
        return stats.monthlyRevenue;
      default:
        return stats.previousDayRevenue;
    }
  };

  const getDisplayLabel = () => {
    switch (viewMode) {
      case 'weekly':
        return 'Heti forgalom';
      case 'monthly':
        return 'Havi forgalom';
      default:
        return 'Előző napi forgalom';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin vezérlőpult</h1>
          <p className="text-gray-500 mt-1 hidden sm:block">
            Üdvözöljük! Itt láthatja az összes egység összesített adatait.
          </p>
        </div>

        {/* View mode toggle - visible on mobile */}
        <div className="flex bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'daily'
                ? 'bg-white text-pepper-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Napi
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'weekly'
                ? 'bg-white text-pepper-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Heti
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'monthly'
                ? 'bg-white text-pepper-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Havi
          </button>
        </div>
      </div>

      {/* Mobile-first Hero KPI Card */}
      <div className="md:hidden space-y-3">
        <Card className="bg-gradient-to-br from-pepper-red to-red-700 text-white">
          <div className="text-center py-4">
            <p className="text-white/80 text-sm font-medium mb-1">{getDisplayLabel()}</p>
            <p className="text-4xl font-bold mb-2">
              <AnimatedCurrency value={getDisplayRevenue()} />
            </p>
            {viewMode === 'monthly' && stats.monthlyBudget > 0 && (
              <div className="flex items-center justify-center gap-2 mt-2">
                {stats.budgetVariance >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-300" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-300" />
                )}
                <span className={`text-sm ${stats.budgetVariance >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {stats.budgetPercentage.toFixed(1)}% a tervhez képest
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Mobile compact secondary stats */}
        <div className="grid grid-cols-2 gap-2">
          {viewMode !== 'weekly' && (
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600 mb-1">Heti</p>
              <p className="text-sm font-bold text-blue-800">{formatCurrency(stats.weeklyRevenue)}</p>
            </div>
          )}
          {viewMode !== 'monthly' && (
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-600 mb-1">Havi</p>
              <p className="text-sm font-bold text-purple-800">{formatCurrency(stats.monthlyRevenue)}</p>
            </div>
          )}
          {viewMode !== 'daily' && (
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600 mb-1">Tegnap</p>
              <p className="text-sm font-bold text-green-800">{formatCurrency(stats.previousDayRevenue)}</p>
            </div>
          )}
          {(stats.previousDayDiscrepancies.length > 0 || stats.missingData.length > 0) && (
            <div className={`rounded-lg p-3 text-center ${
              stats.previousDayDiscrepancies.length > 0 ? 'bg-red-50' : 'bg-yellow-50'
            }`}>
              <p className={`text-xs mb-1 ${
                stats.previousDayDiscrepancies.length > 0 ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {stats.previousDayDiscrepancies.length > 0 ? 'Eltérések' : 'Hiányzó'}
              </p>
              <p className={`text-sm font-bold ${
                stats.previousDayDiscrepancies.length > 0 ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {stats.previousDayDiscrepancies.length > 0
                  ? `${stats.previousDayDiscrepancies.length} db`
                  : `${stats.missingData.length} egység`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Budget vs Actual Card - shown in monthly view */}
      {viewMode === 'monthly' && stats.monthlyBudget > 0 && (
        <div className="hidden md:block">
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Terv vs Tény - {new Date().toLocaleDateString('hu-HU', { month: 'long' })}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-xs text-gray-500">Tény</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
                  </div>
                  <div className="text-2xl text-gray-300">/</div>
                  <div>
                    <p className="text-xs text-gray-500">Terv</p>
                    <p className="text-xl font-bold text-gray-600">{formatCurrency(stats.monthlyBudget)}</p>
                  </div>
                </div>
              </div>
              <div className={`text-right p-4 rounded-xl ${stats.budgetVariance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="flex items-center gap-1">
                  {stats.budgetVariance >= 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`text-2xl font-bold ${stats.budgetVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.budgetPercentage.toFixed(0)}%
                  </span>
                </div>
                <p className={`text-sm ${stats.budgetVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.budgetVariance >= 0 ? '+' : ''}{formatCurrency(stats.budgetVariance)}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    stats.budgetPercentage >= 100 ? 'bg-green-500' : stats.budgetPercentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(stats.budgetPercentage, 100)}%` }}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* KPI Cards - hidden on mobile when hero is shown */}
      <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-200 rounded-lg shrink-0">
              <TrendingUp className="h-6 w-6 text-green-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-green-600 font-medium">Előző napi forgalom</p>
              <p className="text-base font-bold text-green-800 break-words">
                <AnimatedCurrency value={stats.previousDayRevenue} />
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-200 rounded-lg shrink-0">
              <CalendarDays className="h-6 w-6 text-blue-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-blue-600 font-medium">Heti forgalom</p>
              <p className="text-base font-bold text-blue-800 break-words">
                <AnimatedCurrency value={stats.weeklyRevenue} />
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-200 rounded-lg shrink-0">
              <CalendarDays className="h-6 w-6 text-purple-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-purple-600 font-medium">Havi forgalom</p>
              <p className="text-base font-bold text-purple-800 break-words">
                <AnimatedCurrency value={stats.monthlyRevenue} />
              </p>
            </div>
          </div>
        </Card>

        {stats.previousDayDiscrepancies.length > 0 && (
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-200 rounded-lg shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-red-600 font-medium">Előző napi eltérések</p>
                <p className="text-base font-bold text-red-800">
                  {stats.previousDayDiscrepancies.length}
                </p>
              </div>
            </div>
          </Card>
        )}

        {stats.missingData.length > 0 && (
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-200 rounded-lg shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-yellow-600 font-medium">Hiányzó adatok</p>
                <p className="text-base font-bold text-yellow-800 break-words">
                  {stats.missingData.length} egység
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Revenue trend chart - changes based on viewMode */}
      {(() => {
        const chartData = viewMode === 'monthly'
          ? stats.monthlyChartData
          : viewMode === 'weekly'
            ? stats.weeklyChartData
            : stats.last5DaysRevenue;
        const chartTitle = viewMode === 'monthly'
          ? `${new Date().toLocaleDateString('hu-HU', { month: 'long' })} napi forgalma`
          : viewMode === 'weekly'
            ? (new Date().getDay() === 1 ? 'Előző hét forgalma' : 'Aktuális hét forgalma')
            : 'Elmúlt 5 nap forgalma';

        return chartData?.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{chartTitle}</h3>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
            <MiniTrendChart data={chartData} height={100} />
          </Card>
        );
      })()}

      {/* Warnings */}
      {/* Reverse service fee (new) next to the missing-data block; on mobile the
          fee card stacks above the missing-data block. */}
      <div className="grid gap-6 md:grid-cols-2 items-start">
        <ReverseServiceFeeCard />
        {stats.missingData.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Hiányzó előző napi adatok</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Az alábbi egységeknél még nem rögzítettek előző napi forgalmi adatokat:
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
      </div>

      {/* Unit revenues */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Yesterday's revenue by unit */}
        <Card title="Előző napi forgalom egységenként">
          {stats.previousDayRevenues?.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Még nincsenek előző napi adatok
            </p>
          ) : (
            <div className="space-y-3">
              {stats.previousDayRevenues?.map((revenue) => (
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

      {/* Sales Pipeline Widget */}
      {(stats.openDeals > 0 || stats.topDeals?.length > 0) && (
        <Card title="Sales Pipeline">
          <div className="space-y-4">
            {/* Pipeline KPIs */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">Nyitott</span>
                </div>
                <p className="text-xl font-bold text-blue-800">{stats.openDeals}</p>
              </div>
              <div className="text-center p-3 bg-pepper-red/5 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-pepper-red" />
                  <span className="text-sm text-pepper-red font-medium">Forecast</span>
                </div>
                <p className="text-xl font-bold text-pepper-red">
                  {formatCurrency(stats.weightedForecast)}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Trophy className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Nyert</span>
                </div>
                <p className="text-xl font-bold text-green-800">
                  {formatCurrency(stats.wonDeals)}
                </p>
              </div>
            </div>

            {/* Deals closing soon alert */}
            {stats.dealsClosingSoon?.length > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    {stats.dealsClosingSoon.length} deal lejár 7 napon belül
                  </span>
                </div>
              </div>
            )}

            {/* Top deals */}
            {stats.topDeals?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600">Top dealek</h4>
                {stats.topDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {deal.name}
                      </p>
                      <p className="text-xs text-gray-500">{deal.company?.name}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="font-semibold text-pepper-red text-sm">
                        {formatCurrency(deal.expected_value)}
                      </p>
                      <p className="text-xs text-gray-500">{deal.probability}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Link to deals page */}
            <Link
              to="/deals"
              className="flex items-center justify-center gap-2 text-sm text-pepper-red hover:text-pepper-red/80 font-medium pt-2 border-t"
            >
              Összes deal megtekintése
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      )}

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
