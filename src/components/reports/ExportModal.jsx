import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal, Button } from '../common';
import { supabase } from '../../lib/supabase';
import { formatDate, formatCurrency } from '../../lib/utils';
import { fetchHouseCashSeries, fetchCentralHouseCashSeries } from '../../lib/houseCashSeries';
import { isBlankClosure, hufDiscrepancyOf, validatePaymentBreakdown } from '../../lib/validations';
import { fetchCumulativeCheckSet } from '../../hooks/useCumulativeChecks';
import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
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
  monthly_table: 'Havi tábla (költség-bevétel)',
  house_cash: 'Házipénztár',
  full_traffic: 'Teljes forgalmi jelentés (forgalom + házipénztár)',
};

// Columns that hold plain counts (e.g. guest headcount), not money — these must
// not be formatted as currency in the PDF/Excel exports.
// Plain counters — no currency suffix (closure numbers are Z-report counters).
const COUNT_HEADERS = new Set(['Létszám', 'Zárás', 'Első zárás', 'Utolsó zárás']);
// Amounts denominated in EUR rather than HUF.
const EUR_HEADERS = new Set(['EUR elütés']);

// Hungarian month names for export
const MONTH_NAMES = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
];

// Parse yearMonth to get display text
function formatYearMonthDisplay(yearMonth) {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-').map(Number);
  return `${year}. ${MONTH_NAMES[month - 1]}`;
}

