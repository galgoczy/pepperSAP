import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, LoadingSpinner, Badge } from '../common';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';
import { REGISTER_TOLERANCE, hasDocumentedDiscrepancy, isBlankClosure, hufDiscrepancyOf, validatePaymentBreakdown, validateCardPayments, methodCardAdjustmentOf } from '../../lib/validations';
import { buildClosureChecks, computeRegisterProtocolMarks } from '../../lib/registerChecks';
import { useAuth } from '../../hooks/useAuth';
import { useCumulativeChecks } from '../../hooks/useCumulativeChecks';
import toast from 'react-hot-toast';
import { RevenueTrendChart } from '../charts/RevenueTrendChart';

// Color options for marking
const MARK_COLORS = {
  red: 'bg-red-50 border-l-4 border-l-red-500',
  yellow: 'bg-yellow-50 border-l-4 border-l-yellow-500',
  green: 'bg-green-50 border-l-4 border-l-green-500',
  blue: 'bg-blue-50 border-l-4 border-l-blue-500',
  purple: 'bg-purple-50 border-l-4 border-l-purple-500',
};

// Build a continuous daily series across [startDate, endDate], so charts also
// show days that have no data (0 revenue) instead of skipping them. Existing
// days are matched by their `date` field; missing days get the provided zero
// values. Falls back to the rows' own date span if a range isn't supplied.
function fillDailySeries(rows, startDate, endDate, zeroFields) {
  const byDate = {};
  (rows || []).forEach((r) => { byDate[r.date] = r; });

  const dates = (rows || []).map((r) => r.date).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const from = startDate || dates[0];
  const to = endDate || dates[dates.length - 1];
  if (!from || !to) return rows || [];

  const result = [];
  // Iterate calendar days from `from` to `to` (inclusive) in local time.
  const cursor = new Date(`${from}T00:00:00`);
  const last = new Date(`${to}T00:00:00`);
  while (cursor <= last) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    result.push(byDate[key] || { date: key, ...zeroFields });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export default function MonthlyReport({ startDate, endDate, reportType, unitId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({});
  const [unitName, setUnitName] = useState('');
  const [eventsList, setEventsList] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [eventsTotals, setEventsTotals] = useState({});
  const [grandTotals, setGrandTotals] = useState({});

  useEffect(() => {
    // Reset data immediately when report type changes to prevent rendering old data with new component
    setData([]);
    setTotals({});
    setUnitName('');
    setEventsList([]);
    setEventsData([]);
    setEventsTotals({});
    setGrandTotals({});

    async function fetchReportData() {
      setLoading(true);

      try {
        let reportData = [];
        let reportTotals = {};
        let reportUnitName = '';
        let reportEventsList = [];
        let reportEventsData = [];
        let reportEventsTotals = {};
        let reportGrandTotals = {};

        // Single unit reports (or admin with specific unit)
        if (reportType === 'full_monthly') {
          const result = await fetchFullMonthlyData(startDate, endDate, unitId);
          reportData = result.data;
          reportTotals = result.totals;
          reportUnitName = result.data[0]?.units?.name || '';
        } else if (reportType === 'cash_revenue') {
          const result = await fetchCashRevenueData(startDate, endDate, unitId);
          reportData = result.data;
          reportTotals = result.totals;
          reportUnitName = result.data[0]?.units?.name || '';
        } else if (reportType === 'cash_register') {
          const result = await fetchCashRegisterData(startDate, endDate, unitId);
          reportData = result.data;
          reportTotals = result.totals;
          reportUnitName = result.unitName || '';
        } else if (reportType === 'events') {
          const result = await fetchEventsData(startDate, endDate, unitId);
          reportData = result.data;
          reportTotals = result.totals;
          reportUnitName = result.unitName || '';
        }
        // Admin aggregate reports (all units)
        else if (reportType === 'full_monthly_all') {
          const result = await fetchFullMonthlyAllUnits(startDate, endDate);
          reportData = result.data;
          reportTotals = result.totals;
          reportEventsData = result.eventsData || [];
          reportEventsTotals = result.eventsTotals || {};
          reportEventsList = result.eventsList || [];
          reportGrandTotals = result.grandTotals || {};
        } else if (reportType === 'cash_revenue_all') {
          const result = await fetchCashRevenueAllUnits(startDate, endDate);
          reportData = result.data;
          reportTotals = result.totals;
        } else if (reportType === 'cash_register_all_simple') {
          const result = await fetchCashRegisterAllUnitsSimple(startDate, endDate);
          reportData = result.data;
          reportTotals = result.totals;
        } else if (reportType === 'cash_register_all_detailed') {
          const result = await fetchCashRegisterAllUnitsDetailed(startDate, endDate);
          reportData = result.data;
          reportTotals = result.totals;
        } else if (reportType === 'cash_register_all_accounting') {
          const result = await fetchCashRegisterAccounting(startDate, endDate);
          reportData = result.data;
          reportTotals = result.totals;
        } else if (reportType === 'events_all') {
          const result = await fetchEventsAllUnits(startDate, endDate);
          reportData = result.data;
          reportTotals = result.totals;
          reportEventsList = result.eventsList || [];
        }

        setData(reportData);
        setTotals(reportTotals);
        setUnitName(reportUnitName);
        setEventsList(reportEventsList);
        setEventsData(reportEventsData);
        setEventsTotals(reportEventsTotals);
        setGrandTotals(reportGrandTotals);
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
  if (reportType === 'full_monthly') {
    return <FullMonthlyReport data={data} totals={totals} unitName={unitName} startDate={startDate} endDate={endDate} />;
  }
  if (reportType === 'cash_revenue') {
    return <CashRevenueReport data={data} totals={totals} unitName={unitName} />;
  }
  if (reportType === 'cash_register') {
    return <CashRegisterReport data={data} totals={totals} unitName={unitName} />;
  }
  if (reportType === 'events') {
    return <EventsReport data={data} totals={totals} unitName={unitName} />;
  }
  // Admin aggregate reports
  if (reportType === 'full_monthly_all') {
    return <FullMonthlyAllUnitsReport data={data} totals={totals} eventsData={eventsData} eventsTotals={eventsTotals} eventsList={eventsList} grandTotals={grandTotals} />;
  }
  if (reportType === 'cash_revenue_all') {
    return <CashRevenueAllUnitsReport data={data} totals={totals} />;
  }
  if (reportType === 'cash_register_all_simple') {
    return <CashRegisterAllUnitsSimpleReport data={data} totals={totals} startDate={startDate} endDate={endDate} />;
  }
  if (reportType === 'cash_register_all_detailed') {
    return <CashRegisterAllUnitsDetailedReport data={data} totals={totals} />;
  }
  if (reportType === 'cash_register_all_accounting') {
    return <CashRegisterAccountingReport data={data} totals={totals} startDate={startDate} endDate={endDate} />;
  }
  if (reportType === 'events_all') {
    return <EventsAllUnitsReport data={data} totals={totals} eventsList={eventsList} />;
  }

  return null;
}

// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

async function fetchFullMonthlyData(startDate, endDate, unitId) {
  // Fetch daily revenue with cash register data
  let revenueQuery = supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(cash_payment, card_payment)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  // Fetch expenses (both invoice and non-invoice)
  let expensesQuery = supabase
    .from('expenses')
    .select('*')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate);

  if (unitId) {
    revenueQuery = revenueQuery.eq('unit_id', unitId);
    expensesQuery = expensesQuery.eq('unit_id', unitId);
  }

  const [revenueResult, expensesResult] = await Promise.all([revenueQuery, expensesQuery]);

  const revenues = revenueResult.data || [];
  const expenses = expensesResult.data || [];

  // Group expenses by date
  const expensesByDate = {};
  expenses.forEach((exp) => {
    const date = exp.invoice_date;
    if (!expensesByDate[date]) {
      expensesByDate[date] = { invoice: 0, nonInvoice: 0, all: [] };
    }
    if (exp.is_official) {
      expensesByDate[date].invoice += parseFloat(exp.amount) || 0;
    } else {
      expensesByDate[date].nonInvoice += parseFloat(exp.amount) || 0;
    }
    expensesByDate[date].all.push(exp);
  });

  // Calculate data for each day
  const data = revenues.map((row) => {
    // Sum cash register data
    const crRevenues = row.cash_register_revenue || [];
    const cashRegisterCash = crRevenues.reduce((sum, r) => sum + (parseFloat(r.cash_payment) || 0), 0);
    const cashRegisterCard = crRevenues.reduce((sum, r) => sum + (parseFloat(r.card_payment) || 0), 0);
    const cashRegisterTotal = cashRegisterCash + cashRegisterCard;

    // Get expenses for this day
    const dayExpenses = expensesByDate[row.date] || { invoice: 0, nonInvoice: 0, all: [] };

    // Reserve revenue = Total software - Cash register total - non-invoice expenses
    const totalSoftware = parseFloat(row.total_revenue) || 0;
    const reserveRevenue = totalSoftware - cashRegisterTotal - dayExpenses.nonInvoice;

    // Daily result = Cash register + Reserve - Invoice expenses
    const dailyResult = cashRegisterTotal + reserveRevenue - dayExpenses.invoice;

    return {
      ...row,
      totalSoftware,
      cashRegisterCash,
      cashRegisterCard,
      cashRegisterTotal,
      reserveRevenue,
      invoiceExpenses: dayExpenses.invoice,
      nonInvoiceExpenses: dayExpenses.nonInvoice,
      dailyResult,
      expenses: dayExpenses.all,
    };
  });

  // Calculate totals
  const totals = {
    totalSoftware: data.reduce((sum, r) => sum + r.totalSoftware, 0),
    cashRegisterCash: data.reduce((sum, r) => sum + r.cashRegisterCash, 0),
    cashRegisterCard: data.reduce((sum, r) => sum + r.cashRegisterCard, 0),
    cashRegisterTotal: data.reduce((sum, r) => sum + r.cashRegisterTotal, 0),
    reserveRevenue: data.reduce((sum, r) => sum + r.reserveRevenue, 0),
    invoiceExpenses: data.reduce((sum, r) => sum + r.invoiceExpenses, 0),
    dailyResult: data.reduce((sum, r) => sum + r.dailyResult, 0),
    guestCount: data.reduce((sum, r) => sum + (parseInt(r.guest_count, 10) || 0), 0),
  };

  return { data, totals };
}

async function fetchCashRevenueData(startDate, endDate, unitId) {
  // Fetch daily revenue with cash register data
  let revenueQuery = supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(cash_payment, card_payment)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  // Fetch cash expenses (invoice and non-invoice)
  let expensesQuery = supabase
    .from('expenses')
    .select('*')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)
    .eq('payment_method', 'cash');

  if (unitId) {
    revenueQuery = revenueQuery.eq('unit_id', unitId);
    expensesQuery = expensesQuery.eq('unit_id', unitId);
  }

  const [revenueResult, expensesResult] = await Promise.all([revenueQuery, expensesQuery]);

  const revenues = revenueResult.data || [];
  const expenses = expensesResult.data || [];

  // Group expenses by date
  const expensesByDate = {};
  expenses.forEach((exp) => {
    const date = exp.invoice_date;
    if (!expensesByDate[date]) {
      expensesByDate[date] = { invoice: 0, nonInvoice: 0 };
    }
    if (exp.is_official) {
      expensesByDate[date].invoice += parseFloat(exp.amount) || 0;
    } else {
      expensesByDate[date].nonInvoice += parseFloat(exp.amount) || 0;
    }
  });

  // Calculate data for each day
  const data = revenues.map((row) => {
    // Sum cash register cash
    const crRevenues = row.cash_register_revenue || [];
    const cashRegisterCash = crRevenues.reduce((sum, r) => sum + (parseFloat(r.cash_payment) || 0), 0);
    const cashRegisterCard = crRevenues.reduce((sum, r) => sum + (parseFloat(r.card_payment) || 0), 0);
    const cashRegisterTotal = cashRegisterCash + cashRegisterCard;

    // Get cash expenses for this day
    const dayExpenses = expensesByDate[row.date] || { invoice: 0, nonInvoice: 0 };

    // Cash register pocket (after invoice cash expenses)
    const cashRegisterPocket = cashRegisterCash - dayExpenses.invoice;

    // Reserve revenue = Total software - Cash register total - non-invoice expenses
    const totalSoftware = parseFloat(row.total_revenue) || 0;
    const reserveRevenue = totalSoftware - cashRegisterTotal - dayExpenses.nonInvoice;

    return {
      ...row,
      cashRegisterCash,
      cashRegisterPocket,
      invoiceCashExpenses: dayExpenses.invoice,
      reserveRevenue,
      total: cashRegisterPocket + reserveRevenue,
    };
  });

  // Calculate totals
  const totals = {
    cashRegisterCash: data.reduce((sum, r) => sum + r.cashRegisterCash, 0),
    cashRegisterPocket: data.reduce((sum, r) => sum + r.cashRegisterPocket, 0),
    reserveRevenue: data.reduce((sum, r) => sum + r.reserveRevenue, 0),
    total: data.reduce((sum, r) => sum + r.total, 0),
  };

  return { data, totals };
}

// From a register's closures in the period: the first and last closure number
// (chronologically) and the cumulative ("göngyölt") revenue of the last one.
function closureSummary(closures) {
  const ordered = [...(closures || [])].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.closure_number ?? 0) - (b.closure_number ?? 0);
  });
  const withSeq = ordered.filter((c) => c.sequence != null);
  const withCum = ordered.filter((c) => c.cumulative != null);
  return {
    firstSequence: withSeq.length ? withSeq[0].sequence : null,
    lastSequence: withSeq.length ? withSeq[withSeq.length - 1].sequence : null,
    lastCumulative: withCum.length ? withCum[withCum.length - 1].cumulative : null,
  };
}

async function fetchCashRegisterData(startDate, endDate, unitId) {
  // Fetch daily revenue with cash register data, including cash register info
  let query = supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(*, cash_registers(ap_number, name))')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (unitId) {
    query = query.eq('unit_id', unitId);
  }

  const { data: revenues } = await query;

  // Get unit name from first record
  const unitName = revenues?.[0]?.units?.name || '';

  // Group by cash register
  const registerData = {};
  (revenues || []).forEach((row) => {
    // All-empty closure rows (a day opened and saved without register data) are
    // noise — same rule as the admin reports.
    const crRevenues = (row.cash_register_revenue || []).filter((cr) => !isBlankClosure(cr));
    crRevenues.forEach((cr) => {
      const apNumber = cr.cash_registers?.ap_number || 'unknown';
      const registerName = cr.cash_registers?.name || '';

      if (!registerData[apNumber]) {
        registerData[apNumber] = {
          ap_number: apNumber,
          name: registerName,
          days: [],
          // Every closure of the period, so the first/last closure number and the
          // last cumulative ("göngyölt") figure can be reported.
          closures: [],
          totals: {
            vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0,
            cash: 0, card: 0, terminal_card: 0, total: 0, software: 0,
          },
        };
      }

      registerData[apNumber].closures.push({
        date: row.date,
        closure_number: cr.closure_number ?? 1,
        sequence: cr.closure_sequence == null || cr.closure_sequence === '' ? null : Number(cr.closure_sequence),
        cumulative: cr.cumulative_revenue == null || cr.cumulative_revenue === '' ? null : Number(cr.cumulative_revenue),
      });
      registerData[apNumber].totals.software += parseFloat(cr.software_revenue) || 0;

      const dayData = {
        date: row.date,
        unit_id: row.unit_id,
        vat_0: parseFloat(cr.vat_0_percent) || 0,
        vat_5: parseFloat(cr.vat_5_percent) || 0,
        vat_18: parseFloat(cr.vat_18_percent) || 0,
        vat_27: parseFloat(cr.vat_27_percent) || 0,
        tips: parseFloat(cr.tips) || 0,
        cash: parseFloat(cr.cash_payment) || 0,
        card: parseFloat(cr.card_payment) || 0,
        terminal_card: parseFloat(cr.terminal_card) || 0,
        // Everything the shared checks need (payment gap, terminal, göngyölt,
        // recorded elütés) — identical to what the admin reports evaluate.
        ...buildClosureChecks(cr),
      };
      // Register turnover = the ÁFA buckets. Borravaló is its own column, not part of it.
      dayData.total = dayData.turnover;
      dayData.cardDiscrepancy = dayData.discrepancy;

      registerData[apNumber].days.push(dayData);
      registerData[apNumber].totals.vat_0 += dayData.vat_0;
      registerData[apNumber].totals.vat_5 += dayData.vat_5;
      registerData[apNumber].totals.vat_18 += dayData.vat_18;
      registerData[apNumber].totals.vat_27 += dayData.vat_27;
      registerData[apNumber].totals.tips += dayData.tips;
      registerData[apNumber].totals.cash += dayData.cash;
      registerData[apNumber].totals.card += dayData.card;
      registerData[apNumber].totals.terminal_card += dayData.terminal_card;
      registerData[apNumber].totals.total += dayData.total;
    });
  });

  // Calculate card discrepancy + closure summary + protocol marks per register
  Object.values(registerData).forEach((reg) => {
    reg.totals.cardDiscrepancy = reg.totals.card - reg.totals.terminal_card;
    Object.assign(reg, closureSummary(reg.closures));
    computeRegisterProtocolMarks(reg.days || []);
    reg.totals.hufDiscrepancy = (reg.days || []).reduce((s, d) => s + (d.hufDiscrepancy || 0), 0);
    reg.totals.eurDiscrepancy = (reg.days || []).reduce((s, d) => s + (d.eurDiscrepancy || 0), 0);
    reg.totals.missingProtocols = (reg.days || []).filter((d) => d.protocolMark === 'missing').length;
  });

  const data = Object.values(registerData).sort((a, b) => a.ap_number.localeCompare(b.ap_number));

  // Calculate grand totals
  const totals = {
    vat_0: data.reduce((sum, r) => sum + r.totals.vat_0, 0),
    vat_5: data.reduce((sum, r) => sum + r.totals.vat_5, 0),
    vat_18: data.reduce((sum, r) => sum + r.totals.vat_18, 0),
    vat_27: data.reduce((sum, r) => sum + r.totals.vat_27, 0),
    tips: data.reduce((sum, r) => sum + r.totals.tips, 0),
    cash: data.reduce((sum, r) => sum + r.totals.cash, 0),
    card: data.reduce((sum, r) => sum + r.totals.card, 0),
    terminal_card: data.reduce((sum, r) => sum + r.totals.terminal_card, 0),
    hufDiscrepancy: data.reduce((sum, r) => sum + (r.totals.hufDiscrepancy || 0), 0),
    eurDiscrepancy: data.reduce((sum, r) => sum + (r.totals.eurDiscrepancy || 0), 0),
    missingProtocols: data.reduce((sum, r) => sum + (r.totals.missingProtocols || 0), 0),
  };
  totals.cashRegisterTotal = totals.vat_0 + totals.vat_5 + totals.vat_18 + totals.vat_27; // borravaló nélkül
  totals.cardDiscrepancy = totals.card - totals.terminal_card;

  return { data, totals, unitName };
}

