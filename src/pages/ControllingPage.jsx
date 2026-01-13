import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  Target,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from '../components/common';
import { supabase } from '../lib/supabase';
import { formatCurrency, cn } from '../lib/utils';
import toast from 'react-hot-toast';

// Variance thresholds for coloring
const VARIANCE_THRESHOLDS = {
  good: 5,      // Within 5% = green
  warning: 10,  // Within 10% = yellow
  bad: 10,      // Over 10% = red
};

export default function ControllingPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [actuals, setActuals] = useState({});
  const [units, setUnits] = useState([]);

  // Current period
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [year, month] = currentMonth.split('-').map(Number);
      const startDate = `${currentMonth}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

      // Fetch budgets for current month
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budget_targets')
        .select(`
          *,
          unit:units!budget_targets_unit_id_fkey(id, name, type)
        `)
        .eq('year_month', currentMonth);
      if (budgetsError) throw budgetsError;

      // Fetch units
      const { data: unitsData } = await supabase
        .from('units')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name');

      // Fetch actual revenue for the month (aggregate daily_revenue)
      const { data: revenueData } = await supabase
        .from('daily_revenue')
        .select('unit_id, total_revenue')
        .gte('date', startDate)
        .lte('date', endDate);

      // Fetch actual expenses for the month
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('unit_id, amount')
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate);

      // Aggregate actuals by unit
      const actualsByUnit = {};

      // Initialize units
      (unitsData || []).forEach(u => {
        actualsByUnit[u.id] = { revenue: 0, cost: 0, margin: 0 };
      });

      // Sum revenues
      (revenueData || []).forEach(r => {
        if (actualsByUnit[r.unit_id]) {
          actualsByUnit[r.unit_id].revenue += parseFloat(r.total_revenue) || 0;
        }
      });

      // Sum expenses
      (expenseData || []).forEach(e => {
        if (actualsByUnit[e.unit_id]) {
          actualsByUnit[e.unit_id].cost += parseFloat(e.amount) || 0;
        }
      });

      // Calculate margins
      Object.keys(actualsByUnit).forEach(unitId => {
        actualsByUnit[unitId].margin = actualsByUnit[unitId].revenue - actualsByUnit[unitId].cost;
      });

      setBudgets(budgetsData || []);
      setUnits(unitsData || []);
      setActuals(actualsByUnit);
    } catch (error) {
      console.error('Error fetching controlling data:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigate months
  const navigateMonth = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + direction;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  // Format month for display
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const months = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június',
                    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
    return `${year}. ${months[parseInt(month) - 1]}`;
  };

  // Calculate variance
  const calculateVariance = (actual, planned) => {
    if (!planned || planned === 0) return { amount: 0, percent: 0 };
    const amount = actual - planned;
    const percent = (amount / Math.abs(planned)) * 100;
    return { amount, percent };
  };

  // Get variance color class
  const getVarianceColor = (variance, isPositiveGood = true) => {
    const absPercent = Math.abs(variance.percent);
    const isGood = isPositiveGood ? variance.amount >= 0 : variance.amount <= 0;

    if (absPercent <= VARIANCE_THRESHOLDS.good && isGood) {
      return 'text-green-600';
    } else if (absPercent <= VARIANCE_THRESHOLDS.warning) {
      return 'text-yellow-600';
    } else {
      return isGood ? 'text-green-600' : 'text-red-600';
    }
  };

  // Get variance badge color
  const getVarianceBadgeColor = (variance, isPositiveGood = true) => {
    const absPercent = Math.abs(variance.percent);
    const isGood = isPositiveGood ? variance.amount >= 0 : variance.amount <= 0;

    if (absPercent <= VARIANCE_THRESHOLDS.good && isGood) {
      return 'bg-green-100 text-green-700';
    } else if (absPercent <= VARIANCE_THRESHOLDS.warning) {
      return 'bg-yellow-100 text-yellow-700';
    } else {
      return isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
    }
  };

  // Aggregate totals
  const totals = useMemo(() => {
    const plannedRevenue = budgets.filter(b => b.unit_id).reduce((sum, b) => sum + (parseFloat(b.planned_revenue) || 0), 0);
    const plannedCost = budgets.filter(b => b.unit_id).reduce((sum, b) => sum + (parseFloat(b.planned_cost) || 0), 0);
    const plannedMargin = plannedRevenue - plannedCost;

    const actualRevenue = Object.values(actuals).reduce((sum, a) => sum + a.revenue, 0);
    const actualCost = Object.values(actuals).reduce((sum, a) => sum + a.cost, 0);
    const actualMargin = actualRevenue - actualCost;

    return {
      planned: { revenue: plannedRevenue, cost: plannedCost, margin: plannedMargin },
      actual: { revenue: actualRevenue, cost: actualCost, margin: actualMargin },
      variance: {
        revenue: calculateVariance(actualRevenue, plannedRevenue),
        cost: calculateVariance(actualCost, plannedCost),
        margin: calculateVariance(actualMargin, plannedMargin),
      },
    };
  }, [budgets, actuals]);

  // Per-unit comparison data
  const unitComparison = useMemo(() => {
    return units.map(unit => {
      const budget = budgets.find(b => b.unit_id === unit.id);
      const actual = actuals[unit.id] || { revenue: 0, cost: 0, margin: 0 };

      const planned = {
        revenue: parseFloat(budget?.planned_revenue) || 0,
        cost: parseFloat(budget?.planned_cost) || 0,
        margin: parseFloat(budget?.planned_margin) || 0,
      };

      return {
        unit,
        planned,
        actual,
        variance: {
          revenue: calculateVariance(actual.revenue, planned.revenue),
          cost: calculateVariance(actual.cost, planned.cost),
          margin: calculateVariance(actual.margin, planned.margin),
        },
        hasBudget: !!budget,
      };
    }).sort((a, b) => Math.abs(b.variance.margin.percent) - Math.abs(a.variance.margin.percent));
  }, [units, budgets, actuals]);

  // Warnings: significant variances
  const warnings = useMemo(() => {
    return unitComparison.filter(uc =>
      uc.hasBudget && Math.abs(uc.variance.margin.percent) > VARIANCE_THRESHOLDS.warning
    );
  }, [unitComparison]);

  // Render variance with icon
  const renderVariance = (variance, isPositiveGood = true) => {
    const Icon = variance.amount > 0 ? ArrowUp : variance.amount < 0 ? ArrowDown : Minus;
    const colorClass = getVarianceColor(variance, isPositiveGood);

    return (
      <span className={cn('flex items-center gap-1', colorClass)}>
        <Icon className="h-3 w-3" />
        {formatCurrency(Math.abs(variance.amount))}
        <span className="text-xs">({variance.percent >= 0 ? '+' : ''}{variance.percent.toFixed(1)}%)</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontrolling</h1>
          <p className="text-gray-500 mt-1">Terv–tény elemzés és eltérésvizsgálat</p>
        </div>
        {isAdmin && (
          <Link to="/budget">
            <Button variant="secondary">
              <Target className="h-4 w-4 mr-2" />
              Budget tervezés
            </Button>
          </Link>
        )}
      </div>

      {/* Period selector */}
      <Card>
        <div className="p-4 flex items-center justify-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[200px]">
            <h2 className="text-xl font-bold text-gray-900">{formatMonth(currentMonth)}</h2>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Warning banner */}
      {warnings.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">
                  {warnings.length} egységnél jelentős eltérés (>{VARIANCE_THRESHOLDS.warning}%)
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {warnings.slice(0, 3).map(w => (
                    <span key={w.unit.id} className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded">
                      {w.unit.name}: {w.variance.margin.percent.toFixed(0)}%
                    </span>
                  ))}
                  {warnings.length > 3 && (
                    <span className="text-sm text-red-600">+{warnings.length - 3} további</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <Card>
          <div className="p-8 text-center text-gray-500">Betöltés...</div>
        </Card>
      ) : budgets.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nincs budget adat erre a hónapra</p>
            {isAdmin && (
              <Link to="/budget">
                <Button className="mt-4">
                  <Target className="h-4 w-4 mr-2" />
                  Budget készítése
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Revenue */}
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getVarianceBadgeColor(totals.variance.revenue, true)
                  )}>
                    {totals.variance.revenue.percent >= 0 ? '+' : ''}{totals.variance.revenue.percent.toFixed(1)}%
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-500">Bevétel</h3>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Tény:</span>
                    <span className="font-bold text-green-600">{formatCurrency(totals.actual.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Terv:</span>
                    <span className="text-gray-900">{formatCurrency(totals.planned.revenue)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-sm text-gray-500">Eltérés:</span>
                    {renderVariance(totals.variance.revenue, true)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Cost */}
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getVarianceBadgeColor(totals.variance.cost, false)
                  )}>
                    {totals.variance.cost.percent >= 0 ? '+' : ''}{totals.variance.cost.percent.toFixed(1)}%
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-500">Költség</h3>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Tény:</span>
                    <span className="font-bold text-red-600">{formatCurrency(totals.actual.cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Terv:</span>
                    <span className="text-gray-900">{formatCurrency(totals.planned.cost)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-sm text-gray-500">Eltérés:</span>
                    {renderVariance(totals.variance.cost, false)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Margin */}
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    totals.actual.margin >= 0 ? 'bg-blue-100' : 'bg-red-100'
                  )}>
                    <DollarSign className={cn(
                      'h-5 w-5',
                      totals.actual.margin >= 0 ? 'text-blue-600' : 'text-red-600'
                    )} />
                  </div>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getVarianceBadgeColor(totals.variance.margin, true)
                  )}>
                    {totals.variance.margin.percent >= 0 ? '+' : ''}{totals.variance.margin.percent.toFixed(1)}%
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-500">Fedezet</h3>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Tény:</span>
                    <span className={cn(
                      'font-bold',
                      totals.actual.margin >= 0 ? 'text-blue-600' : 'text-red-600'
                    )}>{formatCurrency(totals.actual.margin)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Terv:</span>
                    <span className="text-gray-900">{formatCurrency(totals.planned.margin)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-sm text-gray-500">Eltérés:</span>
                    {renderVariance(totals.variance.margin, true)}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Unit-level comparison table */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Egységek terv–tény összehasonlítása</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Egység</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Tény bevétel</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Terv bevétel</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Tény költség</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Terv költség</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Tény fedezet</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Terv fedezet</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Eltérés %</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {unitComparison.map(uc => (
                    <tr
                      key={uc.unit.id}
                      className={cn(
                        'hover:bg-gray-50',
                        Math.abs(uc.variance.margin.percent) > VARIANCE_THRESHOLDS.warning && 'bg-red-50'
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{uc.unit.name}</span>
                          {!uc.hasBudget && (
                            <span className="text-xs text-orange-500">(nincs terv)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">
                        {formatCurrency(uc.actual.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">
                        {formatCurrency(uc.planned.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">
                        {formatCurrency(uc.actual.cost)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">
                        {formatCurrency(uc.planned.cost)}
                      </td>
                      <td className={cn(
                        'py-3 px-4 text-right font-bold',
                        uc.actual.margin >= 0 ? 'text-blue-600' : 'text-red-600'
                      )}>
                        {formatCurrency(uc.actual.margin)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">
                        {formatCurrency(uc.planned.margin)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {uc.hasBudget ? (
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
                            getVarianceBadgeColor(uc.variance.margin, true)
                          )}>
                            {uc.variance.margin.amount > 0 ? <ArrowUp className="h-3 w-3" /> :
                             uc.variance.margin.amount < 0 ? <ArrowDown className="h-3 w-3" /> :
                             <Minus className="h-3 w-3" />}
                            {uc.variance.margin.percent >= 0 ? '+' : ''}{uc.variance.margin.percent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td className="py-3 px-4">Összesen</td>
                    <td className="py-3 px-4 text-right text-green-600">{formatCurrency(totals.actual.revenue)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{formatCurrency(totals.planned.revenue)}</td>
                    <td className="py-3 px-4 text-right text-red-600">{formatCurrency(totals.actual.cost)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{formatCurrency(totals.planned.cost)}</td>
                    <td className={cn(
                      'py-3 px-4 text-right',
                      totals.actual.margin >= 0 ? 'text-blue-600' : 'text-red-600'
                    )}>{formatCurrency(totals.actual.margin)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{formatCurrency(totals.planned.margin)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
                        getVarianceBadgeColor(totals.variance.margin, true)
                      )}>
                        {totals.variance.margin.percent >= 0 ? '+' : ''}{totals.variance.margin.percent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Legend */}
          <Card>
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Jelmagyarázat</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-gray-600">Terven belül (±{VARIANCE_THRESHOLDS.good}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-gray-600">Kisebb eltérés (±{VARIANCE_THRESHOLDS.warning}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-gray-600">Jelentős eltérés (&gt;{VARIANCE_THRESHOLDS.bad}%)</span>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
