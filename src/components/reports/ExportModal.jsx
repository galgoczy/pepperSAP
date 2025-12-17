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
      let unitName = '';
      let customTotals = null;

      // Helper to sanitize unit name for filename
      const sanitizeFilename = (name) => {
        if (!name) return '';
        return name
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[áàâä]/g, 'a')
          .replace(/[éèêë]/g, 'e')
          .replace(/[íìîï]/g, 'i')
          .replace(/[óòôöő]/g, 'o')
          .replace(/[úùûüű]/g, 'u')
          .replace(/[^a-z0-9_]/g, '');
      };

      // Fetch data based on report type
      if (reportType === 'full_monthly') {
        const result = await fetchFullMonthlyExport(startDate, endDate, unitId);
        data = result.data;
        headers = result.headers;
        unitName = result.unitName || '';
        const unitSlug = sanitizeFilename(unitName);
        filename = unitSlug ? `teljes_havi_forgalom_${unitSlug}_${startDate}_${endDate}` : `teljes_havi_forgalom_${startDate}_${endDate}`;
      } else if (reportType === 'cash_revenue') {
        const result = await fetchCashRevenueExport(startDate, endDate, unitId);
        data = result.data;
        headers = result.headers;
        unitName = result.unitName || '';
        const unitSlug = sanitizeFilename(unitName);
        filename = unitSlug ? `keszpenz_bevetelek_${unitSlug}_${startDate}_${endDate}` : `keszpenz_bevetelek_${startDate}_${endDate}`;
      } else if (reportType === 'cash_register') {
        const result = await fetchCashRegisterExport(startDate, endDate, unitId);
        data = result.data;
        headers = result.headers;
        unitName = result.unitName || '';
        const unitSlug = sanitizeFilename(unitName);
        filename = unitSlug ? `penztargep_jelentes_${unitSlug}_${startDate}_${endDate}` : `penztargep_jelentes_${startDate}_${endDate}`;
        // Special totals row for cash register
        customTotals = {
          'Dátum': 'Mindösszesen',
          '0% ÁFA': result.grandTotals.vat_0,
          '5% ÁFA': result.grandTotals.vat_5,
          '18% ÁFA': result.grandTotals.vat_18,
          '27% ÁFA': result.grandTotals.vat_27,
          'Borravaló': result.grandTotals.tips,
          'Összesen': result.grandTotals.total,
          'Készpénz': result.grandTotals.cash,
          'Kártya': result.grandTotals.card,
          'Terminál': result.grandTotals.terminal_card,
          'Eltérés': result.grandTotals.cardDiscrepancy,
          _rowType: 'grandTotal',
        };
      } else if (reportType === 'events') {
        const result = await fetchEventsExport(startDate, endDate, unitId);
        data = result.data;
        headers = result.headers;
        unitName = result.unitName || '';
        const unitSlug = sanitizeFilename(unitName);
        filename = unitSlug ? `rendezvenyek_${unitSlug}_${startDate}_${endDate}` : `rendezvenyek_${startDate}_${endDate}`;
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

      // Calculate totals row (use custom totals for cash_register)
      const totalsRow = customTotals || calculateTotalsRow(data, headers);

      // Export based on format
      if (format === 'xlsx') {
        exportToExcel(data, headers, totalsRow, filename, reportType);
      } else if (format === 'pdf') {
        await exportToPdf(data, headers, totalsRow, filename, reportType, startDate, endDate, unitName);
      } else {
        exportToCsv(data, headers, totalsRow, filename, reportType);
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

  // Get unit name
  const unitName = revenues[0]?.units?.name || '';

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

  return { data, headers, unitName };
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

  // Get unit name
  const unitName = revenues[0]?.units?.name || '';

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

  return { data, headers, unitName };
}

async function fetchCashRegisterExport(startDate, endDate, unitId) {
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

  // Get unit name
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

  const registers = Object.values(registerData).sort((a, b) => a.ap_number.localeCompare(b.ap_number));

  // Headers without "Pénztárgép" column - register name will be in header rows
  const headers = ['Dátum', '0% ÁFA', '5% ÁFA', '18% ÁFA', '27% ÁFA', 'Borravaló', 'Összesen', 'Készpénz', 'Kártya', 'Terminál', 'Eltérés'];

  const data = [];
  let grandTotals = {
    vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0,
    total: 0, cash: 0, card: 0, terminal_card: 0, cardDiscrepancy: 0,
  };

  registers.forEach((reg) => {
    // Add register header row
    const registerLabel = reg.name ? `Pénztárgép: ${reg.ap_number} (${reg.name})` : `Pénztárgép: ${reg.ap_number}`;
    data.push({
      'Dátum': registerLabel,
      '0% ÁFA': '',
      '5% ÁFA': '',
      '18% ÁFA': '',
      '27% ÁFA': '',
      'Borravaló': '',
      'Összesen': '',
      'Készpénz': '',
      'Kártya': '',
      'Terminál': '',
      'Eltérés': '',
      _rowType: 'registerHeader',
    });

    // Add days for this register
    reg.days.forEach((day) => {
      data.push({
        'Dátum': formatDate(day.date),
        '0% ÁFA': day.vat_0,
        '5% ÁFA': day.vat_5,
        '18% ÁFA': day.vat_18,
        '27% ÁFA': day.vat_27,
        'Borravaló': day.tips,
        'Összesen': day.total,
        'Készpénz': day.cash,
        'Kártya': day.card,
        'Terminál': day.terminal_card,
        'Eltérés': day.cardDiscrepancy,
        _rowType: 'data',
      });
    });

    // Add subtotal row for this register
    data.push({
      'Dátum': `${reg.ap_number} összesen`,
      '0% ÁFA': reg.totals.vat_0,
      '5% ÁFA': reg.totals.vat_5,
      '18% ÁFA': reg.totals.vat_18,
      '27% ÁFA': reg.totals.vat_27,
      'Borravaló': reg.totals.tips,
      'Összesen': reg.totals.total,
      'Készpénz': reg.totals.cash,
      'Kártya': reg.totals.card,
      'Terminál': reg.totals.terminal_card,
      'Eltérés': reg.totals.cardDiscrepancy,
      _rowType: 'subtotal',
    });

    // Accumulate grand totals
    grandTotals.vat_0 += reg.totals.vat_0;
    grandTotals.vat_5 += reg.totals.vat_5;
    grandTotals.vat_18 += reg.totals.vat_18;
    grandTotals.vat_27 += reg.totals.vat_27;
    grandTotals.tips += reg.totals.tips;
    grandTotals.total += reg.totals.total;
    grandTotals.cash += reg.totals.cash;
    grandTotals.card += reg.totals.card;
    grandTotals.terminal_card += reg.totals.terminal_card;
    grandTotals.cardDiscrepancy += reg.totals.cardDiscrepancy;
  });

  return { data, headers, unitName, grandTotals };
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
    return { data: [], headers: [], unitName: '' };
  }

  // Get unit name
  const unitName = events[0]?.units?.name || '';

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

  return { data, headers, unitName };
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

  // Fetch events data
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

  const unitsArray = Object.values(unitData).sort((a, b) => a.unitName.localeCompare(b.unitName));

  // Calculate units totals
  const unitsTotals = {
    totalSoftware: unitsArray.reduce((sum, u) => sum + u.totalSoftware, 0),
    cashRegisterCash: unitsArray.reduce((sum, u) => sum + u.cashRegisterCash, 0),
    cashRegisterCard: unitsArray.reduce((sum, u) => sum + u.cashRegisterCard, 0),
    reserveRevenue: unitsArray.reduce((sum, u) => sum + u.reserveRevenue, 0),
    invoiceExpenses: unitsArray.reduce((sum, u) => sum + u.invoiceExpenses, 0),
    dailyResult: unitsArray.reduce((sum, u) => sum + u.dailyResult, 0),
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
        event_date: event.event_date,
        name: event.name,
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
      const unitName = event.unitName;

      if (!eventUnitData[unitName]) {
        eventUnitData[unitName] = {
          unitName,
          eventCount: 0,
          total_revenue: 0,
          total_expenses: 0,
          official_expenses: 0,
          efo_expenses: 0,
          non_official_expenses: 0,
          profit: 0,
        };
      }

      eventUnitData[unitName].eventCount += 1;
      eventUnitData[unitName].total_revenue += event.total_revenue;
      eventUnitData[unitName].total_expenses += event.total_expenses;
      eventUnitData[unitName].official_expenses += event.official_expenses;
      eventUnitData[unitName].efo_expenses += event.efo_expenses;
      eventUnitData[unitName].non_official_expenses += event.non_official_expenses;
      eventUnitData[unitName].profit += event.profit;
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

  // Calculate grand totals
  const grandTotals = {
    totalRevenue: unitsTotals.totalSoftware + eventsTotals.total_revenue,
    totalResult: unitsTotals.dailyResult + eventsTotals.profit,
  };

  // Build combined data for export
  const data = [];

  // Section 1: Units
  data.push({
    'Egység': '=== EGYSÉGEK ===',
    'Szoftver bevétel': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Költség': '',
    'Eredmény': '',
    _rowType: 'sectionHeader',
  });

  unitsArray.forEach((unit) => {
    data.push({
      'Egység': unit.unitName,
      'Szoftver bevétel': unit.totalSoftware,
      'Pénztárgép KP': unit.cashRegisterCash,
      'Pénztárgép kártya': unit.cashRegisterCard,
      'Tartalék bevétel': unit.reserveRevenue,
      'Költség': -unit.invoiceExpenses,
      'Eredmény': unit.dailyResult,
      _rowType: 'data',
    });
  });

  data.push({
    'Egység': 'Egységek összesen',
    'Szoftver bevétel': unitsTotals.totalSoftware,
    'Pénztárgép KP': unitsTotals.cashRegisterCash,
    'Pénztárgép kártya': unitsTotals.cashRegisterCard,
    'Tartalék bevétel': unitsTotals.reserveRevenue,
    'Költség': -unitsTotals.invoiceExpenses,
    'Eredmény': unitsTotals.dailyResult,
    _rowType: 'subtotal',
  });

  // Section 2: Events (if any)
  if (eventsData.length > 0) {
    // Empty row
    data.push({
      'Egység': '',
      'Szoftver bevétel': '',
      'Pénztárgép KP': '',
      'Pénztárgép kártya': '',
      'Tartalék bevétel': '',
      'Költség': '',
      'Eredmény': '',
      _rowType: 'empty',
    });

    data.push({
      'Egység': '=== RENDEZVÉNYEK ===',
      'Szoftver bevétel': '',
      'Pénztárgép KP': '',
      'Pénztárgép kártya': '',
      'Tartalék bevétel': '',
      'Költség': '',
      'Eredmény': '',
      _rowType: 'sectionHeader',
    });

    // Events headers row
    data.push({
      'Egység': 'Egység',
      'Szoftver bevétel': 'Db',
      'Pénztárgép KP': 'Bevétel',
      'Pénztárgép kártya': 'Számlás',
      'Tartalék bevétel': 'EFO',
      'Költség': 'Nem számlás',
      'Eredmény': 'Eredmény',
      _rowType: 'eventsHeader',
    });

    eventsData.forEach((event) => {
      data.push({
        'Egység': event.unitName,
        'Szoftver bevétel': event.eventCount,
        'Pénztárgép KP': event.total_revenue,
        'Pénztárgép kártya': event.official_expenses,
        'Tartalék bevétel': event.efo_expenses,
        'Költség': event.non_official_expenses,
        'Eredmény': event.profit,
        _rowType: 'eventData',
      });
    });

    data.push({
      'Egység': 'Rendezvények összesen',
      'Szoftver bevétel': eventsTotals.eventCount,
      'Pénztárgép KP': eventsTotals.total_revenue,
      'Pénztárgép kártya': eventsTotals.official_expenses,
      'Tartalék bevétel': eventsTotals.efo_expenses,
      'Költség': eventsTotals.non_official_expenses,
      'Eredmény': eventsTotals.profit,
      _rowType: 'eventsSubtotal',
    });

    // Section 3: Events list
    data.push({
      'Egység': '',
      'Szoftver bevétel': '',
      'Pénztárgép KP': '',
      'Pénztárgép kártya': '',
      'Tartalék bevétel': '',
      'Költség': '',
      'Eredmény': '',
      _rowType: 'empty',
    });

    data.push({
      'Egység': '--- Rendezvények részletesen ---',
      'Szoftver bevétel': '',
      'Pénztárgép KP': '',
      'Pénztárgép kártya': '',
      'Tartalék bevétel': '',
      'Költség': '',
      'Eredmény': '',
      _rowType: 'eventsListHeader',
    });

    data.push({
      'Egység': 'Dátum',
      'Szoftver bevétel': 'Egység',
      'Pénztárgép KP': 'Rendezvény',
      'Pénztárgép kártya': 'Bevétel',
      'Tartalék bevétel': 'Költség',
      'Költség': '',
      'Eredmény': 'Eredmény',
      _rowType: 'eventsListColumns',
    });

    eventsList.forEach((event) => {
      data.push({
        'Egység': formatDate(event.event_date),
        'Szoftver bevétel': event.unitName,
        'Pénztárgép KP': event.name,
        'Pénztárgép kártya': event.total_revenue,
        'Tartalék bevétel': event.total_expenses,
        'Költség': '',
        'Eredmény': event.profit,
        _rowType: 'eventListItem',
      });
    });
  }

  // Section 4: Grand totals
  data.push({
    'Egység': '',
    'Szoftver bevétel': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Költség': '',
    'Eredmény': '',
    _rowType: 'empty',
  });

  data.push({
    'Egység': '=== MINDÖSSZESEN ===',
    'Szoftver bevétel': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Költség': '',
    'Eredmény': '',
    _rowType: 'grandTotalHeader',
  });

  data.push({
    'Egység': 'Egységek bevétel',
    'Szoftver bevétel': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Költség': '',
    'Eredmény': unitsTotals.totalSoftware,
    _rowType: 'grandTotalRow',
  });

  data.push({
    'Egység': 'Rendezvények bevétel',
    'Szoftver bevétel': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Költség': '',
    'Eredmény': eventsTotals.total_revenue,
    _rowType: 'grandTotalRow',
  });

  data.push({
    'Egység': 'ÖSSZES BEVÉTEL',
    'Szoftver bevétel': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Költség': '',
    'Eredmény': grandTotals.totalRevenue,
    _rowType: 'grandTotal',
  });

  data.push({
    'Egység': 'Egységek eredménye',
    'Szoftver bevétel': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Költség': '',
    'Eredmény': unitsTotals.dailyResult,
    _rowType: 'grandTotalRow',
  });

  data.push({
    'Egység': 'Rendezvények eredménye',
    'Szoftver bevétel': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Költség': '',
    'Eredmény': eventsTotals.profit,
    _rowType: 'grandTotalRow',
  });

  data.push({
    'Egység': 'ÖSSZES EREDMÉNY',
    'Szoftver bevétel': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Költség': '',
    'Eredmény': grandTotals.totalResult,
    _rowType: 'grandTotal',
  });

  return { data, headers, hasEvents: eventsData.length > 0 };
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
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, terminal_card, cash_registers(ap_number, name))')
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
        terminal_card: 0,
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

  const headers = ['Egység', 'Pénztárgép', 'Forgalom', 'Készpénz', 'Kártya', 'Terminál', 'Eltérés'];

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
          'Terminál': reg.terminal_card,
          'Eltérés': reg.card - reg.terminal_card,
        });
      });
    });

  return { data, headers };
}

