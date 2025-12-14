import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal, Button } from '../common';
import { supabase } from '../../lib/supabase';
import { formatDate, formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

// Report type labels
const reportTypeLabels = {
  full_monthly: 'Teljes havi forgalom',
  cash_revenue: 'Készpénz bevételek',
  cash_register: 'Pénztárgép jelentés',
  events: 'Rendezvény összesítő',
  full_monthly_all: 'Teljes havi forgalom - összes egység',
  cash_revenue_all: 'Készpénz bevételek - összes egység',
  cash_register_all_simple: 'Pénztárgép forgalom - összes egység (egyszerű)',
  cash_register_all_detailed: 'Pénztárgép forgalom - összes egység (részletes)',
  events_all: 'Rendezvény összesítő - összes egység',
};

export default function ExportModal({ isOpen, onClose, startDate, endDate, unitId, reportType, isAdmin }) {
  const [format, setFormat] = useState('xlsx');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      let data = [];
      let headers = [];
      let filename = '';

      // Fetch data based on report type
      if (reportType === 'full_monthly') {
        const result = await fetchFullMonthlyExport(startDate, endDate, unitId);
        data = result.data;
        headers = result.headers;
        filename = `teljes_havi_forgalom_${startDate}_${endDate}`;
      } else if (reportType === 'cash_revenue') {
        const result = await fetchCashRevenueExport(startDate, endDate, unitId);
        data = result.data;
        headers = result.headers;
        filename = `keszpenz_bevetelek_${startDate}_${endDate}`;
      } else if (reportType === 'cash_register') {
        const result = await fetchCashRegisterExport(startDate, endDate, unitId);
        data = result.data;
        headers = result.headers;
        filename = `penztargep_jelentes_${startDate}_${endDate}`;
      } else if (reportType === 'events') {
        const result = await fetchEventsExport(startDate, endDate, unitId);
        data = result.data;
        headers = result.headers;
        filename = `rendezvenyek_${startDate}_${endDate}`;
      } else if (reportType === 'full_monthly_all') {
        const result = await fetchFullMonthlyAllUnitsExport(startDate, endDate);
        data = result.data;
        headers = result.headers;
        filename = `teljes_havi_osszes_egyseg_${startDate}_${endDate}`;
      } else if (reportType === 'cash_revenue_all') {
        const result = await fetchCashRevenueAllUnitsExport(startDate, endDate);
        data = result.data;
        headers = result.headers;
        filename = `keszpenz_osszes_egyseg_${startDate}_${endDate}`;
      } else if (reportType === 'cash_register_all_simple') {
        const result = await fetchCashRegisterAllUnitsSimpleExport(startDate, endDate);
        data = result.data;
        headers = result.headers;
        filename = `penztargep_osszes_egyszeru_${startDate}_${endDate}`;
      } else if (reportType === 'cash_register_all_detailed') {
        const result = await fetchCashRegisterAllUnitsDetailedExport(startDate, endDate);
        data = result.data;
        headers = result.headers;
        filename = `penztargep_osszes_reszletes_${startDate}_${endDate}`;
      } else if (reportType === 'events_all') {
        const result = await fetchEventsAllUnitsExport(startDate, endDate);
        data = result.data;
        headers = result.headers;
        filename = `rendezvenyek_osszes_egyseg_${startDate}_${endDate}`;
      }

      if (data.length === 0) {
        toast.error('Nincs exportálható adat');
        return;
      }

      // Calculate totals row
      const totalsRow = calculateTotalsRow(data, headers);

      // Export based on format
      if (format === 'xlsx') {
        exportToExcel(data, headers, totalsRow, filename);
      } else if (format === 'pdf') {
        exportToPdf(data, headers, totalsRow, filename, reportType, startDate, endDate);
      } else {
        exportToCsv(data, headers, totalsRow, filename);
      }

      toast.success('Export sikeres!');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Hiba történt az export során');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adatok exportálása"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Mégse
          </Button>
          <Button onClick={handleExport} loading={loading}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg text-sm">
          <p className="text-gray-600">
            <span className="font-medium">{reportTypeLabels[reportType] || 'Riport'}</span>
          </p>
          <p className="text-gray-600">
            Időszak: <span className="font-medium">{formatDate(startDate)}</span> -{' '}
            <span className="font-medium">{formatDate(endDate)}</span>
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Fájl formátum
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="xlsx"
                checked={format === 'xlsx'}
                onChange={(e) => setFormat(e.target.value)}
                className="text-pepper-red focus:ring-pepper-red"
              />
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <span className="text-sm">Excel (.xlsx)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={format === 'pdf'}
                onChange={(e) => setFormat(e.target.value)}
                className="text-pepper-red focus:ring-pepper-red"
              />
              <FileDown className="h-5 w-5 text-red-600" />
              <span className="text-sm">PDF (.pdf)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === 'csv'}
                onChange={(e) => setFormat(e.target.value)}
                className="text-pepper-red focus:ring-pepper-red"
              />
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm">CSV (.csv)</span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

async function fetchFullMonthlyExport(startDate, endDate, unitId) {
  let revenueQuery = supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(cash_payment, card_payment)')
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

  const headers = ['Dátum', 'Szoftver bevétel', 'Pénztárgép KP', 'Pénztárgép kártya', 'Tartalék bevétel', 'Költség', 'Eredmény'];

  const data = revenues.map((row) => {
    const crRevenues = row.cash_register_revenue || [];
    const cashRegisterCash = crRevenues.reduce((sum, r) => sum + (parseFloat(r.cash_payment) || 0), 0);
    const cashRegisterCard = crRevenues.reduce((sum, r) => sum + (parseFloat(r.card_payment) || 0), 0);
    const cashRegisterTotal = cashRegisterCash + cashRegisterCard;

    const dayExpenses = expensesByDate[row.date] || { invoice: 0, nonInvoice: 0 };
    const totalSoftware = parseFloat(row.total_revenue) || 0;
    const reserveRevenue = totalSoftware - cashRegisterTotal - dayExpenses.nonInvoice;
    const dailyResult = cashRegisterTotal + reserveRevenue - dayExpenses.invoice;

    return {
      'Dátum': formatDate(row.date),
      'Szoftver bevétel': totalSoftware,
      'Pénztárgép KP': cashRegisterCash,
      'Pénztárgép kártya': cashRegisterCard,
      'Tartalék bevétel': reserveRevenue,
      'Költség': -dayExpenses.invoice,
      'Eredmény': dailyResult,
    };
  });

  return { data, headers };
}

async function fetchCashRevenueExport(startDate, endDate, unitId) {
  let revenueQuery = supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(cash_payment, card_payment)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

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

  const headers = ['Dátum', 'Pénztár zseb', 'Tartalék bevétel', 'Összesen'];

  const data = revenues.map((row) => {
    const crRevenues = row.cash_register_revenue || [];
    const cashRegisterCash = crRevenues.reduce((sum, r) => sum + (parseFloat(r.cash_payment) || 0), 0);
    const cashRegisterCard = crRevenues.reduce((sum, r) => sum + (parseFloat(r.card_payment) || 0), 0);
    const cashRegisterTotal = cashRegisterCash + cashRegisterCard;

    const dayExpenses = expensesByDate[row.date] || { invoice: 0, nonInvoice: 0 };
    const cashRegisterPocket = cashRegisterCash - dayExpenses.invoice;

    const totalSoftware = parseFloat(row.total_revenue) || 0;
    const reserveRevenue = totalSoftware - cashRegisterTotal - dayExpenses.nonInvoice;

    return {
      'Dátum': formatDate(row.date),
      'Pénztár zseb': cashRegisterPocket,
      'Tartalék bevétel': reserveRevenue,
      'Összesen': cashRegisterPocket + reserveRevenue,
    };
  });

  return { data, headers };
}

async function fetchCashRegisterExport(startDate, endDate, unitId) {
  let query = supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, terminal_card)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (unitId) {
    query = query.eq('unit_id', unitId);
  }

  const { data: revenues } = await query;

  const headers = ['Dátum', '0% ÁFA', '5% ÁFA', '18% ÁFA', '27% ÁFA', 'Borravaló', 'Összesen', 'Készpénz', 'Kártya', 'Terminál'];

  const data = (revenues || []).map((row) => {
    const crRevenues = row.cash_register_revenue || [];
    const vat_0 = crRevenues.reduce((sum, r) => sum + (parseFloat(r.vat_0_percent) || 0), 0);
    const vat_5 = crRevenues.reduce((sum, r) => sum + (parseFloat(r.vat_5_percent) || 0), 0);
    const vat_18 = crRevenues.reduce((sum, r) => sum + (parseFloat(r.vat_18_percent) || 0), 0);
    const vat_27 = crRevenues.reduce((sum, r) => sum + (parseFloat(r.vat_27_percent) || 0), 0);
    const tips = crRevenues.reduce((sum, r) => sum + (parseFloat(r.tips) || 0), 0);
    const cash = crRevenues.reduce((sum, r) => sum + (parseFloat(r.cash_payment) || 0), 0);
    const card = crRevenues.reduce((sum, r) => sum + (parseFloat(r.card_payment) || 0), 0);
    const terminal = crRevenues.reduce((sum, r) => sum + (parseFloat(r.terminal_card) || 0), 0);

    return {
      'Dátum': formatDate(row.date),
      '0% ÁFA': vat_0,
      '5% ÁFA': vat_5,
      '18% ÁFA': vat_18,
      '27% ÁFA': vat_27,
      'Borravaló': tips,
      'Összesen': vat_0 + vat_5 + vat_18 + vat_27 + tips,
      'Készpénz': cash,
      'Kártya': card,
      'Terminál': terminal,
    };
  });

  return { data, headers };
}

