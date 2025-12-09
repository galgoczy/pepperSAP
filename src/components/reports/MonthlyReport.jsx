import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, LoadingSpinner, Badge } from '../common';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';

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

  useEffect(() => {
    async function fetchReportData() {
      setLoading(true);

      try {
        let reportData = [];
        let reportTotals = {};

        if (reportType === 'cash_register' || reportType === 'full_monthly' || reportType === 'cash_register_report') {
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
              <th className="px-4 py-2 text-right">Hivatalos zseb</th>
              <th className="px-4 py-2 text-right">Egyéb zseb</th>
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
              <th className="px-4 py-2 text-right font-semibold">Összesen</th>
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
                <td className="px-4 py-2 text-right font-semibold">{formatCurrency(cashRegisterTotal(row))}</td>
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
              <td className="px-4 py-2 text-right">{formatCurrency(totalCashRegister)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.cash)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.card)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.szep)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FullMonthlyReport({ data, totals }) {
  const navigate = useNavigate();

  return (
    <Card title="Teljes havi forgalom">
      <p className="text-sm text-gray-500 mb-3">Kattints egy sorra a szerkesztéshez</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Dátum</th>
              <th className="px-4 py-2 text-left">Egység</th>
              <th className="px-4 py-2 text-right">Szoftver</th>
              <th className="px-4 py-2 text-right hidden lg:table-cell">0%</th>
              <th className="px-4 py-2 text-right hidden lg:table-cell">5%</th>
              <th className="px-4 py-2 text-right hidden lg:table-cell">18%</th>
              <th className="px-4 py-2 text-right hidden lg:table-cell">27%</th>
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
                <td className="px-4 py-2 text-right font-semibold">
                  {formatCurrency(row.total_revenue)}
                </td>
                <td className="px-4 py-2 text-right hidden lg:table-cell text-gray-500">{formatCurrency(row.vat_0_percent)}</td>
                <td className="px-4 py-2 text-right hidden lg:table-cell text-gray-500">{formatCurrency(row.vat_5_percent)}</td>
                <td className="px-4 py-2 text-right hidden lg:table-cell text-gray-500">{formatCurrency(row.vat_18_percent)}</td>
                <td className="px-4 py-2 text-right hidden lg:table-cell text-gray-500">{formatCurrency(row.vat_27_percent)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.cash_payment)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.card_payment)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.szep_card_payment)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-2" colSpan={2}>Összesen</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.total_revenue)}</td>
              <td className="px-4 py-2 text-right hidden lg:table-cell">{formatCurrency(totals.vat_0)}</td>
              <td className="px-4 py-2 text-right hidden lg:table-cell">{formatCurrency(totals.vat_5)}</td>
              <td className="px-4 py-2 text-right hidden lg:table-cell">{formatCurrency(totals.vat_18)}</td>
              <td className="px-4 py-2 text-right hidden lg:table-cell">{formatCurrency(totals.vat_27)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.cash)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.card)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.szep)}</td>
            </tr>
          </tbody>
        </table>
      </div>
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