export default function ExportModal({ isOpen, onClose, startDate, endDate, unitId, reportType, selectedYearMonth }) {
  const [format, setFormat] = useState('xlsx');
  const [loading, setLoading] = useState(false);
  const { isAccountant } = useAuth();
  const { settings } = useAppSettings();
  // Mirror the house cash report: accountants only get the reserve-less version.
  const houseCashShowReserve = settings.showReserve && !isAccountant;

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
          'Novo forgalom': result.grandTotals.software,
          'Első zárás': '',
          'Utolsó zárás': '',
          'Utolsó göngyölt': '',
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
      } else if (reportType === 'monthly_table') {
        const result = await fetchMonthlyTableExport(selectedYearMonth);
        data = result.data;
        headers = result.headers;
        filename = `havi_tabla_${selectedYearMonth}`;
      } else if (reportType === 'house_cash') {
        const result = await fetchHouseCashExport(startDate, endDate, unitId, houseCashShowReserve);
        data = result.data;
        headers = result.headers;
        unitName = result.unitName || '';
        const unitSlug = sanitizeFilename(unitName);
        filename = unitSlug
          ? `hazipenztar_${unitSlug}_${startDate}_${endDate}`
          : `hazipenztar_osszes_egyseg_${startDate}_${endDate}`;
        // Sum only the flow columns (opening/closing are running balances).
        const sum = (key) => data.reduce((s, r) => s + (parseFloat(r[key]) || 0), 0);
        customTotals = {
          'Egység': 'Összesen', 'Dátum': '', 'Zseb': '', 'Nyitó': '',
          'Bevétel': sum('Bevétel'),
          'Kifizetés': sum('Kifizetés'),
          'Átküldés': sum('Átküldés'),
          'Zárás': '',
          _rowType: 'grandTotal',
        };
      } else if (reportType === 'full_traffic') {
        // Combined report: the monthly revenue AND the house cash, exported as two
        // sheets (Excel) / two sections (PDF) / two blocks (CSV).
        const forgalom = unitId
          ? await fetchFullMonthlyExport(startDate, endDate, unitId)
          : await fetchFullMonthlyAllUnitsExport(startDate, endDate);
        const hazi = await fetchHouseCashExport(startDate, endDate, unitId, houseCashShowReserve);
        unitName = forgalom.unitName || '';
        const unitSlug = sanitizeFilename(unitName);
        const fname = unitSlug
          ? `teljes_forgalmi_${unitSlug}_${startDate}_${endDate}`
          : `teljes_forgalmi_osszes_egyseg_${startDate}_${endDate}`;
        await exportCombined(
          [
            { name: 'Forgalom', data: forgalom.data, headers: forgalom.headers },
            { name: 'Házipénztár', data: hazi.data, headers: hazi.headers },
          ],
          fname,
          format,
        );
        toast.success('Export sikeres!');
        onClose();
        return;
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
        await exportToPdf(data, headers, totalsRow, filename, reportType, startDate, endDate, unitName, selectedYearMonth);
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
            {reportType === 'monthly_table' ? (
              <>Feldolgozott hónap: <span className="font-medium">{formatYearMonthDisplay(selectedYearMonth)}</span></>
            ) : (
              <>Időszak: <span className="font-medium">{formatDate(startDate)}</span> -{' '}
              <span className="font-medium">{formatDate(endDate)}</span></>
            )}
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

  const headers = ['Dátum', 'Létszám', 'Novo', 'Pénztárgép KP', 'Pénztárgép kártya', 'Tartalék bevétel', 'Összesen'];

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

    return {
      'Dátum': formatDate(row.date),
      'Létszám': parseInt(row.guest_count, 10) || 0,
      'Novo': totalSoftware,
      'Pénztárgép KP': cashRegisterCash,
      'Pénztárgép kártya': cashRegisterCard,
      'Tartalék bevétel': reserveRevenue,
      'Összesen': totalSoftware,
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

// First/last closure number and the last cumulative ("göngyölt") revenue of a
// register in the exported period.
function exportClosureSummary(closures) {
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
        vat_0: parseFloat(cr.vat_0_percent) || 0,
        vat_5: parseFloat(cr.vat_5_percent) || 0,
        vat_18: parseFloat(cr.vat_18_percent) || 0,
        vat_27: parseFloat(cr.vat_27_percent) || 0,
        tips: parseFloat(cr.tips) || 0,
        cash: parseFloat(cr.cash_payment) || 0,
        card: parseFloat(cr.card_payment) || 0,
        terminal_card: parseFloat(cr.terminal_card) || 0,
      };
      // Register turnover = the ÁFA buckets. Borravaló is its own column, not part of it.
      dayData.total = dayData.vat_0 + dayData.vat_5 + dayData.vat_18 + dayData.vat_27;
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

  // Calculate card discrepancy + closure summary for each register
  Object.values(registerData).forEach((reg) => {
    reg.totals.cardDiscrepancy = reg.totals.card - reg.totals.terminal_card;
    Object.assign(reg, exportClosureSummary(reg.closures));
  });

  const registers = Object.values(registerData).sort((a, b) => a.ap_number.localeCompare(b.ap_number));

  // Headers without "Pénztárgép" column - register name will be in header rows.
  // The last four are per-register figures, filled on the subtotal rows.
  const headers = ['Dátum', '0% ÁFA', '5% ÁFA', '18% ÁFA', '27% ÁFA', 'Borravaló', 'Összesen', 'Készpénz', 'Kártya', 'Terminál', 'Eltérés', 'Novo forgalom', 'Első zárás', 'Utolsó zárás', 'Utolsó göngyölt'];

  const data = [];
  let grandTotals = {
    vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0,
    total: 0, cash: 0, card: 0, terminal_card: 0, cardDiscrepancy: 0, software: 0,
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
      'Novo forgalom': '',
      'Első zárás': '',
      'Utolsó zárás': '',
      'Utolsó göngyölt': '',
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
        'Novo forgalom': '',
        'Első zárás': '',
        'Utolsó zárás': '',
        'Utolsó göngyölt': '',
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
      'Novo forgalom': reg.totals.software,
      'Első zárás': reg.firstSequence ?? '',
      'Utolsó zárás': reg.lastSequence ?? '',
      'Utolsó göngyölt': reg.lastCumulative ?? '',
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
    grandTotals.software += reg.totals.software;
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
        guestCount: 0,
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

  const headers = ['Egység', 'Létszám', 'Novo', 'Pénztárgép KP', 'Pénztárgép kártya', 'Tartalék bevétel', 'Összesen'];

  const unitsArray = Object.values(unitData).sort((a, b) => a.unitName.localeCompare(b.unitName));

  // Calculate units totals
  const unitsTotals = {
    totalSoftware: unitsArray.reduce((sum, u) => sum + u.totalSoftware, 0),
    cashRegisterCash: unitsArray.reduce((sum, u) => sum + u.cashRegisterCash, 0),
    cashRegisterCard: unitsArray.reduce((sum, u) => sum + u.cashRegisterCard, 0),
    reserveRevenue: unitsArray.reduce((sum, u) => sum + u.reserveRevenue, 0),
    invoiceExpenses: unitsArray.reduce((sum, u) => sum + u.invoiceExpenses, 0),
    dailyResult: unitsArray.reduce((sum, u) => sum + u.dailyResult, 0),
    guestCount: unitsArray.reduce((sum, u) => sum + (u.guestCount || 0), 0),
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
    'Novo': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Összesen': '',
    _rowType: 'sectionHeader',
  });

  unitsArray.forEach((unit) => {
    data.push({
      'Egység': unit.unitName,
      'Létszám': unit.guestCount || 0,
      'Novo': unit.totalSoftware,
      'Pénztárgép KP': unit.cashRegisterCash,
      'Pénztárgép kártya': unit.cashRegisterCard,
      'Tartalék bevétel': unit.reserveRevenue,
      'Összesen': unit.totalSoftware,
      _rowType: 'data',
    });
  });

  data.push({
    'Egység': 'Egységek összesen',
    'Létszám': unitsTotals.guestCount || 0,
    'Novo': unitsTotals.totalSoftware,
    'Pénztárgép KP': unitsTotals.cashRegisterCash,
    'Pénztárgép kártya': unitsTotals.cashRegisterCard,
    'Tartalék bevétel': unitsTotals.reserveRevenue,
    'Összesen': unitsTotals.totalSoftware,
    _rowType: 'subtotal',
  });

  // Section 2: Events (if any)
  if (eventsData.length > 0) {
    // Empty row
    data.push({
      'Egység': '',
      'Novo': '',
      'Pénztárgép KP': '',
      'Pénztárgép kártya': '',
      'Tartalék bevétel': '',
      'Összesen': '',
      _rowType: 'empty',
    });

    data.push({
      'Egység': '=== RENDEZVÉNYEK ===',
      'Novo': '',
      'Pénztárgép KP': '',
      'Pénztárgép kártya': '',
      'Tartalék bevétel': '',
      'Összesen': '',
      _rowType: 'sectionHeader',
    });

    // Events headers row
    data.push({
      'Egység': 'Egység',
      'Novo': 'Db',
      'Pénztárgép KP': 'Bevétel',
      'Pénztárgép kártya': 'Számlás',
      'Tartalék bevétel': 'EFO + Nem számlás',
      'Összesen': 'Eredmény',
      _rowType: 'eventsHeader',
    });

    eventsData.forEach((event) => {
      data.push({
        'Egység': event.unitName,
        'Novo': event.eventCount,
        'Pénztárgép KP': event.total_revenue,
        'Pénztárgép kártya': event.official_expenses,
        'Tartalék bevétel': event.efo_expenses + event.non_official_expenses,
        'Összesen': event.profit,
        _rowType: 'eventData',
      });
    });

    data.push({
      'Egység': 'Rendezvények összesen',
      'Novo': eventsTotals.eventCount,
      'Pénztárgép KP': eventsTotals.total_revenue,
      'Pénztárgép kártya': eventsTotals.official_expenses,
      'Tartalék bevétel': eventsTotals.efo_expenses + eventsTotals.non_official_expenses,
      'Összesen': eventsTotals.profit,
      _rowType: 'eventsSubtotal',
    });

    // Section 3: Events list
    data.push({
      'Egység': '',
      'Novo': '',
      'Pénztárgép KP': '',
      'Pénztárgép kártya': '',
      'Tartalék bevétel': '',
      'Összesen': '',
      _rowType: 'empty',
    });

    data.push({
      'Egység': '--- Rendezvények részletesen ---',
      'Novo': '',
      'Pénztárgép KP': '',
      'Pénztárgép kártya': '',
      'Tartalék bevétel': '',
      'Összesen': '',
      _rowType: 'eventsListHeader',
    });

    data.push({
      'Egység': 'Dátum',
      'Novo': 'Egység',
      'Pénztárgép KP': 'Rendezvény',
      'Pénztárgép kártya': 'Bevétel',
      'Tartalék bevétel': 'Költség',
      'Összesen': 'Eredmény',
      _rowType: 'eventsListColumns',
    });

    eventsList.forEach((event) => {
      data.push({
        'Egység': formatDate(event.event_date),
        'Novo': event.unitName,
        'Pénztárgép KP': event.name,
        'Pénztárgép kártya': event.total_revenue,
        'Tartalék bevétel': event.total_expenses,
        'Összesen': event.profit,
        _rowType: 'eventListItem',
      });
    });
  }

  // Section 4: Grand totals
  data.push({
    'Egység': '',
    'Novo': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Összesen': '',
    _rowType: 'empty',
  });

  data.push({
    'Egység': '=== MINDÖSSZESEN ===',
    'Novo': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Összesen': '',
    _rowType: 'grandTotalHeader',
  });

  data.push({
    'Egység': 'Egységek bevétel',
    'Novo': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Összesen': unitsTotals.totalSoftware,
    _rowType: 'grandTotalRow',
  });

  data.push({
    'Egység': 'Rendezvények bevétel',
    'Novo': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Összesen': eventsTotals.total_revenue,
    _rowType: 'grandTotalRow',
  });

  data.push({
    'Egység': 'ÖSSZES BEVÉTEL',
    'Novo': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Összesen': grandTotals.totalRevenue,
    _rowType: 'grandTotal',
  });

  data.push({
    'Egység': 'Egységek eredménye',
    'Novo': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Összesen': unitsTotals.totalSoftware,
    _rowType: 'grandTotalRow',
  });

  data.push({
    'Egység': 'Rendezvények eredménye',
    'Novo': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Összesen': eventsTotals.profit,
    _rowType: 'grandTotalRow',
  });

  data.push({
    'Egység': 'ÖSSZES EREDMÉNY',
    'Novo': '',
    'Pénztárgép KP': '',
    'Pénztárgép kártya': '',
    'Tartalék bevétel': '',
    'Összesen': grandTotals.totalRevenue,
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

// Sum of the EUR-denominated elütés entries on one closure (mirrors the
// on-screen report: HUF elütés moves the house cash, EUR is reported only).
function exportEurDiscrepancy(cr) {
  if (!Array.isArray(cr?.discrepancies)) return 0;
  return cr.discrepancies.reduce(
    (sum, d) => sum + (d?.currency === 'EUR' ? (parseFloat(d.amount) || 0) : 0),
    0
  );
}

async function fetchCashRegisterAllUnitsSimpleExport(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, szep_card_payment, terminal_card, software_revenue, closure_number, closure_sequence, cumulative_revenue, discrepancies, cash_registers(id, ap_number, name))')
    .gte('date', startDate)
    .lte('date', endDate);

  // "Göngyölt ellenőrizve" ticks of this exact period (empty if none / no table).
  const checkedRegisters = await fetchCumulativeCheckSet(startDate, endDate);

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

      const regAcc = unitData[unitId].registers[registerId];
      regAcc.szep += parseFloat(cr.szep_card_payment) || 0;
      regAcc.huf += hufDiscrepancyOf(cr);
      regAcc.eur += exportEurDiscrepancy(cr);
      regAcc.vat_0 += parseFloat(cr.vat_0_percent) || 0;
      regAcc.vat_5 += parseFloat(cr.vat_5_percent) || 0;
      regAcc.vat_18 += parseFloat(cr.vat_18_percent) || 0;
      regAcc.vat_27 += parseFloat(cr.vat_27_percent) || 0;
      regAcc.tips += parseFloat(cr.tips) || 0;
      regAcc.software += parseFloat(cr.software_revenue) || 0;
      regAcc.closures.push({
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
    });
  });

  // Column order mirrors the on-screen report exactly. "Időszaki" is the
  // period total incl. borravaló (the former "Összesen"); "Időszaki eltérés"
  // is the on-screen red mark: ÁFA-kulcsok (borravaló nélkül) − (KP + kártya +
  // SZÉP), blank when within tolerance.
  const headers = [
    'Egység', 'Pénztárgép', 'Első zárás', 'Utolsó zárás',
    '0% ÁFA', '5% ÁFA', '18% ÁFA', '27% ÁFA',
    'Készpénz', 'Kártya', 'Terminál', 'Időszaki', 'Időszaki eltérés', 'Eltérés',
    'Göngyölt forgalom', 'Göngyölt ellenőrizve', 'Novo forgalom', 'EUR elütés', 'Borravaló',
  ];

  const data = [];
  Object.values(unitData)
    .sort((a, b) => a.unitName.localeCompare(b.unitName))
    .forEach((unit) => {
      Object.values(unit.registers).forEach((reg) => {
        const summary = exportClosureSummary(reg.closures);
        const turnover = reg.vat_0 + reg.vat_5 + reg.vat_18 + reg.vat_27;
        const check = validatePaymentBreakdown({
          vatTotal: turnover, cash: reg.cash, card: reg.card, szep: reg.szep, hufDiscrepancy: reg.huf,
        });
        const paid = check.paid;
        const paymentGap = check.applicable && !check.isValid;
        data.push({
          'Egység': unit.unitName,
          'Pénztárgép': `${reg.ap_number}${reg.name ? ` (${reg.name})` : ''}`,
          'Első zárás': summary.firstSequence ?? '',
          'Utolsó zárás': summary.lastSequence ?? '',
          '0% ÁFA': reg.vat_0,
          '5% ÁFA': reg.vat_5,
          '18% ÁFA': reg.vat_18,
          '27% ÁFA': reg.vat_27,
          'Készpénz': reg.cash,
          'Kártya': reg.card,
          'Terminál': reg.terminal_card,
          'Időszaki': reg.total,
          'Időszaki eltérés': paymentGap ? turnover - paid : '',
          'Eltérés': reg.card - reg.terminal_card,
          'Göngyölt forgalom': summary.lastCumulative ?? '',
          'Göngyölt ellenőrizve': reg.registerId && checkedRegisters.has(reg.registerId) ? 'igen' : '',
          'Novo forgalom': reg.software,
          'EUR elütés': reg.eur,
          'Borravaló': reg.tips,
        });
      });
    });

  return { data, headers };
}

async function fetchCashRegisterAllUnitsDetailedExport(startDate, endDate) {
  const { data: revenues } = await supabase
    .from('daily_revenue')
    .select('*, units(name), cash_register_revenue(vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, tips, cash_payment, card_payment, szep_card_payment, terminal_card, terminal_discrepancy_note, closure_number, closure_sequence, cumulative_revenue, discrepancies, discrepancy_note, discrepancy_amount, software_revenue, guest_count, terminal_card_total, terminal_szep, cash_registers(ap_number, name))')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  // Group by unit, then by register
  const unitData = {};
  (revenues || []).forEach((row) => {
    const unitName = row.units?.name || 'Ismeretlen';
    const unitId = row.unit_id;

    // Same rule as the on-screen detailed report: all-empty closure rows (a day
    // that was opened and saved without register data) are left out.
    const crRevenues = (row.cash_register_revenue || []).filter((cr) => !isBlankClosure(cr));
    if (crRevenues.length === 0) return;

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
        closureSeq: cr.closure_sequence ?? cr.closure_number ?? null,
        eur: exportEurDiscrepancy(cr),
        vat_0: parseFloat(cr.vat_0_percent) || 0,
        vat_5: parseFloat(cr.vat_5_percent) || 0,
        vat_18: parseFloat(cr.vat_18_percent) || 0,
        vat_27: parseFloat(cr.vat_27_percent) || 0,
        tips: parseFloat(cr.tips) || 0,
        cash: parseFloat(cr.cash_payment) || 0,
        card: parseFloat(cr.card_payment) || 0,
        terminal_card: parseFloat(cr.terminal_card) || 0,
      };
      // Register turnover = the ÁFA buckets. Borravaló is its own column, not part of it.
      dayData.total = dayData.vat_0 + dayData.vat_5 + dayData.vat_18 + dayData.vat_27;
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

  // Headers without "Pénztárgép" column - register name will be in header rows.
  // Closure number first, EUR elütés last (matches the on-screen report).
  const headers = ['Zárás', 'Dátum', '0% ÁFA', '5% ÁFA', '18% ÁFA', '27% ÁFA', 'Időszaki', 'Készpénz', 'Kártya', 'Terminál', 'Eltérés', 'Borravaló', 'EUR elütés'];

  // Blank cells for the label/separator rows, so every row has every column.
  const blanks = () => ({
    'Zárás': '', '0% ÁFA': '', '5% ÁFA': '', '18% ÁFA': '', '27% ÁFA': '', 'Borravaló': '',
    'Időszaki': '', 'Készpénz': '', 'Kártya': '', 'Terminál': '', 'Eltérés': '', 'EUR elütés': '',
  });

  const data = [];
  const units = Object.values(unitData).sort((a, b) => a.unitName.localeCompare(b.unitName));

  // Track grand totals
  const grandTotals = {
    vat_0: 0, vat_5: 0, vat_18: 0, vat_27: 0, tips: 0,
    total: 0, cash: 0, card: 0, terminal_card: 0, eur: 0,
  };

  units.forEach((unit, unitIndex) => {
    // Add empty row between units (not before the first unit)
    if (unitIndex > 0) {
      data.push({ ...blanks(), 'Dátum': '', _rowType: 'empty' });
    }

    // Unit header row
    data.push({ ...blanks(), 'Dátum': `=== ${unit.unitName} ===`, _rowType: 'unitHeader' });

    const registers = Object.values(unit.registers).sort((a, b) => a.ap_number.localeCompare(b.ap_number));
    let unitEur = 0;

    registers.forEach((reg) => {
      // Register header row
      const registerLabel = reg.name ? `Pénztárgép: ${reg.ap_number} (${reg.name})` : `Pénztárgép: ${reg.ap_number}`;
      data.push({ ...blanks(), 'Dátum': registerLabel, _rowType: 'registerHeader' });

      // Day rows
      reg.days.forEach((day) => {
        data.push({
          'Zárás': day.closureSeq ?? '',
          'Dátum': formatDate(day.date),
          '0% ÁFA': day.vat_0,
          '5% ÁFA': day.vat_5,
          '18% ÁFA': day.vat_18,
          '27% ÁFA': day.vat_27,
          'Időszaki': day.total,
          'Készpénz': day.cash,
          'Kártya': day.card,
          'Terminál': day.terminal_card,
          'Eltérés': day.discrepancy,
          'Borravaló': day.tips,
          'EUR elütés': day.eur,
          _rowType: 'data',
        });
      });

      // Register subtotal row
      const regDiscrepancy = reg.totals.card - reg.totals.terminal_card;
      const regEur = reg.days.reduce((s, d) => s + (d.eur || 0), 0);
      unitEur += regEur;
      data.push({
        'Zárás': '',
        'Dátum': `${reg.ap_number} összesen`,
        '0% ÁFA': reg.totals.vat_0,
        '5% ÁFA': reg.totals.vat_5,
        '18% ÁFA': reg.totals.vat_18,
        '27% ÁFA': reg.totals.vat_27,
        'Időszaki': reg.totals.total,
        'Készpénz': reg.totals.cash,
        'Kártya': reg.totals.card,
        'Terminál': reg.totals.terminal_card,
        'Eltérés': regDiscrepancy,
        'Borravaló': reg.totals.tips,
        'EUR elütés': regEur,
        _rowType: 'subtotal',
      });
    });

    // Unit grand total row
    const unitDiscrepancy = unit.totals.card - unit.totals.terminal_card;
    data.push({
      'Zárás': '',
      'Dátum': `${unit.unitName} összesen`,
      '0% ÁFA': unit.totals.vat_0,
      '5% ÁFA': unit.totals.vat_5,
      '18% ÁFA': unit.totals.vat_18,
      '27% ÁFA': unit.totals.vat_27,
      'Időszaki': unit.totals.total,
      'Készpénz': unit.totals.cash,
      'Kártya': unit.totals.card,
      'Terminál': unit.totals.terminal_card,
      'Eltérés': unitDiscrepancy,
      'Borravaló': unit.totals.tips,
      'EUR elütés': unitEur,
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
    grandTotals.eur += unitEur;
  });

  // Add empty row before grand total
  data.push({ ...blanks(), 'Dátum': '', _rowType: 'empty' });

  // Add grand total row at the end
  const grandDiscrepancy = grandTotals.card - grandTotals.terminal_card;
  data.push({
    'Zárás': '',
    'Dátum': 'Mindösszesen',
    '0% ÁFA': grandTotals.vat_0,
    '5% ÁFA': grandTotals.vat_5,
    '18% ÁFA': grandTotals.vat_18,
    '27% ÁFA': grandTotals.vat_27,
    'Időszaki': grandTotals.total,
    'Készpénz': grandTotals.cash,
    'Kártya': grandTotals.card,
    'Terminál': grandTotals.terminal_card,
    'Eltérés': grandDiscrepancy,
    'Borravaló': grandTotals.tips,
    'EUR elütés': grandTotals.eur,
    _rowType: 'grandTotal',
  });

  return { data, headers };
}

async function fetchMonthlyTableExport(yearMonth) {
  // yearMonth is in format YYYY-MM
  const [year, month] = yearMonth.split('-').map(Number);
  const monthStartDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEndDate = new Date(year, month, 0).toISOString().split('T')[0];

  // Fetch all required data in parallel
  const [
    unitsResult,
    dailyRevenueResult,
    expensesResult,
    eventsResult,
    eventRevenuesResult,
    eventExpensesResult,
    monthlyDataResult,
  ] = await Promise.all([
    supabase.from('units').select('*').eq('is_active', true),
    supabase.from('daily_revenue').select('*').gte('date', monthStartDate).lte('date', monthEndDate),
    supabase.from('expenses').select('*').gte('invoice_date', monthStartDate).lte('invoice_date', monthEndDate),
    supabase.from('events').select('*').gte('event_date', monthStartDate).lte('event_date', monthEndDate),
    supabase.from('event_revenues').select('*, events!inner(*)').gte('events.event_date', monthStartDate).lte('events.event_date', monthEndDate),
    supabase.from('event_expenses').select('*, events!inner(*)').gte('events.event_date', monthStartDate).lte('events.event_date', monthEndDate),
    supabase.from('monthly_financial_data').select('*').eq('year_month', yearMonth),
  ]);

  const units = unitsResult.data || [];
  const restaurantUnits = units.filter(u => u.type === 'restaurant');
  const eventsUnit = units.find(u => u.type === 'events');
  const dailyRevenue = dailyRevenueResult.data || [];
  const expenses = expensesResult.data || [];
  const events = eventsResult.data || [];
  const eventRevenues = eventRevenuesResult.data || [];
  const eventExpenses = eventExpensesResult.data || [];
  const monthlyData = monthlyDataResult.data || [];

  const headers = [
    'Egység',
    'Napi bevétel',
    'Szubvenció',
    'Bevétel összesen',
    'Készpénz költség',
    'EFO',
    'Utalásos',
    'Bér+járulék',
    'Eszköz/Bérlet',
    'Disztribúció',
    'Költség összesen',
    'Eredmény',
  ];

  const data = [];

  // Process each restaurant unit
  let totalRevenue = 0;
  let totalCosts = 0;

  for (const unit of restaurantUnits) {
    const unitDailyRevenue = dailyRevenue.filter(r => r.unit_id === unit.id);
    const unitExpenses = expenses.filter(e => e.unit_id === unit.id);
    const unitMonthlyData = monthlyData.find(m => m.unit_id === unit.id) || {};

    const dailyRevenueSum = unitDailyRevenue.reduce((sum, r) => sum + (parseFloat(r.total_revenue) || 0), 0);
    const cashExpenses = unitExpenses.filter(e => e.payment_method === 'cash').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const efoExpenses = unitExpenses.filter(e => e.is_efo).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const transferExpenses = parseFloat(unitMonthlyData.transfer_expenses) || 0;
    const paidWages = parseFloat(unitMonthlyData.paid_wages) || 0;
    const wageContributions = parseFloat(unitMonthlyData.wage_contributions) || 0;
    const equipmentExpenses = parseFloat(unitMonthlyData.equipment_expenses) || 0;
    const rentUtilities = parseFloat(unitMonthlyData.rent_utilities) || 0;
    const rawMaterialDist = parseFloat(unitMonthlyData.raw_material_distribution) || 0;
    const wageDist = parseFloat(unitMonthlyData.wage_distribution) || 0;
    const subvention = parseFloat(unitMonthlyData.subvention) || 0;

    const unitTotalCosts = cashExpenses + efoExpenses + transferExpenses +
      paidWages + wageContributions + equipmentExpenses + rentUtilities +
      rawMaterialDist + wageDist;
    const unitTotalRevenue = dailyRevenueSum + subvention;
    const profit = unitTotalRevenue - unitTotalCosts;

    totalRevenue += unitTotalRevenue;
    totalCosts += unitTotalCosts;

    data.push({
      'Egység': unit.name,
      'Napi bevétel': dailyRevenueSum,
      'Szubvenció': subvention,
      'Bevétel összesen': unitTotalRevenue,
      'Készpénz költség': cashExpenses,
      'EFO': efoExpenses,
      'Utalásos': transferExpenses,
      'Bér+járulék': paidWages + wageContributions,
      'Eszköz/Bérlet': equipmentExpenses + rentUtilities,
      'Disztribúció': rawMaterialDist + wageDist,
      'Költség összesen': unitTotalCosts,
      'Eredmény': profit,
      _rowType: 'data',
    });
  }

  // Process events unit
  if (eventsUnit) {
    const eventsRevenueSum = eventRevenues.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const eventsExpensesSum = eventExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const eventsMonthlyData = monthlyData.find(m => m.unit_id === eventsUnit.id) || {};
    const eventsTransferExpenses = parseFloat(eventsMonthlyData.transfer_expenses) || 0;
    const eventsTotalCosts = eventsExpensesSum + eventsTransferExpenses;
    const eventsProfit = eventsRevenueSum - eventsTotalCosts;

    totalRevenue += eventsRevenueSum;
    totalCosts += eventsTotalCosts;

    data.push({
      'Egység': `${eventsUnit.name} (${events.length} esemény)`,
      'Napi bevétel': eventsRevenueSum,
      'Szubvenció': 0,
      'Bevétel összesen': eventsRevenueSum,
      'Készpénz költség': eventsExpensesSum,
      'EFO': 0,
      'Utalásos': eventsTransferExpenses,
      'Bér+járulék': 0,
      'Eszköz/Bérlet': 0,
      'Disztribúció': 0,
      'Költség összesen': eventsTotalCosts,
      'Eredmény': eventsProfit,
      _rowType: 'data',
    });
  }

  // Add empty row before special categories
  data.push({
    'Egység': '',
    'Napi bevétel': '',
    'Szubvenció': '',
    'Bevétel összesen': '',
    'Készpénz költség': '',
    'EFO': '',
    'Utalásos': '',
    'Bér+járulék': '',
    'Eszköz/Bérlet': '',
    'Disztribúció': '',
    'Költség összesen': '',
    'Eredmény': '',
    _rowType: 'empty',
  });

  // Special categories header
  data.push({
    'Egység': '=== SPECIÁLIS KATEGÓRIÁK ===',
    'Napi bevétel': '',
    'Szubvenció': '',
    'Bevétel összesen': '',
    'Készpénz költség': '',
    'EFO': '',
    'Utalásos': '',
    'Bér+járulék': '',
    'Eszköz/Bérlet': '',
    'Disztribúció': '',
    'Költség összesen': '',
    'Eredmény': '',
    _rowType: 'sectionHeader',
  });

  // K0
  const k0Data = monthlyData.find(m => m.category === 'K0') || {};
  const k0Revenue = parseFloat(k0Data.k0_revenue) || 0;
  const k0Costs = (parseFloat(k0Data.transfer_expenses) || 0) +
    (parseFloat(k0Data.paid_wages) || 0) +
    (parseFloat(k0Data.wage_contributions) || 0);
  totalRevenue += k0Revenue;
  totalCosts += k0Costs;

  data.push({
    'Egység': 'K0',
    'Napi bevétel': k0Revenue,
    'Szubvenció': 0,
    'Bevétel összesen': k0Revenue,
    'Készpénz költség': 0,
    'EFO': 0,
    'Utalásos': parseFloat(k0Data.transfer_expenses) || 0,
    'Bér+járulék': (parseFloat(k0Data.paid_wages) || 0) + (parseFloat(k0Data.wage_contributions) || 0),
    'Eszköz/Bérlet': 0,
    'Disztribúció': 0,
    'Költség összesen': k0Costs,
    'Eredmény': k0Revenue - k0Costs,
    _rowType: 'data',
  });

  // K00
  const k00Data = monthlyData.find(m => m.category === 'K00') || {};
  const k00Costs = parseFloat(k00Data.transfer_expenses) || 0;
  totalCosts += k00Costs;

  data.push({
    'Egység': 'K00',
    'Napi bevétel': 0,
    'Szubvenció': 0,
    'Bevétel összesen': 0,
    'Készpénz költség': 0,
    'EFO': 0,
    'Utalásos': k00Costs,
    'Bér+járulék': 0,
    'Eszköz/Bérlet': 0,
    'Disztribúció': 0,
    'Költség összesen': k00Costs,
    'Eredmény': -k00Costs,
    _rowType: 'data',
  });

  // Bank costs
  const bankCostsData = monthlyData.find(m => m.category === 'bank_costs') || {};
  const bankCosts = parseFloat(bankCostsData.bank_costs_amount) || 0;
  totalCosts += bankCosts;

  data.push({
    'Egység': 'Bankköltségek',
    'Napi bevétel': 0,
    'Szubvenció': 0,
    'Bevétel összesen': 0,
    'Készpénz költség': 0,
    'EFO': 0,
    'Utalásos': bankCosts,
    'Bér+járulék': 0,
    'Eszköz/Bérlet': 0,
    'Disztribúció': 0,
    'Költség összesen': bankCosts,
    'Eredmény': -bankCosts,
    _rowType: 'data',
  });

  // Add empty row before totals
  data.push({
    'Egység': '',
    'Napi bevétel': '',
    'Szubvenció': '',
    'Bevétel összesen': '',
    'Készpénz költség': '',
    'EFO': '',
    'Utalásos': '',
    'Bér+járulék': '',
    'Eszköz/Bérlet': '',
    'Disztribúció': '',
    'Költség összesen': '',
    'Eredmény': '',
    _rowType: 'empty',
  });

  // Grand totals
  data.push({
    'Egység': 'MINDÖSSZESEN',
    'Napi bevétel': '',
    'Szubvenció': '',
    'Bevétel összesen': totalRevenue,
    'Készpénz költség': '',
    'EFO': '',
    'Utalásos': '',
    'Bér+járulék': '',
    'Eszköz/Bérlet': '',
    'Disztribúció': '',
    'Költség összesen': totalCosts,
    'Eredmény': totalRevenue - totalCosts,
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

// Counters and "last value" columns: summing them would be meaningless, so the
// totals row leaves them blank.
const NON_SUMMABLE_HEADERS = new Set(['Zárás', 'Első zárás', 'Utolsó zárás', 'Göngyölt forgalom', 'Göngyölt ellenőrizve', 'Időszaki eltérés']);

function calculateTotalsRow(data, headers) {
  const totalsRow = {};
  headers.forEach((key) => {
    const firstRow = data[0];
    if (NON_SUMMABLE_HEADERS.has(key)) {
      totalsRow[key] = '';
    } else if (firstRow && typeof firstRow[key] === 'number') {
      totalsRow[key] = data.reduce((sum, row) => sum + (row[key] || 0), 0);
    } else if (key === 'Dátum' || key === 'Egység') {
      totalsRow[key] = 'Összesen';
    } else {
      totalsRow[key] = '';
    }
  });
  return totalsRow;
}

// House cash export: one row per (unit/central, day, pocket) with opening,
// revenue, expenses, transfers and closing — built from the same live series as
// the on-screen Házipénztár report. When unitId is empty, all restaurant units
// plus Központ are included. Reserve rows are omitted when reserve is hidden.
async function fetchHouseCashExport(startDate, endDate, unitId, showReserve) {
  const headers = ['Egység', 'Dátum', 'Zseb', 'Nyitó', 'Bevétel', 'Kifizetés', 'Átküldés', 'Zárás'];
  const inRange = (d) => (!startDate || d >= startDate) && (!endDate || d <= endDate);
  const data = [];
  let unitName = '';

  const sections = [];
  if (unitId) {
    const { data: u } = await supabase.from('units').select('name').eq('id', unitId).maybeSingle();
    unitName = u?.name || '';
    sections.push({ name: unitName, series: await fetchHouseCashSeries(unitId, endDate) });
  } else {
    const { data: units } = await supabase
      .from('units').select('id, name').eq('type', 'restaurant').order('name');
    sections.push({ name: 'Központ', series: await fetchCentralHouseCashSeries(endDate) });
    for (const u of units || []) {
      sections.push({ name: u.name, series: await fetchHouseCashSeries(u.id, endDate) });
    }
  }

  sections.forEach((sec) => {
    sec.series.orderedDates.filter(inRange).forEach((d) => {
      const r = sec.series.byDate.get(d);
      data.push({
        'Egység': sec.name,
        'Dátum': formatDate(d),
        'Zseb': 'Pénztár',
        'Nyitó': r.cashOpening,
        'Bevétel': r.cashRevenue - r.cashDiscrepancies,
        'Kifizetés': r.cashExpenses,
        'Átküldés': r.cashTransfers,
        'Zárás': r.cashClosing,
      });
      if (showReserve) {
        data.push({
          'Egység': sec.name,
          'Dátum': formatDate(d),
          'Zseb': 'Tartalék',
          'Nyitó': r.reserveOpening,
          'Bevétel': r.reserveRevenue,
          'Kifizetés': r.reserveExpenses,
          'Átküldés': r.reserveTransfers,
          'Zárás': r.reserveClosing,
        });
      }
    });
  });

  return { data, headers, unitName };
}

// Combined multi-section export (used by the "Teljes forgalmi jelentés"): each
// section becomes its own Excel sheet / PDF page / CSV block.
async function exportCombined(sections, filename, format) {
  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    sections.forEach((sec) => {
      const aoa = [sec.headers];
      sec.data.forEach((r) => aoa.push(sec.headers.map((h) => (r[h] ?? ''))));
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, sec.name.substring(0, 31));
    });
    XLSX.writeFile(wb, `${filename}.xlsx`);
    return;
  }

  if (format === 'pdf') {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    let first = true;
    sections.forEach((sec) => {
      if (!first) doc.addPage();
      first = false;
      doc.setFontSize(13);
      doc.text(sec.name, 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [sec.headers],
        body: sec.data.map((r) =>
          sec.headers.map((h) => {
            const v = r[h];
            return typeof v === 'number' ? formatCurrency(v) : (v ?? '');
          })
        ),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [211, 47, 47] },
      });
    });
    doc.save(`${filename}.pdf`);
    return;
  }

  // CSV: sections separated by a blank line, each prefixed with its name.
  const parts = sections.map((sec) => {
    const lines = [sec.name, sec.headers.join(';')];
    sec.data.forEach((r) => lines.push(sec.headers.map((h) => (r[h] ?? '')).join(';')));
    return lines.join('\n');
  });
  const blob = new Blob(['﻿' + parts.join('\n\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

  // Keep the header row visible while scrolling in Excel (best effort — older
  // SheetJS builds ignore the property, in which case View > Freeze Panes does it).
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };

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

  // For cash_register, cash_register_all_detailed, full_monthly_all and monthly_table, style rows based on _rowType
  if (reportType === 'cash_register' || reportType === 'cash_register_all_detailed' || reportType === 'full_monthly_all' || reportType === 'monthly_table') {
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

  // Add totals row (skip for cash_register_all_detailed, full_monthly_all, and monthly_table since they have their own grandTotal rows)
  if (reportType !== 'cash_register_all_detailed' && reportType !== 'full_monthly_all' && reportType !== 'monthly_table') {
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
        const header = headers[col];
        if (COUNT_HEADERS.has(header)) ws[cell].z = '#,##0';
        else if (EUR_HEADERS.has(header)) ws[cell].z = '#,##0.00 "€"';
        else ws[cell].z = '#,##0 Ft';
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

async function exportToPdf(data, headers, totalsRow, filename, reportType, startDate, endDate, unitName = '', selectedYearMonth = '') {
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
  } catch {
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

  // Date range or processed month
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  if (reportType === 'monthly_table' && selectedYearMonth) {
    doc.text(sanitizeForPdf(`Feldolgozott hónap: ${formatYearMonthDisplay(selectedYearMonth)}`), 14, 42);
  } else {
    doc.text(sanitizeForPdf(`Idöszak: ${formatDate(startDate)} - ${formatDate(endDate)}`), 14, 42);
  }

  // Format data for PDF table - sanitize all strings
  const formatPdfVal = (h, val) => {
    if (typeof val !== 'number') return sanitizeForPdf(val);
    if (COUNT_HEADERS.has(h)) return val.toLocaleString('hu-HU');
    if (EUR_HEADERS.has(h)) return sanitizeForPdf(formatCurrency(val, 'EUR'));
    return formatCurrency(val);
  };

  const tableData = data.map((row) => headers.map((h) => formatPdfVal(h, row[h])));

  // Add totals row (skip for cash_register_all_detailed, full_monthly_all, and monthly_table since they have their own grandTotal rows)
  if (reportType !== 'cash_register_all_detailed' && reportType !== 'full_monthly_all' && reportType !== 'monthly_table') {
    const totalsPdfRow = headers.map((h) => formatPdfVal(h, totalsRow[h]));
    tableData.push(totalsPdfRow);
  }

  // Sanitize headers
  const sanitizedHeaders = headers.map((h) => sanitizeForPdf(h));

  // Determine if we should skip default totals row styling
  const skipDefaultTotalsStyle = reportType === 'cash_register_all_detailed' || reportType === 'full_monthly_all' || reportType === 'monthly_table';

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
      // Style rows based on _rowType for cash_register, cash_register_all_detailed, full_monthly_all, and monthly_table
      else if ((reportType === 'cash_register' || reportType === 'cash_register_all_detailed' || reportType === 'full_monthly_all' || reportType === 'monthly_table') && data[hookData.row.index]) {
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

  // Add totals row (skip for cash_register_all_detailed, full_monthly_all, and monthly_table since they have their own grandTotal rows)
  const csvRows = [headers.join(','), ...dataRows];
  if (reportType !== 'cash_register_all_detailed' && reportType !== 'full_monthly_all' && reportType !== 'monthly_table') {
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
