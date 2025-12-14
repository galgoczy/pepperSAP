import { useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { Card, Button, Select } from '../components/common';
import MonthlyReport from '../components/reports/MonthlyReport';
import ExportModal from '../components/reports/ExportModal';
import { getFirstDayOfMonth, getLastDayOfMonth } from '../lib/utils';

// Base report types for all users
const baseReportTypes = [
  { value: 'full_monthly', label: 'Teljes havi forgalom' },
  { value: 'cash_revenue', label: 'Készpénz bevételek' },
  { value: 'cash_register', label: 'Pénztárgép jelentés' },
  { value: 'events', label: 'Rendezvény összesítő' },
];

// Admin-only aggregated report types (when "all units" selected)
const adminAggregateReportTypes = [
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

export default function ReportsPage() {
  const { isAdmin, isEvents, unitId } = useAuth();
  const { units } = useUnits();
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  const [reportType, setReportType] = useState('full_monthly');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(unitId || '');

  // Get restaurant units only (exclude events unit)
  const restaurantUnits = units.filter((u) => u.type === 'restaurant');

  // Determine available report types based on user role and selected unit
  const getAvailableReportTypes = () => {
    if (isEvents) {
      return [{ value: 'events', label: 'Rendezvény összesítő' }];
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
    // If switching to/from "all units", reset report type
    if ((newUnit === '' && selectedUnit !== '') || (newUnit !== '' && selectedUnit === '')) {
      setReportType(newUnit === '' ? 'full_monthly_all' : 'full_monthly');
    }
  };

  // Build unit options for admin dropdown
  const unitOptions = [
    { value: '', label: 'Összes egység' },
    ...restaurantUnits.map((unit) => ({ value: unit.id, label: unit.name })),
  ];

  // Determine effective unit ID for reports
  const effectiveUnitId = isAdmin ? selectedUnit : unitId;

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
            {startDate === getFirstDayOfMonth() && endDate === getLastDayOfMonth() ? (
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

          {isAdmin && (
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

      {/* Report content */}
      <MonthlyReport
        startDate={startDate}
        endDate={endDate}
        reportType={reportType}
        unitId={effectiveUnitId}
        isAdmin={isAdmin}
      />

      {/* Export modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        startDate={startDate}
        endDate={endDate}
        unitId={effectiveUnitId}
        reportType={reportType}
        isAdmin={isAdmin}
      />
    </div>
  );
}
