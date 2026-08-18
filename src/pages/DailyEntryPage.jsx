import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { Card, Button, Select, LoadingSpinner, Modal, Badge, DateInput } from '../components/common';
import { usePaymentItems, PAYMENT_KIND_META } from '../hooks/usePaymentItems';
import { useAppSettings, resolveDefaultUnit } from '../hooks/useAppSettings';
import DailyRevenueForm from '../components/daily/DailyRevenueForm';
import HouseCashForm from '../components/daily/HouseCashForm';
import DailyReport from '../components/daily/DailyReport';
import MonthCalendar from '../components/daily/MonthCalendar';
import ExpenseForm from '../components/expenses/ExpenseForm';
import EfoPaymentForm from '../components/expenses/EfoPaymentForm';
import WagePaymentForm from '../components/expenses/WagePaymentForm';
import PaymentEditModal from '../components/expenses/PaymentEditModal';
import { getToday, formatCurrency, formatDate, formatDateWithWeekday, PAYMENT_METHODS, TERMINAL_TIP_WITHDRAW_RATE } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { REGISTER_TOLERANCE, validatePaymentBreakdown, hasDocumentedDiscrepancy } from '../lib/validations';
import { CalendarDays, Printer, Plus, Receipt, Clock, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, FileText, Users, Banknote } from 'lucide-react';

// Shift a YYYY-MM-DD date string by whole days, using local date components so
// there is no timezone drift.
function shiftDate(dateStr, days) {
  const [y, m, d] = (dateStr || getToday()).split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// Helper to sanitize Hungarian characters for PDF
function sanitizeForPdf(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/ő/g, 'ö').replace(/Ő/g, 'Ö').replace(/ű/g, 'ü').replace(/Ű/g, 'Ü');
}

// Format currency for PDF (simple version without currency symbol issues)
function formatPdfCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('hu-HU') + ' Ft';
}

// White Pepper House logo used in the PDF header (transparent PNG in /public)
const PDF_LOGO_URL = `${import.meta.env.BASE_URL}Pepperhouse_logo_2021_rgb_horizontal_white.png`;
const PDF_LOGO_ASPECT = 2777 / 516; // width / height of the source PNG

// Load an image as a data URL so jsPDF can embed it. Returns null on failure.
async function loadImageDataUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const tabs = [
  { id: 'all', label: 'Minden adat' },
  { id: 'revenue', label: 'Napi forgalom' },
  { id: 'cash', label: 'Házipénztár' },
  { id: 'expenses', label: 'Kifizetések' },
  { id: 'history', label: 'Előzmények' },
  { id: 'incomplete', label: 'Hiányos', isWarning: true },
  { id: 'report', label: 'Napi riport' },
];

