import { useState } from 'react';
import { Download, ChevronLeft, ChevronRight, FileSpreadsheet, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { useAppSettings } from '../hooks/useAppSettings';
import { Card, Button, Select } from '../components/common';
import MonthlyReport from '../components/reports/MonthlyReport';
import MonthlyTableReport from '../components/reports/MonthlyTableReport';
import ExportModal from '../components/reports/ExportModal';
import { getFirstDayOfMonth, getToday } from '../lib/utils';

// Hungarian month names
const MONTH_NAMES = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
];

// Base report types for all users
const baseReportTypes = [
  { value: 'full_monthly', label: 'Teljes havi forgalom' },
  { value: 'cash_revenue', label: 'Készpénz bevételek' },
  { value: 'cash_register', label: 'Pénztárgép jelentés' },
  { value: 'events', label: 'Rendezvény összesítő' },
];

// Admin-only aggregated report types (when "all units" selected)
const adminAggregateReportTypes = [
  { value: 'monthly_table', label: '📊 Havi tábla (költség-bevétel)' },
  { value: 'full_monthly_all', label: 'Teljes havi forgalom - összes egység' },
  { value: 'cash_revenue_all', label: 'Készpénz bevételek - összes egység' },
  { value: 'cash_register_all_simple', label: 'Pénztárgép forgalom - összes egység (egyszerű)' },
  { value: 'cash_register_all_detailed', label: 'Pénztárgép forgalom - összes egység (részletes)' },
  { value: 'events_all', label: 'Rendezvény összesítő - összes egység' },
];

// Get previous month's first and last day
function getPreviousMonthDates() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0],
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
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getToday());
  const [selectedYearMonth, setSelectedYearMonth] = useState(getPreviousMonthYearMonth());

  // Month options for monthly table dropdown
  const monthlyTableOptions = getMonthlyTableMonthOptions();

  // Set default report type based on user role
  const getDefaultReportType = () => {
    if (isEvents) return 'events';
    if (isAccountant && !unitId) return 'cash_register_all_simple';
    if (isAccountant) return 'cash_register';
    if (isAdmin && !unitId) return 'full_monthly_all';
    return 'full_monthly';
  };
  const [reportType, setReportType] = useState(getDefaultReportType());
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(() => {
    if (!canViewAllUnits) return unitId || '';
    // Admin/accountant: apply the "default unit" preference ('' = all units).
    if (settings.defaultUnitMode === 'specific' && settings.defaultUnitId) return settings.defaultUnitId;
    if (settings.defaultUnitMode === 'remember' && settings.lastUnitId) return settings.lastUnitId;
    return unitId || '';
  });

  // Get restaurant units only (exclude events unit)
  const restaurantUnits = units.filter((u) => u.type === 'restaurant');

  // Determine available report types based on user role and selected unit
  const getAvailableReportTypes = () => {
    if (isEvents) {
      return [{ value: 'events', label: 'Rendezvény összesítő' }];
    }

    if (isAccountant && !selectedUnit) {
      // Accountant with "all units" selected - show only cash register reports
      return [
        { value: 'cash_register_all_simple', label: 'Pénztárgép forgalom - összes egység (egyszerű)' },
        { value: 'cash_register_all_detailed', label: 'Pénztárgép forgalom - összes egység (részletes)' },
      ];
    }

    if (isAccountant && selectedUnit) {
      // Accountant with specific unit - show only cash register report
      return [{ value: 'cash_register', label: 'Pénztárgép jelentés' }];
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
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Záró dátum
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-1">
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
      ) : (
        <MonthlyReport
          startDate={startDate}
          endDate={endDate}
          reportType={reportType}
          unitId={effectiveUnitId}
        />
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
