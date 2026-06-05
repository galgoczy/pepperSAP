import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, LoadingSpinner, Badge } from '../common';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';
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
    return <CashRegisterAllUnitsSimpleReport data={data} totals={totals} />;
  }
  if (reportType === 'cash_register_all_detailed') {
    return <CashRegisterAllUnitsDetailedReport data={data} totals={totals} />;
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
    const crRevenues = row.cash_register_revenue || [];
    crRevenues.forEach((cr) => {
      const apNumber = cr.cash_registers?.ap_number || 'unknown';
      const registerName = cr.cash_registers?.name || '';

      if (!registerData[apNumber]) {
        registerData[apNumber] = {
          ap_number: apNumber,
          name: registerName,
          days: [],
          totals: {
            vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0,
            cash: 0, card: 0, terminal_card: 0, total: 0,
          },
        };
      }

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
      };
      dayData.total = dayData.vat_0 + dayData.vat_5 + dayData.vat_18 + dayData.vat_27 + dayData.tips;
      dayData.cardDiscrepancy = dayData.card - dayData.terminal_card;

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

  // Calculate card discrepancy for each register
  Object.values(registerData).forEach((reg) => {
    reg.totals.cardDiscrepancy = reg.totals.card - reg.totals.terminal_card;
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
  };
  totals.cashRegisterTotal = totals.vat_0 + totals.vat_5 + totals.vat_18 + totals.vat_27 + totals.tips;
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

async function fetchCashRegisterAllUnitsSimple(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, terminal_card, cash_registers(ap_number, name))')
    .gte('date', startDate)
    .lte('date', endDate);

  // Group by unit
  const unitData = {};
  (revenues || []).forEach((row) => {
    const unitName = row.units?.name || 'Ismeretlen';
    const unitId = row.unit_id;

    if (!unitData[unitId]) {
      unitData[unitId] = {
        unitName,
        cashRegisterTotal: 0,
        cash: 0,
        card: 0,
        terminal_card: 0,
        registers: {},
      };
    }

    const crRevenues = row.cash_register_revenue || [];
    crRevenues.forEach((cr) => {
      const registerId = cr.cash_registers?.ap_number || 'unknown';
      const registerName = cr.cash_registers?.name || '';

      if (!unitData[unitId].registers[registerId]) {
        unitData[unitId].registers[registerId] = {
          ap_number: registerId,
          name: registerName,
          total: 0,
          cash: 0,
          card: 0,
          terminal_card: 0,
        };
      }

      const total = (parseFloat(cr.vat_0_percent) || 0) +
        (parseFloat(cr.vat_5_percent) || 0) +
        (parseFloat(cr.vat_18_percent) || 0) +
        (parseFloat(cr.vat_27_percent) || 0) +
        (parseFloat(cr.tips) || 0);

      unitData[unitId].registers[registerId].total += total;
      unitData[unitId].registers[registerId].cash += parseFloat(cr.cash_payment) || 0;
      unitData[unitId].registers[registerId].card += parseFloat(cr.card_payment) || 0;
      unitData[unitId].registers[registerId].terminal_card += parseFloat(cr.terminal_card) || 0;

      unitData[unitId].cashRegisterTotal += total;
      unitData[unitId].cash += parseFloat(cr.cash_payment) || 0;
      unitData[unitId].card += parseFloat(cr.card_payment) || 0;
      unitData[unitId].terminal_card += parseFloat(cr.terminal_card) || 0;
    });
  });

  const data = Object.values(unitData).map((unit) => ({
    ...unit,
    registers: Object.values(unit.registers),
  })).sort((a, b) => a.unitName.localeCompare(b.unitName));

  const totals = {
    cashRegisterTotal: data.reduce((sum, r) => sum + r.cashRegisterTotal, 0),
    cash: data.reduce((sum, r) => sum + r.cash, 0),
    card: data.reduce((sum, r) => sum + r.card, 0),
    terminal_card: data.reduce((sum, r) => sum + r.terminal_card, 0),
  };

  return { data, totals };
}

async function fetchCashRegisterAllUnitsDetailed(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, terminal_card, cash_registers(ap_number, name))')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  // Group by unit, then by register, then list days
  const unitData = {};
  (revenues || []).forEach((row) => {
    const unitName = row.units?.name || 'Ismeretlen';
    const unitId = row.unit_id;

    if (!unitData[unitId]) {
      unitData[unitId] = {
        unitName,
        registers: {},
        totals: {
          vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0,
          total: 0, cash: 0, card: 0, terminal_card: 0,
        },
      };
    }

    const crRevenues = row.cash_register_revenue || [];
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
            total: 0, cash: 0, card: 0, terminal_card: 0,
          },
        };
      }

      const dayData = {
        date: row.date,
        vat_0: parseFloat(cr.vat_0_percent) || 0,
        vat_5: parseFloat(cr.vat_5_percent) || 0,
        vat_18: parseFloat(cr.vat_18_percent) || 0,
        vat_27: parseFloat(cr.vat_27_percent) || 0,
        tips: parseFloat(cr.tips) || 0,
        cash: parseFloat(cr.cash_payment) || 0,
        card: parseFloat(cr.card_payment) || 0,
        terminal_card: parseFloat(cr.terminal_card) || 0,
      };
      dayData.total = dayData.vat_0 + dayData.vat_5 + dayData.vat_18 + dayData.vat_27 + dayData.tips;
      dayData.discrepancy = dayData.card - dayData.terminal_card;

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
    });
  });

  // Convert registers object to array and calculate discrepancies
  const data = Object.values(unitData).map((unit) => ({
    ...unit,
    registers: Object.values(unit.registers || {}).sort((a, b) => (a.ap_number || '').localeCompare(b.ap_number || '')),
    totals: {
      ...(unit.totals || { vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0, total: 0, cash: 0, card: 0, terminal_card: 0 }),
      discrepancy: (unit.totals?.card || 0) - (unit.totals?.terminal_card || 0),
    },
  })).sort((a, b) => (a.unitName || '').localeCompare(b.unitName || ''));

  // Add discrepancy to register totals
  data.forEach((unit) => {
    (unit.registers || []).forEach((reg) => {
      if (reg.totals) {
        reg.totals.discrepancy = reg.totals.card - reg.totals.terminal_card;
      }
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

function CashRegisterReport({ data, totals, unitName }) {
  const navigate = useNavigate();

  return (
    <Card title={unitName ? `Pénztárgép jelentés - ${unitName}` : 'Pénztárgép jelentés'}>
      <p className="text-sm text-gray-500 mb-3">Kattints egy sorra a szerkesztéshez</p>

      <div className="space-y-6">
        {data.map((register, regIdx) => (
          <div key={`register-${regIdx}-${register.ap_number}`} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-pepper-red bg-opacity-10 px-4 py-2 font-bold text-gray-900">
              Pénztárgép: {register.ap_number} {register.name && `(${register.name})`}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Dátum</th>
                    <th className="px-3 py-2 text-right">0%</th>
                    <th className="px-3 py-2 text-right">5%</th>
                    <th className="px-3 py-2 text-right">18%</th>
                    <th className="px-3 py-2 text-right">27%</th>
                    <th className="px-3 py-2 text-right">Borr.</th>
                    <th className="px-3 py-2 text-right font-semibold">Összesen</th>
                    <th className="px-3 py-2 text-right">KP</th>
                    <th className="px-3 py-2 text-right">Kártya</th>
                    <th className="px-3 py-2 text-right">Term.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(register.days || []).map((day, dayIdx) => (
                    <tr
                      key={`${regIdx}-${dayIdx}-${day.date}`}
                      onClick={() => navigate(`/daily?date=${day.date}&unit=${day.unit_id}`)}
                      className="hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2">{formatDate(day.date)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(day.vat_0)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(day.vat_5)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(day.vat_18)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(day.vat_27)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(day.tips)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(day.total)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(day.cash)}</td>
                      <td className={`px-3 py-2 text-right ${Math.abs(day.cardDiscrepancy) > 0.01 ? 'text-red-600' : ''}`}>
                        {formatCurrency(day.card)}
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(day.terminal_card)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-3 py-2">{register.ap_number} összesen</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(register.totals?.vat_0 || 0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(register.totals?.vat_5 || 0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(register.totals?.vat_18 || 0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(register.totals?.vat_27 || 0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(register.totals?.tips || 0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(register.totals?.total || 0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(register.totals?.cash || 0)}</td>
                    <td className={`px-3 py-2 text-right ${Math.abs(register.totals?.cardDiscrepancy || 0) > 0.01 ? 'text-red-600' : ''}`}>
                      {formatCurrency(register.totals?.card || 0)}
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(register.totals?.terminal_card || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Per-register discrepancy warning */}
            {Math.abs(register.totals?.cardDiscrepancy || 0) > 0.01 && (
              <div className="m-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                <span className="text-red-800">Kártya eltérés: {formatCurrency(register.totals?.cardDiscrepancy || 0)}</span>
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
            {Math.abs(totals.cardDiscrepancy) > 0.01 && (
              <div>
                <p className="text-sm text-red-600">Eltérés</p>
                <p className="text-lg font-bold text-red-700">{formatCurrency(totals.cardDiscrepancy)}</p>
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

function CashRegisterAllUnitsSimpleReport({ data, totals }) {
  return (
    <Card title="Pénztárgép forgalom - összes egység (egyszerű)">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-pepper-red bg-opacity-10">
            <tr>
              <th className="px-4 py-2 text-left">Egység / Pénztárgép</th>
              <th className="px-4 py-2 text-right">Forgalom</th>
              <th className="px-4 py-2 text-right">KP</th>
              <th className="px-4 py-2 text-right">Kártya</th>
              <th className="px-4 py-2 text-right">Terminál</th>
              <th className="px-4 py-2 text-right">Eltérés</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((unit, unitIdx) => (
              <React.Fragment key={`unit-${unitIdx}-${unit.unitName}`}>
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-2" colSpan={6}>{unit.unitName}</td>
                </tr>
                {(unit.registers || []).map((reg, regIdx) => {
                  const discrepancy = reg.card - (reg.terminal_card || 0);
                  return (
                    <tr key={`${unitIdx}-${regIdx}-${reg.ap_number}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 pl-8 text-gray-600">
                        {reg.ap_number} {reg.name && `(${reg.name})`}
                      </td>
                      <td className="px-4 py-2 text-right">{formatCurrency(reg.total)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(reg.cash)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(reg.card)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(reg.terminal_card || 0)}</td>
                      <td className={`px-4 py-2 text-right ${discrepancy !== 0 ? 'text-orange-600 font-medium' : ''}`}>
                        {formatCurrency(discrepancy)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100">
                  <td className="px-4 py-2 pl-8 font-medium text-gray-700">{unit.unitName} összesen</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(unit.cashRegisterTotal)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(unit.cash)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(unit.card)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(unit.terminal_card)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${(unit.card - unit.terminal_card) !== 0 ? 'text-orange-600' : ''}`}>
                    {formatCurrency(unit.card - unit.terminal_card)}
                  </td>
                </tr>
              </React.Fragment>
            ))}
            <tr className="bg-pepper-red bg-opacity-10 font-bold">
              <td className="px-4 py-2">Mindösszesen</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.cashRegisterTotal)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.cash)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.card)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(totals.terminal_card)}</td>
              <td className={`px-4 py-2 text-right ${(totals.card - totals.terminal_card) !== 0 ? 'text-orange-600' : ''}`}>
                {formatCurrency(totals.card - totals.terminal_card)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CashRegisterAllUnitsDetailedReport({ data, totals }) {
  return (
    <Card title="Pénztárgép forgalom - összes egység (részletes)">
      <div className="space-y-6">
        {data.map((unit, unitIdx) => (
          <div key={`unit-${unitIdx}-${unit.unitName}`} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-pepper-red bg-opacity-10 px-4 py-2 font-bold text-gray-900">
              {unit.unitName}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Dátum</th>
                    <th className="px-3 py-2 text-right">0%</th>
                    <th className="px-3 py-2 text-right">5%</th>
                    <th className="px-3 py-2 text-right">18%</th>
                    <th className="px-3 py-2 text-right">27%</th>
                    <th className="px-3 py-2 text-right">Borr.</th>
                    <th className="px-3 py-2 text-right font-semibold">Össz.</th>
                    <th className="px-3 py-2 text-right">KP</th>
                    <th className="px-3 py-2 text-right">Kártya</th>
                    <th className="px-3 py-2 text-right">Term.</th>
                    <th className="px-3 py-2 text-right">Elt.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(unit.registers || []).map((reg, regIdx) => (
                    <React.Fragment key={`reg-${unitIdx}-${regIdx}-${reg.ap_number}`}>
                      {/* Register header row */}
                      <tr className="bg-blue-50">
                        <td className="px-3 py-2 font-bold text-blue-800" colSpan={11}>
                          Pénztárgép: {reg.ap_number} {reg.name && `(${reg.name})`}
                        </td>
                      </tr>
                      {/* Day rows for this register */}
                      {(reg.days || []).map((day, dayIdx) => (
                        <tr key={`day-${unitIdx}-${regIdx}-${dayIdx}-${day.date}`} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{formatDate(day.date)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(day.vat_0)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(day.vat_5)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(day.vat_18)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(day.vat_27)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(day.tips)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(day.total)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(day.cash)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(day.card)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(day.terminal_card)}</td>
                          <td className={`px-3 py-2 text-right ${day.discrepancy !== 0 ? 'text-orange-600 font-medium' : ''}`}>
                            {formatCurrency(day.discrepancy)}
                          </td>
                        </tr>
                      ))}
                      {/* Register subtotal row */}
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-3 py-2">{reg.ap_number} összesen</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(reg.totals?.vat_0)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(reg.totals?.vat_5)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(reg.totals?.vat_18)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(reg.totals?.vat_27)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(reg.totals?.tips)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(reg.totals?.total)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(reg.totals?.cash)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(reg.totals?.card)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(reg.totals?.terminal_card)}</td>
                        <td className={`px-3 py-2 text-right ${reg.totals?.discrepancy !== 0 ? 'text-orange-600' : ''}`}>
                          {formatCurrency(reg.totals?.discrepancy)}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                  {/* Unit grand total row */}
                  <tr className="bg-pepper-red bg-opacity-20 font-bold">
                    <td className="px-3 py-2">{unit.unitName} összesen</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(unit.totals?.vat_0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(unit.totals?.vat_5)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(unit.totals?.vat_18)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(unit.totals?.vat_27)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(unit.totals?.tips)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(unit.totals?.total)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(unit.totals?.cash)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(unit.totals?.card)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(unit.totals?.terminal_card)}</td>
                    <td className={`px-3 py-2 text-right ${unit.totals?.discrepancy !== 0 ? 'text-orange-600' : ''}`}>
                      {formatCurrency(unit.totals?.discrepancy)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Grand total */}
        <div className="bg-pepper-red bg-opacity-10 rounded-lg p-4">
          <div className="grid grid-cols-5 gap-4 text-center">
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