async function fetchEventsExport(startDate, endDate, unitId) {
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
    return { data: [], headers: [] };
  }

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

  const headers = ['Dátum', 'Rendezvény', 'Bevétel', 'Költség', 'Eredmény'];

  const data = events.map((event) => ({
    'Dátum': formatDate(event.event_date),
    'Rendezvény': event.name,
    'Bevétel': revenueByEvent[event.id] || 0,
    'Költség': expenseByEvent[event.id] || 0,
    'Eredmény': (revenueByEvent[event.id] || 0) - (expenseByEvent[event.id] || 0),
  }));

  return { data, headers };
}

// Admin all-units exports
async function fetchFullMonthlyAllUnitsExport(startDate, endDate) {
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
  });

  // Add expenses
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
    unit.invoiceExpenses = unitExpenses.invoice;
    unit.reserveRevenue = unit.totalSoftware - unit.cashRegisterTotal - unitExpenses.nonInvoice;
    unit.dailyResult = unit.cashRegisterTotal + unit.reserveRevenue - unitExpenses.invoice;
  });

  const headers = ['Egység', 'Szoftver bevétel', 'Pénztárgép KP', 'Pénztárgép kártya', 'Tartalék bevétel', 'Költség', 'Eredmény'];

  const data = Object.values(unitData)
    .sort((a, b) => a.unitName.localeCompare(b.unitName))
    .map((unit) => ({
      'Egység': unit.unitName,
      'Szoftver bevétel': unit.totalSoftware,
      'Pénztárgép KP': unit.cashRegisterCash,
      'Pénztárgép kártya': unit.cashRegisterCard,
      'Tartalék bevétel': unit.reserveRevenue,
      'Költség': -unit.invoiceExpenses,
      'Eredmény': unit.dailyResult,
    }));

  return { data, headers };
}