async function fetchEventsData(startDate, endDate, unitId) {
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

  if (!events?.length) {
    return { data: [], totals: {}, unitName: '' };
  }

  // Get unit name
  const unitName = events[0]?.units?.name || '';

  const eventIds = events.map((e) => e.id);

  const [revenuesResult, expensesResult] = await Promise.all([
    supabase.from('event_revenues').select('event_id, amount').in('event_id', eventIds),
    supabase.from('event_expenses').select('event_id, amount, is_efo, is_official').in('event_id', eventIds),
  ]);

  const revenueByEvent = {};
  const expenseByEvent = {};

  (revenuesResult.data || []).forEach((r) => {
    revenueByEvent[r.event_id] = (revenueByEvent[r.event_id] || 0) + parseFloat(r.amount);
  });

  (expensesResult.data || []).forEach((e) => {
    if (!expenseByEvent[e.event_id]) {
      expenseByEvent[e.event_id] = { total: 0, official: 0, efo: 0, nonOfficial: 0 };
    }
    const amount = parseFloat(e.amount) || 0;
    expenseByEvent[e.event_id].total += amount;
    if (e.is_efo) {
      expenseByEvent[e.event_id].efo += amount;
    } else if (e.is_official === false) {
      expenseByEvent[e.event_id].nonOfficial += amount;
    } else {
      expenseByEvent[e.event_id].official += amount;
    }
  });

  const data = events.map((event) => {
    const expenses = expenseByEvent[event.id] || { total: 0, official: 0, efo: 0, nonOfficial: 0 };
    const revenue = revenueByEvent[event.id] || 0;
    return {
      ...event,
      total_revenue: revenue,
      total_expenses: expenses.total,
      official_expenses: expenses.official,
      efo_expenses: expenses.efo,
      non_official_expenses: expenses.nonOfficial,
      profit: revenue - expenses.total,
    };
  });

  const totals = {
    total_revenue: data.reduce((sum, e) => sum + e.total_revenue, 0),
    total_expenses: data.reduce((sum, e) => sum + e.total_expenses, 0),
    official_expenses: data.reduce((sum, e) => sum + e.official_expenses, 0),
    efo_expenses: data.reduce((sum, e) => sum + e.efo_expenses, 0),
    non_official_expenses: data.reduce((sum, e) => sum + e.non_official_expenses, 0),
    profit: data.reduce((sum, e) => sum + e.profit, 0),
  };

  return { data, totals, unitName };
}

// Admin aggregate reports
async function fetchFullMonthlyAllUnits(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(cash_payment, card_payment)')
    .gte('date', startDate)
    .lte('date', endDate);

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate);

  // Fetch events data for the same period
  const { data: events } = await supabase
    .from('events')
    .select('*, units(name)')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true });

  // Group by unit
  const unitData = {};
  (revenues || []).forEach((row) => {
    const unitName = row.units?.name || 'Ismeretlen';
    const unitId = row.unit_id;

    if (!unitData[unitId]) {
      unitData[unitId] = {
        unitName,
        totalSoftware: 0,
        cashRegisterCash: 0,
        cashRegisterCard: 0,
        cashRegisterTotal: 0,
        reserveRevenue: 0,
        invoiceExpenses: 0,
        dailyResult: 0,
        guestCount: 0,
        days: 0,
      };
    }

    const crRevenues = row.cash_register_revenue || [];
    const cashRegisterCash = crRevenues.reduce((sum, r) => sum + (parseFloat(r.cash_payment) || 0), 0);
    const cashRegisterCard = crRevenues.reduce((sum, r) => sum + (parseFloat(r.card_payment) || 0), 0);
    const cashRegisterTotal = cashRegisterCash + cashRegisterCard;

    unitData[unitId].totalSoftware += parseFloat(row.total_revenue) || 0;
    unitData[unitId].cashRegisterCash += cashRegisterCash;
    unitData[unitId].cashRegisterCard += cashRegisterCard;
    unitData[unitId].cashRegisterTotal += cashRegisterTotal;
    unitData[unitId].guestCount += parseInt(row.guest_count, 10) || 0;
    unitData[unitId].days += 1;
  });

  // Add expenses to units
  const expensesByUnit = {};
  (expenses || []).forEach((exp) => {
    if (!expensesByUnit[exp.unit_id]) {
      expensesByUnit[exp.unit_id] = { invoice: 0, nonInvoice: 0 };
    }
    if (exp.is_official) {
      expensesByUnit[exp.unit_id].invoice += parseFloat(exp.amount) || 0;
    } else {
      expensesByUnit[exp.unit_id].nonInvoice += parseFloat(exp.amount) || 0;
    }
  });

  // Calculate reserve revenue and daily result for each unit
  Object.keys(unitData).forEach((unitId) => {
    const unit = unitData[unitId];
    const unitExpenses = expensesByUnit[unitId] || { invoice: 0, nonInvoice: 0 };
    unit.invoiceExpenses = unitExpenses.invoice;
    unit.reserveRevenue = unit.totalSoftware - unit.cashRegisterTotal - unitExpenses.nonInvoice;
    unit.dailyResult = unit.cashRegisterTotal + unit.reserveRevenue - unitExpenses.invoice;
  });

  const data = Object.values(unitData).sort((a, b) => a.unitName.localeCompare(b.unitName));

  const totals = {
    totalSoftware: data.reduce((sum, r) => sum + r.totalSoftware, 0),
    cashRegisterCash: data.reduce((sum, r) => sum + r.cashRegisterCash, 0),
    cashRegisterCard: data.reduce((sum, r) => sum + r.cashRegisterCard, 0),
    cashRegisterTotal: data.reduce((sum, r) => sum + r.cashRegisterTotal, 0),
    reserveRevenue: data.reduce((sum, r) => sum + r.reserveRevenue, 0),
    invoiceExpenses: data.reduce((sum, r) => sum + r.invoiceExpenses, 0),
    dailyResult: data.reduce((sum, r) => sum + r.dailyResult, 0),
    guestCount: data.reduce((sum, r) => sum + (r.guestCount || 0), 0),
  };

  // Process events data
  let eventsData = [];
  let eventsTotals = {
    eventCount: 0,
    total_revenue: 0,
    total_expenses: 0,
    official_expenses: 0,
    efo_expenses: 0,
    non_official_expenses: 0,
    profit: 0,
  };
  let eventsList = [];

  if (events && events.length > 0) {
    const eventIds = events.map((e) => e.id);

    const [revenuesResult, expensesResult] = await Promise.all([
      supabase.from('event_revenues').select('event_id, amount').in('event_id', eventIds),
      supabase.from('event_expenses').select('event_id, amount, is_efo, is_official').in('event_id', eventIds),
    ]);

    const revenueByEvent = {};
    const expenseByEvent = {};

    (revenuesResult.data || []).forEach((r) => {
      revenueByEvent[r.event_id] = (revenueByEvent[r.event_id] || 0) + parseFloat(r.amount);
    });

    (expensesResult.data || []).forEach((e) => {
      if (!expenseByEvent[e.event_id]) {
        expenseByEvent[e.event_id] = { total: 0, official: 0, efo: 0, nonOfficial: 0 };
      }
      const amount = parseFloat(e.amount) || 0;
      expenseByEvent[e.event_id].total += amount;
      if (e.is_efo) {
        expenseByEvent[e.event_id].efo += amount;
      } else if (e.is_official === false) {
        expenseByEvent[e.event_id].nonOfficial += amount;
      } else {
        expenseByEvent[e.event_id].official += amount;
      }
    });

    // Build events list with details
    eventsList = events.map((event) => {
      const eventExpenses = expenseByEvent[event.id] || { total: 0, official: 0, efo: 0, nonOfficial: 0 };
      const revenue = revenueByEvent[event.id] || 0;
      return {
        ...event,
        unitName: event.units?.name || 'Ismeretlen',
        total_revenue: revenue,
        total_expenses: eventExpenses.total,
        official_expenses: eventExpenses.official,
        efo_expenses: eventExpenses.efo,
        non_official_expenses: eventExpenses.nonOfficial,
        profit: revenue - eventExpenses.total,
      };
    });

    // Group events by unit
    const eventUnitData = {};
    eventsList.forEach((event) => {
      const unitId = event.unit_id;

      if (!eventUnitData[unitId]) {
        eventUnitData[unitId] = {
          unitName: event.unitName,
          eventCount: 0,
          total_revenue: 0,
          total_expenses: 0,
          official_expenses: 0,
          efo_expenses: 0,
          non_official_expenses: 0,
          profit: 0,
        };
      }

      eventUnitData[unitId].eventCount += 1;
      eventUnitData[unitId].total_revenue += event.total_revenue;
      eventUnitData[unitId].total_expenses += event.total_expenses;
      eventUnitData[unitId].official_expenses += event.official_expenses;
      eventUnitData[unitId].efo_expenses += event.efo_expenses;
      eventUnitData[unitId].non_official_expenses += event.non_official_expenses;
      eventUnitData[unitId].profit += event.profit;
    });

    eventsData = Object.values(eventUnitData).sort((a, b) => a.unitName.localeCompare(b.unitName));

    eventsTotals = {
      eventCount: eventsData.reduce((sum, r) => sum + r.eventCount, 0),
      total_revenue: eventsData.reduce((sum, r) => sum + r.total_revenue, 0),
      total_expenses: eventsData.reduce((sum, r) => sum + r.total_expenses, 0),
      official_expenses: eventsData.reduce((sum, r) => sum + r.official_expenses, 0),
      efo_expenses: eventsData.reduce((sum, r) => sum + r.efo_expenses, 0),
      non_official_expenses: eventsData.reduce((sum, r) => sum + r.non_official_expenses, 0),
      profit: eventsData.reduce((sum, r) => sum + r.profit, 0),
    };
  }

  // Calculate grand totals (units + events)
  const grandTotals = {
    totalRevenue: totals.totalSoftware + eventsTotals.total_revenue,
    totalResult: totals.dailyResult + eventsTotals.profit,
  };

  return { data, totals, eventsData, eventsTotals, eventsList, grandTotals };
}

