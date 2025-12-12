import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, LoadingSpinner, Badge } from '../common';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DayOverDayChart, RevenueTrendChart } from '../charts/RevenueTrendChart';

// Feature flag for SZÉP card
const SHOW_SZEP_FIELDS = false;

// Color options for marking
const MARK_COLORS = {
  red: 'bg-red-50 border-l-4 border-l-red-500',
  yellow: 'bg-yellow-50 border-l-4 border-l-yellow-500',
  green: 'bg-green-50 border-l-4 border-l-green-500',
  blue: 'bg-blue-50 border-l-4 border-l-blue-500',
  purple: 'bg-purple-50 border-l-4 border-l-purple-500',
};

export default function MonthlyReport({ startDate, endDate, reportType, unitId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({});
  const [aggregateData, setAggregateData] = useState(null);

  useEffect(() => {
    async function fetchReportData() {
      setLoading(true);

      try {
        let reportData = [];
        let reportTotals = {};

        if (reportType === 'cash_register' || reportType === 'cash_register_report') {
          // Fetch daily revenue data
          let query = supabase
            .from('daily_revenue')
            .select('*, units(name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

          if (unitId) {
            query = query.eq('unit_id', unitId);
          }

          const { data: revenues } = await query;

          reportData = revenues || [];

          // Calculate totals
          reportTotals = {
            total_revenue: reportData.reduce((sum, r) => sum + (parseFloat(r.total_revenue) || 0), 0),
            vat_0: reportData.reduce((sum, r) => sum + (parseFloat(r.vat_0_percent) || 0), 0),
            vat_5: reportData.reduce((sum, r) => sum + (parseFloat(r.vat_5_percent) || 0), 0),
            vat_18: reportData.reduce((sum, r) => sum + (parseFloat(r.vat_18_percent) || 0), 0),
            vat_27: reportData.reduce((sum, r) => sum + (parseFloat(r.vat_27_percent) || 0), 0),
            tips: reportData.reduce((sum, r) => sum + (parseFloat(r.tips) || 0), 0),
            cash: reportData.reduce((sum, r) => sum + (parseFloat(r.cash_payment) || 0), 0),
            card: reportData.reduce((sum, r) => sum + (parseFloat(r.card_payment) || 0), 0),
            szep: reportData.reduce((sum, r) => sum + (parseFloat(r.szep_card_payment) || 0), 0),
            terminal_card: reportData.reduce((sum, r) => sum + (parseFloat(r.terminal_card) || 0), 0),
            terminal_szep: reportData.reduce((sum, r) => sum + (parseFloat(r.terminal_szep) || 0), 0),
          };
        } else if (reportType === 'full_monthly') {
          // Fetch daily revenue and expenses data
          let revenueQuery = supabase
            .from('daily_revenue')
            .select('*, units(name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

          let expensesQuery = supabase
            .from('expenses')
            .select('*')
            .gte('invoice_date', startDate)
            .lte('invoice_date', endDate);

          if (unitId) {
            revenueQuery = revenueQuery.eq('unit_id', unitId);
            expensesQuery = expensesQuery.eq('unit_id', unitId);
          }

          const [revenueResult, expensesResult] = await Promise.all([
            revenueQuery,
            expensesQuery,
          ]);

          const revenues = revenueResult.data || [];
          const expenses = expensesResult.data || [];

          // Group expenses by date
          const expensesByDate = {};
          expenses.forEach((exp) => {
            const date = exp.invoice_date;
            if (!expensesByDate[date]) {
              expensesByDate[date] = [];
            }
            expensesByDate[date].push(exp);
          });

          // Add expenses to each day
          reportData = revenues.map((row) => {
            const dayExpenses = expensesByDate[row.date] || [];
            const totalExpenses = dayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
            return {
              ...row,
              expenses: dayExpenses,
              total_expenses: totalExpenses,
              daily_total: (parseFloat(row.total_revenue) || 0) - totalExpenses,
            };
          });

          // Calculate totals
          const totalRevenue = reportData.reduce((sum, r) => sum + (parseFloat(r.total_revenue) || 0), 0);
          const totalExpenses = reportData.reduce((sum, r) => sum + (r.total_expenses || 0), 0);

          reportTotals = {
            total_revenue: totalRevenue,
            vat_0: reportData.reduce((sum, r) => sum + (parseFloat(r.vat_0_percent) || 0), 0),
            vat_5: reportData.reduce((sum, r) => sum + (parseFloat(r.vat_5_percent) || 0), 0),
            vat_18: reportData.reduce((sum, r) => sum + (parseFloat(r.vat_18_percent) || 0), 0),
            vat_27: reportData.reduce((sum, r) => sum + (parseFloat(r.vat_27_percent) || 0), 0),
            tips: reportData.reduce((sum, r) => sum + (parseFloat(r.tips) || 0), 0),
            cash: reportData.reduce((sum, r) => sum + (parseFloat(r.cash_payment) || 0), 0),
            card: reportData.reduce((sum, r) => sum + (parseFloat(r.card_payment) || 0), 0),
            szep: reportData.reduce((sum, r) => sum + (parseFloat(r.szep_card_payment) || 0), 0),
            terminal_card: reportData.reduce((sum, r) => sum + (parseFloat(r.terminal_card) || 0), 0),
            terminal_szep: reportData.reduce((sum, r) => sum + (parseFloat(r.terminal_szep) || 0), 0),
            total_expenses: totalExpenses,
            grand_total: totalRevenue - totalExpenses,
          };
        } else if (reportType === 'cash_revenue') {
          // Fetch daily revenue (for cash_payment), expenses, and house_cash in parallel
          let revenueQuery = supabase
            .from('daily_revenue')
            .select('*, units(name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

          let expensesQuery = supabase
            .from('expenses')
            .select('*')
            .gte('invoice_date', startDate)
            .lte('invoice_date', endDate)
            .eq('is_official', true)
            .eq('payment_method', 'cash');

          let houseCashQuery = supabase
            .from('house_cash')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

          if (unitId) {
            revenueQuery = revenueQuery.eq('unit_id', unitId);
            expensesQuery = expensesQuery.eq('unit_id', unitId);
            houseCashQuery = houseCashQuery.eq('unit_id', unitId);
          }

          const [revenueResult, expensesResult, houseCashResult] = await Promise.all([
            revenueQuery,
            expensesQuery,
            houseCashQuery,
          ]);

          const revenues = revenueResult.data || [];
          const expenses = expensesResult.data || [];
          const houseCashData = houseCashResult.data || [];

          // Group expenses by date
          const expensesByDate = {};
          expenses.forEach((exp) => {
            const date = exp.invoice_date;
            expensesByDate[date] = (expensesByDate[date] || 0) + (parseFloat(exp.amount) || 0);
          });

          // Group house_cash by date for other pocket
          const houseCashByDate = {};
          houseCashData.forEach((hc) => {
            houseCashByDate[hc.date] = hc;
          });

          // Calculate revenue for each day
          reportData = revenues.map((row) => {
            const officialExpenses = expensesByDate[row.date] || 0;
            const officialRevenue = (parseFloat(row.cash_payment) || 0) - officialExpenses;

            // Other pocket from house_cash
            const hc = houseCashByDate[row.date];
            const otherRevenue = hc
              ? (parseFloat(hc.other_difference) || 0) +
                (parseFloat(hc.other_extra_income) || 0) -
                (parseFloat(hc.other_expenses) || 0)
              : 0;

            return {
              ...row,
              official_revenue: officialRevenue,
              official_expenses: officialExpenses,
              other_revenue: otherRevenue,
            };
          });

          reportTotals = {
            official_revenue: reportData.reduce((sum, r) => sum + (r.official_revenue || 0), 0),
            other_revenue: reportData.reduce((sum, r) => sum + (r.other_revenue || 0), 0),
          };
        } else if (reportType === 'events') {
          // Fetch events data
          let query = supabase
            .from('events')
            .select('*, units(name)')
            .gte('event_date', startDate)
            .lte('event_date', endDate)
            .order('event_date', { ascending: true });

          if (unitId) {
            query = query.eq('unit_id', unitId);
          }

          const { data: events } = await query;

          if (events?.length) {
            const eventIds = events.map((e) => e.id);

            const [revenuesResult, expensesResult] = await Promise.all([
              supabase.from('event_revenues').select('event_id, amount').in('event_id', eventIds),
              supabase.from('event_expenses').select('event_id, amount').in('event_id', eventIds),
            ]);

            const revenueByEvent = {};
            const expenseByEvent = {};

            (revenuesResult.data || []).forEach((r) => {
              revenueByEvent[r.event_id] = (revenueByEvent[r.event_id] || 0) + parseFloat(r.amount);
            });

            (expensesResult.data || []).forEach((e) => {
              expenseByEvent[e.event_id] = (expenseByEvent[e.event_id] || 0) + parseFloat(e.amount);
            });

            reportData = events.map((event) => ({
              ...event,
              total_revenue: revenueByEvent[event.id] || 0,
              total_expenses: expenseByEvent[event.id] || 0,
              profit: (revenueByEvent[event.id] || 0) - (expenseByEvent[event.id] || 0),
            }));

            reportTotals = {
              total_revenue: reportData.reduce((sum, e) => sum + e.total_revenue, 0),
              total_expenses: reportData.reduce((sum, e) => sum + e.total_expenses, 0),
              profit: reportData.reduce((sum, e) => sum + e.profit, 0),
            };
          }
        }

        setData(reportData);
        setTotals(reportTotals);

        // Calculate aggregate data by unit if no specific unit selected
        if (!unitId && reportData.length > 0 && (reportType === 'full_monthly' || reportType === 'cash_register' || reportType === 'cash_register_report')) {
          const unitAggregates = {};
          reportData.forEach((row) => {
            const unitName = row.units?.name || 'Ismeretlen';
            if (!unitAggregates[unitName]) {
              unitAggregates[unitName] = {
                name: unitName,
                total_revenue: 0,
                cash: 0,
                card: 0,
                szep: 0,
                total_expenses: 0,
                grand_total: 0,
                days: 0,
              };
            }
            unitAggregates[unitName].total_revenue += parseFloat(row.total_revenue) || 0;
            unitAggregates[unitName].cash += parseFloat(row.cash_payment) || 0;
            unitAggregates[unitName].card += parseFloat(row.card_payment) || 0;
            unitAggregates[unitName].szep += parseFloat(row.szep_card_payment) || 0;
            unitAggregates[unitName].total_expenses += row.total_expenses || 0;
            unitAggregates[unitName].grand_total += row.daily_total || parseFloat(row.total_revenue) || 0;
            unitAggregates[unitName].days += 1;
          });
          setAggregateData(Object.values(unitAggregates));
        } else {
          setAggregateData(null);
        }
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchReportData();
  }, [startDate, endDate, reportType, unitId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">
          Nincs adat a megadott időszakra
        </p>
      </Card>
    );
  }

  // Show aggregate summary for "all units" view
  if (aggregateData && !unitId) {
    return (
      <div className="space-y-6">
        <AggregateReport data={aggregateData} totals={totals} reportType={reportType} />
        {reportType === 'full_monthly' && (
          <FullMonthlyReport data={data} totals={totals} />
        )}
        {reportType === 'cash_register' && (
          <CashRegisterReport data={data} totals={totals} />
        )}
        {reportType === 'cash_register_report' && (
          <CashRegisterFullReport data={data} totals={totals} />
        )}
      </div>
    );
  }

  // Render based on report type
  if (reportType === 'cash_register') {
    return <CashRegisterReport data={data} totals={totals} />;
  }

  if (reportType === 'cash_register_report') {
    return <CashRegisterFullReport data={data} totals={totals} />;
  }

  if (reportType === 'cash_revenue') {
    return <CashRevenueReport data={data} totals={totals} />;
  }

  if (reportType === 'full_monthly') {
    return <FullMonthlyReport data={data} totals={totals} />;
  }

  if (reportType === 'events') {
    return <EventsReport data={data} totals={totals} />;
  }

  return null;
}

function AggregateReport({ data, totals, reportType }) {
  // Calculate grand totals
  const grandTotal = {
    total_revenue: data.reduce((sum, u) => sum + u.total_revenue, 0),
    cash: data.reduce((sum, u) => sum + u.cash, 0),
    card: data.reduce((sum, u) => sum + u.card, 0),
    szep: data.reduce((sum, u) => sum + u.szep, 0),
    total_expenses: data.reduce((sum, u) => sum + u.total_expenses, 0),
    days: data.reduce((sum, u) => sum + u.days, 0),
  };

  return (
    <Card title="Egységenkénti összesítő">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-pepper-red bg-opacity-10">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Egység</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-900">Napok</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-900">Bevétel</th>
              {reportType === 'full_monthly' && (
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Költség</th>
              )}
              <th className="px-4 py-3 text-right font-semibold text-gray-900">Készpénz</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-900">Kártya</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-900">SZÉP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((unit) => (
              <tr key={unit.name} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{unit.name}</td>
                <td className="px-4 py-3 text-right text-gray-600">{unit.days}</td>
                <td className="px-4 py-3 text-right text-green-600 font-medium">
                  {formatCurrency(unit.total_revenue)}
                </td>
                {reportType === 'full_monthly' && (
                  <td className="px-4 py-3 text-right text-red-600">
                    {unit.total_expenses > 0 ? `-${formatCurrency(unit.total_expenses)}` : formatCurrency(0)}
                  </td>
                )}
                <td className="px-4 py-3 text-right">{formatCurrency(unit.cash)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(unit.card)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(unit.szep)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-3">Mindösszesen</td>
              <td className="px-4 py-3 text-right">{grandTotal.days}</td>
              <td className="px-4 py-3 text-right text-green-700">{formatCurrency(grandTotal.total_revenue)}</td>
              {reportType === 'full_monthly' && (
                <td className="px-4 py-3 text-right text-red-700">-{formatCurrency(grandTotal.total_expenses)}</td>
              )}
              <td className="px-4 py-3 text-right">{formatCurrency(grandTotal.cash)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(grandTotal.card)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(grandTotal.szep)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-green-600">Összes bevétel</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(grandTotal.total_revenue)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-600">Készpénz</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(grandTotal.cash)}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-sm text-purple-600">Kártya</p>
            <p className="text-lg font-bold text-purple-700">{formatCurrency(grandTotal.card)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-sm text-orange-600">SZÉP kártya</p>
            <p className="text-lg font-bold text-orange-700">{formatCurrency(grandTotal.szep)}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CashRegisterReport({ data, totals }) {
  const navigate = useNavigate();

  return (
    <Card title="Pénztárgép és bankkártya forgalom">
      <p className="text-sm text-gray-500 mb-3">Kattints egy sorra a szerkesztéshez</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Dátum</th>
              <th className="px-4 py-2 text-right">0%</th>
              <th className="px-4 py-2 text-right">5%</th>
              <th className="px-4 py-2 text-right">18%</th>
              <th className="px-4 py-2 text-right">27%</th>
              <th className="px-4 py-2 text-right">Borr.</th>
              <th className="px-4 py-2 text-right">Term. kártya</th>
              <th className="px-4 py-2 text-right">Term. SZÉP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => navigate(`/daily?date=${row.date}`)}
                className={`hover:bg-gray-100 cursor-pointer transition-colors ${
                  row.mark_color ? MARK_COLORS[row.mark_color] : ''
                }`}
              >
                <td className="px-4 py-2">{formatDate(row.date)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.vat_0_percent)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.vat_5_percent)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.vat_18_percent)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.vat_27_percent)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.tips)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.terminal_card)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.terminal_szep)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-2">Összesen</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.vat_0)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.vat_5)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.vat_18)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.vat_27)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.tips)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.terminal_card)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.terminal_szep)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CashRevenueReport({ data, totals }) {
  const navigate = useNavigate();

  return (
    <Card title="Készpénz bevételek">
      <p className="text-sm text-gray-500 mb-3">Kattints egy sorra a szerkesztéshez</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Dátum</th>
              <th className="px-4 py-2 text-left">Egység</th>
              <th className="px-4 py-2 text-right">Pénztár zseb</th>
              <th className="px-4 py-2 text-right">Tartalék</th>
              <th className="px-4 py-2 text-right">Összesen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => navigate(`/daily?date=${row.date}`)}
                className={`hover:bg-gray-100 cursor-pointer transition-colors ${
                  row.mark_color ? MARK_COLORS[row.mark_color] : ''
                }`}
              >
                <td className="px-4 py-2">{formatDate(row.date)}</td>
                <td className="px-4 py-2">{row.units?.name}</td>
                <td className="px-4 py-2 text-right text-green-600">
                  {formatCurrency(row.official_revenue)}
                </td>
                <td className="px-4 py-2 text-right text-blue-600">
                  {formatCurrency(row.other_revenue)}
                </td>
                <td className="px-4 py-2 text-right font-semibold">
                  {formatCurrency((row.official_revenue || 0) + (row.other_revenue || 0))}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-2" colSpan={2}>Összesen</td>
              <td className="px-4 py-2 text-right text-green-700">
                {formatCurrency(totals.official_revenue)}
              </td>
              <td className="px-4 py-2 text-right text-blue-700">
                {formatCurrency(totals.other_revenue)}
              </td>
              <td className="px-4 py-2 text-right">
                {formatCurrency(totals.official_revenue + totals.other_revenue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CashRegisterFullReport({ data, totals }) {
  const navigate = useNavigate();

  // Calculate cash register total (sum of VAT amounts + tips)
  const cashRegisterTotal = (row) =>
    (parseFloat(row.vat_0_percent) || 0) +
    (parseFloat(row.vat_5_percent) || 0) +
    (parseFloat(row.vat_18_percent) || 0) +
    (parseFloat(row.vat_27_percent) || 0) +
    (parseFloat(row.tips) || 0);

  const totalCashRegister =
    (totals.vat_0 || 0) +
    (totals.vat_5 || 0) +
    (totals.vat_18 || 0) +
    (totals.vat_27 || 0) +
    (totals.tips || 0);

  // Calculate card discrepancy (cash register card vs terminal card)
  const cardDiscrepancy = (totals.card || 0) - (totals.terminal_card || 0);
  const szepDiscrepancy = (totals.szep || 0) - (totals.terminal_szep || 0);
  const hasCardDiscrepancy = Math.abs(cardDiscrepancy) > 0.01;
  const hasSzepDiscrepancy = Math.abs(szepDiscrepancy) > 0.01;

  return (
    <Card title="Pénztárgép jelentés">
      <p className="text-sm text-gray-500 mb-3">Kattints egy sorra a szerkesztéshez</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Dátum</th>
              <th className="px-4 py-2 text-left">Egység</th>
              <th className="px-4 py-2 text-right">0%</th>
              <th className="px-4 py-2 text-right">5%</th>
              <th className="px-4 py-2 text-right">18%</th>
              <th className="px-4 py-2 text-right">27%</th>
              <th className="px-4 py-2 text-right">Borr.</th>
              <th className="px-4 py-2 text-right font-semibold bg-gray-100">Összesen</th>
              <th className="px-4 py-2 text-right">Készpénz</th>
              <th className="px-4 py-2 text-right">Kártya</th>
              <th className="px-4 py-2 text-right">SZÉP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => navigate(`/daily?date=${row.date}`)}
                className={`hover:bg-gray-100 cursor-pointer transition-colors ${
                  row.mark_color ? MARK_COLORS[row.mark_color] : ''
                }`}
              >
                <td className="px-4 py-2">{formatDate(row.date)}</td>
                <td className="px-4 py-2">{row.units?.name}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.vat_0_percent)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.vat_5_percent)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.vat_18_percent)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.vat_27_percent)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.tips)}</td>
                <td className="px-4 py-2 text-right font-semibold bg-gray-50">{formatCurrency(cashRegisterTotal(row))}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.cash_payment)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.card_payment)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.szep_card_payment)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-2" colSpan={2}>Összesen</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.vat_0)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.vat_5)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.vat_18)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.vat_27)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.tips)}</td>
              <td className="px-4 py-2 text-right bg-gray-200">{formatCurrency(totalCashRegister)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.cash)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.card)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.szep)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Terminal comparison */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Terminál egyeztetés</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Pénztárgép kártya:</span>
            <span className="ml-2 font-medium">{formatCurrency(totals.card)}</span>
          </div>
          <div>
            <span className="text-gray-500">Terminál kártya:</span>
            <span className="ml-2 font-medium">{formatCurrency(totals.terminal_card)}</span>
          </div>
          <div>
            <span className="text-gray-500">Pénztárgép SZÉP:</span>
            <span className="ml-2 font-medium">{formatCurrency(totals.szep)}</span>
          </div>
          <div>
            <span className="text-gray-500">Terminál SZÉP:</span>
            <span className="ml-2 font-medium">{formatCurrency(totals.terminal_szep)}</span>
          </div>
        </div>

        {/* Discrepancy warnings */}
        {(hasCardDiscrepancy || hasSzepDiscrepancy) && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Eltérés a pénztárgép és terminál között!
            </div>
            <ul className="mt-2 text-sm text-red-700 space-y-1">
              {hasCardDiscrepancy && (
                <li>Bankkártya eltérés: <span className="font-semibold">{formatCurrency(cardDiscrepancy)}</span></li>
              )}
              {hasSzepDiscrepancy && (
                <li>SZÉP kártya eltérés: <span className="font-semibold">{formatCurrency(szepDiscrepancy)}</span></li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function FullMonthlyReport({ data, totals }) {
  const navigate = useNavigate();
  const [expandedDays, setExpandedDays] = useState({});

  const toggleDay = (date) => {
    setExpandedDays((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  return (
    <Card title="Teljes havi forgalom">
      <p className="text-sm text-gray-500 mb-3">Kattints egy sorra a szerkesztéshez, vagy a + gombra a költségek megtekintéséhez</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left w-8"></th>
              <th className="px-4 py-2 text-left">Dátum</th>
              <th className="px-4 py-2 text-left">Egység</th>
              <th className="px-4 py-2 text-right">Bevétel</th>
              <th className="px-4 py-2 text-right">Költség</th>
              <th className="px-4 py-2 text-right font-semibold bg-gray-100">Napi összesen</th>
              <th className="px-4 py-2 text-right hidden lg:table-cell">Készpénz</th>
              <th className="px-4 py-2 text-right hidden lg:table-cell">Kártya</th>
              <th className="px-4 py-2 text-right hidden lg:table-cell">SZÉP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row) => (
              <>
                <tr
                  key={row.id}
                  className={`hover:bg-gray-100 transition-colors ${
                    row.mark_color ? MARK_COLORS[row.mark_color] : ''
                  }`}
                >
                  <td className="px-2 py-2">
                    {row.expenses?.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDay(row.date);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500"
                      >
                        {expandedDays[row.date] ? '−' : '+'}
                      </button>
                    )}
                  </td>
                  <td
                    className="px-4 py-2 cursor-pointer"
                    onClick={() => navigate(`/daily?date=${row.date}`)}
                  >
                    {formatDate(row.date)}
                  </td>
                  <td
                    className="px-4 py-2 cursor-pointer"
                    onClick={() => navigate(`/daily?date=${row.date}`)}
                  >
                    {row.units?.name}
                  </td>
                  <td className="px-4 py-2 text-right text-green-600">
                    {formatCurrency(row.total_revenue)}
                  </td>
                  <td className="px-4 py-2 text-right text-red-600">
                    {row.total_expenses > 0 ? `-${formatCurrency(row.total_expenses)}` : formatCurrency(0)}
                  </td>
                  <td className={`px-4 py-2 text-right font-semibold bg-gray-50 ${row.daily_total >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(row.daily_total)}
                  </td>
                  <td className="px-4 py-2 text-right hidden lg:table-cell">{formatCurrency(row.cash_payment)}</td>
                  <td className="px-4 py-2 text-right hidden lg:table-cell">{formatCurrency(row.card_payment)}</td>
                  <td className="px-4 py-2 text-right hidden lg:table-cell">{formatCurrency(row.szep_card_payment)}</td>
                </tr>
                {expandedDays[row.date] && row.expenses?.length > 0 && (
                  <tr key={`${row.id}-expenses`} className="bg-red-50">
                    <td colSpan={9} className="px-4 py-2">
                      <div className="pl-8 space-y-1">
                        <p className="text-xs font-medium text-gray-500 mb-2">Napi költségek:</p>
                        {row.expenses.map((exp) => (
                          <div key={exp.id} className="flex justify-between text-sm text-red-700">
                            <span>{exp.supplier_name} {exp.item_description ? `- ${exp.item_description}` : ''}</span>
                            <span className="font-medium">-{formatCurrency(exp.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-2 py-2"></td>
              <td className="px-4 py-2" colSpan={2}>Összesen</td>
              <td className="px-4 py-2 text-right text-green-700">{formatCurrency(totals.total_revenue)}</td>
              <td className="px-4 py-2 text-right text-red-700">-{formatCurrency(totals.total_expenses)}</td>
              <td className={`px-4 py-2 text-right bg-gray-200 ${totals.grand_total >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                {formatCurrency(totals.grand_total)}
              </td>
              <td className="px-4 py-2 text-right hidden lg:table-cell">{formatCurrency(totals.cash)}</td>
              <td className="px-4 py-2 text-right hidden lg:table-cell">{formatCurrency(totals.card)}</td>
              <td className="px-4 py-2 text-right hidden lg:table-cell">{formatCurrency(totals.szep)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary card */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-green-600">Összes bevétel</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totals.total_revenue)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-sm text-red-600">Összes költség</p>
            <p className="text-lg font-bold text-red-700">-{formatCurrency(totals.total_expenses)}</p>
          </div>
          <div className={`rounded-lg p-3 ${totals.grand_total >= 0 ? 'bg-blue-50' : 'bg-red-100'}`}>
            <p className={`text-sm ${totals.grand_total >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Eredmény</p>
            <p className={`text-lg font-bold ${totals.grand_total >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {formatCurrency(totals.grand_total)}
            </p>
          </div>
        </div>
      </div>

      {/* Revenue trend chart */}
      {data.length > 1 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <DayOverDayChart
            data={data.map((row) => ({
              label: formatDate(row.date).split('.').slice(1).join('.').trim(),
              value: parseFloat(row.total_revenue) || 0,
            }))}
            height={180}
          />
        </div>
      )}
    </Card>
  );
}

function EventsReport({ data, totals }) {
  return (
    <Card title="Rendezvény összesítő">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Dátum</th>
              <th className="px-4 py-2 text-left">Rendezvény</th>
              <th className="px-4 py-2 text-right">Bevétel</th>
              <th className="px-4 py-2 text-right">Költség</th>
              <th className="px-4 py-2 text-right">Eredmény</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{formatDate(row.event_date)}</td>
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 text-right text-green-600">
                  {formatCurrency(row.total_revenue)}
                </td>
                <td className="px-4 py-2 text-right text-red-600">
                  {formatCurrency(row.total_expenses)}
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${row.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(row.profit)}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-2" colSpan={2}>Összesen</td>
              <td className="px-4 py-2 text-right text-green-700">
                {formatCurrency(totals.total_revenue)}
              </td>
              <td className="px-4 py-2 text-right text-red-700">
                {formatCurrency(totals.total_expenses)}
              </td>
              <td className={`px-4 py-2 text-right ${totals.profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                {formatCurrency(totals.profit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