async function fetchCashRevenueAllUnitsExport(startDate, endDate) {
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
        totalSoftware: 0,
        cashRegisterTotal: 0,
      };
    }

    const crRevenues = row.cash_register_revenue || [];
    const cashRegisterCash = crRevenues.reduce((sum, r) => sum + (parseFloat(r.cash_payment) || 0), 0);
    const cashRegisterCard = crRevenues.reduce((sum, r) => sum + (parseFloat(r.card_payment) || 0), 0);
    const cashRegisterTotal = cashRegisterCash + cashRegisterCard;

    unitData[unitId].cashRegisterCash += cashRegisterCash;
    unitData[unitId].totalSoftware += parseFloat(row.total_revenue) || 0;
    unitData[unitId].cashRegisterTotal += cashRegisterTotal;
  });

  // Add expenses
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

  const headers = ['Egység', 'Pénztár zseb', 'Tartalék bevétel', 'Összesen'];

  const data = Object.values(unitData)
    .sort((a, b) => a.unitName.localeCompare(b.unitName))
    .map((unit) => ({
      'Egység': unit.unitName,
      'Pénztár zseb': unit.cashRegisterPocket,
      'Tartalék bevétel': unit.reserveRevenue,
      'Összesen': unit.total,
    }));

  return { data, headers };
}