async function fetchCashRevenueAllUnits(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(cash_payment, card_payment)')
    .gte('date', startDate)
    .lte('date', endDate);

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)
    .eq('payment_method', 'cash');

  // Group by unit
  const unitData = {};
  (revenues || []).forEach((row) => {
    const unitName = row.units?.name || 'Ismeretlen';
    const unitId = row.unit_id;

    if (!unitData[unitId]) {
      unitData[unitId] = {
        unitName,
        cashRegisterCash: 0,
        cashRegisterPocket: 0,
        reserveRevenue: 0,
        total: 0,
      };
    }

    const crRevenues = row.cash_register_revenue || [];
    const cashRegisterCash = crRevenues.reduce((sum, r) => sum + (parseFloat(r.cash_payment) || 0), 0);
    const cashRegisterCard = crRevenues.reduce((sum, r) => sum + (parseFloat(r.card_payment) || 0), 0);
    const cashRegisterTotal = cashRegisterCash + cashRegisterCard;

    unitData[unitId].cashRegisterCash += cashRegisterCash;
    unitData[unitId].totalSoftware = (unitData[unitId].totalSoftware || 0) + (parseFloat(row.total_revenue) || 0);
    unitData[unitId].cashRegisterTotal = (unitData[unitId].cashRegisterTotal || 0) + cashRegisterTotal;
  });

  // Add expenses to units
  const expensesByUnit = {};
  (expenses || []).forEach((exp) => {
    if (!expensesByUnit[exp.unit_id]) {
      expensesByUnit[exp.unit_id] = { invoice: 0, nonInvoice: 0 };
    }
    if (exp.is_official) {
      expensesByUnit[exp.unit_id].invoice += parseFloat(exp.amount) || 0;
    } else {
      expensesByUnit[exp.unit_id].nonInvoice += parseFloat(exp.amount) || 0;
    }
  });

  // Calculate for each unit
  Object.keys(unitData).forEach((unitId) => {
    const unit = unitData[unitId];
    const unitExpenses = expensesByUnit[unitId] || { invoice: 0, nonInvoice: 0 };
    unit.cashRegisterPocket = unit.cashRegisterCash - unitExpenses.invoice;
    unit.reserveRevenue = unit.totalSoftware - unit.cashRegisterTotal - unitExpenses.nonInvoice;
    unit.total = unit.cashRegisterPocket + unit.reserveRevenue;
  });

  const data = Object.values(unitData).sort((a, b) => a.unitName.localeCompare(b.unitName));

  const totals = {
    cashRegisterCash: data.reduce((sum, r) => sum + r.cashRegisterCash, 0),
    cashRegisterPocket: data.reduce((sum, r) => sum + r.cashRegisterPocket, 0),
    reserveRevenue: data.reduce((sum, r) => sum + r.reserveRevenue, 0),
    total: data.reduce((sum, r) => sum + r.total, 0),
  };

  return { data, totals };
}

// Sum of the EUR-denominated elütés entries recorded on one closure. HUF
// entries are handled separately (they move the house cash); the EUR ones are
// only reported, so they are summed for the period as their own column.
function eurDiscrepancyOf(cr) {
  if (!Array.isArray(cr?.discrepancies)) return 0;
  return cr.discrepancies.reduce(
    (sum, d) => sum + (d?.currency === 'EUR' ? (parseFloat(d.amount) || 0) : 0),
    0
  );
}

async function fetchCashRegisterAllUnitsSimple(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, szep_card_payment, terminal_card, software_revenue, closure_number, closure_sequence, cumulative_revenue, discrepancies, cash_registers(id, ap_number, name))')
    .gte('date', startDate)
    .lte('date', endDate);

  // Group by unit
  const unitData = {};
  (revenues || []).forEach((row) => {
    const unitName = row.units?.name || 'Ismeretlen';
    const unitId = row.unit_id;

    if (!unitData[unitId]) {
      unitData[unitId] = {
        unitId,
        unitName,
        cashRegisterTotal: 0,
        cash: 0,
        card: 0,
        terminal_card: 0,
        eur: 0,
        registers: {},
      };
    }

    const crRevenues = row.cash_register_revenue || [];
    crRevenues.forEach((cr) => {
      const registerId = cr.cash_registers?.ap_number || 'unknown';
      const registerName = cr.cash_registers?.name || '';

      if (!unitData[unitId].registers[registerId]) {
        unitData[unitId].registers[registerId] = {
          // DB id, for the "göngyölt ellenőrizve" tick of this period.
          registerId: cr.cash_registers?.id || null,
          ap_number: registerId,
          name: registerName,
          total: 0,
          cash: 0,
          card: 0,
          szep: 0,
          terminal_card: 0,
          eur: 0,
          huf: 0,
          vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0,
          software: 0,
          closures: [],
        };
      }

      const total = (parseFloat(cr.vat_0_percent) || 0) +
        (parseFloat(cr.vat_5_percent) || 0) +
        (parseFloat(cr.vat_18_percent) || 0) +
        (parseFloat(cr.vat_27_percent) || 0); // borravaló nélkül
      const eur = eurDiscrepancyOf(cr);

      const reg = unitData[unitId].registers[registerId];
      reg.szep += parseFloat(cr.szep_card_payment) || 0;
      reg.huf += hufDiscrepancyOf(cr);
      reg.eur += eur;
      reg.vat_0 += parseFloat(cr.vat_0_percent) || 0;
      reg.vat_5 += parseFloat(cr.vat_5_percent) || 0;
      reg.vat_18 += parseFloat(cr.vat_18_percent) || 0;
      reg.vat_27 += parseFloat(cr.vat_27_percent) || 0;
      reg.tips += parseFloat(cr.tips) || 0;
      reg.software += parseFloat(cr.software_revenue) || 0;
      reg.closures.push({
        date: row.date,
        closure_number: cr.closure_number ?? 1,
        sequence: cr.closure_sequence == null || cr.closure_sequence === '' ? null : Number(cr.closure_sequence),
        cumulative: cr.cumulative_revenue == null || cr.cumulative_revenue === '' ? null : Number(cr.cumulative_revenue),
      });

      unitData[unitId].registers[registerId].total += total;
      unitData[unitId].registers[registerId].cash += parseFloat(cr.cash_payment) || 0;
      unitData[unitId].registers[registerId].card += parseFloat(cr.card_payment) || 0;
      unitData[unitId].registers[registerId].terminal_card += parseFloat(cr.terminal_card) || 0;

      unitData[unitId].cashRegisterTotal += total;
      unitData[unitId].cash += parseFloat(cr.cash_payment) || 0;
      unitData[unitId].card += parseFloat(cr.card_payment) || 0;
      unitData[unitId].terminal_card += parseFloat(cr.terminal_card) || 0;
      unitData[unitId].eur += eur;
    });
  });

  const data = Object.values(unitData).map((unit) => ({
    ...unit,
    registers: Object.values(unit.registers).map((reg) => ({
      ...reg,
      // Closure summary: first/last closure number + last cumulative revenue.
      ...closureSummary(reg.closures),
      // Same shape the summary component expects for the novo figure.
      totals: { software: reg.software },
    })),
  })).sort((a, b) => a.unitName.localeCompare(b.unitName));

  const totals = {
    cashRegisterTotal: data.reduce((sum, r) => sum + r.cashRegisterTotal, 0),
    cash: data.reduce((sum, r) => sum + r.cash, 0),
    card: data.reduce((sum, r) => sum + r.card, 0),
    terminal_card: data.reduce((sum, r) => sum + r.terminal_card, 0),
    eur: data.reduce((sum, r) => sum + (r.eur || 0), 0),
  };

  return { data, totals };
}

// Könyvelési nézet: NEM egységre, hanem PÉNZTÁRGÉPRE bontva. Egy gép AP-száma
// akkor is egyetlen sor, ha az időszakban több egységnél is dolgozott — a
// zárás-sorszám és a göngyölt forgalom a gép saját, folyamatos számlálója,
// tehát csak így áll össze értelmes sorrá. Az egység csak a sorrendezéshez
// kell, oszlopként nem jelenik meg.
async function fetchCashRegisterAccounting(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, szep_card_payment, terminal_card, software_revenue, guest_count, terminal_card_total, terminal_szep, closure_number, closure_sequence, cumulative_revenue, discrepancies, discrepancy_note, discrepancy_amount, cash_registers(id, ap_number, name))')
    .gte('date', startDate)
    .lte('date', endDate);

  const byAp = {};
  (revenues || []).forEach((row) => {
    const unitName = row.units?.name || 'Ismeretlen';
    const crRevenues = (row.cash_register_revenue || []).filter((cr) => !isBlankClosure(cr));

    crRevenues.forEach((cr) => {
      const apNumber = cr.cash_registers?.ap_number || 'ismeretlen';

      if (!byAp[apNumber]) {
        byAp[apNumber] = {
          registerId: cr.cash_registers?.id || null,
          ap_number: apNumber,
          name: cr.cash_registers?.name || '',
          // A sorrendezéshez: melyik egységnél bukkant fel először az időszakban.
          firstUnitName: unitName,
          firstDate: row.date,
          unitNames: new Set([unitName]),
          vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0,
          cash: 0, card: 0, szep: 0, terminal_card: 0,
          eur: 0, huf: 0,
          closures: [],
        };
      }

      const reg = byAp[apNumber];
      reg.unitNames.add(unitName);
      if (row.date < reg.firstDate) {
        reg.firstDate = row.date;
        reg.firstUnitName = unitName;
      }
      if (!reg.name && cr.cash_registers?.name) reg.name = cr.cash_registers.name;

      reg.vat_0 += parseFloat(cr.vat_0_percent) || 0;
      reg.vat_5 += parseFloat(cr.vat_5_percent) || 0;
      reg.vat_18 += parseFloat(cr.vat_18_percent) || 0;
      reg.vat_27 += parseFloat(cr.vat_27_percent) || 0;
      reg.cash += parseFloat(cr.cash_payment) || 0;
      reg.card += parseFloat(cr.card_payment) || 0;
      reg.szep += parseFloat(cr.szep_card_payment) || 0;
      reg.terminal_card += parseFloat(cr.terminal_card) || 0;
      reg.eur += eurDiscrepancyOf(cr);
      reg.huf += hufDiscrepancyOf(cr);

      reg.closures.push({
        date: row.date,
        closure_number: cr.closure_number ?? 1,
        sequence: cr.closure_sequence == null || cr.closure_sequence === '' ? null : Number(cr.closure_sequence),
        cumulative: cr.cumulative_revenue == null || cr.cumulative_revenue === '' ? null : Number(cr.cumulative_revenue),
      });
    });
  });

  const data = Object.values(byAp)
    .map((reg) => ({
      ...reg,
      unitNames: Array.from(reg.unitNames).sort((a, b) => a.localeCompare(b)),
      // Időszaki forgalom: az ÁFA-kulcsok összege, borravaló nélkül.
      total: reg.vat_0 + reg.vat_5 + reg.vat_18 + reg.vat_27,
      ...closureSummary(reg.closures),
    }))
    // Egységek szerint sorrendben, azon belül AP-szám szerint.
    .sort(
      (a, b) =>
        a.firstUnitName.localeCompare(b.firstUnitName) ||
        (a.ap_number || '').localeCompare(b.ap_number || '')
    );

  const sum = (key) => data.reduce((s, r) => s + (r[key] || 0), 0);
  const totals = {
    vat_0: sum('vat_0'), vat_5: sum('vat_5'), vat_18: sum('vat_18'), vat_27: sum('vat_27'),
    cash: sum('cash'), card: sum('card'), szep: sum('szep'),
    terminal_card: sum('terminal_card'), total: sum('total'), eur: sum('eur'),
  };
  totals.discrepancy = totals.card - totals.terminal_card;

  return { data, totals };
}