export default function DailyEntryPage() {
  const { isAdmin, unitId } = useAuth();
  const { units, loading: unitsLoading } = useUnits();
  const { settings, updateSetting } = useAppSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || getToday());
  // Initialize selected unit from URL param (for admin), or user's unit
  const urlUnitParam = searchParams.get('unit');
  // Deep link from the cash register reports: open this register's box (AP number).
  const focusRegisterAp = searchParams.get('register') || null;
  const [selectedUnit, setSelectedUnit] = useState(urlUnitParam || unitId || '');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showEfoForm, setShowEfoForm] = useState(false);
  const [showWageForm, setShowWageForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expenseRefreshKey, setExpenseRefreshKey] = useState(0);

  // Get restaurant units only
  const restaurantUnits = units.filter(u => u.type === 'restaurant');

  // Sync with URL params during render (avoids useEffect setState warning)
  const dateParam = searchParams.get('date');
  const unitParam = searchParams.get('unit');

  // Update local state to match URL when it changes
  if (dateParam && dateParam !== selectedDate) {
    setSelectedDate(dateParam);
  }
  if (isAdmin && unitParam && unitParam !== selectedUnit) {
    setSelectedUnit(unitParam);
  }

  // Auto-select unit for admin if none selected (during render, not in effect).
  // Honours the admin "default unit" preference (default / remember / specific).
  if (isAdmin && !selectedUnit && !unitParam && restaurantUnits.length > 0) {
    const target = resolveDefaultUnit(settings, restaurantUnits, restaurantUnits[0].id);
    if (target && selectedUnit !== target) {
      setSelectedUnit(target);
    }
  }

  // Use user's unit if not admin
  const effectiveUnitId = isAdmin ? selectedUnit : unitId;

  // Get selected unit name
  const selectedUnitName = units.find(u => u.id === effectiveUnitId)?.name || '';

  // Change the selected date and keep the URL's date param in sync, so the
  // render-time URL→state sync doesn't revert it (used by the date picker and
  // the prev/next-day arrows).
  const today = getToday();
  const changeDate = (newDate) => {
    if (!newDate) return;
    setSelectedDate(newDate);
    const next = new URLSearchParams(searchParams);
    next.set('date', newDate);
    setSearchParams(next, { replace: true });
  };

  // Generate Daily Report PDF
  const generateDailyReportPdf = async () => {
    try {
      const showReserve = settings.showReserve;
      // Load the header logo (embedded into the PDF)
      const logoDataUrl = await loadImageDataUrl(PDF_LOGO_URL);

      // Fetch data
      const [revenueResult, houseCashResult, expensesResult, efoResult, wageResult, previousResult] = await Promise.all([
        supabase
          .from('daily_revenue')
          .select('*')
          .eq('unit_id', effectiveUnitId)
          .eq('date', selectedDate)
          .maybeSingle(),
        supabase
          .from('house_cash')
          .select('*')
          .eq('unit_id', effectiveUnitId)
          .eq('date', selectedDate)
          .maybeSingle(),
        supabase
          .from('expenses')
          .select('*')
          .eq('unit_id', effectiveUnitId)
          .eq('invoice_date', selectedDate)
          .order('created_at', { ascending: true }),
        supabase
          .from('efo_payments')
          .select('employee_name, total_amount, payment_method, notes')
          .eq('unit_id', effectiveUnitId)
          .eq('payment_date', selectedDate)
          .order('created_at', { ascending: true }),
        supabase
          .from('wage_payments')
          .select('worker_name, total_amount, notes')
          .eq('unit_id', effectiveUnitId)
          .eq('payment_date', selectedDate)
          .order('created_at', { ascending: true }),
        supabase
          .from('house_cash')
          .select('official_total, other_total')
          .eq('unit_id', effectiveUnitId)
          .lt('date', selectedDate)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const revenue = revenueResult.data;
      const houseCash = houseCashResult.data;
      const expenses = expensesResult.data || [];
      const efoPaymentsList = efoResult.data || [];
      const wagePaymentsList = wageResult.data || [];
      const openingBalance = parseFloat(previousResult.data?.official_total) || 0;
      const reserveOpening = parseFloat(previousResult.data?.other_total) || 0;

      // Sort expenses: official first
      const sortedExpenses = [...expenses].sort((a, b) => {
        if (a.is_official === b.is_official) return 0;
        return a.is_official ? -1 : 1;
      });

      // Calculate expense totals
      const officialExpenses = expenses
        .filter(e => e.is_official === true)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const nonOfficialExpenses = expenses
        .filter(e => e.is_official === false)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      // Cash-only official expenses (for the Pénztár zárás on the cash report)
      const officialCashExpenses = expenses
        .filter(e => e.is_official === true && e.payment_method === 'cash')
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

      // Fetch cash register data with register info if revenue exists
      let totalCashRegisterCash = 0;
      let totalCashRegisterCard = 0;
      let totalCashRegisterRevenue = 0;
      let totalDiscrepancies = 0;
      let discrepancyDetails = [];
      let cashRegisterDetails = [];

      if (revenue?.id) {
        const { data: cashRegisterData } = await supabase
          .from('cash_register_revenue')
          .select(`
            *,
            cash_registers (
              id,
              ap_number,
              name
            )
          `)
          .eq('daily_revenue_id', revenue.id);

        if (cashRegisterData) {
          cashRegisterDetails = cashRegisterData;
          cashRegisterData.forEach(cr => {
            totalCashRegisterCash += parseFloat(cr.cash_payment) || 0;
            totalCashRegisterCard += parseFloat(cr.card_payment) || 0;
            totalCashRegisterRevenue +=
              (parseFloat(cr.vat_0_percent) || 0) +
              (parseFloat(cr.vat_5_percent) || 0) +
              (parseFloat(cr.vat_18_percent) || 0) +
              (parseFloat(cr.vat_27_percent) || 0) +
              (parseFloat(cr.tips) || 0);

            // Calculate discrepancies from each cash register
            const registerName = cr.cash_registers?.name || cr.cash_registers?.ap_number || 'Pénztárgép';
            if (cr.discrepancies && Array.isArray(cr.discrepancies)) {
              cr.discrepancies.forEach(disc => {
                if (disc.currency === 'HUF') {
                  totalDiscrepancies += parseFloat(disc.amount) || 0;
                }
                discrepancyDetails.push({ ...disc, registerName });
              });
            } else if (cr.discrepancy_amount && parseFloat(cr.discrepancy_amount) !== 0) {
              if (cr.discrepancy_currency === 'HUF') {
                totalDiscrepancies += parseFloat(cr.discrepancy_amount) || 0;
              }
              discrepancyDetails.push({
                amount: cr.discrepancy_amount,
                currency: cr.discrepancy_currency || 'HUF',
                note: cr.discrepancy_note || '',
                registerName,
              });
            }
          });
        }
      }

      // Calculate house cash values with discrepancy adjustment
      const softwareRevenue = parseFloat(revenue?.total_revenue) || 0;
      const efoPayments = parseFloat(houseCash?.official_employment_expenses) || 0;
      const changeAmount = parseFloat(houseCash?.change_amount) || 0;
      const extraIncome = parseFloat(houseCash?.other_extra_income) || 0;
      const adjustedCash = totalCashRegisterCash - totalDiscrepancies;
      const officialTotal = adjustedCash - officialExpenses - efoPayments;
      const revenueDifference = softwareRevenue - totalCashRegisterRevenue;
      // Withdrawn bankkártya tip -> 60% is a reserve (tartalék) cost.
      const terminalTipReserveCost = cashRegisterDetails.reduce(
        (s, cr) => s + (cr.terminal_tip_withdrawn ? (parseFloat(cr.terminal_card_tip) || 0) * TERMINAL_TIP_WITHDRAW_RATE : 0),
        0
      );
      const reserveTotal = revenueDifference + extraIncome - nonOfficialExpenses - terminalTipReserveCost;
      // Closings (opening + daily movement) for the report/PDF
      const cashClosing = openingBalance + officialTotal;
      const reserveClosing = reserveOpening + reserveTotal;

      // Create PDF
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const rightMargin = pageWidth - 15; // Right edge for values

      // Draws the red header band with the white logo + subtitle and the
      // unit name / date below it. Returns the y position to continue from.
      const drawHeader = (subtitle) => {
        doc.setFillColor(211, 47, 47); // Pepper red
        doc.rect(0, 0, pageWidth, 28, 'F');
        if (logoDataUrl) {
          const logoH = 10;
          const logoW = logoH * PDF_LOGO_ASPECT;
          doc.addImage(logoDataUrl, 'PNG', (pageWidth - logoW) / 2, 4, logoW, logoH);
        } else {
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(20);
          doc.setFont('helvetica', 'bold');
          doc.text(sanitizeForPdf('PEPPER HOUSE'), pageWidth / 2, 13, { align: 'center' });
        }
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf(subtitle), pageWidth / 2, 22, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        let hy = 36;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf(selectedUnitName || 'Egység'), pageWidth / 2, hy, { align: 'center' });
        hy += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(selectedDate), pageWidth / 2, hy, { align: 'center' });
        return hy + 10;
      };

      let y = drawHeader('Napi elszámolás');

      // Revenue section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Forgalmi adatok'), 15, y);
      y += 8;

      if (revenue) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Software revenue - right aligned
        doc.text(sanitizeForPdf('Éttermi szoftver forgalom:'), 20, y);
        doc.setFont('helvetica', 'bold');
        doc.text(formatPdfCurrency(revenue.total_revenue), rightMargin, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 6;

        // Per-register cash register data
        if (cashRegisterDetails.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text(sanitizeForPdf('Pénztárgép forgalom (pénztárgépenként):'), 20, y);
          y += 6;

          cashRegisterDetails.forEach((cr) => {
            const registerName = cr.cash_registers?.name || cr.cash_registers?.ap_number || 'Pénztárgép';
            const regTotal = (parseFloat(cr.vat_0_percent) || 0) + (parseFloat(cr.vat_5_percent) || 0) +
              (parseFloat(cr.vat_18_percent) || 0) + (parseFloat(cr.vat_27_percent) || 0); // tips not in total

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(sanitizeForPdf(registerName + ' (AP: ' + (cr.cash_registers?.ap_number || '-') + ')'), 25, y);
            doc.text(formatPdfCurrency(regTotal), rightMargin, y, { align: 'right' });
            y += 4;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(sanitizeForPdf('0%: ' + formatPdfCurrency(cr.vat_0_percent) + '  5%: ' + formatPdfCurrency(cr.vat_5_percent) + '  18%: ' + formatPdfCurrency(cr.vat_18_percent) + '  27%: ' + formatPdfCurrency(cr.vat_27_percent) + '  Borr: ' + formatPdfCurrency(cr.tips)), 30, y);
            y += 5;
            doc.setFontSize(10);
          });
          y += 2;
        }

        // Aggregated cash register total - right aligned
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Pénztárgép forgalom összesen:'), 20, y);
        doc.text(formatPdfCurrency(totalCashRegisterRevenue), rightMargin, y, { align: 'right' });
        y += 6;

        // Discrepancies section
        if (discrepancyDetails.length > 0) {
          doc.setTextColor(180, 0, 0);
          doc.text(sanitizeForPdf('Elütések:'), 20, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          discrepancyDetails.forEach((disc) => {
            doc.text(sanitizeForPdf(disc.registerName + ': ' + (disc.note || 'Nincs indoklás')), 25, y);
            doc.text('-' + formatPdfCurrency(disc.amount) + (disc.currency !== 'HUF' ? ' ' + disc.currency : ''), rightMargin, y, { align: 'right' });
            y += 4;
          });
          if (totalDiscrepancies > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text(sanitizeForPdf('Elütések összesen (HUF):'), 25, y);
            doc.text('-' + formatPdfCurrency(totalDiscrepancies), rightMargin, y, { align: 'right' });
            y += 4;
          }
          doc.setTextColor(0, 0, 0);
          y += 2;
        }

        // Payment methods - without SZÉP card
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Fizetési módok:'), 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf('Készpénz:'), 25, y);
        doc.text(formatPdfCurrency(totalCashRegisterCash), 80, y);
        doc.text(sanitizeForPdf('Bankkártya:'), 110, y);
        doc.text(formatPdfCurrency(totalCashRegisterCard), 160, y);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Összesen:'), 25, y);
        doc.text(formatPdfCurrency(totalCashRegisterCash + totalCashRegisterCard), 80, y);
        y += 8;

        // Terminal data
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Terminál:'), 20, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf('Bankkártya (terminál):'), 25, y);
        doc.text(formatPdfCurrency(totalCashRegisterCard), 80, y);
        y += 8;

        // Additional revenue types (Protocol, McKinsey, Ordit, Event)
        const hasAdditionalRevenue = (revenue.protocol_gross > 0) || (revenue.mckinsey_gross > 0) ||
          (revenue.ordit_gross > 0) || (revenue.event_revenue_gross > 0);

        if (hasAdditionalRevenue) {
          doc.setFont('helvetica', 'bold');
          doc.text(sanitizeForPdf('Egyéb bevételek:'), 20, y);
          y += 6;
          doc.setFont('helvetica', 'normal');

          if (revenue.protocol_gross > 0) {
            doc.text(sanitizeForPdf('Protokoll:'), 25, y);
            doc.text(formatPdfCurrency(revenue.protocol_gross), rightMargin, y, { align: 'right' });
            y += 5;
          }
          if (revenue.mckinsey_gross > 0) {
            doc.text(sanitizeForPdf('McKinsey:'), 25, y);
            doc.text(formatPdfCurrency(revenue.mckinsey_gross), rightMargin, y, { align: 'right' });
            y += 5;
          }
          if (revenue.ordit_gross > 0) {
            doc.text(sanitizeForPdf('Ordit:'), 25, y);
            doc.text(formatPdfCurrency(revenue.ordit_gross), rightMargin, y, { align: 'right' });
            y += 5;
          }
          if (revenue.event_revenue_gross > 0) {
            doc.text(sanitizeForPdf('Rendezvény:'), 25, y);
            doc.text(formatPdfCurrency(revenue.event_revenue_gross), rightMargin, y, { align: 'right' });
            y += 5;
          }
          y += 3;
        }
      } else {
        doc.setFontSize(10);
        doc.text(sanitizeForPdf('Nincs rögzített forgalmi adat'), 20, y);
        y += 8;
      }

      // House cash section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Házipénztár'), 15, y);
      y += 8;

      doc.setFontSize(10);

      // Pénztár zseb
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Pénztár zseb:'), 20, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(sanitizeForPdf('Váltópénz (info):'), 25, y);
      doc.text(formatPdfCurrency(changeAmount), rightMargin, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.text(sanitizeForPdf('Napi készpénz (pénztárgép):'), 25, y);
      doc.text(formatPdfCurrency(totalCashRegisterCash), rightMargin, y, { align: 'right' });
      y += 5;
      // Show discrepancy deduction if any
      if (totalDiscrepancies > 0) {
        doc.setTextColor(180, 0, 0);
        doc.text(sanitizeForPdf('Elütések levonva:'), 25, y);
        doc.text('-' + formatPdfCurrency(totalDiscrepancies), rightMargin, y, { align: 'right' });
        y += 5;
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(255, 250, 205);
        doc.rect(24, y - 3.5, rightMargin - 22, 5, 'F');
        doc.text(sanitizeForPdf('Korrigált készpénz:'), 25, y);
        doc.setFont('helvetica', 'bold');
        doc.text(formatPdfCurrency(adjustedCash), rightMargin, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 5;
      }
      doc.setTextColor(180, 0, 0);
      doc.text(sanitizeForPdf('Kifizetések:'), 25, y);
      doc.text('-' + formatPdfCurrency(officialExpenses), rightMargin, y, { align: 'right' });
      y += 5;
      doc.text(sanitizeForPdf('EFO kifizetések:'), 25, y);
      doc.text('-' + formatPdfCurrency(efoPayments), rightMargin, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Összesen:'), 25, y);
      if (officialTotal >= 0) {
        doc.setTextColor(0, 128, 0);
      } else {
        doc.setTextColor(180, 0, 0);
      }
      doc.text(formatPdfCurrency(officialTotal), rightMargin, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(sanitizeForPdf('Nyitó egyenleg:'), 25, y);
      doc.text(formatPdfCurrency(openingBalance), rightMargin, y, { align: 'right' });
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Házipénztár zárás:'), 25, y);
      doc.text(formatPdfCurrency(cashClosing), rightMargin, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 8;

      // Tartalék (omitted when reserve display is disabled)
      if (showReserve) {
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Tartalék:'), 20, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf('Szoftver-pénztárgép különbség:'), 25, y);
        if (revenueDifference >= 0) {
          doc.text(formatPdfCurrency(revenueDifference), rightMargin, y, { align: 'right' });
        } else {
          doc.setTextColor(180, 0, 0);
          doc.text(formatPdfCurrency(revenueDifference), rightMargin, y, { align: 'right' });
          doc.setTextColor(0, 0, 0);
        }
        y += 5;
        doc.text(sanitizeForPdf('Extra bevétel:'), 25, y);
        doc.text(formatPdfCurrency(extraIncome), rightMargin, y, { align: 'right' });
        y += 5;
        doc.setTextColor(180, 0, 0);
        doc.text(sanitizeForPdf('Nem számlás kifizetések:'), 25, y);
        doc.text('-' + formatPdfCurrency(nonOfficialExpenses), rightMargin, y, { align: 'right' });
        y += 5;
        if (terminalTipReserveCost > 0) {
          doc.text(sanitizeForPdf('Bankkártyás borravaló kivét (60%):'), 25, y);
          doc.text('-' + formatPdfCurrency(terminalTipReserveCost), rightMargin, y, { align: 'right' });
          y += 5;
        }
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Összesen:'), 25, y);
        if (reserveTotal >= 0) {
          doc.setTextColor(0, 0, 180);
        } else {
          doc.setTextColor(180, 0, 0);
        }
        doc.text(formatPdfCurrency(reserveTotal), rightMargin, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf('Tartalék nyitó:'), 25, y);
        doc.text(formatPdfCurrency(reserveOpening), rightMargin, y, { align: 'right' });
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Tartalék zárás:'), 25, y);
        doc.text(formatPdfCurrency(reserveClosing), rightMargin, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 10;
      }

      // Expenses section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Napi kifizetések'), 15, y);
      y += 8;

      // Helper to render a single payment line (name + amount + sub-line)
      const renderPaymentLine = (name, amount, subText) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf(name), 20, y);
        doc.setTextColor(180, 0, 0);
        doc.text('-' + formatPdfCurrency(amount), rightMargin, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 4;
        if (subText) {
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(sanitizeForPdf(subText), 25, y);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
        }
        y += 6;
      };

      // All payments: invoices + EFO + weekly wage
      const expensesTotal = sortedExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      const efoTotal = efoPaymentsList.reduce((s, p) => s + (parseFloat(p.total_amount) || 0), 0);
      const wageTotal = wagePaymentsList.reduce((s, p) => s + (parseFloat(p.total_amount) || 0), 0);
      const totalPayments = expensesTotal + efoTotal + wageTotal;
      const hasAnyPayment = sortedExpenses.length > 0 || efoPaymentsList.length > 0 || wagePaymentsList.length > 0;

      if (hasAnyPayment) {
        sortedExpenses.forEach((expense) => {
          const supplierText = expense.is_official
            ? expense.supplier_name + ' (számlás)'
            : expense.supplier_name;
          const paymentMethod = PAYMENT_METHODS[expense.payment_method] || expense.payment_method;
          renderPaymentLine(supplierText, expense.amount, (expense.item_description || 'Nincs leírás') + ' - ' + paymentMethod);
        });
        efoPaymentsList.forEach((p) => {
          const method = p.payment_method ? ' - ' + (PAYMENT_METHODS[p.payment_method] || p.payment_method) : '';
          renderPaymentLine(p.employee_name + ' (EFO)', p.total_amount, (p.notes || 'EFO kifizetés') + method);
        });
        wagePaymentsList.forEach((p) => {
          renderPaymentLine(p.worker_name + ' (Heti bér)', p.total_amount, p.notes || 'Heti bér kifizetés');
        });

        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Kifizetések összesen:'), 20, y);
        doc.setTextColor(180, 0, 0);
        doc.text('-' + formatPdfCurrency(totalPayments), rightMargin, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 8;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf('Nincs rögzített kifizetés'), 20, y);
        y += 8;
      }

      // Napi eredmény = éttermi szoftver forgalom - kifizetések összesen
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const dailyResult = softwareRevenue - totalPayments;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y - 2, rightMargin, y - 2);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Napi eredmény:'), 20, y + 4);
      if (dailyResult >= 0) {
        doc.setTextColor(0, 128, 0);
      } else {
        doc.setTextColor(180, 0, 0);
      }
      doc.text(formatPdfCurrency(dailyResult), rightMargin, y + 4, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(sanitizeForPdf('Éttermi szoftver forgalom - kifizetések összesen'), 20, y + 9);
      doc.setTextColor(0, 0, 0);
      y += 18;

      // ===== Page 2: Pénztárjelentés (cash report) =====
      doc.addPage();
      y = drawHeader('Pénztárjelentés');

      // Per-register cash register revenue + total
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Pénztárgép forgalom'), 15, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (cashRegisterDetails.length > 0) {
        cashRegisterDetails.forEach((cr) => {
          if (y > 255) { doc.addPage(); y = drawHeader('Pénztárjelentés'); }
          const registerName = cr.cash_registers?.name || cr.cash_registers?.ap_number || 'Pénztárgép';
          const regTotal = (parseFloat(cr.vat_0_percent) || 0) + (parseFloat(cr.vat_5_percent) || 0) +
            (parseFloat(cr.vat_18_percent) || 0) + (parseFloat(cr.vat_27_percent) || 0);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(sanitizeForPdf(registerName + ' (AP: ' + (cr.cash_registers?.ap_number || '-') + ')'), 20, y);
          doc.text(formatPdfCurrency(regTotal), rightMargin, y, { align: 'right' });
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(sanitizeForPdf('0%: ' + formatPdfCurrency(cr.vat_0_percent) + '  5%: ' + formatPdfCurrency(cr.vat_5_percent) + '  18%: ' + formatPdfCurrency(cr.vat_18_percent) + '  27%: ' + formatPdfCurrency(cr.vat_27_percent) + '  Borr: ' + formatPdfCurrency(cr.tips)), 25, y);
          y += 4;
          // Closure number and cumulative ("göngyölt") figure from the Z-report.
          doc.text(
            sanitizeForPdf(
              'Zárás sorszáma: ' + (cr.closure_sequence ?? '-')
              + '   Göngyölt egyenleg: ' + (cr.cumulative_revenue == null ? '-' : formatPdfCurrency(cr.cumulative_revenue))
            ),
            25, y
          );
          y += 6;
          doc.setFontSize(10);
        });
      } else {
        doc.text(sanitizeForPdf('Nincs pénztárgép adat'), 20, y);
        y += 6;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(sanitizeForPdf('Pénztárgép forgalom összesen:'), 20, y);
      doc.text(formatPdfCurrency(totalCashRegisterRevenue), rightMargin, y, { align: 'right' });
      y += 10;

      // Payment methods
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Fizetési módok'), 15, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(sanitizeForPdf('Készpénz:'), 20, y);
      doc.text(formatPdfCurrency(totalCashRegisterCash), rightMargin, y, { align: 'right' });
      y += 5;
      doc.text(sanitizeForPdf('Bankkártya:'), 20, y);
      doc.text(formatPdfCurrency(totalCashRegisterCard), rightMargin, y, { align: 'right' });
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Összesen:'), 20, y);
      doc.text(formatPdfCurrency(totalCashRegisterCash + totalCashRegisterCard), rightMargin, y, { align: 'right' });
      y += 10;

      // Házipénztár - csak Pénztár (Tartalék NEM kell)
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Házipénztár - Pénztár'), 15, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(sanitizeForPdf('Korrigált készpénz:'), 20, y);
      doc.text(formatPdfCurrency(adjustedCash), rightMargin, y, { align: 'right' });
      y += 5;
      doc.setTextColor(180, 0, 0);
      doc.text(sanitizeForPdf('Kifizetések:'), 20, y);
      doc.text('-' + formatPdfCurrency(officialExpenses), rightMargin, y, { align: 'right' });
      y += 5;
      doc.text(sanitizeForPdf('Bér jellegű kifizetések:'), 20, y);
      doc.text('-' + formatPdfCurrency(efoPayments), rightMargin, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Pénztár zseb összesen:'), 20, y);
      if (officialTotal >= 0) { doc.setTextColor(0, 128, 0); } else { doc.setTextColor(180, 0, 0); }
      doc.text(formatPdfCurrency(officialTotal), rightMargin, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 8;

      // Pénztár zárás = nyitó + pénztárgép kp bevétel - hivatalos KP költségek
      // (only cash-paid official expenses are relevant here)
      doc.setFont('helvetica', 'normal');
      doc.text(sanitizeForPdf('Nyitó egyenleg:'), 25, y);
      doc.text(formatPdfCurrency(openingBalance), rightMargin, y, { align: 'right' });
      y += 5;
      doc.text(sanitizeForPdf('Pénztárgép készpénz bevétel:'), 25, y);
      doc.text('+' + formatPdfCurrency(totalCashRegisterCash), rightMargin, y, { align: 'right' });
      y += 5;
      doc.setTextColor(180, 0, 0);
      doc.text(sanitizeForPdf('Hivatalos kp költségek:'), 25, y);
      doc.text('-' + formatPdfCurrency(officialCashExpenses), rightMargin, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 6;
      const pocketCashClosing = openingBalance + totalCashRegisterCash - officialCashExpenses;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y - 2, rightMargin, y - 2);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Pénztár zárás:'), 20, y + 4);
      doc.text(formatPdfCurrency(pocketCashClosing), rightMargin, y + 4, { align: 'right' });

      // ===== Finalize: signature (bottom-right) + footer on every page =====
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(0, 0, 0);
        doc.line(140, 280, rightMargin, 280);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(sanitizeForPdf('aláírás'), (140 + rightMargin) / 2, 284, { align: 'center' });
        doc.setTextColor(128, 128, 128);
        doc.text(sanitizeForPdf('Pepper House Pénzügyi Nyilvántartó Rendszer'), pageWidth / 2, 288, { align: 'center' });
        doc.text(sanitizeForPdf('Nyomtatva: ' + new Date().toLocaleString('hu-HU')), pageWidth / 2, 292, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }

      // Save PDF
      const fileName = `napi_riport_${selectedUnitName.replace(/\s+/g, '_')}_${selectedDate}.pdf`;
      doc.save(sanitizeForPdf(fileName));
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hiba a PDF generálása közben');
    }
  };

  if (unitsLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Napi adatrögzítés</h1>
          <p className="text-gray-500 mt-1">
            {selectedUnitName && `${selectedUnitName} - `}{selectedDate ? selectedDate.replace(/-/g, '/') : ''}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeDate(shiftDate(selectedDate, -1))}
              title="Előző nap"
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => changeDate(today)}
              disabled={selectedDate === today}
              title="Mai nap"
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500"
            >
              <span className="block h-2.5 w-2.5 rounded-full bg-current" />
            </button>
            <button
              type="button"
              onClick={() => changeDate(shiftDate(selectedDate, 1))}
              disabled={selectedDate >= today}
              title="Következő nap"
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <DateInput
              value={selectedDate}
              onChange={(e) => changeDate(e.target.value)}
              max={today}
              className="w-44"
            />
          </div>

          {activeTab === 'report' && (
            <Button
              variant="outline"
              onClick={generateDailyReportPdf}
              className="no-print"
            >
              <Printer className="h-4 w-4" />
              PDF letöltés
            </Button>
          )}
        </div>
      </div>

      {/* Always-visible date banner. It sticks under the fixed navbar so the day
          being edited stays in sight while scrolling through a long form. */}
      <div className="sticky top-16 z-30 -mx-4 md:-mx-6 lg:-mx-8 no-print">
        <div className="bg-pepper-red text-white px-4 md:px-6 lg:px-8 py-2 shadow-md">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <CalendarDays className="h-5 w-5 flex-shrink-0" />
            <span className="font-bold text-base md:text-lg">
              {formatDateWithWeekday(selectedDate)}
            </span>
            {selectedUnitName && (
              <span className="text-white/90 text-sm md:text-base">• {selectedUnitName}</span>
            )}
            {selectedDate === today && (
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">ma</span>
            )}
          </div>
        </div>
      </div>

      {/* Unit selector for admin */}
      {isAdmin && (
        <Card padding={false} className="p-4">
          <Select
            label="Egység kiválasztása"
            value={selectedUnit}
            onChange={(e) => {
              setSelectedUnit(e.target.value);
              updateSetting('lastUnitId', e.target.value);
            }}
            options={restaurantUnits.map(u => ({ value: u.id, label: u.name }))}
            placeholder="Válassz egységet..."
          />
        </Card>
      )}

      {/* Tab navigation */}
      <div className="border-b border-gray-200 no-print overflow-x-auto">
        <nav className="flex gap-4 md:gap-8 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-1
                ${
                  activeTab === tab.id
                    ? tab.isWarning ? 'border-red-500 text-red-600' : 'border-pepper-red text-pepper-red'
                    : tab.isWarning ? 'border-transparent text-red-500 hover:text-red-600 hover:border-red-300' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.isWarning && <AlertTriangle className="h-4 w-4" />}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {/* ALL - Combined view */}
        {activeTab === 'all' && (
          <div className="space-y-8">
            {/* Month overview: which days are already recorded, and a one-click
                jump to any of them. Collapsible; the choice is remembered. */}
            <Card padding={false} className="p-3 no-print">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.dailyCalendarOpen}
                  onClick={() => updateSetting('dailyCalendarOpen', !settings.dailyCalendarOpen)}
                  className="flex items-center gap-2 text-sm text-gray-600"
                  title="Naptár megjelenítése"
                >
                  <span
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      settings.dailyCalendarOpen ? 'bg-pepper-red' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.dailyCalendarOpen ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </span>
                  Naptár
                </button>
              </div>
              {settings.dailyCalendarOpen && effectiveUnitId && (
                <div className="mt-3">
                  <MonthCalendar
                    unitId={effectiveUnitId}
                    selectedDate={selectedDate}
                    onSelectDate={changeDate}
                  />
                </div>
              )}
            </Card>

            {/* Revenue Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold">1</span>
                Napi forgalom
              </h2>
              <DailyRevenueForm
                date={selectedDate}
                unitId={effectiveUnitId}
                unitName={selectedUnitName}
                focusRegisterAp={focusRegisterAp}
              />
            </div>

            {/* House Cash Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
                Házipénztár
              </h2>
              <HouseCashForm
                date={selectedDate}
                unitId={effectiveUnitId}
                onSaveSuccess={() => setActiveTab('report')}
              />
            </div>

            {/* Expenses Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">3</span>
                Napi kifizetések / számlák
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowExpenseForm(!showExpenseForm)}
                  >
                    <Plus className="h-4 w-4" />
                    Új kifizetés
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowEfoForm(true)}
                  >
                    <Users className="h-4 w-4" />
                    EFO
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowWageForm(true)}
                  >
                    <Banknote className="h-4 w-4" />
                    Napi / Heti bér
                  </Button>
                </div>
              </h2>

              {showExpenseForm && (
                <Card className="mb-4">
                  <ExpenseForm
                    unitId={effectiveUnitId}
                    onSuccess={() => {
                      setShowExpenseForm(false);
                      setExpenseRefreshKey(k => k + 1);
                    }}
                    onCancel={() => setShowExpenseForm(false)}
                  />
                </Card>
              )}

              <DailyExpensesList
                key={expenseRefreshKey}
                unitId={effectiveUnitId}
                date={selectedDate}
                onEditItem={(item) => setEditingItem(item)}
              />

              {/* EFO payment modal for "Minden adat" tab */}
              <Modal
                isOpen={showEfoForm}
                onClose={() => setShowEfoForm(false)}
                title="Új EFO kifizetés"
                size="lg"
              >
                <EfoPaymentForm
                  unitId={effectiveUnitId}
                  defaultDate={selectedDate}
                  onSuccess={() => {
                    setShowEfoForm(false);
                    setExpenseRefreshKey(k => k + 1);
                  }}
                  onCancel={() => setShowEfoForm(false)}
                />
              </Modal>

              {/* Wage payment modal for "Minden adat" tab */}
              <Modal
                isOpen={showWageForm}
                onClose={() => setShowWageForm(false)}
                title="Új Heti bér fizetés"
                size="lg"
              >
                <WagePaymentForm
                  unitId={effectiveUnitId}
                  defaultDate={selectedDate}
                  onSuccess={() => {
                    setShowWageForm(false);
                    setExpenseRefreshKey(k => k + 1);
                  }}
                  onCancel={() => setShowWageForm(false)}
                />
              </Modal>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <DailyRevenueForm
            date={selectedDate}
            unitId={effectiveUnitId}
            unitName={selectedUnitName}
            focusRegisterAp={focusRegisterAp}
          />
        )}

        {activeTab === 'cash' && (
          <HouseCashForm
            date={selectedDate}
            unitId={effectiveUnitId}
            onSaveSuccess={() => setActiveTab('report')}
          />
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-end">
              <Button onClick={() => setShowExpenseForm(!showExpenseForm)}>
                <Plus className="h-4 w-4" />
                Új kifizetés
              </Button>
              <Button variant="secondary" onClick={() => setShowEfoForm(true)}>
                <Users className="h-4 w-4" />
                Új EFO kifizetés
              </Button>
              <Button variant="secondary" onClick={() => setShowWageForm(true)}>
                <Banknote className="h-4 w-4" />
                Új Napi / Heti bér
              </Button>
            </div>

            {showExpenseForm && (
              <Card>
                <ExpenseForm
                  unitId={effectiveUnitId}
                  onSuccess={() => {
                    setShowExpenseForm(false);
                    setExpenseRefreshKey(k => k + 1);
                  }}
                  onCancel={() => setShowExpenseForm(false)}
                />
              </Card>
            )}

            <DailyExpensesList
              key={expenseRefreshKey}
              unitId={effectiveUnitId}
              date={selectedDate}
              onEditItem={(item) => setEditingItem(item)}
            />

            {/* EFO payment modal */}
            <Modal
              isOpen={showEfoForm}
              onClose={() => setShowEfoForm(false)}
              title="Új EFO kifizetés"
              size="lg"
            >
              <EfoPaymentForm
                unitId={effectiveUnitId}
                defaultDate={selectedDate}
                onSuccess={() => {
                  setShowEfoForm(false);
                  setExpenseRefreshKey(k => k + 1);
                }}
                onCancel={() => setShowEfoForm(false)}
              />
            </Modal>

            {/* Wage payment modal */}
            <Modal
              isOpen={showWageForm}
              onClose={() => setShowWageForm(false)}
              title="Új Heti bér fizetés"
              size="lg"
            >
              <WagePaymentForm
                unitId={effectiveUnitId}
                defaultDate={selectedDate}
                onSuccess={() => {
                  setShowWageForm(false);
                  setExpenseRefreshKey(k => k + 1);
                }}
                onCancel={() => setShowWageForm(false)}
              />
            </Modal>
          </div>
        )}

        {activeTab === 'history' && (
          <RecentEntriesList
            unitId={effectiveUnitId}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setActiveTab('all');
            }}
          />
        )}

        {activeTab === 'incomplete' && (
          <IncompleteEntriesList
            unitId={effectiveUnitId}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setActiveTab('all');
            }}
          />
        )}

        {activeTab === 'report' && (
          <DailyReport
            date={selectedDate}
            unitId={effectiveUnitId}
          />
        )}
      </div>

      {/* Edit modal for any payment kind */}
      <PaymentEditModal
        item={editingItem}
        unitId={effectiveUnitId}
        onClose={() => setEditingItem(null)}
        onSaved={() => setExpenseRefreshKey(k => k + 1)}
      />
    </div>
  );
}