async function fetchCashRegisterAllUnitsSimpleExport(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, cash_registers(ap_number, name))')
    .gte('date', startDate)
    .lte('date', endDate);

  // Group by unit and register
  const unitData = {};
  (revenues || []).forEach((row) => {
    const unitName = row.units?.name || 'Ismeretlen';
    const unitId = row.unit_id;

    if (!unitData[unitId]) {
      unitData[unitId] = {
        unitName,
        registers: {},
        cashRegisterTotal: 0,
        cash: 0,
        card: 0,
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

      unitData[unitId].cashRegisterTotal += total;
      unitData[unitId].cash += parseFloat(cr.cash_payment) || 0;
      unitData[unitId].card += parseFloat(cr.card_payment) || 0;
    });
  });

  const headers = ['Egység', 'Pénztárgép', 'Forgalom', 'Készpénz', 'Kártya'];

  const data = [];
  Object.values(unitData)
    .sort((a, b) => a.unitName.localeCompare(b.unitName))
    .forEach((unit) => {
      Object.values(unit.registers).forEach((reg) => {
        data.push({
          'Egység': unit.unitName,
          'Pénztárgép': `${reg.ap_number}${reg.name ? ` (${reg.name})` : ''}`,
          'Forgalom': reg.total,
          'Készpénz': reg.cash,
          'Kártya': reg.card,
        });
      });
    });

  return { data, headers };
}

async function fetchCashRegisterAllUnitsDetailedExport(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, cash_registers(ap_number, name))')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  const headers = ['Egység', 'Dátum', 'Pénztárgép', '0% ÁFA', '5% ÁFA', '18% ÁFA', '27% ÁFA', 'Borravaló', 'Összesen', 'Készpénz', 'Kártya'];

  const data = [];
  (revenues || []).forEach((row) => {
    const unitName = row.units?.name || 'Ismeretlen';
    const crRevenues = row.cash_register_revenue || [];

    crRevenues.forEach((cr) => {
      const total = (parseFloat(cr.vat_0_percent) || 0) +
        (parseFloat(cr.vat_5_percent) || 0) +
        (parseFloat(cr.vat_18_percent) || 0) +
        (parseFloat(cr.vat_27_percent) || 0) +
        (parseFloat(cr.tips) || 0);

      data.push({
        'Egység': unitName,
        'Dátum': formatDate(row.date),
        'Pénztárgép': cr.cash_registers?.ap_number || 'unknown',
        '0% ÁFA': parseFloat(cr.vat_0_percent) || 0,
        '5% ÁFA': parseFloat(cr.vat_5_percent) || 0,
        '18% ÁFA': parseFloat(cr.vat_18_percent) || 0,
        '27% ÁFA': parseFloat(cr.vat_27_percent) || 0,
        'Borravaló': parseFloat(cr.tips) || 0,
        'Összesen': total,
        'Készpénz': parseFloat(cr.cash_payment) || 0,
        'Kártya': parseFloat(cr.card_payment) || 0,
      });
    });
  });

  return { data, headers };
}