async function fetchCashRegisterAllUnitsDetailed(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, szep_card_payment, terminal_card, terminal_discrepancy_note, discrepancies, discrepancy_note, discrepancy_amount, software_revenue, guest_count, terminal_card_total, terminal_szep, cumulative_revenue, closure_number, closure_sequence, cash_registers(ap_number, name))')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  // Group by unit, then by register, then list days
  const unitData = {};
  (revenues || []).forEach((row) => {
    const unitName = row.units?.name || 'Ismeretlen';
    const unitId = row.unit_id;

    const crRevenues = (row.cash_register_revenue || []).filter((cr) => !isBlankClosure(cr));
    if (crRevenues.length === 0) return;

    if (!unitData[unitId]) {
      unitData[unitId] = {
        unitId,
        unitName,
        registers: {},
        totals: {
          vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0,
          total: 0, cash: 0, card: 0, terminal_card: 0, eur: 0,
        },
      };
    }

    crRevenues.forEach((cr) => {
      const apNumber = cr.cash_registers?.ap_number || 'unknown';
      const registerName = cr.cash_registers?.name || '';

      if (!unitData[unitId].registers[apNumber]) {
        unitData[unitId].registers[apNumber] = {
          ap_number: apNumber,
          name: registerName,
          days: [],
          totals: {
            vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0,
            total: 0, cash: 0, card: 0, terminal_card: 0, eur: 0,
          },
        };
      }

      const dayData = {
        date: row.date,
        // Needed for the deep link back to the daily entry of this closure.
        unitId,
        apNumber,
        closureNumber: cr.closure_number ?? 1,
        eur: eurDiscrepancyOf(cr),
        vat_0: parseFloat(cr.vat_0_percent) || 0,
        vat_5: parseFloat(cr.vat_5_percent) || 0,
        vat_18: parseFloat(cr.vat_18_percent) || 0,
        vat_27: parseFloat(cr.vat_27_percent) || 0,
        tips: parseFloat(cr.tips) || 0,
        cash: parseFloat(cr.cash_payment) || 0,
        card: parseFloat(cr.card_payment) || 0,
        szep: parseFloat(cr.szep_card_payment) || 0,
        terminal_card: parseFloat(cr.terminal_card) || 0,
        // Closure-level fields used to auto-detect discrepancies and whether a
        // protocol ("jegyzőkönyv") was recorded for them (see computeProtocolMark).
        terminalNote: (cr.terminal_discrepancy_note || '').trim(),
        discrepancyCount: Array.isArray(cr.discrepancies) ? cr.discrepancies.length : 0,
        discrepancyDocumented: hasDocumentedDiscrepancy(cr),
        cumulative: parseFloat(cr.cumulative_revenue) || 0,
        closureSeq: cr.closure_sequence ?? cr.closure_number ?? null,
      };
      // Register turnover = the ÁFA buckets. Borravaló is its own column, not part of it.
      dayData.total = dayData.vat_0 + dayData.vat_5 + dayData.vat_18 + dayData.vat_27;
      dayData.discrepancy = dayData.card - dayData.terminal_card;
      // A "rossz fizetési mód" elütés moving exactly the difference on/off the
      // card explains it (the terminal is the true figure).
      dayData.terminalExplained = validateCardPayments(
        dayData.card, dayData.terminal_card, methodCardAdjustmentOf(cr)
      ).explainedByDiscrepancy;
      // Turnover that the cumulative (göngyölt) Z-report increments by: VAT
      // buckets only, tips excluded (matches the daily form's validation).
      dayData.turnover = dayData.vat_0 + dayData.vat_5 + dayData.vat_18 + dayData.vat_27;
      // Payment breakdown: the VAT buckets must equal KP + kártya + SZÉP.
      // A recorded forint elütés of the same size explains the gap.
      dayData.huf = hufDiscrepancyOf(cr);
      const breakdown = validatePaymentBreakdown({
        vatTotal: dayData.turnover,
        cash: dayData.cash,
        card: dayData.card,
        szep: dayData.szep,
        hufDiscrepancy: dayData.huf,
      });
      dayData.paid = breakdown.paid;
      dayData.paymentDiff = breakdown.difference;
      dayData.paymentGap = breakdown.applicable && !breakdown.isValid;

      unitData[unitId].registers[apNumber].days.push(dayData);

      // Update register totals
      unitData[unitId].registers[apNumber].totals.vat_0 += dayData.vat_0;
      unitData[unitId].registers[apNumber].totals.vat_5 += dayData.vat_5;
      unitData[unitId].registers[apNumber].totals.vat_18 += dayData.vat_18;
      unitData[unitId].registers[apNumber].totals.vat_27 += dayData.vat_27;
      unitData[unitId].registers[apNumber].totals.tips += dayData.tips;
      unitData[unitId].registers[apNumber].totals.total += dayData.total;
      unitData[unitId].registers[apNumber].totals.cash += dayData.cash;
      unitData[unitId].registers[apNumber].totals.card += dayData.card;
      unitData[unitId].registers[apNumber].totals.terminal_card += dayData.terminal_card;
      unitData[unitId].registers[apNumber].totals.eur += dayData.eur;

      // Update unit totals
      unitData[unitId].totals.vat_0 += dayData.vat_0;
      unitData[unitId].totals.vat_5 += dayData.vat_5;
      unitData[unitId].totals.vat_18 += dayData.vat_18;
      unitData[unitId].totals.vat_27 += dayData.vat_27;
      unitData[unitId].totals.tips += dayData.tips;
      unitData[unitId].totals.total += dayData.total;
      unitData[unitId].totals.cash += dayData.cash;
      unitData[unitId].totals.card += dayData.card;
      unitData[unitId].totals.terminal_card += dayData.terminal_card;
      unitData[unitId].totals.eur += dayData.eur;
    });
  });

  // Convert registers object to array and calculate discrepancies
  const data = Object.values(unitData).map((unit) => ({
    ...unit,
    registers: Object.values(unit.registers || {}).sort((a, b) => (a.ap_number || '').localeCompare(b.ap_number || '')),
    totals: {
      ...(unit.totals || { vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0, total: 0, cash: 0, card: 0, terminal_card: 0, eur: 0 }),
      discrepancy: (unit.totals?.card || 0) - (unit.totals?.terminal_card || 0),
    },
  })).sort((a, b) => (a.unitName || '').localeCompare(b.unitName || ''));

  // Add discrepancy to register totals and auto-mark protocol status per closure
  data.forEach((unit) => {
    (unit.registers || []).forEach((reg) => {
      if (reg.totals) {
        reg.totals.discrepancy = reg.totals.card - reg.totals.terminal_card;
      }
      computeRegisterProtocolMarks(reg.days || []);
    });
  });

  const totals = {
    vat_0: data.reduce((sum, r) => sum + (r.totals?.vat_0 || 0), 0),
    vat_5: data.reduce((sum, r) => sum + (r.totals?.vat_5 || 0), 0),
    vat_18: data.reduce((sum, r) => sum + (r.totals?.vat_18 || 0), 0),
    vat_27: data.reduce((sum, r) => sum + (r.totals?.vat_27 || 0), 0),
    tips: data.reduce((sum, r) => sum + (r.totals?.tips || 0), 0),
    total: data.reduce((sum, r) => sum + (r.totals?.total || 0), 0),
    cash: data.reduce((sum, r) => sum + (r.totals?.cash || 0), 0),
    card: data.reduce((sum, r) => sum + (r.totals?.card || 0), 0),
    terminal_card: data.reduce((sum, r) => sum + (r.totals?.terminal_card || 0), 0),
    discrepancy: data.reduce((sum, r) => sum + (r.totals?.discrepancy || 0), 0),
    eur: data.reduce((sum, r) => sum + (r.totals?.eur || 0), 0),
  };

  return { data, totals };
}

async function fetchEventsAllUnits(startDate, endDate) {
  const { data: events } = await supabase
    .from('events')
    .select('*, units(name)')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true });

  if (!events?.length) {
    return { data: [], totals: {}, eventsList: [] };
  }

  const eventIds = events.map((e) => e.id);

  const [revenuesResult, expensesResult] = await Promise.all([
    supabase.from('event_revenues').select('event_id, amount').in('event_id', eventIds),
    supabase.from('event_expenses').select('event_id, amount, is_efo, is_official').in('event_id', eventIds),
  ]);

  const revenueByEvent = {};
  const expenseByEvent = {};

  (revenuesResult.data || []).forEach((r) => {
    revenueByEvent[r.event_id] = (revenueByEvent[r.event_id] || 0) + parseFloat(r.amount);
  });

  (expensesResult.data || []).forEach((e) => {
    if (!expenseByEvent[e.event_id]) {
      expenseByEvent[e.event_id] = { total: 0, official: 0, efo: 0, nonOfficial: 0 };
    }
    const amount = parseFloat(e.amount) || 0;
    expenseByEvent[e.event_id].total += amount;
    if (e.is_efo) {
      expenseByEvent[e.event_id].efo += amount;
    } else if (e.is_official === false) {
      expenseByEvent[e.event_id].nonOfficial += amount;
    } else {
      expenseByEvent[e.event_id].official += amount;
    }
  });

  // Build events list with details
  const eventsList = events.map((event) => {
    const expenses = expenseByEvent[event.id] || { total: 0, official: 0, efo: 0, nonOfficial: 0 };
    const revenue = revenueByEvent[event.id] || 0;
    return {
      ...event,
      unitName: event.units?.name || 'Ismeretlen',
      total_revenue: revenue,
      total_expenses: expenses.total,
      official_expenses: expenses.official,
      efo_expenses: expenses.efo,
      non_official_expenses: expenses.nonOfficial,
      profit: revenue - expenses.total,
    };
  });

  // Group by unit
  const unitData = {};
  eventsList.forEach((event) => {
    const unitId = event.unit_id;

    if (!unitData[unitId]) {
      unitData[unitId] = {
        unitName: event.unitName,
        eventCount: 0,
        total_revenue: 0,
        total_expenses: 0,
        official_expenses: 0,
        efo_expenses: 0,
        non_official_expenses: 0,
        profit: 0,
      };
    }

    unitData[unitId].eventCount += 1;
    unitData[unitId].total_revenue += event.total_revenue;
    unitData[unitId].total_expenses += event.total_expenses;
    unitData[unitId].official_expenses += event.official_expenses;
    unitData[unitId].efo_expenses += event.efo_expenses;
    unitData[unitId].non_official_expenses += event.non_official_expenses;
    unitData[unitId].profit += event.profit;
  });

  const data = Object.values(unitData).sort((a, b) => a.unitName.localeCompare(b.unitName));

  const totals = {
    eventCount: data.reduce((sum, r) => sum + r.eventCount, 0),
    total_revenue: data.reduce((sum, r) => sum + r.total_revenue, 0),
    total_expenses: data.reduce((sum, r) => sum + r.total_expenses, 0),
    official_expenses: data.reduce((sum, r) => sum + r.official_expenses, 0),
    efo_expenses: data.reduce((sum, r) => sum + r.efo_expenses, 0),
    non_official_expenses: data.reduce((sum, r) => sum + r.non_official_expenses, 0),
    profit: data.reduce((sum, r) => sum + r.profit, 0),
  };

  return { data, totals, eventsList };
}

// ============================================
// REPORT COMPONENTS
// ============================================

