import { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, FileSpreadsheet, Calendar } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { useAppSettings } from '../hooks/useAppSettings';
import { Card, Button, Select, DateInput, ErrorBoundary } from '../components/common';
import MonthlyReport from '../components/reports/MonthlyReport';
import MonthlyTableReport from '../components/reports/MonthlyTableReport';
import HouseCashReport from '../components/reports/HouseCashReport';
import TrafficReport from '../components/reports/TrafficReport';
import ExportModal from '../components/reports/ExportModal';
import { getFirstDayOfMonth, getToday } from '../lib/utils';

// Hungarian month names
const MONTH_NAMES = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
];

// Base report types for all users
const baseReportTypes = [
  { value: 'traffic', label: 'Forgalmi jelentés' },
  { value: 'full_monthly', label: 'Teljes havi forgalom' },
  { value: 'full_traffic', label: 'Teljes forgalmi jelentés (forgalom + házipénztár)' },
  { value: 'cash_revenue', label: 'Készpénz bevételek' },
  { value: 'cash_register', label: 'Pénztárgép jelentés' },
  { value: 'house_cash', label: 'Házipénztár' },
  { value: 'events', label: 'Rendezvény összesítő' },
];

// Admin-only aggregated report types (when "all units" selected)
const adminAggregateReportTypes = [
  { value: 'monthly_table', label: '📊 Havi tábla (költség-bevétel)' },
  { value: 'full_monthly_all', label: 'Teljes havi forgalom - összes egység' },
  { value: 'full_traffic', label: 'Teljes forgalmi jelentés - összes egység' },
  { value: 'cash_revenue_all', label: 'Készpénz bevételek - összes egység' },
  { value: 'cash_register_all_simple', label: 'Pénztárgép forgalom - összes egység (egyszerű)' },
  { value: 'cash_register_all_detailed', label: 'Pénztárgép forgalom - összes egység (részletes)' },
  { value: 'cash_register_all_accounting', label: 'Pénztárgép forgalom - könyvelés' },
  { value: 'house_cash', label: 'Házipénztár - összes egység' },
  { value: 'events_all', label: 'Rendezvény összesítő - összes egység' },
];

// Get previous month's first and last day (using LOCAL date components, not
// UTC — toISOString() shifts back a day in timezones ahead of UTC like Hungary,
// which made the range start on the last day of the month before).
function getPreviousMonthDates() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    start: ymd(firstDay),
    end: ymd(lastDay),
  };
}

// Get previous month's year-month string (for monthly table report default)
function getPreviousMonthYearMonth() {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
}

// Generate month options for monthly table (from Oct 2024 to previous month)
function getMonthlyTableMonthOptions() {
  const options = [];
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Previous month
  const startDate = new Date(2024, 9, 1); // October 2024

  let current = new Date(endDate);
  while (current >= startDate) {
    const yearMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    const label = `${current.getFullYear()}. ${MONTH_NAMES[current.getMonth()]}`;
    options.push({ value: yearMonth, label });
    current.setMonth(current.getMonth() - 1);
  }

  return options;
}

