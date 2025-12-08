import { useState } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Select, Modal } from '../components/common';
import MonthlyReport from '../components/reports/MonthlyReport';
import ExportModal from '../components/reports/ExportModal';
import { getFirstDayOfMonth, getLastDayOfMonth } from '../lib/utils';

const reportTypes = [
  { value: 'cash_register', label: 'Pénztárgép és bankkártya forgalom' },
  { value: 'cash_revenue', label: 'Készpénz bevételek' },
  { value: 'full_monthly', label: 'Teljes havi forgalom' },
  { value: 'events', label: 'Rendezvény összesítő' },
];

export default function ReportsPage() {
  const { isAdmin, isEvents, unitId } = useAuth();
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  const [reportType, setReportType] = useState('full_monthly');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(unitId || '');

  const filteredReportTypes = reportTypes.filter((type) => {
    if (isEvents && !['events'].includes(type.value)) {
      return false;
    }
    return true;
  });

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
        <div className="grid gap-4 md:grid-cols-4">
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

          <Select
            label="Riport típusa"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={filteredReportTypes}
          />

          {isAdmin && (
            <Select
              label="Egység"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              options={[
                { value: '', label: 'Összes egység' },
              ]}
              placeholder="Összes egység"
            />
          )}
        </div>
      </Card>

      {/* Report content */}
      <MonthlyReport
        startDate={startDate}
        endDate={endDate}
        reportType={reportType}
        unitId={isAdmin ? selectedUnit : unitId}
      />

      {/* Export modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        startDate={startDate}
        endDate={endDate}
        unitId={isAdmin ? selectedUnit : unitId}
      />
    </div>
  );
}