async function fetchEventsAllUnitsExport(startDate, endDate) {
  const { data: events } = await supabase
    .from('events')
    .select('*, units(name)')
    .gte('event_date', startDate)
    .lte('event_date', endDate);

  if (!events?.length) {
    return { data: [], headers: [] };
  }

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

  // Group by unit
  const unitData = {};
  events.forEach((event) => {
    const unitName = event.units?.name || 'Ismeretlen';
    const unitId = event.unit_id;

    if (!unitData[unitId]) {
      unitData[unitId] = {
        unitName,
        eventCount: 0,
        totalRevenue: 0,
        totalExpenses: 0,
      };
    }

    unitData[unitId].eventCount += 1;
    unitData[unitId].totalRevenue += revenueByEvent[event.id] || 0;
    unitData[unitId].totalExpenses += expenseByEvent[event.id] || 0;
  });

  const headers = ['Egység', 'Események száma', 'Bevétel', 'Költség', 'Eredmény'];

  const data = Object.values(unitData)
    .sort((a, b) => a.unitName.localeCompare(b.unitName))
    .map((unit) => ({
      'Egység': unit.unitName,
      'Események száma': unit.eventCount,
      'Bevétel': unit.totalRevenue,
      'Költség': unit.totalExpenses,
      'Eredmény': unit.totalRevenue - unit.totalExpenses,
    }));

  return { data, headers };
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function calculateTotalsRow(data, headers) {
  const totalsRow = {};
  headers.forEach((key) => {
    const firstRow = data[0];
    if (firstRow && typeof firstRow[key] === 'number') {
      totalsRow[key] = data.reduce((sum, row) => sum + (row[key] || 0), 0);
    } else if (key === 'Dátum' || key === 'Egység') {
      totalsRow[key] = 'Összesen';
    } else {
      totalsRow[key] = '';
    }
  });
  return totalsRow;
}

function exportToExcel(data, headers, totalsRow, filename) {
  const ws = XLSX.utils.json_to_sheet(data);

  // Get the range
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Set column widths
  const colWidths = headers.map((key) => ({
    wch: Math.max(key.length + 2, 15),
  }));
  ws['!cols'] = colWidths;

  // Style header row
  for (let col = range.s.c; col <= range.e.c; col++) {
    const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[headerCell]) {
      ws[headerCell].s = {
        fill: { fgColor: { rgb: 'D32F2F' } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center' },
      };
    }
  }

  // Add totals row
  XLSX.utils.sheet_add_json(ws, [totalsRow], {
    skipHeader: true,
    origin: -1,
  });

  // Update range after adding totals
  const newRange = XLSX.utils.decode_range(ws['!ref']);

  // Style totals row
  const totalsRowIndex = newRange.e.r;
  for (let col = newRange.s.c; col <= newRange.e.c; col++) {
    const cell = XLSX.utils.encode_cell({ r: totalsRowIndex, c: col });
    if (ws[cell]) {
      ws[cell].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'F3F4F6' } },
      };
    }
  }

  // Format numeric cells
  for (let row = 1; row <= newRange.e.r; row++) {
    for (let col = 0; col <= newRange.e.c; col++) {
      const cell = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[cell] && typeof ws[cell].v === 'number') {
        ws[cell].z = '#,##0 Ft';
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Riport');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportToPdf(data, headers, totalsRow, filename, reportType, startDate, endDate) {
  const doc = new jsPDF({
    orientation: headers.length > 7 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header with Pepper House branding
  doc.setFillColor(211, 47, 47);
  doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('Pepper House', 14, 12);

  doc.setFontSize(10);
  doc.text('Pénzügyi Nyilvántartó Rendszer', 14, 18);

  // Report title
  const reportLabel = reportTypeLabels[reportType] || 'Riport';
  doc.setFontSize(14);
  doc.setTextColor(211, 47, 47);
  doc.text(reportLabel, 14, 35);

  // Date range
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Időszak: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 42);

  // Format data for PDF table
  const tableData = data.map((row) =>
    headers.map((h) =>
      typeof row[h] === 'number' ? formatCurrency(row[h]) : row[h]
    )
  );

  // Add totals row
  const totalsPdfRow = headers.map((h) =>
    typeof totalsRow[h] === 'number' ? formatCurrency(totalsRow[h]) : totalsRow[h]
  );
  tableData.push(totalsPdfRow);

  // Create table
  autoTable(doc, {
    startY: 48,
    head: [headers],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [211, 47, 47],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: headers.reduce((acc, h, i) => {
      const firstRow = data[0];
      if (firstRow && typeof firstRow[h] === 'number') {
        acc[i] = { halign: 'right' };
      }
      return acc;
    }, {}),
    didParseCell: function (hookData) {
      // Bold the totals row
      if (hookData.row.index === tableData.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [243, 244, 246];
      }
    },
    margin: { top: 48 },
  });

  // Footer with generation date
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(150);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Generálva: ${new Date().toLocaleString('hu-HU')} | Oldal ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${filename}.pdf`);
}

function exportToCsv(data, headers, totalsRow, filename) {
  const totalsArray = headers.map((h) => {
    const val = totalsRow[h];
    if (typeof val === 'string' && val.includes(',')) {
      return `"${val}"`;
    }
    return val;
  });

  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`;
        }
        return val;
      }).join(',')
    ),
    totalsArray.join(','),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