export default function ReportsPage() {
  const { isAdmin, isEvents, isAccountant, canViewAllUnits, unitId } = useAuth();
  const { units } = useUnits();
  const { settings, updateSetting } = useAppSettings();
  // The report's selection lives in the URL, so leaving the page and coming back
  // (e.g. from a day opened out of the register report) restores what was on
  // screen instead of resetting to the defaults.
  const [searchParams, setSearchParams] = useSearchParams();
  const [startDate, setStartDate] = useState(() => searchParams.get('start') || getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(() => searchParams.get('end') || getToday());
  const [selectedYearMonth, setSelectedYearMonth] = useState(
    () => searchParams.get('ym') || getPreviousMonthYearMonth()
  );

  // Month options for monthly table dropdown
  const monthlyTableOptions = getMonthlyTableMonthOptions();

  // Set default report type based on user role
  const getDefaultReportType = () => {
    if (isEvents) return 'events';
    if (isAccountant && !unitId) return 'cash_register_all_simple';
    if (isAccountant) return 'cash_register';
    if (isAdmin && !unitId) return 'full_monthly_all';
    // A unit's own default is the traffic report.
    if (!isAdmin) return 'traffic';
    return 'full_monthly';
  };
  const [reportType, setReportType] = useState(() => searchParams.get('type') || getDefaultReportType());
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(() => {
    // '' is a real value here ("all units"), so presence decides, not truthiness.
    if (searchParams.has('unit')) return searchParams.get('unit');
    if (!canViewAllUnits) return unitId || '';
    // Admin/accountant: apply the "default unit" preference ('' = all units).
    if (settings.defaultUnitMode === 'specific' && settings.defaultUnitId) return settings.defaultUnitId;
    if (settings.defaultUnitMode === 'remember' && settings.lastUnitId) return settings.lastUnitId;
    return unitId || '';
  });

  // Mirror the selection into the URL. The functional form keeps anything else
  // that is there (e.g. `focus`, which scrolls the report back to a register).
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('type', reportType);
      next.set('unit', selectedUnit);
      next.set('start', startDate);
      next.set('end', endDate);
      next.set('ym', selectedYearMonth);
      return next;
    }, { replace: true });
  }, [reportType, selectedUnit, startDate, endDate, selectedYearMonth, setSearchParams]);

  // Get restaurant units only (exclude events unit)
  const restaurantUnits = units.filter((u) => u.type === 'restaurant');

  // Determine available report types based on user role and selected unit
  const getAvailableReportTypes = () => {
    if (isEvents) {
      return [{ value: 'events', label: 'Rendezvény összesítő' }];
    }

    if (isAccountant && !selectedUnit) {
      // Accountant with "all units" selected - cash register reports + house cash
      // (reserve-less; the reserve is hidden for accountants in the report).
      return [
        { value: 'cash_register_all_simple', label: 'Pénztárgép forgalom - összes egység (egyszerű)' },
        { value: 'cash_register_all_detailed', label: 'Pénztárgép forgalom - összes egység (részletes)' },
        { value: 'cash_register_all_accounting', label: 'Pénztárgép forgalom - könyvelés' },
        { value: 'house_cash', label: 'Házipénztár - összes egység (tartalék nélkül)' },
      ];
    }

    if (isAccountant && selectedUnit) {
      // Accountant with specific unit - cash register report + house cash
      return [
        { value: 'cash_register', label: 'Pénztárgép jelentés' },
        { value: 'house_cash', label: 'Házipénztár (tartalék nélkül)' },
      ];
    }

    if (isAdmin && !selectedUnit) {
      // Admin with "all units" selected - show aggregate reports
      return adminAggregateReportTypes;
    }

    // Regular user or admin with specific unit selected
    return baseReportTypes;
  };

  const availableReportTypes = getAvailableReportTypes();

  // Reset report type if current selection is not available
  const handleUnitChange = (newUnit) => {
    setSelectedUnit(newUnit);
    if (canViewAllUnits) updateSetting('lastUnitId', newUnit);
    // If switching to/from "all units", reset report type based on role
    if ((newUnit === '' && selectedUnit !== '') || (newUnit !== '' && selectedUnit === '')) {
      if (isAccountant) {
        setReportType(newUnit === '' ? 'cash_register_all_simple' : 'cash_register');
      } else {
        setReportType(newUnit === '' ? 'full_monthly_all' : 'full_monthly');
      }
    }
  };

  // Build unit options for admin dropdown
  const unitOptions = [
    { value: '', label: 'Összes egység' },
    ...restaurantUnits.map((unit) => ({ value: unit.id, label: unit.name })),
  ];

  // Determine effective unit ID for reports
  const effectiveUnitId = canViewAllUnits ? selectedUnit : unitId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jelentések</h1>
          <p className="text-gray-500 mt-1">
            Havi összesítők és exportok
          </p>
        </div>

        <Button onClick={() => setIsExportOpen(true)}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {reportType === 'monthly_table' ? (
            // Month selector for monthly table
            <>
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Feldolgozott hónap
                </label>
                <select
                  value={selectedYearMonth}
                  onChange={(e) => setSelectedYearMonth(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-transparent bg-white"
                >
                  {monthlyTableOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Gyors választás
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const currentIndex = monthlyTableOptions.findIndex(o => o.value === selectedYearMonth);
                      if (currentIndex < monthlyTableOptions.length - 1) {
                        setSelectedYearMonth(monthlyTableOptions[currentIndex + 1].value);
                      }
                    }}
                    disabled={selectedYearMonth === monthlyTableOptions[monthlyTableOptions.length - 1]?.value}
                    className="flex-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const currentIndex = monthlyTableOptions.findIndex(o => o.value === selectedYearMonth);
                      if (currentIndex > 0) {
                        setSelectedYearMonth(monthlyTableOptions[currentIndex - 1].value);
                      }
                    }}
                    disabled={selectedYearMonth === monthlyTableOptions[0]?.value}
                    className="flex-1"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            // Date pickers for other reports
            <>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Kezdő dátum
                </label>
                <DateInput
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Záró dátum
                </label>
                <DateInput
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>

              <div className="space-y-1 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Gyors választás
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStartDate(getFirstDayOfMonth());
                      setEndDate(getToday());
                    }}
                    className="flex-1"
                  >
                    Aktuális hónap
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const prev = getPreviousMonthDates();
                      setStartDate(prev.start);
                      setEndDate(prev.end);
                    }}
                    className="flex-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Előző hónap
                  </Button>
                </div>
              </div>
            </>
          )}

          {canViewAllUnits && (
            <Select
              label="Egység"
              value={selectedUnit}
              onChange={(e) => handleUnitChange(e.target.value)}
              options={unitOptions}
            />
          )}

          <Select
            label="Riport típusa"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={availableReportTypes}
          />
        </div>
      </Card>

      {/* Admin link for monthly data entry */}
      {isAdmin && reportType === 'monthly_table' && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Havi pénzügyi adatok rögzítése</p>
                <p className="text-sm text-blue-700">Kézi adatbevitel és Excel import a havi táblához</p>
              </div>
            </div>
            <Link to="/monthly-data">
              <Button variant="secondary">
                Adatok kezelése
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Report content */}
      {reportType === 'monthly_table' ? (
        <MonthlyTableReport
          yearMonth={selectedYearMonth}
        />
      ) : reportType === 'traffic' ? (
        effectiveUnitId ? (
          <TrafficReport
            unitId={effectiveUnitId}
            unitName={units.find((u) => u.id === effectiveUnitId)?.name || ''}
          />
        ) : (
          <Card>
            <p className="text-center text-gray-500 py-8">
              Válassz ki egy egységet a forgalmi jelentéshez
            </p>
          </Card>
        )
      ) : reportType === 'house_cash' ? (
        <HouseCashReport
          unitId={effectiveUnitId}
          units={units}
          startDate={startDate}
          endDate={endDate}
        />
      ) : reportType === 'full_traffic' ? (
        <div className="space-y-8">
          <MonthlyReport
            startDate={startDate}
            endDate={endDate}
            reportType={effectiveUnitId ? 'full_monthly' : 'full_monthly_all'}
            unitId={effectiveUnitId}
          />
          <HouseCashReport
            unitId={effectiveUnitId}
            units={units}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      ) : (
        <ErrorBoundary resetKey={reportType} title="Hiba a jelentés megjelenítésekor">
          <MonthlyReport
            startDate={startDate}
            endDate={endDate}
            reportType={reportType}
            unitId={effectiveUnitId}
          />
        </ErrorBoundary>
      )}

      {/* Export modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        startDate={startDate}
        endDate={endDate}
        unitId={effectiveUnitId}
        reportType={reportType}
        selectedYearMonth={selectedYearMonth}
      />
    </div>
  );
}