// Component to show last 10 entries with discrepancy indicators
function RecentEntriesList({ unitId, onSelectDate }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discrepancyStatus, setDiscrepancyStatus] = useState({});

  useEffect(() => {
    async function fetchRecentEntries() {
      if (!unitId) {
        setEntries([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('daily_revenue')
          .select('*')
          .eq('unit_id', unitId)
          .order('date', { ascending: false })
          .limit(10);

        if (error) throw error;
        setEntries(data || []);

        // Fetch discrepancy status for each entry
        if (data && data.length > 0) {
          const statusMap = {};
          for (const entry of data) {
            const { data: crData } = await supabase
              .from('cash_register_revenue')
              .select('discrepancy_amount, discrepancy_note, discrepancies, terminal_discrepancy_note')
              .eq('daily_revenue_id', entry.id);

            if (crData) {
              let hasDiscrepancy = false;
              let hasProtocol = true;

              crData.forEach(cr => {
                // Check for discrepancy
                const discAmount = parseFloat(cr.discrepancy_amount) || 0;
                if (discAmount !== 0) {
                  hasDiscrepancy = true;
                  // Check if there's a protocol/note
                  if (!cr.discrepancy_note && !cr.terminal_discrepancy_note) {
                    hasProtocol = false;
                  }
                }
                // Also check discrepancies array
                if (cr.discrepancies && Array.isArray(cr.discrepancies)) {
                  cr.discrepancies.forEach(d => {
                    if (parseFloat(d.amount) !== 0) {
                      hasDiscrepancy = true;
                      if (!d.note) hasProtocol = false;
                    }
                  });
                }
              });

              statusMap[entry.id] = { hasDiscrepancy, hasProtocol };
            }
          }
          setDiscrepancyStatus(statusMap);
        }
      } catch (error) {
        console.error('Error fetching recent entries:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentEntries();
  }, [unitId]);

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Még nincsenek rögzített napok</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Legutóbbi 10 rögzítés">
      <p className="text-sm text-gray-500 mb-4">
        Kattints egy sorra a nap szerkesztéséhez
      </p>
      <div className="space-y-2">
        {entries.map((entry) => {
          const status = discrepancyStatus[entry.id];
          const showWarning = status?.hasDiscrepancy && !status?.hasProtocol;
          const showOk = status?.hasDiscrepancy && status?.hasProtocol;

          return (
            <button
              key={entry.id}
              onClick={() => onSelectDate(entry.date)}
              className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors text-left group ${
                showWarning ? 'bg-red-50 hover:bg-red-100 border border-red-200' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-sm ${
                  showWarning ? 'bg-red-100' : 'bg-white'
                }`}>
                  {showWarning ? (
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  ) : showOk ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <CalendarDays className="h-6 w-6 text-pepper-red" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{formatDate(entry.date)}</p>
                    {showWarning && (
                      <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                        Jegyzőkönyv hiányzik!
                      </span>
                    )}
                    {showOk && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <FileText className="h-3 w-3" /> OK
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Szoftver: {formatCurrency(entry.total_revenue)}</span>
                    <span className="hidden sm:inline">KP: {formatCurrency(entry.cash_payment)}</span>
                    <span className="hidden sm:inline">Kártya: {formatCurrency(entry.card_payment)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-xs text-gray-400">ÁFA bontás</p>
                  <p className="text-sm text-gray-600">
                    0%: {formatCurrency(entry.vat_0_percent)} |
                    5%: {formatCurrency(entry.vat_5_percent)} |
                    18%: {formatCurrency(entry.vat_18_percent)} |
                    27%: {formatCurrency(entry.vat_27_percent)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-pepper-red transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// Component to show entries with discrepancies (both complete and incomplete)
function IncompleteEntriesList({ unitId, onSelectDate }) {
  const [incompleteEntries, setIncompleteEntries] = useState([]);
  const [completeEntries, setCompleteEntries] = useState([]);
  // Days where the sum of the per-register software revenue differs from the
  // total (non-critical: may be intentional, so flagged in a soft colour).
  const [mismatchEntries, setMismatchEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate protocol PDF
  const generateProtocolPdf = (entry, protocol) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(211, 47, 47);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('ELTÉRÉS JEGYZŐKÖNYV'), pageWidth / 2, 15, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    y = 40;

    // Date and register info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('Dátum:'), 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(entry.date), 60, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('Pénztárgép:'), 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeForPdf(protocol.register), 60, y);
    y += 10;

    if (protocol.apNumber) {
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('AP szám:'), 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(protocol.apNumber, 60, y);
      y += 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('Eltérés típusa:'), 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeForPdf(protocol.type), 60, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('Összeg:'), 20, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 0, 0);
    doc.text(formatPdfCurrency(protocol.amount) + (protocol.currency && protocol.currency !== 'HUF' ? ' ' + protocol.currency : ''), 60, y);
    doc.setTextColor(0, 0, 0);
    y += 15;

    // Reason box
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('Indoklás:'), 20, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y - 4, pageWidth - 40, 40, 'F');
    doc.setFontSize(11);

    // Word wrap the note
    const note = protocol.note || 'Nincs megadva';
    const splitNote = doc.splitTextToSize(sanitizeForPdf(note), pageWidth - 50);
    doc.text(splitNote, 25, y + 4);
    y += 50;

    // Signature section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('Keltezés:'), 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('hu-HU'), 60, y);
    y += 20;

    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('Vezető neve:'), 20, y);
    doc.line(60, y + 1, 150, y + 1);
    y += 20;

    doc.text(sanitizeForPdf('Aláírás:'), 20, y);
    doc.line(60, y + 1, 150, y + 1);
    y += 30;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(sanitizeForPdf('Pepper House Pénzügyi Nyilvántartó Rendszer'), pageWidth / 2, 280, { align: 'center' });
    doc.text(sanitizeForPdf('Nyomtatva: ' + new Date().toLocaleString('hu-HU')), pageWidth / 2, 285, { align: 'center' });

    // Save
    const fileName = `elutesi_jegyzokonyv_${entry.date}_${protocol.register.replace(/\s+/g, '_')}.pdf`;
    doc.save(sanitizeForPdf(fileName));
  };

  useEffect(() => {
    async function fetchEntries() {
      if (!unitId) {
        setIncompleteEntries([]);
        setCompleteEntries([]);
        setLoading(false);
        return;
      }

      try {
        const { data: revenueData, error } = await supabase
          .from('daily_revenue')
          .select('*')
          .eq('unit_id', unitId)
          .order('date', { ascending: false });

        if (error) throw error;

        const incomplete = [];
        const complete = [];
        const mismatch = [];

        for (const entry of revenueData || []) {
          const { data: crData } = await supabase
            .from('cash_register_revenue')
            .select(`
              *,
              cash_registers (ap_number, name)
            `)
            .eq('daily_revenue_id', entry.id);

          if (crData) {
            const missingProtocols = [];
            const completedProtocols = [];

            crData.forEach(cr => {
              const discAmount = parseFloat(cr.discrepancy_amount) || 0;
              const cardTerminalDiff = (parseFloat(cr.card_payment) || 0) - (parseFloat(cr.terminal_card) || 0);
              const registerName = cr.cash_registers?.name || cr.cash_registers?.ap_number || 'Ismeretlen';
              const apNumber = cr.cash_registers?.ap_number || '';

              // Check discrepancy_amount
              if (discAmount !== 0) {
                const protocolData = {
                  register: registerName,
                  apNumber,
                  type: 'Elütés',
                  amount: discAmount,
                  note: cr.discrepancy_note,
                };
                if (cr.discrepancy_note) {
                  completedProtocols.push(protocolData);
                } else {
                  missingProtocols.push(protocolData);
                }
              }

              // Check card vs terminal difference (rounding tolerance only)
              if (Math.abs(cardTerminalDiff) > REGISTER_TOLERANCE) {
                const protocolData = {
                  register: registerName,
                  apNumber,
                  type: 'Kártya-terminál eltérés',
                  amount: cardTerminalDiff,
                  note: cr.terminal_discrepancy_note,
                };
                if (cr.terminal_discrepancy_note) {
                  completedProtocols.push(protocolData);
                } else {
                  missingProtocols.push(protocolData);
                }
              }

              // Check the payment breakdown: the VAT buckets have to add up to
              // készpénz + bankkártya + SZÉP (borravaló is not part of it).
              const turnover =
                (parseFloat(cr.vat_0_percent) || 0) +
                (parseFloat(cr.vat_5_percent) || 0) +
                (parseFloat(cr.vat_18_percent) || 0) +
                (parseFloat(cr.vat_27_percent) || 0);
              const breakdown = validatePaymentBreakdown({
                vatTotal: turnover,
                cash: parseFloat(cr.cash_payment) || 0,
                card: parseFloat(cr.card_payment) || 0,
                szep: parseFloat(cr.szep_card_payment) || 0,
              });
              if (breakdown.applicable && !breakdown.isValid) {
                const protocolData = {
                  register: registerName,
                  apNumber,
                  type: 'Fizetési mód eltérés',
                  amount: breakdown.difference,
                  note: hasDocumentedDiscrepancy(cr) ? 'Elütés rögzítve' : '',
                };
                if (protocolData.note) {
                  completedProtocols.push(protocolData);
                } else {
                  missingProtocols.push(protocolData);
                }
              }

              // Check discrepancies array
              if (cr.discrepancies && Array.isArray(cr.discrepancies)) {
                cr.discrepancies.forEach(d => {
                  if (parseFloat(d.amount) !== 0) {
                    const protocolData = {
                      register: registerName,
                      apNumber,
                      type: 'Elütés',
                      amount: d.amount,
                      currency: d.currency,
                      note: d.note,
                    };
                    if (d.note) {
                      completedProtocols.push(protocolData);
                    } else {
                      missingProtocols.push(protocolData);
                    }
                  }
                });
              }
            });

            if (missingProtocols.length > 0) {
              incomplete.push({ ...entry, protocols: missingProtocols });
            }
            if (completedProtocols.length > 0) {
              complete.push({ ...entry, protocols: completedProtocols });
            }

            // Non-critical check: does the per-register software revenue sum
            // match the day's total? Only flag when the registers actually carry
            // software revenue (so pure manual-entry days aren't flagged).
            const softwareSum = crData.reduce((s, cr) => s + (parseFloat(cr.software_revenue) || 0), 0);
            const totalRev = parseFloat(entry.total_revenue) || 0;
            if (softwareSum > 0 && Math.abs(softwareSum - totalRev) > 1) {
              mismatch.push({ ...entry, softwareSum, totalRev, diff: totalRev - softwareSum });
            }
          }
        }

        setIncompleteEntries(incomplete);
        setCompleteEntries(complete);
        setMismatchEntries(mismatch);
      } catch (error) {
        console.error('Error fetching entries:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, [unitId]);

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  const hasAny = incompleteEntries.length > 0 || completeEntries.length > 0 || mismatchEntries.length > 0;

  if (!hasAny) {
    return (
      <Card>
        <div className="text-center py-8">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-semibold text-gray-900">Minden rendben!</p>
          <p className="text-gray-500 mt-2">Nincs eltérés a rendszerben</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Incomplete entries - red */}
      {incompleteEntries.length > 0 && (
        <Card>
          <div className="flex items-center gap-3 mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">{incompleteEntries.length} nap jegyzőkönyv nélküli eltéréssel</p>
              <p className="text-sm text-red-600">Kérlek írj jegyzőkönyvet minden eltéréshez!</p>
            </div>
          </div>

          <div className="space-y-3">
            {incompleteEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onSelectDate(entry.date)}
                className="w-full p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <p className="font-semibold text-gray-900">{formatDate(entry.date)}</p>
                    </div>
                    <div className="space-y-1">
                      {entry.protocols.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-red-600 font-medium">{p.register}:</span>
                          <span className="text-gray-600">{p.type}</span>
                          <span className="text-red-600 font-mono">
                            {formatCurrency(p.amount)} {p.currency && p.currency !== 'HUF' ? p.currency : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-red-400 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Software revenue sum mismatch - amber (non-critical) */}
      {mismatchEntries.length > 0 && (
        <Card>
          <div className="flex items-center gap-3 mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">
                {mismatchEntries.length} nap, ahol a pénztárgépek szoftver-forgalma ≠ Teljes forgalom
              </p>
              <p className="text-sm text-amber-700">
                Nem kritikus – lehet szándékos (kézi megadás), de érdemes ellenőrizni.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {mismatchEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onSelectDate(entry.date)}
                className="w-full p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <p className="font-semibold text-gray-900">{formatDate(entry.date)}</p>
                    </div>
                    <div className="text-sm text-gray-600 space-y-0.5">
                      <div>Pénztárgépek szoftver-forgalma: <span className="font-medium">{formatCurrency(entry.softwareSum)}</span></div>
                      <div>Teljes forgalom: <span className="font-medium">{formatCurrency(entry.totalRev)}</span></div>
                      <div className="text-amber-700">Eltérés: <span className="font-mono">{formatCurrency(entry.diff)}</span></div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-amber-400 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Complete entries - green */}
      {completeEntries.length > 0 && (
        <Card>
          <div className="flex items-center gap-3 mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">{completeEntries.length} nap rendezett eltéréssel</p>
              <p className="text-sm text-green-600">Jegyzőkönyv rögzítve - nyomtatható</p>
            </div>
          </div>

          <div className="space-y-3">
            {completeEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <p className="font-semibold text-gray-900">{formatDate(entry.date)}</p>
                  </div>
                  <button
                    onClick={() => onSelectDate(entry.date)}
                    className="text-sm text-green-600 hover:text-green-800"
                  >
                    Részletek →
                  </button>
                </div>
                <div className="space-y-2">
                  {entry.protocols.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-100">
                      <div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-700 font-medium">{p.register}:</span>
                          <span className="text-gray-600">{p.type}</span>
                          <span className="text-green-700 font-mono">
                            {formatCurrency(p.amount)} {p.currency && p.currency !== 'HUF' ? p.currency : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-md">
                          {p.note}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateProtocolPdf(entry, p);
                        }}
                        className="flex-shrink-0"
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Jegyzőkönyv
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// Component to show daily expenses
function DailyExpensesList({ unitId, date, onEditItem }) {
  const { items, loading } = usePaymentItems(unitId, date, date);

  const formatHuf = (amount, currency = 'HUF') =>
    new Intl.NumberFormat('hu-HU', { style: 'currency', currency: currency || 'HUF', minimumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">
          <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Ezen a napon még nincs rögzített kifizetés</p>
        </div>
      </Card>
    );
  }

  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Per-kind subtotals for the summary at the bottom.
  const kindSummary = [
    { kind: 'efo', label: 'EFO' },
    { kind: 'wage', label: 'Bér' },
    { kind: 'expense', label: 'Egyéb kifizetések' },
  ]
    .map(({ kind, label }) => ({
      label,
      amount: items.filter((i) => i.kind === kind).reduce((s, i) => s + (i.amount || 0), 0),
    }))
    .filter((row) => row.amount > 0);

  return (
    <Card>
      <p className="text-xs text-gray-500 mb-3">Kattints egy sorra a szerkesztéshez</p>
      <div className="space-y-3">
        {items.map((item) => {
          const kindMeta = PAYMENT_KIND_META[item.kind];
          return (
            <div
              key={item.id}
              onClick={() => onEditItem?.(item)}
              className="flex items-center justify-between py-3 px-3 -mx-3 border-b border-gray-100 last:border-0 rounded-lg transition-colors cursor-pointer hover:bg-gray-50"
            >
              <div className="flex items-start gap-2">
                <Badge variant={kindMeta.variant} size="sm">
                  {kindMeta.label}
                </Badge>
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.description || 'Nincs leírás'}
                    {item.payment_method && ` • ${PAYMENT_METHODS[item.payment_method] || item.payment_method}`}
                  </p>
                </div>
              </div>
              <p className="font-semibold text-red-600">
                -{formatHuf(item.amount, item.currency)}
              </p>
            </div>
          );
        })}

        <div className="pt-3 border-t border-gray-200 space-y-1">
          {kindSummary.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{row.label}:</span>
              <span className="font-medium text-red-600">-{formatHuf(row.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <p className="font-semibold text-gray-700">Összesen:</p>
            <p className="font-bold text-red-600 text-lg">
              -{formatHuf(total)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
