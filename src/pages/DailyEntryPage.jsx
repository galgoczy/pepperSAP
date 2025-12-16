import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { Card, Button, Select, LoadingSpinner } from '../components/common';
import DailyRevenueForm from '../components/daily/DailyRevenueForm';
import HouseCashForm from '../components/daily/HouseCashForm';
import DailyReport from '../components/daily/DailyReport';
import ExpenseForm from '../components/expenses/ExpenseForm';
import { getToday, formatCurrency, formatDate, PAYMENT_METHODS } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { CalendarDays, Printer, Plus, Receipt, Clock, ChevronRight } from 'lucide-react';

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
  { id: 'report', label: 'Napi riport' },
];

export default function DailyEntryPage() {
  const { isAdmin, unitId, profile } = useAuth();
  const { units, loading: unitsLoading } = useUnits();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || getToday());
  // Initialize selected unit from URL param (for admin), or user's unit
  const urlUnitParam = searchParams.get('unit');
  const [selectedUnit, setSelectedUnit] = useState(urlUnitParam || unitId || '');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseRefreshKey, setExpenseRefreshKey] = useState(0);

  // Update date and unit when URL params change
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const unitParam = searchParams.get('unit');
    if (dateParam) {
      setSelectedDate(dateParam);
    }
    if (unitParam && isAdmin) {
      setSelectedUnit(unitParam);
    }
  }, [searchParams, isAdmin]);

  // Get restaurant units only
  const restaurantUnits = units.filter(u => u.type === 'restaurant');

  // Auto-select first unit for admin if none selected
  useEffect(() => {
    if (isAdmin && !selectedUnit && restaurantUnits.length > 0) {
      setSelectedUnit(restaurantUnits[0].id);
    }
  }, [isAdmin, selectedUnit, restaurantUnits]);

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

      // Fetch cash register data with register info if revenue exists
      let cashRegisterTotals = {
        vat_0_percent: 0,
        vat_5_percent: 0,
        vat_18_percent: 0,
        vat_27_percent: 0,
        tips: 0,
        cash_payment: 0,
        card_payment: 0,
      };
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
          cashRegisterTotals = cashRegisterData.reduce(
            (acc, cr) => ({
              vat_0_percent: acc.vat_0_percent + (parseFloat(cr.vat_0_percent) || 0),
              vat_5_percent: acc.vat_5_percent + (parseFloat(cr.vat_5_percent) || 0),
              vat_18_percent: acc.vat_18_percent + (parseFloat(cr.vat_18_percent) || 0),
              vat_27_percent: acc.vat_27_percent + (parseFloat(cr.vat_27_percent) || 0),
              tips: acc.tips + (parseFloat(cr.tips) || 0),
              cash_payment: acc.cash_payment + (parseFloat(cr.cash_payment) || 0),
              card_payment: acc.card_payment + (parseFloat(cr.card_payment) || 0),
            }),
            cashRegisterTotals
          );
        }
      }

      // Create PDF
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Napi elszámolás'), pageWidth / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(sanitizeForPdf(selectedUnitName || 'Egység'), pageWidth / 2, y, { align: 'center' });
      y += 6;
      doc.text(formatDate(selectedDate), pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Revenue section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Forgalmi adatok'), 15, y);
      y += 8;

      if (revenue) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Software revenue
        doc.text(sanitizeForPdf('Éttermi szoftver forgalom:'), 20, y);
        doc.text(formatPdfCurrency(revenue.total_revenue), 120, y);
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
            doc.text(formatPdfCurrency(regTotal), 160, y);
            y += 4;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(sanitizeForPdf('0%: ' + formatPdfCurrency(cr.vat_0_percent) + '  5%: ' + formatPdfCurrency(cr.vat_5_percent) + '  18%: ' + formatPdfCurrency(cr.vat_18_percent) + '  27%: ' + formatPdfCurrency(cr.vat_27_percent) + '  Borr: ' + formatPdfCurrency(cr.tips)), 30, y);
            y += 5;
            doc.setFontSize(10);
          });
          y += 2;
        }

        // Aggregated VAT breakdown
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Pénztárgép forgalom összesítve:'), 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf('0% ÁFA:'), 25, y);
        doc.text(formatPdfCurrency(cashRegisterTotals.vat_0_percent), 80, y);
        doc.text(sanitizeForPdf('5% ÁFA:'), 110, y);
        doc.text(formatPdfCurrency(cashRegisterTotals.vat_5_percent), 160, y);
        y += 5;
        doc.text(sanitizeForPdf('18% ÁFA:'), 25, y);
        doc.text(formatPdfCurrency(cashRegisterTotals.vat_18_percent), 80, y);
        doc.text(sanitizeForPdf('27% ÁFA:'), 110, y);
        doc.text(formatPdfCurrency(cashRegisterTotals.vat_27_percent), 160, y);
        y += 5;
        doc.text(sanitizeForPdf('Borravaló:'), 25, y);
        doc.text(formatPdfCurrency(cashRegisterTotals.tips), 80, y);
        y += 6;

        const cashRegisterTotal =
          cashRegisterTotals.vat_0_percent +
          cashRegisterTotals.vat_5_percent +
          cashRegisterTotals.vat_18_percent +
          cashRegisterTotals.vat_27_percent +
          cashRegisterTotals.tips;
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Pénztárgép összesen:'), 25, y);
        doc.text(formatPdfCurrency(cashRegisterTotal), 80, y);
        y += 8;

        // Discrepancy
        if (parseFloat(revenue.discrepancy_amount) !== 0) {
          doc.setTextColor(180, 0, 0);
          doc.text(sanitizeForPdf('Elütés:'), 20, y);
          doc.text(formatPdfCurrency(revenue.discrepancy_amount), 80, y);
          if (revenue.discrepancy_note) {
            y += 5;
            doc.setFont('helvetica', 'italic');
            doc.text(sanitizeForPdf(revenue.discrepancy_note.substring(0, 80)), 25, y);
          }
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          y += 6;
        }

        // Payment methods (from aggregated cash register data) - without SZÉP card
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Fizetési módok:'), 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf('Készpénz:'), 25, y);
        doc.text(formatPdfCurrency(cashRegisterTotals.cash_payment), 80, y);
        doc.text(sanitizeForPdf('Bankkártya:'), 110, y);
        doc.text(formatPdfCurrency(cashRegisterTotals.card_payment), 160, y);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Összesen:'), 25, y);
        doc.text(formatPdfCurrency(cashRegisterTotals.cash_payment + cashRegisterTotals.card_payment), 80, y);
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

      if (houseCash) {
        doc.setFontSize(10);

        // Official pocket
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Pénztár zseb:'), 20, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf('Váltópénz:'), 25, y);
        doc.text(formatPdfCurrency(houseCash.change_amount), 80, y);
        y += 5;
        doc.text(sanitizeForPdf('Napi készpénz:'), 25, y);
        doc.text(formatPdfCurrency(houseCash.official_daily_cash), 80, y);
        y += 5;
        doc.text(sanitizeForPdf('Egyéb bevétel:'), 25, y);
        doc.text(formatPdfCurrency(houseCash.official_other_income), 80, y);
        y += 5;
        doc.text(sanitizeForPdf('Készpénzes számlák:'), 25, y);
        doc.text('-' + formatPdfCurrency(houseCash.official_cash_expenses), 80, y);
        y += 5;
        doc.text(sanitizeForPdf('EFO kifizetések:'), 25, y);
        doc.text('-' + formatPdfCurrency(houseCash.official_employment_expenses), 80, y);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Összesen:'), 25, y);
        doc.text(formatPdfCurrency(houseCash.official_total), 80, y);
        y += 8;

        // Reserve pocket
        doc.text(sanitizeForPdf('Tartalék:'), 20, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf('Különbözet:'), 25, y);
        doc.text(formatPdfCurrency(houseCash.other_difference), 80, y);
        y += 5;
        doc.text(sanitizeForPdf('Extra bevétel:'), 25, y);
        doc.text(formatPdfCurrency(houseCash.other_extra_income), 80, y);
        y += 5;
        doc.text(sanitizeForPdf('Kiadások:'), 25, y);
        doc.text('-' + formatPdfCurrency(houseCash.other_expenses), 80, y);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Összesen:'), 25, y);
        doc.text(formatPdfCurrency(houseCash.other_total), 80, y);
        y += 10;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(sanitizeForPdf('Nincs rögzített házipénztár adat'), 20, y);
        y += 10;
      }

      // Expenses section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf('Napi kifizetések'), 15, y);
      y += 8;

      if (expenses.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        let totalExpenses = 0;
        expenses.forEach((expense) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          totalExpenses += parseFloat(expense.amount) || 0;
          doc.text(sanitizeForPdf(expense.supplier_name), 20, y);
          doc.text('-' + formatPdfCurrency(expense.amount), 160, y);
          y += 4;
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          const paymentMethod = PAYMENT_METHODS[expense.payment_method] || expense.payment_method;
          doc.text(sanitizeForPdf((expense.item_description || '') + ' - ' + paymentMethod), 25, y);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          y += 6;
        });

        doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf('Kifizetések összesen:'), 20, y);
        doc.text('-' + formatPdfCurrency(totalExpenses), 160, y);
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
                py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? 'border-pepper-red text-pepper-red'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
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

              <DailyExpensesList key={expenseRefreshKey} unitId={effectiveUnitId} date={selectedDate} />
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

            <DailyExpensesList key={expenseRefreshKey} unitId={effectiveUnitId} date={selectedDate} />
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

        {activeTab === 'report' && (
          <DailyReport
            date={selectedDate}
            unitId={effectiveUnitId}
          />
        )}
      </div>
    </div>
  );
}

// Component to show last 10 entries
function RecentEntriesList({ unitId, onSelectDate }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

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
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelectDate(entry.date)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <CalendarDays className="h-6 w-6 text-pepper-red" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{formatDate(entry.date)}</p>
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
        ))}
      </div>
    </Card>
  );
}

// Component to show daily expenses
function DailyExpensesList({ unitId, date }) {
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
      <div className="space-y-3">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
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
