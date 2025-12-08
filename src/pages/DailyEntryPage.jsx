import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Select } from '../components/common';
import DailyRevenueForm from '../components/daily/DailyRevenueForm';
import HouseCashForm from '../components/daily/HouseCashForm';
import DailyReport from '../components/daily/DailyReport';
import { getToday } from '../lib/utils';
import { CalendarDays, Printer } from 'lucide-react';

const tabs = [
  { id: 'revenue', label: 'Napi forgalom' },
  { id: 'cash', label: 'Házipénztár' },
  { id: 'report', label: 'Napi riport' },
];

export default function DailyEntryPage() {
  const { isAdmin, unitId } = useAuth();
  const [activeTab, setActiveTab] = useState('revenue');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedUnit, setSelectedUnit] = useState(unitId || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Napi adatok</h1>
          <p className="text-gray-500 mt-1">
            Napi forgalom és házipénztár kezelése
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
              onClick={() => window.print()}
              className="no-print"
            >
              <Printer className="h-4 w-4" />
              Nyomtatás
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
            options={[]} // Will be populated by hook
            placeholder="Válassz egységet..."
          />
        </Card>
      )}

      {/* Tab navigation */}
      <div className="border-b border-gray-200 no-print">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
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
        {activeTab === 'revenue' && (
          <DailyRevenueForm
            date={selectedDate}
            unitId={isAdmin ? selectedUnit : unitId}
          />
        )}
        {activeTab === 'cash' && (
          <HouseCashForm
            date={selectedDate}
            unitId={isAdmin ? selectedUnit : unitId}
          />
        )}
        {activeTab === 'report' && (
          <DailyReport
            date={selectedDate}
            unitId={isAdmin ? selectedUnit : unitId}
          />
        )}
      </div>
    </div>
  );
}