function FullMonthlyReport({ data, totals, unitName, startDate, endDate }) {
  const navigate = useNavigate();
  const [expandedDays, setExpandedDays] = useState({});

  // Include every day of the selected range on the chart, even days with no
  // revenue (shown as 0), so gaps are visible rather than skipped.
  const chartData = fillDailySeries(data, startDate, endDate, {
    totalSoftware: 0,
    cashRegisterCash: 0,
    cashRegisterCard: 0,
    reserveRevenue: 0,
  });

  const toggleDay = (date) => {
    setExpandedDays((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  const title = unitName ? `Teljes havi forgalom - ${unitName}` : 'Teljes havi forgalom';

  return (
    <Card title={title}>
      <p className="text-sm text-gray-500 mb-3">Kattints egy sorra a szerkesztéshez, vagy a + gombra a költségek megtekintéséhez</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-pepper-red bg-opacity-10">
            <tr>
              <th className="px-2 py-2 text-left w-8"></th>
              <th className="px-3 py-2 text-left">Dátum</th>
              <th className="px-3 py-2 text-right">Létszám</th>
              <th className="px-3 py-2 text-right">Novo</th>
              <th className="px-3 py-2 text-right">KP</th>
              <th className="px-3 py-2 text-right">Kártya</th>
              <th className="px-3 py-2 text-right">Tartalék</th>
              <th className="px-3 py-2 text-right font-semibold bg-pepper-red bg-opacity-20">Összesen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row, rowIdx) => (
              <React.Fragment key={`row-${rowIdx}-${row.id}`}>
                <tr
                  className={`hover:bg-gray-100 transition-colors ${row.mark_color ? MARK_COLORS[row.mark_color] : ''}`}
                >
                  <td className="px-2 py-2">
                    {row.expenses?.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDay(row.date); }}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500"
                      >
                        {expandedDays[row.date] ? '−' : '+'}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 cursor-pointer" onClick={() => navigate(`/daily?date=${row.date}&unit=${row.unit_id}`)}>
                    {formatDate(row.date)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">{row.guest_count || 0}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.totalSoftware)}</td>
                  <td className="px-3 py-2 text-right text-green-600">{formatCurrency(row.cashRegisterCash)}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(row.cashRegisterCard)}</td>
                  <td className="px-3 py-2 text-right text-purple-600">{formatCurrency(row.reserveRevenue)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">
                    {formatCurrency(row.totalSoftware)}
                  </td>
                </tr>
                {expandedDays[row.date] && row.expenses?.length > 0 && (
                  <tr className="bg-red-50">
                    <td colSpan={8} className="px-4 py-2">
                      <div className="pl-8 space-y-1">
                        <p className="text-xs font-medium text-gray-500 mb-2">Napi költségek:</p>
                        {row.expenses.map((exp) => (
                          <div key={exp.id} className="flex justify-between text-sm text-red-700">
                            <span>{exp.supplier_name} {exp.item_description ? `- ${exp.item_description}` : ''} {!exp.is_official && '(nem számlás)'}</span>
                            <span className="font-medium">-{formatCurrency(exp.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-2 py-2"></td>
              <td className="px-3 py-2">Összesen</td>
              <td className="px-3 py-2 text-right text-gray-900">{totals.guestCount || 0}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(totals.totalSoftware)}</td>
              <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.cashRegisterCash)}</td>
              <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(totals.cashRegisterCard)}</td>
              <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(totals.reserveRevenue)}</td>
              <td className="px-3 py-2 text-right text-gray-900">
                {formatCurrency(totals.totalSoftware)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Novo bevétel</p>
            <p className="text-lg font-bold text-gray-700">{formatCurrency(totals.totalSoftware)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-green-600">Pénztárgép KP</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totals.cashRegisterCash)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-600">Pénztárgép Kártya</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(totals.cashRegisterCard)}</p>
          </div>
          <div className="bg-pepper-red bg-opacity-10 rounded-lg p-3">
            <p className="text-sm text-pepper-red">Összesen</p>
            <p className="text-lg font-bold text-pepper-red">{formatCurrency(totals.totalSoftware)}</p>
          </div>
        </div>
      </div>

      {/* Revenue trend chart (includes 0-revenue days across the range) */}
      {chartData.length > 1 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Napi forgalom alakulása</h4>
          <RevenueTrendChart
            data={chartData.map((row) => ({
              label: formatDate(row.date).split('.').slice(1).join('.').trim(),
              value: row.totalSoftware,
            }))}
            height={180}
          />
        </div>
      )}
    </Card>
  );
}

function CashRevenueReport({ data, totals, unitName }) {
  const navigate = useNavigate();

  const title = unitName ? `Készpénz bevételek - ${unitName}` : 'Készpénz bevételek';

  return (
    <Card title={title}>
      <p className="text-sm text-gray-500 mb-3">Kattints egy sorra a szerkesztéshez</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-pepper-red bg-opacity-10">
            <tr>
              <th className="px-4 py-2 text-left">Dátum</th>
              <th className="px-4 py-2 text-right">Pénztár zseb</th>
              <th className="px-4 py-2 text-right">Tartalék bevétel</th>
              <th className="px-4 py-2 text-right font-semibold bg-pepper-red bg-opacity-20">Összesen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => navigate(`/daily?date=${row.date}&unit=${row.unit_id}`)}
                className={`hover:bg-gray-100 cursor-pointer transition-colors ${row.mark_color ? MARK_COLORS[row.mark_color] : ''}`}
              >
                <td className="px-4 py-2">{formatDate(row.date)}</td>
                <td className="px-4 py-2 text-right text-green-600">{formatCurrency(row.cashRegisterPocket)}</td>
                <td className="px-4 py-2 text-right text-purple-600">{formatCurrency(row.reserveRevenue)}</td>
                <td className="px-4 py-2 text-right font-semibold">{formatCurrency(row.total)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-2">Összesen</td>
              <td className="px-4 py-2 text-right text-green-700">{formatCurrency(totals.cashRegisterPocket)}</td>
              <td className="px-4 py-2 text-right text-purple-700">{formatCurrency(totals.reserveRevenue)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-green-600">Pénztár zseb</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totals.cashRegisterPocket)}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-sm text-purple-600">Tartalék bevétel</p>
            <p className="text-lg font-bold text-purple-700">{formatCurrency(totals.reserveRevenue)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-600">Összes készpénz</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(totals.total)}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Closure/novo summary shown under a register's heading in the reports.
function RegisterClosureSummary({ register }) {
  const val = (v) => (v == null ? '-' : v);
  return (
    <div className="text-xs font-normal text-gray-600 flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
      <span>Első zárás: <span className="font-medium">{val(register.firstSequence)}</span></span>
      <span>Utolsó zárás: <span className="font-medium">{val(register.lastSequence)}</span></span>
      <span>
        Utolsó göngyölt:{' '}
        <span className="font-medium">
          {register.lastCumulative == null ? '-' : formatCurrency(register.lastCumulative)}
        </span>
      </span>
      <span>Novo forgalom: <span className="font-medium">{formatCurrency(register.totals?.software || 0)}</span></span>
    </div>
  );
}

// Dense column layout for the unit's own register report, shared by the daily
// rows and the register subtotal so they line up.
const UNIT_COLS = [78, 88, 88, 88, 96, 96, 96, 96, 104, 84, 40, 80, 88];
const UNIT_WIDTH = UNIT_COLS.reduce((s, w) => s + w, 0);

function UnitColGroup() {
  return (
    <colgroup>
      {UNIT_COLS.map((w, i) => (
        <col key={i} style={{ width: `${w}px` }} />
      ))}
    </colgroup>
  );
}

function CashRegisterReport({ data, totals, unitName }) {
  const navigate = useNavigate();

  const gapTitle = (day) =>
    `Az ÁFA-kulcsok szerinti forgalom (${formatCurrency(day.turnover)}, borravaló nélkül) nem egyezik ` +
    `a fizetési módok összegével: KP ${formatCurrency(day.cash)} + kártya ${formatCurrency(day.card)}` +
    `${(day.szep || 0) !== 0 ? ` + SZÉP ${formatCurrency(day.szep)}` : ''} = ${formatCurrency(day.paid)}. ` +
    `Eltérés: ${formatCurrency(day.paymentDiff)}.` +
    `${(day.hufDiscrepancy || 0) !== 0
      ? ` Rögzített Ft elütés: ${formatCurrency(day.hufDiscrepancy)} – nem fedi az eltérést.`
      : ' Nincs rögzített Ft elütés.'}`;

  const elutesTitle = (day) => {
    const parts = [];
    if ((day.hufDiscrepancy || 0) !== 0) parts.push(`Téves összeg: ${formatCurrency(day.hufDiscrepancy)}`);
    if ((day.eurDiscrepancy || 0) !== 0) parts.push(`EUR elütés: ${formatCurrency(day.eurDiscrepancy, 'EUR')}`);
    if (day.discrepancyCount > 0) parts.push(`Rögzített elütések száma: ${day.discrepancyCount}`);
    return parts.length ? parts.join(' · ') : undefined;
  };

  const TD = 'px-2.5 py-1.5 whitespace-nowrap';
  const num = `${TD} text-right`;
  const tableStyle = { minWidth: `${UNIT_WIDTH}px` };

  return (
    <Card title={unitName ? `Pénztárgép jelentés - ${unitName}` : 'Pénztárgép jelentés'}>
      <p className="text-xs text-gray-500 mb-3">
        Kattints egy sorra a szerkesztéshez. Oldalra görgetés: Shift + egérgörgő. Az összegek forintban (az Elütés oszlop EUR elütést is
        jelezhet, lásd a tooltipet).
        {' '}<span className="font-semibold">Jkv.</span> oszlop: eltérés esetén automatikus jelölés –{' '}
        <span className="text-green-600 font-bold">✓</span> jegyzőkönyv (elütés) rendben,{' '}
        <span className="text-red-600 font-bold">✗</span> hiányzik. Üres = nincs eltérés.
        {' '}Az <span className="font-semibold">Összesen</span> piros, ha az ÁFA-kulcsok összege nem
        egyezik a KP + kártya összegével. A jelölt értékek fölé állva látszik a magyarázat.
      </p>

      {/* One scroll container for every register, so the register heading and the
          column headers stay pinned while scrolling and hand over to the next
          register when its block reaches the top. */}
      <div className="max-h-[75vh] overflow-auto space-y-6 print:max-h-none print:overflow-visible">
        {data.map((register, regIdx) => (
          <div key={`register-${regIdx}-${register.ap_number}`} className="border border-gray-200 rounded-lg">
            <div className="sticky top-0 z-20 bg-red-50 px-4 py-2 font-bold text-gray-900 border-b border-gray-200">
              <div>Pénztárgép: {register.ap_number} {register.name && `(${register.name})`}</div>
              <RegisterClosureSummary register={register} />
            </div>
            <div>
              <table
                className="min-w-full divide-y divide-gray-200 text-xs tabular-nums table-fixed"
                style={tableStyle}
              >
                <UnitColGroup />
                <thead className="bg-gray-50 sticky top-[62px] z-10">
                  <tr>
                    <th className={`${TD} text-left`}>Dátum</th>
                    <th className={num}>0%</th>
                    <th className={num}>5%</th>
                    <th className={num}>18%</th>
                    <th className={num}>27%</th>
                    <th className={num}>KP</th>
                    <th className={num}>Kártya</th>
                    <th className={num}>Term.</th>
                    <th className={`${num} font-semibold`}>Összesen</th>
                    <th className={num}>Elt.</th>
                    <th className={`${TD} text-center`}>Jkv.</th>
                    <th className={num}>Borr.</th>
                    <th className={num}>Elütés</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(register.days || []).map((day, dayIdx) => (
                    <tr
                      key={`${regIdx}-${dayIdx}-${day.date}-${day.closureSeq ?? ''}`}
                      onClick={() => navigate(`/daily?date=${day.date}&unit=${day.unit_id}`)}
                      className="hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <td className={TD}>{formatDate(day.date)}</td>
                      <td className={num}>{denseAmount(day.vat_0)}</td>
                      <td className={num}>{denseAmount(day.vat_5)}</td>
                      <td className={num}>{denseAmount(day.vat_18)}</td>
                      <td className={num}>{denseAmount(day.vat_27)}</td>
                      <td className={num}>{denseAmount(day.cash)}</td>
                      <td className={num}>{denseAmount(day.card)}</td>
                      <td className={num}>{denseAmount(day.terminal_card)}</td>
                      <td
                        className={`${num} font-medium ${day.paymentGap ? 'text-red-600 bg-red-50 cursor-help' : ''}`}
                        title={day.paymentGap ? gapTitle(day) : undefined}
                      >
                        {denseAmount(day.total)}
                      </td>
                      <td
                        className={`${num} ${
                          Math.abs(day.cardDiscrepancy) > REGISTER_TOLERANCE
                            ? day.terminalExplained
                              ? 'text-green-700 font-medium'
                              : 'text-orange-600 font-medium'
                            : ''
                        }`}
                        title={
                          Math.abs(day.cardDiscrepancy) > REGISTER_TOLERANCE
                            ? `Pénztárgép kártya (${formatCurrency(day.card)}) és terminál (${formatCurrency(day.terminal_card)}) eltérése` +
                              (day.terminalExplained
                                ? ' – a rögzített „rossz fizetési mód” elütés kiadja.'
                                : ' – a terminál a mérvadó, vegyél fel „rossz fizetési mód” elütést.')
                            : undefined
                        }
                      >
                        {denseAmount(day.cardDiscrepancy)}
                      </td>
                      <td className={`${TD} text-center`}>
                        {day.protocolMark === 'ok' && (
                          <span
                            className="text-green-600 font-bold cursor-help"
                            title={(day.protocolReasons || []).join(' · ') || 'Eltérés – rendezve'}
                          >
                            ✓
                          </span>
                        )}
                        {day.protocolMark === 'missing' && (
                          <span
                            className="text-red-600 font-bold cursor-help"
                            title={(day.protocolReasons || []).join(' · ') || 'Eltérés – hiányzó jegyzőkönyv'}
                          >
                            ✗
                          </span>
                        )}
                      </td>
                      <td className={`${num} text-gray-500`}>{denseAmount(day.tips)}</td>
                      <td
                        className={`${num} ${
                          (day.hufDiscrepancy || 0) !== 0 || (day.eurDiscrepancy || 0) !== 0
                            ? 'text-orange-600 font-medium cursor-help'
                            : 'text-gray-300'
                        }`}
                        title={elutesTitle(day)}
                      >
                        {(day.hufDiscrepancy || 0) !== 0
                          ? denseAmount(day.hufDiscrepancy)
                          : (day.eurDiscrepancy || 0) !== 0
                            ? eurCell(day.eurDiscrepancy)
                            : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className={TD}>{register.ap_number} összesen</td>
                    <td className={num}>{denseAmount(register.totals?.vat_0)}</td>
                    <td className={num}>{denseAmount(register.totals?.vat_5)}</td>
                    <td className={num}>{denseAmount(register.totals?.vat_18)}</td>
                    <td className={num}>{denseAmount(register.totals?.vat_27)}</td>
                    <td className={num}>{denseAmount(register.totals?.cash)}</td>
                    <td className={num}>{denseAmount(register.totals?.card)}</td>
                    <td className={num}>{denseAmount(register.totals?.terminal_card)}</td>
                    <td className={num}>{denseAmount(register.totals?.total)}</td>
                    <td
                      className={`${num} ${
                        Math.abs(register.totals?.cardDiscrepancy || 0) > REGISTER_TOLERANCE ? 'text-orange-600' : ''
                      }`}
                    >
                      {denseAmount(register.totals?.cardDiscrepancy)}
                    </td>
                    <td className={`${TD} text-center`}>
                      {(register.totals?.missingProtocols || 0) > 0 && (
                        <span
                          className="text-red-600"
                          title={`${register.totals.missingProtocols} napon hiányzik a jegyzőkönyv`}
                        >
                          {register.totals.missingProtocols}✗
                        </span>
                      )}
                    </td>
                    <td className={num}>{denseAmount(register.totals?.tips)}</td>
                    <td className={num}>{denseAmount(register.totals?.hufDiscrepancy)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Per-register discrepancy warning */}
            {Math.abs(register.totals?.cardDiscrepancy || 0) > REGISTER_TOLERANCE && (
              <div className="m-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                <span className="text-red-800">
                  Kártya-terminál eltérés az időszakban: {formatCurrency(register.totals?.cardDiscrepancy || 0)}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Grand total */}
        <div className="bg-pepper-red bg-opacity-10 rounded-lg p-4">
          <h4 className="font-bold text-gray-900 mb-3">Mindösszesen</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Forgalom</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totals.cashRegisterTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Készpénz</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(totals.cash)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Kártya</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(totals.card)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Terminál</p>
              <p className="text-lg font-bold text-purple-700">{formatCurrency(totals.terminal_card)}</p>
            </div>
            {Math.abs(totals.cardDiscrepancy) > REGISTER_TOLERANCE && (
              <div>
                <p className="text-sm text-red-600">Eltérés</p>
                <p className="text-lg font-bold text-red-700">{formatCurrency(totals.cardDiscrepancy)}</p>
              </div>
            )}
            {(totals.missingProtocols || 0) > 0 && (
              <div>
                <p className="text-sm text-red-600">Hiányzó jkv.</p>
                <p className="text-lg font-bold text-red-700">{totals.missingProtocols} nap</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function EventsReport({ data, totals, unitName }) {
  const title = unitName ? `Rendezvény összesítő - ${unitName}` : 'Rendezvény összesítő';

  return (
    <Card title={title}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-pepper-red bg-opacity-10">
            <tr>
              <th className="px-3 py-2 text-left">Dátum</th>
              <th className="px-3 py-2 text-left">Rendezvény</th>
              <th className="px-3 py-2 text-right">Bevétel</th>
              <th className="px-3 py-2 text-right">Számlás</th>
              <th className="px-3 py-2 text-right">EFO</th>
              <th className="px-3 py-2 text-right">Nem számlás</th>
              <th className="px-3 py-2 text-right">Költség össz.</th>
              <th className="px-3 py-2 text-right font-semibold bg-pepper-red bg-opacity-20">Eredmény</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">{formatDate(row.event_date)}</td>
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2 text-right text-green-600">{formatCurrency(row.total_revenue)}</td>
                <td className="px-3 py-2 text-right text-red-600">{formatCurrency(row.official_expenses)}</td>
                <td className="px-3 py-2 text-right text-orange-600">{formatCurrency(row.efo_expenses)}</td>
                <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(row.non_official_expenses)}</td>
                <td className="px-3 py-2 text-right text-red-700">{formatCurrency(row.total_expenses)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${row.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(row.profit)}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-3 py-2" colSpan={2}>Összesen</td>
              <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.total_revenue)}</td>
              <td className="px-3 py-2 text-right text-red-700">{formatCurrency(totals.official_expenses)}</td>
              <td className="px-3 py-2 text-right text-orange-700">{formatCurrency(totals.efo_expenses)}</td>
              <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(totals.non_official_expenses)}</td>
              <td className="px-3 py-2 text-right text-red-800">{formatCurrency(totals.total_expenses)}</td>
              <td className={`px-3 py-2 text-right ${totals.profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                {formatCurrency(totals.profit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-green-600">Összes bevétel (bruttó)</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totals.total_revenue)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-sm text-red-600">Számlás költség</p>
            <p className="text-lg font-bold text-red-700">{formatCurrency(totals.official_expenses)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-sm text-orange-600">EFO költség</p>
            <p className="text-lg font-bold text-orange-700">{formatCurrency(totals.efo_expenses)}</p>
          </div>
          <div className={`rounded-lg p-3 ${totals.profit >= 0 ? 'bg-blue-50' : 'bg-red-100'}`}>
            <p className={`text-sm ${totals.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Eredmény</p>
            <p className={`text-lg font-bold ${totals.profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {formatCurrency(totals.profit)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Admin aggregate reports
function FullMonthlyAllUnitsReport({ data, totals, eventsData, eventsTotals, eventsList, grandTotals }) {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const hasEvents = eventsData && eventsData.length > 0;

  return (
    <div className="space-y-6">
      {/* Units section */}
      <Card title="Teljes havi forgalom - összes egység">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-pepper-red bg-opacity-10">
              <tr>
                <th className="px-3 py-2 text-left">Egység</th>
                <th className="px-3 py-2 text-right">Létszám</th>
                <th className="px-3 py-2 text-right">Novo</th>
                <th className="px-3 py-2 text-right">KP</th>
                <th className="px-3 py-2 text-right">Kártya</th>
                <th className="px-3 py-2 text-right">Tartalék</th>
                <th className="px-3 py-2 text-right font-semibold bg-pepper-red bg-opacity-20">Összesen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row) => (
                <tr key={row.unitName} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{row.unitName}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{row.guestCount || 0}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.totalSoftware)}</td>
                  <td className="px-3 py-2 text-right text-green-600">{formatCurrency(row.cashRegisterCash)}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(row.cashRegisterCard)}</td>
                  <td className="px-3 py-2 text-right text-purple-600">{formatCurrency(row.reserveRevenue)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">
                    {formatCurrency(row.totalSoftware)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="px-3 py-2">Egységek összesen</td>
                <td className="px-3 py-2 text-right text-gray-900">{totals.guestCount || 0}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(totals.totalSoftware)}</td>
                <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.cashRegisterCash)}</td>
                <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(totals.cashRegisterCard)}</td>
                <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(totals.reserveRevenue)}</td>
                <td className="px-3 py-2 text-right text-gray-900">
                  {formatCurrency(totals.totalSoftware)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Events section */}
      {hasEvents && (
        <Card title="Rendezvények összesítése">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-purple-100">
                <tr>
                  <th className="px-3 py-2 text-left">Egység</th>
                  <th className="px-3 py-2 text-right">Db</th>
                  <th className="px-3 py-2 text-right">Bevétel</th>
                  <th className="px-3 py-2 text-right">Számlás</th>
                  <th className="px-3 py-2 text-right">EFO</th>
                  <th className="px-3 py-2 text-right">Nem számlás</th>
                  <th className="px-3 py-2 text-right">Költség össz.</th>
                  <th className="px-3 py-2 text-right font-semibold bg-purple-200">Eredmény</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {eventsData.map((row) => (
                  <tr key={row.unitName} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{row.unitName}</td>
                    <td className="px-3 py-2 text-right">{row.eventCount}</td>
                    <td className="px-3 py-2 text-right text-green-600">{formatCurrency(row.total_revenue)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{formatCurrency(row.official_expenses)}</td>
                    <td className="px-3 py-2 text-right text-orange-600">{formatCurrency(row.efo_expenses)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(row.non_official_expenses)}</td>
                    <td className="px-3 py-2 text-right text-red-700">{formatCurrency(row.total_expenses)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${row.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(row.profit)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="px-3 py-2">Rendezvények összesen</td>
                  <td className="px-3 py-2 text-right">{eventsTotals.eventCount}</td>
                  <td className="px-3 py-2 text-right text-green-700">{formatCurrency(eventsTotals.total_revenue)}</td>
                  <td className="px-3 py-2 text-right text-red-700">{formatCurrency(eventsTotals.official_expenses)}</td>
                  <td className="px-3 py-2 text-right text-orange-700">{formatCurrency(eventsTotals.efo_expenses)}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(eventsTotals.non_official_expenses)}</td>
                  <td className="px-3 py-2 text-right text-red-800">{formatCurrency(eventsTotals.total_expenses)}</td>
                  <td className={`px-3 py-2 text-right ${eventsTotals.profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {formatCurrency(eventsTotals.profit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Expandable events list */}
          {eventsList && eventsList.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowAllEvents(!showAllEvents)}
                className="w-full flex items-center justify-between text-left font-medium text-gray-900 hover:text-pepper-red transition-colors"
              >
                <span>Rendezvények részletesen ({eventsList.length} db)</span>
                <span className="text-sm text-gray-500">{showAllEvents ? '▲ Összecsuk' : '▼ Kinyit'}</span>
              </button>

              {showAllEvents && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Dátum</th>
                        <th className="px-3 py-2 text-left">Egység</th>
                        <th className="px-3 py-2 text-left">Rendezvény</th>
                        <th className="px-3 py-2 text-right">Bevétel</th>
                        <th className="px-3 py-2 text-right">Számlás</th>
                        <th className="px-3 py-2 text-right">EFO</th>
                        <th className="px-3 py-2 text-right">Nem sz.</th>
                        <th className="px-3 py-2 text-right">Eredmény</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {eventsList.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{formatDate(event.event_date)}</td>
                          <td className="px-3 py-2 text-gray-600">{event.unitName}</td>
                          <td className="px-3 py-2">{event.name}</td>
                          <td className="px-3 py-2 text-right text-green-600">{formatCurrency(event.total_revenue)}</td>
                          <td className="px-3 py-2 text-right text-red-600">{formatCurrency(event.official_expenses)}</td>
                          <td className="px-3 py-2 text-right text-orange-600">{formatCurrency(event.efo_expenses)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(event.non_official_expenses)}</td>
                          <td className={`px-3 py-2 text-right font-semibold ${event.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {formatCurrency(event.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Grand total section */}
      <Card>
        <div className="bg-pepper-red bg-opacity-10 rounded-lg p-4">
          <h4 className="font-bold text-gray-900 mb-4 text-lg">Mindösszesen (Egységek + Rendezvények)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-sm text-gray-600">Egységek bevétel</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalSoftware)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-sm text-gray-600">Rendezvények bevétel</p>
              <p className="text-lg font-bold text-purple-700">{formatCurrency(eventsTotals?.total_revenue || 0)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-sm text-gray-600">Összes bevétel</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(grandTotals?.totalRevenue || totals.totalSoftware)}</p>
            </div>
            <div className={`bg-white rounded-lg p-3 shadow-sm ${(grandTotals?.totalResult || totals.dailyResult) >= 0 ? '' : 'bg-red-50'}`}>
              <p className={`text-sm ${(grandTotals?.totalResult || totals.dailyResult) >= 0 ? 'text-gray-600' : 'text-red-600'}`}>Összes eredmény</p>
              <p className={`text-xl font-bold ${(grandTotals?.totalResult || totals.dailyResult) >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                {formatCurrency(grandTotals?.totalResult || totals.dailyResult)}
              </p>
            </div>
          </div>
          {hasEvents && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Egységek eredménye</p>
                <p className={`text-lg font-bold ${totals.dailyResult >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(totals.dailyResult)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Rendezvények eredménye</p>
                <p className={`text-lg font-bold ${(eventsTotals?.profit || 0) >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                  {formatCurrency(eventsTotals?.profit || 0)}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function CashRevenueAllUnitsReport({ data, totals }) {
  return (
    <Card title="Készpénz bevételek - összes egység">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-pepper-red bg-opacity-10">
            <tr>
              <th className="px-4 py-2 text-left">Egység</th>
              <th className="px-4 py-2 text-right">Pénztár zseb</th>
              <th className="px-4 py-2 text-right">Tartalék bevétel</th>
              <th className="px-4 py-2 text-right font-semibold bg-pepper-red bg-opacity-20">Összesen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={row.unitName} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{row.unitName}</td>
                <td className="px-4 py-2 text-right text-green-600">{formatCurrency(row.cashRegisterPocket)}</td>
                <td className="px-4 py-2 text-right text-purple-600">{formatCurrency(row.reserveRevenue)}</td>
                <td className="px-4 py-2 text-right font-semibold">{formatCurrency(row.total)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-2">Mindösszesen</td>
              <td className="px-4 py-2 text-right text-green-700">{formatCurrency(totals.cashRegisterPocket)}</td>
              <td className="px-4 py-2 text-right text-purple-700">{formatCurrency(totals.reserveRevenue)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Wide reports scroll sideways, but the real scrollbar sits at the BOTTOM of a
// long table — you had to scroll the whole page down just to pan right. This
// wraps the table in a box that scrolls both ways (which is also what makes the
// sticky header work) and pins a second, synced scrollbar above it.
function WideTable({ children, maxHeight = '70vh' }) {
  const topRef = useRef(null);
  const bodyRef = useRef(null);
  const [size, setSize] = useState({ scrollWidth: 0, clientWidth: 0 });
  const syncing = useRef(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setSize({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [children]);

  // Mirror one scrollbar onto the other without the echo re-triggering us.
  const mirror = (from, to) => {
    if (!from || !to || syncing.current) return;
    syncing.current = true;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => { syncing.current = false; });
  };

  const overflowing = size.scrollWidth > size.clientWidth + 1;

  return (
    <div>
      {overflowing && (
        <div
          ref={topRef}
          onScroll={() => mirror(topRef.current, bodyRef.current)}
          className="overflow-x-auto overflow-y-hidden mb-1"
        >
          <div style={{ width: size.scrollWidth, height: 1 }} />
        </div>
      )}
      <div
        ref={bodyRef}
        onScroll={() => mirror(bodyRef.current, topRef.current)}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        {children}
      </div>
    </div>
  );
}

// EUR elütés cell: only shown when there actually was one in the period.
const eurCell = (v) => (Math.abs(v || 0) < 0.005 ? '-' : formatCurrency(v, 'EUR'));

// Sticky column headers. The header can only stick to a scroll container, so the
// table lives in a box that scrolls BOTH ways (a plain overflow-x-auto wrapper
// makes `sticky top-0` a no-op — the wrapper never scrolls vertically). The
// background sits on each th: with collapsed borders a thead background does not
// paint over the rows scrolling underneath it.
const STICKY_TH = 'sticky top-0 z-20 bg-red-50 px-4 py-2';
const STICKY_TH_DENSE = 'sticky top-0 z-20 bg-red-50 px-2 py-1';

function CashRegisterAllUnitsSimpleReport({ data, totals, startDate, endDate }) {
  const { isAdmin } = useAuth();
  const { checks, available: checksAvailable, setChecked } = useCumulativeChecks(startDate, endDate);
  const [savingCheck, setSavingCheck] = useState(null);

  const sumRegisters = (unit, key) =>
    (unit.registers || []).reduce((s, r) => s + (r[key] || 0), 0);
  const sumAll = (key) =>
    data.reduce((s, u) => s + sumRegisters(u, key), 0);

  // Időszaki check: the VAT buckets (borravaló nélkül) must add up to what the
  // payment methods (KP + kártya + SZÉP) add up to over the period.
  // A recorded forint elütés (jegyzőkönyv) of the same size explains the gap.
  const paymentGapOf = (r) => {
    const turnover = (r.vat_0 || 0) + (r.vat_5 || 0) + (r.vat_18 || 0) + (r.vat_27 || 0);
    const check = validatePaymentBreakdown({
      vatTotal: turnover,
      cash: r.cash,
      card: r.card,
      szep: r.szep,
      hufDiscrepancy: r.huf,
    });
    return { turnover, paid: check.paid, diff: check.difference, gap: check.applicable && !check.isValid, r };
  };
  const gapTitle = ({ turnover, paid, diff, r }) =>
    `Az ÁFA-kulcsok szerinti forgalom (${denseAmount(turnover)} Ft, borravaló nélkül) nem egyezik ` +
    `a fizetési módok összegével: KP ${denseAmount(r.cash)} + kártya ${denseAmount(r.card)}` +
    `${(r.szep || 0) !== 0 ? ` + SZÉP ${denseAmount(r.szep)}` : ''} = ${denseAmount(paid)} Ft. ` +
    `Eltérés: ${diff > 0 ? '+' : ''}${denseAmount(diff)} Ft.` +
    `${(r.huf || 0) !== 0 ? ` Rögzített Ft elütés: ${denseAmount(r.huf)} Ft – nem fedi az eltérést.` : ' Nincs rögzített Ft elütés.'}`;

  const toggleCheck = async (reg, checked) => {
    if (!reg.registerId) return;
    setSavingCheck(reg.registerId);
    try {
      await setChecked(reg.registerId, checked);
    } catch (error) {
      console.error('Error saving cumulative check:', error);
      toast.error('A pipát nem sikerült elmenteni.');
    } finally {
      setSavingCheck(null);
    }
  };

  const TH = `${STICKY_TH_DENSE} text-right whitespace-nowrap`;
  const num = `${TD} text-right`;

  return (
    <Card title="Pénztárgép forgalom - összes egység (egyszerű)">
      <p className="text-xs text-gray-500 mb-2">
        Oldalra görgetés: a táblázat feletti csúszkával, vagy Shift + egérgörgő. Az
        egység/pénztárgép oszlop és a fejléc a helyén marad.
        {' '}Az összegek forintban (az EUR elütés kivételével).
        {' '}Az <span className="font-semibold">Időszaki</span> piros, ha az ÁFA-kulcsok
        összege nem egyezik a KP + kártya + SZÉP összegével (fölé állva látszik a részletezés).
        {' '}A <span className="font-semibold">göngyölt</span> mellett pipálható, hogy ellenőrizve
        van – a pipa minden adminnak látszik.
        {!checksAvailable && (
          <span className="text-orange-600">
            {' '}(A göngyölt pipához futtasd a 20260902_register_cumulative_checks migrációt.)
          </span>
        )}
      </p>
      <WideTable>
        <table className="min-w-full divide-y divide-gray-200 text-[11px] tabular-nums">
          <thead>
            <tr>
              <th className={`${STICKY_TH_DENSE} left-0 z-30 text-left whitespace-nowrap`}>Egység / Pénztárgép</th>
              <th className={TH}>Első z.</th>
              <th className={TH}>Utolsó z.</th>
              <th className={TH}>0%</th>
              <th className={TH}>5%</th>
              <th className={TH}>18%</th>
              <th className={TH}>27%</th>
              <th className={TH}>KP</th>
              <th className={TH}>Kártya</th>
              <th className={TH}>Terminál</th>
              <th className={TH}>Időszaki</th>
              <th className={TH}>Eltérés</th>
              <th className={TH}>Göngyölt</th>
              <th className={TH}>Novo</th>
              <th className={TH}>EUR elütés</th>
              <th className={TH}>Borravaló</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((unit, unitIdx) => (
              <React.Fragment key={`unit-${unitIdx}-${unit.unitName}`}>
                <tr className="bg-gray-50 font-medium">
                  <td className={`sticky left-0 z-10 bg-gray-50 ${TD}`}>{unit.unitName}</td>
                  <td className={TD} colSpan={15}></td>
                </tr>
                {(unit.registers || []).map((reg, regIdx) => {
                  const discrepancy = reg.card - (reg.terminal_card || 0);
                  const pay = paymentGapOf(reg);
                  const checked = !!(reg.registerId && checks[reg.registerId]);
                  const canTick = checksAvailable && !!reg.registerId && reg.lastCumulative != null;
                  return (
                    <tr key={`${unitIdx}-${regIdx}-${reg.ap_number}`} className="hover:bg-gray-50">
                      <td className={`sticky left-0 z-10 bg-white ${TD} pl-6 text-gray-600`}>
                        {reg.ap_number} {reg.name && `(${reg.name})`}
                      </td>
                      <td className={num}>{reg.firstSequence ?? '-'}</td>
                      <td className={num}>{reg.lastSequence ?? '-'}</td>
                      <td className={num}>{denseAmount(reg.vat_0)}</td>
                      <td className={num}>{denseAmount(reg.vat_5)}</td>
                      <td className={num}>{denseAmount(reg.vat_18)}</td>
                      <td className={num}>{denseAmount(reg.vat_27)}</td>
                      <td className={num}>{denseAmount(reg.cash)}</td>
                      <td className={num}>{denseAmount(reg.card)}</td>
                      <td className={num}>{denseAmount(reg.terminal_card)}</td>
                      <td
                        className={`${num} font-medium ${pay.gap ? 'text-red-600 bg-red-50 cursor-help' : ''}`}
                        title={pay.gap ? gapTitle(pay) : undefined}
                      >
                        {denseAmount(reg.total)}
                      </td>
                      <td className={`${num} ${discrepancy !== 0 ? 'text-orange-600 font-medium' : ''}`}>
                        {denseAmount(discrepancy)}
                      </td>
                      <td className={`${num} ${checked ? 'text-green-700 font-medium' : ''}`}>
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <span>{reg.lastCumulative == null ? '-' : denseAmount(reg.lastCumulative)}</span>
                          {canTick && (
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 accent-green-600 cursor-pointer disabled:cursor-not-allowed"
                              checked={checked}
                              disabled={!isAdmin || savingCheck === reg.registerId}
                              onChange={(e) => toggleCheck(reg, e.target.checked)}
                              title={
                                checked
                                  ? `Ellenőrizve${checks[reg.registerId]?.checkedAt ? ` (${formatDate(checks[reg.registerId].checkedAt)})` : ''}`
                                  : 'Göngyölt forgalom ellenőrizve – pipáld be, ha rendben van'
                              }
                            />
                          )}
                        </span>
                      </td>
                      <td className={num}>{denseAmount(reg.software)}</td>
                      <td className={`${num} ${(reg.eur || 0) !== 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                        {eurCell(reg.eur)}
                      </td>
                      <td className={num}>{denseAmount(reg.tips)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100">
                  <td className={`sticky left-0 z-10 bg-gray-100 ${TD} pl-6 font-medium text-gray-700`}>{unit.unitName} összesen</td>
                  {/* Első / utolsó zárás only makes sense per register */}
                  <td className={TD} colSpan={2}></td>
                  {['vat_0', 'vat_5', 'vat_18', 'vat_27'].map((k) => (
                    <td key={k} className={`${num} font-medium`}>
                      {denseAmount(sumRegisters(unit, k))}
                    </td>
                  ))}
                  <td className={`${num} font-medium`}>{denseAmount(unit.cash)}</td>
                  <td className={`${num} font-medium`}>{denseAmount(unit.card)}</td>
                  <td className={`${num} font-medium`}>{denseAmount(unit.terminal_card)}</td>
                  <td className={`${num} font-medium`}>{denseAmount(unit.cashRegisterTotal)}</td>
                  <td className={`${num} font-medium ${(unit.card - unit.terminal_card) !== 0 ? 'text-orange-600' : ''}`}>
                    {denseAmount(unit.card - unit.terminal_card)}
                  </td>
                  <td className={TD}></td>
                  <td className={`${num} font-medium`}>{denseAmount(sumRegisters(unit, 'software'))}</td>
                  <td className={`${num} font-medium ${(unit.eur || 0) !== 0 ? 'text-orange-600' : ''}`}>
                    {eurCell(unit.eur)}
                  </td>
                  <td className={`${num} font-medium`}>{denseAmount(sumRegisters(unit, 'tips'))}</td>
                </tr>
              </React.Fragment>
            ))}
            <tr className="bg-pepper-red bg-opacity-10 font-bold">
              <td className={`sticky left-0 z-10 bg-red-50 ${TD}`}>Mindösszesen</td>
              <td className={TD} colSpan={2}></td>
              {['vat_0', 'vat_5', 'vat_18', 'vat_27'].map((k) => (
                <td key={k} className={num}>{denseAmount(sumAll(k))}</td>
              ))}
              <td className={num}>{denseAmount(totals.cash)}</td>
              <td className={num}>{denseAmount(totals.card)}</td>
              {/* The period's terminal total is THE figure this report is read for. */}
              <td className={`${num} bg-yellow-200 text-gray-900`} title="Terminál szerinti bankkártya összesen (időszak)">
                {denseAmount(totals.terminal_card)}
              </td>
              <td className={num}>{denseAmount(totals.cashRegisterTotal)}</td>
              <td className={`${num} ${(totals.card - totals.terminal_card) !== 0 ? 'text-orange-600' : ''}`}>
                {denseAmount(totals.card - totals.terminal_card)}
              </td>
              <td className={TD}></td>
              <td className={num}>{denseAmount(sumAll('software'))}</td>
              <td className={`${num} ${(totals.eur || 0) !== 0 ? 'text-orange-600' : ''}`}>
                {eurCell(totals.eur)}
              </td>
              <td className={num}>{denseAmount(sumAll('tips'))}</td>
            </tr>
          </tbody>
        </table>
      </WideTable>
    </Card>
  );
}

// Dense money for the detailed table: no "Ft" suffix (stated once above the
// report) — with ten numeric columns the suffix alone cost a column's width.
const denseAmount = (v) => Math.round(v || 0).toLocaleString('hu-HU');

// "2026-08-13" -> "08.13." — the year is the same for the whole report.
const dayMonth = (iso) => {
  const [, m, d] = String(iso || '').split('-');
  return m && d ? `${m}.${d}.` : String(iso || '');
};

// One fixed column layout shared by every table in the detailed report, so the
// per-register blocks and the unit total line up despite being separate tables.
// Widths sized for the biggest values each column realistically holds — the
// göngyölt (cumulative) figure runs into the hundreds of millions.
const DETAILED_COLS = [42, 50, 78, 78, 78, 86, 90, 96, 86, 86, 86, 74, 32, 66, 70];
const DETAILED_WIDTH = DETAILED_COLS.reduce((s, w) => s + w, 0);

function DetailedColGroup() {
  return (
    <colgroup>
      {DETAILED_COLS.map((w, i) => (
        <col key={i} style={{ width: `${w}px` }} />
      ))}
    </colgroup>
  );
}

const TD = 'px-2 py-1 whitespace-nowrap';

function CashRegisterAccountingReport({ data, totals, startDate, endDate }) {
  const { isAdmin } = useAuth();
  const { checks, available: checksAvailable, setChecked } = useCumulativeChecks(startDate, endDate);
  const [savingCheck, setSavingCheck] = useState(null);

  // Ugyanaz az ellenőrzés, mint az egyszerű nézetben: az ÁFA-kulcsok összegének
  // ki kell adnia a KP + kártya + SZÉP összegét, a rögzített Ft elütést beszámítva.
  const paymentGapOf = (r) => {
    const check = validatePaymentBreakdown({
      vatTotal: r.total,
      cash: r.cash,
      card: r.card,
      szep: r.szep,
      hufDiscrepancy: r.huf,
    });
    return { paid: check.paid, diff: check.difference, gap: check.applicable && !check.isValid, r };
  };
  const gapTitle = ({ paid, diff, r }) =>
    `Az ÁFA-kulcsok szerinti forgalom (${denseAmount(r.total)} Ft, borravaló nélkül) nem egyezik ` +
    `a fizetési módok összegével: KP ${denseAmount(r.cash)} + kártya ${denseAmount(r.card)}` +
    `${(r.szep || 0) !== 0 ? ` + SZÉP ${denseAmount(r.szep)}` : ''} = ${denseAmount(paid)} Ft. ` +
    `Eltérés: ${diff > 0 ? '+' : ''}${denseAmount(diff)} Ft.` +
    `${(r.huf || 0) !== 0 ? ` Rögzített Ft elütés: ${denseAmount(r.huf)} Ft – nem fedi az eltérést.` : ' Nincs rögzített Ft elütés.'}`;

  const toggleCheck = async (reg, checked) => {
    if (!reg.registerId) return;
    setSavingCheck(reg.registerId);
    try {
      await setChecked(reg.registerId, checked);
    } catch (error) {
      console.error('Error saving cumulative check:', error);
      toast.error('A pipát nem sikerült elmenteni.');
    } finally {
      setSavingCheck(null);
    }
  };

  const TH = `${STICKY_TH_DENSE} text-right whitespace-nowrap`;
  const num = `${TD} text-right`;

  return (
    <Card title="Pénztárgép forgalom - összes egység (könyvelés)">
      <p className="text-xs text-gray-500 mb-2">
        Pénztárgépenként összesítve, AP-szám szerint. Ha egy gép az időszakban több egységnél is
        dolgozott, itt <span className="font-semibold">egyetlen sorban</span> szerepel — a
        zárás-sorszám és a göngyölt forgalom a gép saját, folyamatos számlálója. A sorrend az
        egységeket követi, de az egység nem jelenik meg oszlopként (a gép neve fölé állva látszik,
        hol dolgozott).
        {' '}Az összegek forintban (az EUR elütés kivételével).
        {' '}Az <span className="font-semibold">Időszaki</span> piros, ha az ÁFA-kulcsok összege nem
        egyezik a KP + kártya + SZÉP összegével.
        {' '}A <span className="font-semibold">göngyölt</span> mellett pipálható, hogy ellenőrizve van.
        {!checksAvailable && (
          <span className="text-orange-600">
            {' '}(A göngyölt pipához futtasd a 20260902_register_cumulative_checks migrációt.)
          </span>
        )}
      </p>
      <WideTable>
        <table className="min-w-full divide-y divide-gray-200 text-[11px] tabular-nums">
          <thead>
            <tr>
              <th className={`${STICKY_TH_DENSE} left-0 z-30 text-left whitespace-nowrap`}>Pénztárgép</th>
              <th className={TH}>Első z.</th>
              <th className={TH}>Utolsó z.</th>
              <th className={TH}>0%</th>
              <th className={TH}>5%</th>
              <th className={TH}>18%</th>
              <th className={TH}>27%</th>
              <th className={TH}>KP</th>
              <th className={TH}>Kártya</th>
              <th className={TH}>Terminál</th>
              <th className={TH}>Időszaki</th>
              <th className={TH}>Eltérés</th>
              <th className={TH}>Göngyölt</th>
              <th className={TH}>EUR elütés</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((reg, idx) => {
              const discrepancy = reg.card - (reg.terminal_card || 0);
              const pay = paymentGapOf(reg);
              const checked = !!(reg.registerId && checks[reg.registerId]);
              const canTick = checksAvailable && !!reg.registerId && reg.lastCumulative != null;
              return (
                <tr key={`acc-${idx}-${reg.ap_number}`} className="hover:bg-gray-50">
                  <td
                    className={`sticky left-0 z-10 bg-white ${TD} font-medium text-gray-700 cursor-help`}
                    title={`Egység(ek) az időszakban: ${reg.unitNames.join(', ')}`}
                  >
                    {reg.ap_number} {reg.name && <span className="font-normal text-gray-500">({reg.name})</span>}
                    {reg.unitNames.length > 1 && (
                      <span className="ml-1 text-[10px] text-blue-700">· {reg.unitNames.length} egység</span>
                    )}
                  </td>
                  <td className={num}>{reg.firstSequence ?? '-'}</td>
                  <td className={num}>{reg.lastSequence ?? '-'}</td>
                  <td className={num}>{denseAmount(reg.vat_0)}</td>
                  <td className={num}>{denseAmount(reg.vat_5)}</td>
                  <td className={num}>{denseAmount(reg.vat_18)}</td>
                  <td className={num}>{denseAmount(reg.vat_27)}</td>
                  <td className={num}>{denseAmount(reg.cash)}</td>
                  <td className={num}>{denseAmount(reg.card)}</td>
                  <td className={num}>{denseAmount(reg.terminal_card)}</td>
                  <td
                    className={`${num} font-medium ${pay.gap ? 'text-red-600 bg-red-50 cursor-help' : ''}`}
                    title={pay.gap ? gapTitle(pay) : undefined}
                  >
                    {denseAmount(reg.total)}
                  </td>
                  <td className={`${num} ${discrepancy !== 0 ? 'text-orange-600 font-medium' : ''}`}>
                    {denseAmount(discrepancy)}
                  </td>
                  <td className={`${num} ${checked ? 'text-green-700 font-medium' : ''}`}>
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <span>{reg.lastCumulative == null ? '-' : denseAmount(reg.lastCumulative)}</span>
                      {canTick && (
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-green-600 cursor-pointer disabled:cursor-not-allowed"
                          checked={checked}
                          disabled={!isAdmin || savingCheck === reg.registerId}
                          onChange={(e) => toggleCheck(reg, e.target.checked)}
                          title={
                            checked
                              ? `Ellenőrizve${checks[reg.registerId]?.checkedAt ? ` (${formatDate(checks[reg.registerId].checkedAt)})` : ''}`
                              : 'Göngyölt forgalom ellenőrizve – pipáld be, ha rendben van'
                          }
                        />
                      )}
                    </span>
                  </td>
                  <td className={`${num} ${(reg.eur || 0) !== 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                    {eurCell(reg.eur)}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-pepper-red bg-opacity-10 font-bold">
              <td className={`sticky left-0 z-10 bg-red-50 ${TD}`}>Mindösszesen</td>
              <td className={TD} colSpan={2}></td>
              <td className={num}>{denseAmount(totals.vat_0)}</td>
              <td className={num}>{denseAmount(totals.vat_5)}</td>
              <td className={num}>{denseAmount(totals.vat_18)}</td>
              <td className={num}>{denseAmount(totals.vat_27)}</td>
              <td className={num}>{denseAmount(totals.cash)}</td>
              <td className={num}>{denseAmount(totals.card)}</td>
              {/* A terminál szerinti bankkártya összesen a jelentés fő száma. */}
              <td className={`${num} bg-yellow-200 text-gray-900`} title="Terminál szerinti bankkártya összesen (időszak)">
                {denseAmount(totals.terminal_card)}
              </td>
              <td className={num}>{denseAmount(totals.total)}</td>
              <td className={`${num} ${totals.discrepancy !== 0 ? 'text-orange-600' : ''}`}>
                {denseAmount(totals.discrepancy)}
              </td>
              <td className={TD}></td>
              <td className={`${num} ${(totals.eur || 0) !== 0 ? 'text-orange-600' : ''}`}>
                {eurCell(totals.eur)}
              </td>
            </tr>
          </tbody>
        </table>
      </WideTable>
    </Card>
  );
}

function CashRegisterAllUnitsDetailedReport({ data, totals }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Returning from a day: scroll back to the register the day was opened from.
  const focusKey = searchParams.get('focus');
  useEffect(() => {
    if (!focusKey) return;
    const el = document.getElementById(`reg-${focusKey}`);
    if (el) el.scrollIntoView({ block: 'start' });
  }, [focusKey, data]);

  // Jump to the closure's own day in the daily entry, with that register opened.
  // The whole report URL (period, unit, type) plus the register to scroll back
  // to travels along as `back`, so returning restores the screen as it was —
  // the report keeps none of this in component state.
  const openDay = (day) => {
    if (!day?.unitId || !day?.date) return;
    const back = new URLSearchParams(searchParams);
    back.set('focus', `${day.unitId}-${day.apNumber}`);

    const params = new URLSearchParams({ unit: day.unitId, date: day.date });
    if (day.apNumber) params.set('register', day.apNumber);
    params.set('back', `/reports?${back.toString()}`);
    navigate(`/daily?${params.toString()}`);
  };

  const tableStyle = { minWidth: `${DETAILED_WIDTH}px` };

  return (
    <Card title="Pénztárgép forgalom - összes egység (részletes)">
      <div className="space-y-6">
        <p className="text-xs text-gray-500">
          <span className="font-semibold">Jkv.</span> oszlop: eltérés esetén (terminál/kártya,
          fizetési mód vagy göngyölt) automatikus jelölés –{' '}
          <span className="text-green-600 font-bold">✓</span> jegyzőkönyv elkészült,{' '}
          <span className="text-red-600 font-bold">✗</span> hiányzó jegyzőkönyv. Üres = nincs eltérés.
          {' '}A pirosan/narancsan jelölt értékek fölé állva látszik az eltérés magyarázata.
          {' '}A sorokra kattintva a napi jelentés adott napja nyílik meg.
          {' '}Az összegek forintban (az EUR elütés kivételével).
        </p>

        {data.map((unit, unitIdx) => (
          <div key={`unit-${unitIdx}-${unit.unitName}`} className="border border-gray-200 rounded-lg">
            <div className="bg-pepper-red bg-opacity-10 px-4 py-2 font-bold text-gray-900 rounded-t-lg">
              {unit.unitName}
            </div>

            {/* One block per register: its own header, its own sideways scroll. */}
            {(unit.registers || []).map((reg, regIdx) => (
              <div
                key={`reg-${unitIdx}-${regIdx}-${reg.ap_number}`}
                id={`reg-${unit.unitId}-${reg.ap_number}`}
                className="scroll-mt-20"
              >
                {/* Stays under the navbar while scrolling this register's rows,
                    so it is always clear which register the numbers belong to. */}
                <div className="sticky top-16 z-20 bg-blue-50 border-y border-blue-100 px-3 py-1.5 text-xs font-bold text-blue-800">
                  Pénztárgép: {reg.ap_number} {reg.name && `(${reg.name})`}
                </div>

                <WideTable maxHeight="none">
                  <table className="table-fixed divide-y divide-gray-200 text-[11px] tabular-nums" style={tableStyle}>
                    <DetailedColGroup />
                    <thead className="bg-gray-50">
                      <tr>
                        <th className={`${TD} text-right`} title="Zárás száma (Z-szám)">Zárás</th>
                        <th className={`${TD} text-left`}>Dátum</th>
                        <th className={`${TD} text-right`}>0%</th>
                        <th className={`${TD} text-right`}>5%</th>
                        <th className={`${TD} text-right`}>18%</th>
                        <th className={`${TD} text-right`}>27%</th>
                        <th className={`${TD} text-right font-semibold`} title="A zárás időszaki forgalma">Időszaki</th>
                        <th className={`${TD} text-right`} title="A Z-jelentés göngyölt forgalma">Göngy.</th>
                        <th className={`${TD} text-right`}>KP</th>
                        <th className={`${TD} text-right`}>Kártya</th>
                        <th className={`${TD} text-right`}>Term.</th>
                        <th className={`${TD} text-right`}>Elt.</th>
                        <th className={`${TD} text-center`} title="Eltérés esetén: van-e jegyzőkönyv">Jkv.</th>
                        <th className={`${TD} text-right`}>Borr.</th>
                        <th className={`${TD} text-right`} title="Időszaki EUR alapú elütés">EUR elt.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(reg.days || []).map((day, dayIdx) => (
                        <tr
                          key={`day-${unitIdx}-${regIdx}-${dayIdx}-${day.date}-${day.closureNumber}`}
                          onClick={() => openDay(day)}
                          title="Ugrás a napi jelentéshez"
                          className="hover:bg-blue-50 cursor-pointer"
                        >
                          <td className={`${TD} text-right text-gray-500`}>{day.closureSeq ?? '-'}</td>
                          <td className={TD}>{dayMonth(day.date)}</td>
                          <td className={`${TD} text-right`}>{denseAmount(day.vat_0)}</td>
                          <td className={`${TD} text-right`}>{denseAmount(day.vat_5)}</td>
                          <td className={`${TD} text-right`}>{denseAmount(day.vat_18)}</td>
                          <td className={`${TD} text-right`}>{denseAmount(day.vat_27)}</td>
                          <td
                            className={`${TD} text-right font-medium ${
                              day.paymentGap ? 'text-orange-600 underline decoration-dotted' : ''
                            }`}
                            title={
                              day.paymentGap
                                ? `A fizetési módok nem adják ki a forgalmat: eltérés ${formatCurrency(day.paymentDiff)}` +
                                  (day.huf ? ` (rögzített Ft elütés: ${formatCurrency(day.huf)}, nem fedi az eltérést)` : '')
                                : undefined
                            }
                          >
                            {denseAmount(day.total)}
                          </td>
                          {/* Göngyölt: red when it does not follow the previous
                              closure's cumulative plus this closure's turnover. */}
                          <td
                            className={`${TD} text-right ${
                              day.cumulativeMismatch ? 'text-red-600 font-semibold underline decoration-dotted' : 'text-gray-500'
                            }`}
                            title={
                              day.cumulativeMismatch
                                ? `Göngyölt eltérés: rögzítve ${formatCurrency(day.cumulative)}, `
                                  + `az előző göngyölt (${formatCurrency(day.expectedCumulativeBase)}) `
                                  + `+ ezen zárás forgalma (${formatCurrency(day.turnover)}) alapján `
                                  + `${formatCurrency(day.expectedCumulative)} lenne. Eltérés: `
                                  + `${formatCurrency(day.cumulative - day.expectedCumulative)}.`
                                : undefined
                            }
                          >
                            {day.cumulative > 0 ? denseAmount(day.cumulative) : '-'}
                          </td>
                          <td className={`${TD} text-right`}>{denseAmount(day.cash)}</td>
                          <td className={`${TD} text-right`}>{denseAmount(day.card)}</td>
                          <td className={`${TD} text-right`}>{denseAmount(day.terminal_card)}</td>
                          <td
                            className={`${TD} text-right ${
                              day.discrepancy !== 0
                                ? day.terminalExplained ? 'text-green-700 font-medium' : 'text-orange-600 font-medium'
                                : ''
                            }`}
                            title={
                              day.discrepancy !== 0
                                ? `Pénztárgép kártya (${formatCurrency(day.card)}) és terminál (${formatCurrency(day.terminal_card)}) eltérése` +
                                  (day.terminalExplained ? ' – a rögzített „rossz fizetési mód” elütés kiadja.' : '')
                                : undefined
                            }
                          >
                            {denseAmount(day.discrepancy)}
                          </td>
                          <td className={`${TD} text-center`}>
                            {day.protocolMark === 'ok' && (
                              <span className="text-green-600 font-bold" title="Eltérés – jegyzőkönyv elkészült">✓</span>
                            )}
                            {day.protocolMark === 'missing' && (
                              <span className="text-red-600 font-bold" title="Eltérés – hiányzó jegyzőkönyv">✗</span>
                            )}
                          </td>
                          <td className={`${TD} text-right text-gray-500`}>{denseAmount(day.tips)}</td>
                          <td className={`${TD} text-right ${(day.eur || 0) !== 0 ? 'text-orange-600 font-medium' : 'text-gray-300'}`}>
                            {eurCell(day.eur)}
                          </td>
                        </tr>
                      ))}
                      {/* Register subtotal */}
                      <tr className="bg-gray-100 font-semibold">
                        <td className={TD}></td>
                        <td className={TD}>{reg.ap_number}</td>
                        <td className={`${TD} text-right`}>{denseAmount(reg.totals?.vat_0)}</td>
                        <td className={`${TD} text-right`}>{denseAmount(reg.totals?.vat_5)}</td>
                        <td className={`${TD} text-right`}>{denseAmount(reg.totals?.vat_18)}</td>
                        <td className={`${TD} text-right`}>{denseAmount(reg.totals?.vat_27)}</td>
                        <td className={`${TD} text-right`}>{denseAmount(reg.totals?.total)}</td>
                        <td className={TD}></td>
                        <td className={`${TD} text-right`}>{denseAmount(reg.totals?.cash)}</td>
                        <td className={`${TD} text-right`}>{denseAmount(reg.totals?.card)}</td>
                        <td className={`${TD} text-right`}>{denseAmount(reg.totals?.terminal_card)}</td>
                        <td className={`${TD} text-right ${reg.totals?.discrepancy !== 0 ? 'text-orange-600' : ''}`}>
                          {denseAmount(reg.totals?.discrepancy)}
                        </td>
                        <td className={TD}></td>
                        <td className={`${TD} text-right`}>{denseAmount(reg.totals?.tips)}</td>
                        <td className={`${TD} text-right ${(reg.totals?.eur || 0) !== 0 ? 'text-orange-600' : ''}`}>
                          {eurCell(reg.totals?.eur)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </WideTable>
              </div>
            ))}

            {/* Unit total — its own table, kept aligned by the shared colgroup */}
            <WideTable maxHeight="none">
              <table className="table-fixed text-[11px] tabular-nums" style={tableStyle}>
                <DetailedColGroup />
                <tbody>
                  <tr className="bg-pepper-red bg-opacity-20 font-bold">
                    <td className={TD}></td>
                    <td className={TD} colSpan={1}>Összesen</td>
                    <td className={`${TD} text-right`}>{denseAmount(unit.totals?.vat_0)}</td>
                    <td className={`${TD} text-right`}>{denseAmount(unit.totals?.vat_5)}</td>
                    <td className={`${TD} text-right`}>{denseAmount(unit.totals?.vat_18)}</td>
                    <td className={`${TD} text-right`}>{denseAmount(unit.totals?.vat_27)}</td>
                    <td className={`${TD} text-right`}>{denseAmount(unit.totals?.total)}</td>
                    <td className={TD}></td>
                    <td className={`${TD} text-right`}>{denseAmount(unit.totals?.cash)}</td>
                    <td className={`${TD} text-right`}>{denseAmount(unit.totals?.card)}</td>
                    <td className={`${TD} text-right`}>{denseAmount(unit.totals?.terminal_card)}</td>
                    <td className={`${TD} text-right ${unit.totals?.discrepancy !== 0 ? 'text-orange-600' : ''}`}>
                      {denseAmount(unit.totals?.discrepancy)}
                    </td>
                    <td className={TD}></td>
                    <td className={`${TD} text-right`}>{denseAmount(unit.totals?.tips)}</td>
                    <td className={`${TD} text-right ${(unit.totals?.eur || 0) !== 0 ? 'text-orange-600' : ''}`}>
                      {eurCell(unit.totals?.eur)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </WideTable>
          </div>
        ))}

        {/* Grand total */}
        <div className="bg-pepper-red bg-opacity-10 rounded-lg p-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Összes forgalom</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totals?.total)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Összes KP</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(totals?.cash)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Összes kártya</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(totals?.card)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Összes terminál</p>
              <p className="text-xl font-bold text-purple-700">{formatCurrency(totals?.terminal_card)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Összes eltérés</p>
              <p className={`text-xl font-bold ${totals?.discrepancy !== 0 ? 'text-orange-600' : 'text-gray-700'}`}>
                {formatCurrency(totals?.discrepancy)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">EUR elütés</p>
              <p className={`text-xl font-bold ${(totals?.eur || 0) !== 0 ? 'text-orange-600' : 'text-gray-700'}`}>
                {eurCell(totals?.eur)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EventsAllUnitsReport({ data, totals, eventsList }) {
  const [showAllEvents, setShowAllEvents] = useState(false);

  return (
    <div className="space-y-6">
      <Card title="Rendezvény összesítő - összes egység">
        {/* Summary by unit */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-pepper-red bg-opacity-10">
              <tr>
                <th className="px-3 py-2 text-left">Egység</th>
                <th className="px-3 py-2 text-right">Db</th>
                <th className="px-3 py-2 text-right">Bevétel</th>
                <th className="px-3 py-2 text-right">Számlás</th>
                <th className="px-3 py-2 text-right">EFO</th>
                <th className="px-3 py-2 text-right">Nem számlás</th>
                <th className="px-3 py-2 text-right">Költség össz.</th>
                <th className="px-3 py-2 text-right font-semibold bg-pepper-red bg-opacity-20">Eredmény</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row) => (
                <tr key={row.unitName} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{row.unitName}</td>
                  <td className="px-3 py-2 text-right">{row.eventCount}</td>
                  <td className="px-3 py-2 text-right text-green-600">{formatCurrency(row.total_revenue)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{formatCurrency(row.official_expenses)}</td>
                  <td className="px-3 py-2 text-right text-orange-600">{formatCurrency(row.efo_expenses)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(row.non_official_expenses)}</td>
                  <td className="px-3 py-2 text-right text-red-700">{formatCurrency(row.total_expenses)}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${row.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(row.profit)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="px-3 py-2">Mindösszesen</td>
                <td className="px-3 py-2 text-right">{totals.eventCount}</td>
                <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.total_revenue)}</td>
                <td className="px-3 py-2 text-right text-red-700">{formatCurrency(totals.official_expenses)}</td>
                <td className="px-3 py-2 text-right text-orange-700">{formatCurrency(totals.efo_expenses)}</td>
                <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(totals.non_official_expenses)}</td>
                <td className="px-3 py-2 text-right text-red-800">{formatCurrency(totals.total_expenses)}</td>
                <td className={`px-3 py-2 text-right ${totals.profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  {formatCurrency(totals.profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary cards */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Események</p>
              <p className="text-lg font-bold text-gray-700">{totals.eventCount} db</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-green-600">Bevétel (bruttó)</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(totals.total_revenue)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-sm text-red-600">Számlás költség</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(totals.official_expenses)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-sm text-orange-600">EFO költség</p>
              <p className="text-lg font-bold text-orange-700">{formatCurrency(totals.efo_expenses)}</p>
            </div>
            <div className={`rounded-lg p-3 ${totals.profit >= 0 ? 'bg-blue-50' : 'bg-red-100'}`}>
              <p className={`text-sm ${totals.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Eredmény</p>
              <p className={`text-lg font-bold ${totals.profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(totals.profit)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Expandable events list */}
      {eventsList && eventsList.length > 0 && (
        <Card>
          <button
            onClick={() => setShowAllEvents(!showAllEvents)}
            className="w-full flex items-center justify-between text-left font-medium text-gray-900 hover:text-pepper-red transition-colors"
          >
            <span>Összes rendezvény részletesen ({eventsList.length} db)</span>
            <span className="text-sm text-gray-500">{showAllEvents ? '▲ Összecsuk' : '▼ Kinyit'}</span>
          </button>

          {showAllEvents && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Dátum</th>
                    <th className="px-3 py-2 text-left">Egység</th>
                    <th className="px-3 py-2 text-left">Rendezvény</th>
                    <th className="px-3 py-2 text-right">Bevétel</th>
                    <th className="px-3 py-2 text-right">Számlás</th>
                    <th className="px-3 py-2 text-right">EFO</th>
                    <th className="px-3 py-2 text-right">Nem sz.</th>
                    <th className="px-3 py-2 text-right">Eredmény</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {eventsList.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{formatDate(event.event_date)}</td>
                      <td className="px-3 py-2 text-gray-600">{event.unitName}</td>
                      <td className="px-3 py-2">{event.name}</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatCurrency(event.total_revenue)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatCurrency(event.official_expenses)}</td>
                      <td className="px-3 py-2 text-right text-orange-600">{formatCurrency(event.efo_expenses)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(event.non_official_expenses)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${event.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(event.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
