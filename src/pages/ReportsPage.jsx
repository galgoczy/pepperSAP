import { useState } from 'react';
import { Download, ChevronLeft, ChevronRight, FileSpreadsheet, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { Card, Button, Select } from '../components/common';
import MonthlyReport from '../components/reports/MonthlyReport';
import MonthlyTableReport from '../components/reports/MonthlyTableReport';
import ExportModal from '../components/reports/ExportModal';
import { getFirstDayOfMonth, getLastDayOfMonth } from '../lib/utils';

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

// Get previous month's year-month string (for monthly table report)
function getPreviousMonthYearMonth() {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    yearMonth: `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`,
    year: prevMonth.getFullYear(),
    month: prevMonth.getMonth(), // 0-indexed
    monthName: MONTH_NAMES[prevMonth.getMonth()],
  };
}

export default function ReportsPage() {
  const { isAdmin, isEvents, isAccountant, canViewAllUnits, unitId } = useAuth();
  const { units } = useUnits();
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
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
  const [selectedUnit, setSelectedUnit] = useState(unitId || '');

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
          <h1 className="text-2xl font-bold text-gray-900">Riportok</h1>
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
          <div className="space-y-1">
            <label className={`block text-sm font-medium ${reportType === 'monthly_table' ? 'text-gray-400' : 'text-gray-700'}`}>
              Kezdő dátum
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={reportType === 'monthly_table'}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-transparent ${
                  reportType === 'monthly_table'
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300'
                }`}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={`block text-sm font-medium ${reportType === 'monthly_table' ? 'text-gray-400' : 'text-gray-700'}`}>
              Záró dátum
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                disabled={reportType === 'monthly_table'}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-transparent ${
                  reportType === 'monthly_table'
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300'
                }`}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={`block text-sm font-medium ${reportType === 'monthly_table' ? 'text-gray-400' : 'text-gray-700'}`}>
              Gyors választás
            </label>
            {reportType === 'monthly_table' ? (
              <Button
                variant="secondary"
                disabled
                className="w-full opacity-50 cursor-not-allowed"
              >
                <Calendar className="h-4 w-4" />
                Előző hónap (fix)
              </Button>
            ) : startDate === getFirstDayOfMonth() && endDate === getLastDayOfMonth() ? (
              <Button
                variant="secondary"
                onClick={() => {
                  const prev = getPreviousMonthDates();
                  setStartDate(prev.start);
                  setEndDate(prev.end);
                }}
                className="w-full"
              >
                <ChevronLeft className="h-4 w-4" />
                Előző hónap
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setStartDate(getFirstDayOfMonth());
                  setEndDate(getLastDayOfMonth());
                }}
                className="w-full"
              >
                Aktuális hónap
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

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

      {/* Processed month indicator for monthly table */}
      {reportType === 'monthly_table' && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-amber-50 border border-amber-200 rounded-lg">
          <Calendar className="h-5 w-5 text-amber-600" />
          <span className="text-amber-800 font-medium">
            Feldolgozott időszak: {getPreviousMonthYearMonth().year}. {getPreviousMonthYearMonth().monthName}
          </span>
        </div>
      )}

      {/* Report content */}
      {reportType === 'monthly_table' ? (
        <MonthlyTableReport
          yearMonth={getPreviousMonthYearMonth().yearMonth}
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
      />
    </div>
  );
}