async function fetchCashRegisterAllUnitsDetailedExport(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, terminal_card, cash_registers(ap_number, name))')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  // Group by unit, then by register
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

  // Headers without "Pénztárgép" column - register name will be in header rows
  const headers = ['Dátum', '0% ÁFA', '5% ÁFA', '18% ÁFA', '27% ÁFA', 'Borravaló', 'Összesen', 'Készpénz', 'Kártya', 'Terminál', 'Eltérés'];

  const data = [];
  const units = Object.values(unitData).sort((a, b) => a.unitName.localeCompare(b.unitName));

  // Track grand totals
  const grandTotals = {
    vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0,
    total: 0, cash: 0, card: 0, terminal_card: 0,
  };

  units.forEach((unit, unitIndex) => {
    // Add empty row between units (not before the first unit)
    if (unitIndex > 0) {
      data.push({
        'Dátum': '', '0% ÁFA': '', '5% ÁFA': '', '18% ÁFA': '', '27% ÁFA': '', 'Borravaló': '',
        'Összesen': '', 'Készpénz': '', 'Kártya': '', 'Terminál': '', 'Eltérés': '',
        _rowType: 'empty',
      });
    }

    // Unit header row
    data.push({
      'Dátum': `=== ${unit.unitName} ===`,
      '0% ÁFA': '', '5% ÁFA': '', '18% ÁFA': '', '27% ÁFA': '', 'Borravaló': '',
      'Összesen': '', 'Készpénz': '', 'Kártya': '', 'Terminál': '', 'Eltérés': '',
      _rowType: 'unitHeader',
    });

    const registers = Object.values(unit.registers).sort((a, b) => a.ap_number.localeCompare(b.ap_number));

    registers.forEach((reg) => {
      // Register header row
      const registerLabel = reg.name ? `Pénztárgép: ${reg.ap_number} (${reg.name})` : `Pénztárgép: ${reg.ap_number}`;
      data.push({
        'Dátum': registerLabel,
        '0% ÁFA': '', '5% ÁFA': '', '18% ÁFA': '', '27% ÁFA': '', 'Borravaló': '',
        'Összesen': '', 'Készpénz': '', 'Kártya': '', 'Terminál': '', 'Eltérés': '',
        _rowType: 'registerHeader',
      });

      // Day rows
      reg.days.forEach((day) => {
        data.push({
          'Dátum': formatDate(day.date),
          '0% ÁFA': day.vat_0,
          '5% ÁFA': day.vat_5,
          '18% ÁFA': day.vat_18,
          '27% ÁFA': day.vat_27,
          'Borravaló': day.tips,
          'Összesen': day.total,
          'Készpénz': day.cash,
          'Kártya': day.card,
          'Terminál': day.terminal_card,
          'Eltérés': day.discrepancy,
          _rowType: 'data',
        });
      });

      // Register subtotal row
      const regDiscrepancy = reg.totals.card - reg.totals.terminal_card;
      data.push({
        'Dátum': `${reg.ap_number} összesen`,
        '0% ÁFA': reg.totals.vat_0,
        '5% ÁFA': reg.totals.vat_5,
        '18% ÁFA': reg.totals.vat_18,
        '27% ÁFA': reg.totals.vat_27,
        'Borravaló': reg.totals.tips,
        'Összesen': reg.totals.total,
        'Készpénz': reg.totals.cash,
        'Kártya': reg.totals.card,
        'Terminál': reg.totals.terminal_card,
        'Eltérés': regDiscrepancy,
        _rowType: 'subtotal',
      });
    });

    // Unit grand total row
    const unitDiscrepancy = unit.totals.card - unit.totals.terminal_card;
    data.push({
      'Dátum': `${unit.unitName} összesen`,
      '0% ÁFA': unit.totals.vat_0,
      '5% ÁFA': unit.totals.vat_5,
      '18% ÁFA': unit.totals.vat_18,
      '27% ÁFA': unit.totals.vat_27,
      'Borravaló': unit.totals.tips,
      'Összesen': unit.totals.total,
      'Készpénz': unit.totals.cash,
      'Kártya': unit.totals.card,
      'Terminál': unit.totals.terminal_card,
      'Eltérés': unitDiscrepancy,
      _rowType: 'unitTotal',
    });

    // Add to grand totals
    grandTotals.vat_0 += unit.totals.vat_0;
    grandTotals.vat_5 += unit.totals.vat_5;
    grandTotals.vat_18 += unit.totals.vat_18;
    grandTotals.vat_27 += unit.totals.vat_27;
    grandTotals.tips += unit.totals.tips;
    grandTotals.total += unit.totals.total;
    grandTotals.cash += unit.totals.cash;
    grandTotals.card += unit.totals.card;
    grandTotals.terminal_card += unit.totals.terminal_card;
  });

  // Add empty row before grand total
  data.push({
    'Dátum': '', '0% ÁFA': '', '5% ÁFA': '', '18% ÁFA': '', '27% ÁFA': '', 'Borravaló': '',
    'Összesen': '', 'Készpénz': '', 'Kártya': '', 'Terminál': '', 'Eltérés': '',
    _rowType: 'empty',
  });

  // Add grand total row at the end
  const grandDiscrepancy = grandTotals.card - grandTotals.terminal_card;
  data.push({
    'Dátum': 'Mindösszesen',
    '0% ÁFA': grandTotals.vat_0,
    '5% ÁFA': grandTotals.vat_5,
    '18% ÁFA': grandTotals.vat_18,
    '27% ÁFA': grandTotals.vat_27,
    'Borravaló': grandTotals.tips,
    'Összesen': grandTotals.total,
    'Készpénz': grandTotals.cash,
    'Kártya': grandTotals.card,
    'Terminál': grandTotals.terminal_card,
    'Eltérés': grandDiscrepancy,
    _rowType: 'grandTotal',
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

function exportToExcel(data, headers, totalsRow, filename, reportType) {
  // Clean data: remove internal flags and filter columns
  const cleanData = data.map((row) => {
    const cleanRow = {};
    headers.forEach((h) => {
      cleanRow[h] = row[h];
    });
    return cleanRow;
  });

  const ws = XLSX.utils.json_to_sheet(cleanData);

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

  // For cash_register, cash_register_all_detailed and full_monthly_all, style rows based on _rowType
  if (reportType === 'cash_register' || reportType === 'cash_register_all_detailed' || reportType === 'full_monthly_all') {
    for (let row = 1; row <= range.e.r; row++) {
      const rowData = data[row - 1];
      if (rowData && rowData._rowType) {
        let cellStyle = null;

        if (rowData._rowType === 'unitHeader') {
          // Unit header: bold, dark red background with white text
          cellStyle = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: 'D32F2F' } },
          };
        } else if (rowData._rowType === 'registerHeader') {
          // Register header: bold, dark blue background with white text
          cellStyle = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '3B82F6' } },
          };
        } else if (rowData._rowType === 'sectionHeader' || rowData._rowType === 'grandTotalHeader') {
          // Section header: bold, dark red background with white text
          cellStyle = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: 'D32F2F' } },
          };
        } else if (rowData._rowType === 'eventsHeader' || rowData._rowType === 'eventsListColumns') {
          // Events headers: bold, dark gray background with white text
          cellStyle = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '4B5563' } },
          };
        } else if (rowData._rowType === 'eventsListHeader') {
          // Events list header: bold, medium gray background
          cellStyle = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'D1D5DB' } },
          };
        } else if (rowData._rowType === 'subtotal' || rowData._rowType === 'eventsSubtotal') {
          // Subtotal: bold, gray background
          cellStyle = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'E5E7EB' } },
          };
        } else if (rowData._rowType === 'unitTotal') {
          // Unit total: bold, light red background
          cellStyle = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'FECACA' } },
          };
        } else if (rowData._rowType === 'grandTotalRow') {
          // Grand total row: regular, light gray background
          cellStyle = {
            fill: { fgColor: { rgb: 'F3F4F6' } },
          };
        } else if (rowData._rowType === 'grandTotal') {
          // Grand total: bold, dark red background with white text
          cellStyle = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: 'B91C1C' } },
          };
        }

        if (cellStyle) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cell = XLSX.utils.encode_cell({ r: row, c: col });
            if (ws[cell]) {
              ws[cell].s = cellStyle;
            }
          }
        }
      }
    }
  }

  // Add totals row (skip for cash_register_all_detailed and full_monthly_all since they have their own grandTotal rows)
  if (reportType !== 'cash_register_all_detailed' && reportType !== 'full_monthly_all') {
    const cleanTotalsRow = {};
    headers.forEach((h) => {
      cleanTotalsRow[h] = totalsRow[h];
    });
    XLSX.utils.sheet_add_json(ws, [cleanTotalsRow], {
      skipHeader: true,
      origin: -1,
    });

    // Update range after adding totals
    const updatedRange = XLSX.utils.decode_range(ws['!ref']);

    // Style totals row (grand total for cash_register or regular totals)
    const totalsRowIndex = updatedRange.e.r;
    for (let col = updatedRange.s.c; col <= updatedRange.e.c; col++) {
      const cell = XLSX.utils.encode_cell({ r: totalsRowIndex, c: col });
      if (ws[cell]) {
        ws[cell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'FECACA' } },
        };
      }
    }
  }

  // Format numeric cells
  const finalRange = XLSX.utils.decode_range(ws['!ref']);
  for (let row = 1; row <= finalRange.e.r; row++) {
    for (let col = 0; col <= finalRange.e.c; col++) {
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

// Helper function to replace Hungarian special characters for PDF
function sanitizeForPdf(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/ő/g, 'ö')
    .replace(/Ő/g, 'Ö')
    .replace(/ű/g, 'ü')
    .replace(/Ű/g, 'Ü');
}

async function exportToPdf(data, headers, totalsRow, filename, reportType, startDate, endDate, unitName = '') {
  const doc = new jsPDF({
    orientation: headers.length > 7 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header with Pepper House branding
  doc.setFillColor(211, 47, 47);
  doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');

  // Try to load logo
  let logoLoaded = false;
  try {
    const response = await fetch('/gfx/logo.png');
    if (response.ok) {
      const blob = await response.blob();
      const reader = new FileReader();
      const logoBase64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      // Add logo image (white logo on transparent background for red header)
      // Adjust dimensions as needed - height 15mm, width proportional
      doc.addImage(logoBase64, 'PNG', 10, 5, 50, 15);
      logoLoaded = true;
    }
  } catch (e) {
    // Logo not available, use text fallback
  }

  // Fallback to text if logo not loaded
  if (!logoLoaded) {
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('Pepper House', 14, 12);

    doc.setFontSize(10);
    doc.text(sanitizeForPdf('Pénzügyi Nyilvántartó Rendszer'), 14, 18);
  }

  // Report title with unit name
  let reportLabel = reportTypeLabels[reportType] || 'Riport';
  if (unitName) {
    reportLabel = `${reportLabel} - ${unitName}`;
  }
  doc.setFontSize(14);
  doc.setTextColor(211, 47, 47);
  doc.text(sanitizeForPdf(reportLabel), 14, 35);

  // Date range
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(sanitizeForPdf(`Idöszak: ${formatDate(startDate)} - ${formatDate(endDate)}`), 14, 42);

  // Format data for PDF table - sanitize all strings
  const tableData = data.map((row, rowIndex) =>
    headers.map((h) => {
      const val = row[h];
      if (typeof val === 'number') return formatCurrency(val);
      return sanitizeForPdf(val);
    })
  );

  // Add totals row (skip for cash_register_all_detailed and full_monthly_all since they have their own grandTotal rows)
  if (reportType !== 'cash_register_all_detailed' && reportType !== 'full_monthly_all') {
    const totalsPdfRow = headers.map((h) => {
      const val = totalsRow[h];
      if (typeof val === 'number') return formatCurrency(val);
      return sanitizeForPdf(val);
    });
    tableData.push(totalsPdfRow);
  }

  // Sanitize headers
  const sanitizedHeaders = headers.map((h) => sanitizeForPdf(h));

  // Determine if we should skip default totals row styling
  const skipDefaultTotalsStyle = reportType === 'cash_register_all_detailed' || reportType === 'full_monthly_all';

  // Create table
  autoTable(doc, {
    startY: 48,
    head: [sanitizedHeaders],
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
      // Grand totals row (last row) - skip for reports that have their own styling
      if (!skipDefaultTotalsStyle && hookData.row.index === tableData.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [254, 202, 202];
      }
      // Style rows based on _rowType for cash_register, cash_register_all_detailed, and full_monthly_all
      else if ((reportType === 'cash_register' || reportType === 'cash_register_all_detailed' || reportType === 'full_monthly_all') && data[hookData.row.index]) {
        const rowType = data[hookData.row.index]._rowType;
        if (rowType === 'unitHeader') {
          // Unit header: bold, dark red background with white text
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [211, 47, 47];
          hookData.cell.styles.textColor = [255, 255, 255];
        } else if (rowType === 'registerHeader') {
          // Register header: bold, dark blue background with white text
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [59, 130, 246];
          hookData.cell.styles.textColor = [255, 255, 255];
        } else if (rowType === 'sectionHeader' || rowType === 'grandTotalHeader') {
          // Section header: bold, dark red background with white text
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [211, 47, 47];
          hookData.cell.styles.textColor = [255, 255, 255];
        } else if (rowType === 'eventsHeader' || rowType === 'eventsListColumns') {
          // Events headers: bold, dark gray background with white text
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [75, 85, 99];
          hookData.cell.styles.textColor = [255, 255, 255];
        } else if (rowType === 'eventsListHeader') {
          // Events list header: bold, medium gray background
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [209, 213, 219];
        } else if (rowType === 'subtotal' || rowType === 'eventsSubtotal') {
          // Subtotal: bold, gray background
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [229, 231, 235];
        } else if (rowType === 'unitTotal') {
          // Unit total: bold, light red background
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [254, 202, 202];
        } else if (rowType === 'grandTotalRow') {
          // Grand total row: regular, light gray background
          hookData.cell.styles.fillColor = [243, 244, 246];
        } else if (rowType === 'grandTotal') {
          // Grand total: bold, dark red background with white text
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [185, 28, 28];
          hookData.cell.styles.textColor = [255, 255, 255];
        }
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
      sanitizeForPdf(`Generálva: ${new Date().toLocaleString('hu-HU')} | Oldal ${i}/${pageCount}`),
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${filename}.pdf`);
}

function exportToCsv(data, headers, totalsRow, filename, reportType) {
  const dataRows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`;
      }
      return val;
    }).join(',')
  );

  // Add totals row (skip for cash_register_all_detailed and full_monthly_all since they have their own grandTotal rows)
  const csvRows = [headers.join(','), ...dataRows];
  if (reportType !== 'cash_register_all_detailed' && reportType !== 'full_monthly_all') {
    const totalsArray = headers.map((h) => {
      const val = totalsRow[h];
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`;
      }
      return val;
    });
    csvRows.push(totalsArray.join(','));
  }

  const csvContent = csvRows.join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
