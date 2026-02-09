import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { Card, Button, Select, LoadingSpinner, Modal } from '../components/common';
import DailyRevenueForm from '../components/daily/DailyRevenueForm';
import HouseCashForm from '../components/daily/HouseCashForm';
import DailyReport from '../components/daily/DailyReport';
import ExpenseForm from '../components/expenses/ExpenseForm';
import { getToday, formatCurrency, formatDate, PAYMENT_METHODS } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { CalendarDays, Printer, Plus, Receipt, Clock, ChevronRight, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

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
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || getToday());
  // Initialize selected unit from URL param (for admin), or user's unit
  const urlUnitParam = searchParams.get('unit');
  const [selectedUnit, setSelectedUnit] = useState(urlUnitParam || unitId || '');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
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

  // Auto-select first unit for admin if none selected (during render, not in effect)
  if (isAdmin && !selectedUnit && !unitParam && restaurantUnits.length > 0 && selectedUnit !== restaurantUnits[0].id) {
    setSelectedUnit(restaurantUnits[0].id);
  }

  // Use user's unit if not admin
  const effectiveUnitId = isAdmin ? selectedUnit : unitId;

  // Get selected unit name
  const selectedUnitName = units.find(u => u.id === effectiveUnitId)?.name || '';

  // Generate Daily Report PDF
  const generateDailyReportPdf = async () => {
    try {
      // Fetch data
      const [revenueResult, houseCashResult, expensesResult] = await Promise.all([
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
      ]);

      const revenue = revenueResult.data;
      const houseCash = houseCashResult.data;
      const expenses = expensesResult.data || [];

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
      const reserveTotal = revenueDifference + extraIncome - nonOfficialExpenses;

      // Create PDF
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const rightMargin = pageWidth - 15; // Right edge for values
      let y = 15;

      // Header with styled background
      doc.setFillColor(211, 47, 47); // Pepper red
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('PEPPER HOUSE'), pageWidth / 2, 12, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(sanitizeForPdf('Napi elszámolás'), pageWidth / 2, 20, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      y = 36;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf(selectedUnitName || 'Egység'), pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(selectedDate), pageWidth / 2, y, { align: 'center' });
      y += 10;

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
              (parseFloat(cr.vat_18_percent) || 0) + (parseFloat(cr.vat_27_percent) || 0) + (parseFloat(cr.tips) || 0);

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
      doc.text(sanitizeForPdf('Hivatalos kifizetések:'), 25, y);
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
      y += 8;

      // Tartalék
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
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Összesen:'), 25, y);
      if (reserveTotal >= 0) {
        doc.setTextColor(0, 0, 180);
      } else {
        doc.setTextColor(180, 0, 0);
      }
      doc.text(formatPdfCurrency(reserveTotal), rightMargin, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 10;

      // Expenses section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Napi kifizetések'), 15, y);
      y += 8;

      if (sortedExpenses.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        let totalExpenses = 0;
        sortedExpenses.forEach((expense) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          totalExpenses += parseFloat(expense.amount) || 0;

          // Supplier name with "(számlás)" indicator for official expenses
          const supplierText = expense.is_official
            ? expense.supplier_name + ' (számlás)'
            : expense.supplier_name;
          doc.text(sanitizeForPdf(supplierText), 20, y);
          doc.setTextColor(180, 0, 0);
          doc.text('-' + formatPdfCurrency(expense.amount), rightMargin, y, { align: 'right' });
          doc.setTextColor(0, 0, 0);
          y += 4;
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          const paymentMethod = PAYMENT_METHODS[expense.payment_method] || expense.payment_method;
          doc.text(sanitizeForPdf((expense.item_description || 'Nincs leírás') + ' - ' + paymentMethod), 25, y);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          y += 6;
        });

        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Kifizetések összesen:'), 20, y);
        doc.setTextColor(180, 0, 0);
        doc.text('-' + formatPdfCurrency(totalExpenses), rightMargin, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 10;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf('Nincs rögzített kifizetés'), 20, y);
        y += 10;
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(sanitizeForPdf('Pepper House Pénzügyi Nyilvántartó Rendszer'), pageWidth / 2, 285, { align: 'center' });
      doc.text(sanitizeForPdf('Nyomtatva: ' + new Date().toLocaleString('hu-HU')), pageWidth / 2, 290, { align: 'center' });

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
            {selectedUnitName && `${selectedUnitName} - `}{selectedDate}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={getToday()}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-transparent"
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

      {/* Unit selector for admin */}
      {isAdmin && (
        <Card padding={false} className="p-4">
          <Select
            label="Egység kiválasztása"
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
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
                Napi kifizetések
                <Button
                  size="sm"
                  onClick={() => setShowExpenseForm(!showExpenseForm)}
                  className="ml-auto"
                >
                  <Plus className="h-4 w-4" />
                  Új kifizetés
                </Button>
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
                onEditExpense={(expense) => setEditingExpense(expense)}
              />
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <DailyRevenueForm
            date={selectedDate}
            unitId={effectiveUnitId}
            unitName={selectedUnitName}
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
            <div className="flex justify-end">
              <Button onClick={() => setShowExpenseForm(!showExpenseForm)}>
                <Plus className="h-4 w-4" />
                Új kifizetés
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
              onEditExpense={(expense) => setEditingExpense(expense)}
            />
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

      {/* Expense edit modal */}
      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Kifizetés szerkesztése"
        size="lg"
      >
        <ExpenseForm
          expense={editingExpense}
          unitId={effectiveUnitId}
          onSuccess={() => {
            setEditingExpense(null);
            setExpenseRefreshKey(k => k + 1);
          }}
          onCancel={() => setEditingExpense(null)}
          onDelete={() => {
            setEditingExpense(null);
            setExpenseRefreshKey(k => k + 1);
          }}
        />
      </Modal>
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

// Component to show entries with missing protocols
function IncompleteEntriesList({ unitId, onSelectDate }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIncompleteEntries() {
      if (!unitId) {
        setEntries([]);
        setLoading(false);
        return;
      }

      try {
        // Get all daily revenue entries for this unit
        const { data: revenueData, error } = await supabase
          .from('daily_revenue')
          .select('*')
          .eq('unit_id', unitId)
          .order('date', { ascending: false });

        if (error) throw error;

        // Check each entry for discrepancies without protocols
        const incompleteList = [];

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

            crData.forEach(cr => {
              const discAmount = parseFloat(cr.discrepancy_amount) || 0;
              const cardTerminalDiff = (parseFloat(cr.card_payment) || 0) - (parseFloat(cr.terminal_card) || 0);

              // Check discrepancy_amount
              if (discAmount !== 0 && !cr.discrepancy_note) {
                missingProtocols.push({
                  register: cr.cash_registers?.name || cr.cash_registers?.ap_number || 'Ismeretlen',
                  type: 'Elütés',
                  amount: discAmount,
                });
              }

              // Check card vs terminal difference
              if (cardTerminalDiff !== 0 && !cr.terminal_discrepancy_note) {
                missingProtocols.push({
                  register: cr.cash_registers?.name || cr.cash_registers?.ap_number || 'Ismeretlen',
                  type: 'Kártya-terminál eltérés',
                  amount: cardTerminalDiff,
                });
              }

              // Check discrepancies array
              if (cr.discrepancies && Array.isArray(cr.discrepancies)) {
                cr.discrepancies.forEach(d => {
                  if (parseFloat(d.amount) !== 0 && !d.note) {
                    missingProtocols.push({
                      register: cr.cash_registers?.name || cr.cash_registers?.ap_number || 'Ismeretlen',
                      type: 'Elütés',
                      amount: d.amount,
                      currency: d.currency,
                    });
                  }
                });
              }
            });

            if (missingProtocols.length > 0) {
              incompleteList.push({
                ...entry,
                missingProtocols,
              });
            }
          }
        }

        setEntries(incompleteList);
      } catch (error) {
        console.error('Error fetching incomplete entries:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchIncompleteEntries();
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
        <div className="text-center py-8">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-semibold text-gray-900">Minden rendben!</p>
          <p className="text-gray-500 mt-2">Nincs hiányzó jegyzőkönyv</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
        <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-800">{entries.length} nap jegyzőkönyv nélküli eltéréssel</p>
          <p className="text-sm text-red-600">Kérlek írj jegyzőkönyvet minden eltéréshez!</p>
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
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
                  {entry.missingProtocols.map((mp, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-red-600 font-medium">{mp.register}:</span>
                      <span className="text-gray-600">{mp.type}</span>
                      <span className="text-red-600 font-mono">
                        {formatCurrency(mp.amount)} {mp.currency && mp.currency !== 'HUF' ? mp.currency : ''}
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
  );
}

// Component to show daily expenses
function DailyExpensesList({ unitId, date, onEditExpense }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExpenses() {
      if (!unitId || !date) {
        setExpenses([]);
        setLoading(false);
        return;
      }

      try {
        const { supabase } = await import('../lib/supabase');
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('unit_id', unitId)
          .eq('invoice_date', date)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setExpenses(data || []);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchExpenses();
  }, [unitId, date]);

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">
          <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Ezen a napon még nincs rögzített kifizetés</p>
        </div>
      </Card>
    );
  }

  const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  return (
    <Card>
      <p className="text-xs text-gray-500 mb-3">Kattints egy sorra a szerkesztéshez</p>
      <div className="space-y-3">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            onClick={() => onEditExpense?.(expense)}
            className="flex items-center justify-between py-3 px-3 -mx-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">{expense.supplier_name}</p>
              <p className="text-sm text-gray-500">
                {expense.item_description || 'Nincs leírás'} • {expense.payment_method}
              </p>
            </div>
            <p className="font-semibold text-red-600">
              -{new Intl.NumberFormat('hu-HU', { style: 'currency', currency: expense.currency || 'HUF', minimumFractionDigits: 0 }).format(expense.amount)}
            </p>
          </div>
        ))}

        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <p className="font-semibold text-gray-700">Összesen:</p>
          <p className="font-bold text-red-600 text-lg">
            -{new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', minimumFractionDigits: 0 }).format(total)}
          </p>
        </div>
      </div>
    </Card>
  );
}
