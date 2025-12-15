import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Palette, Calculator, AlertCircle } from 'lucide-react';
import { useDailyRevenue } from '../../hooks/useDailyRevenue';
import { useActiveCashRegisters, useAllCashRegisterRevenue } from '../../hooks/useCashRegisterRevenue';
import { Card, Button, Input, LoadingSpinner } from '../common';
import CashRegisterSection from './CashRegisterSection';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

// Color options for marking entries
const MARK_COLORS = [
  { value: null, label: 'Nincs', className: 'bg-gray-100 border-gray-300' },
  { value: 'red', label: 'Piros', className: 'bg-red-500 border-red-600' },
  { value: 'yellow', label: 'Sárga', className: 'bg-yellow-400 border-yellow-500' },
  { value: 'green', label: 'Zöld', className: 'bg-green-500 border-green-600' },
  { value: 'blue', label: 'Kék', className: 'bg-blue-500 border-blue-600' },
  { value: 'purple', label: 'Lila', className: 'bg-purple-500 border-purple-600' },
];

export default function DailyRevenueForm({ date, unitId, unitName }) {
  const { revenue, loading: revenueLoading, saveRevenue } = useDailyRevenue(unitId, date);
  const { cashRegisters, loading: registersLoading } = useActiveCashRegisters(unitId);
  const { revenues: cashRegisterRevenues, saveAllRevenues } = useAllCashRegisterRevenue(revenue?.id);

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    total_revenue: '',
    mark_color: null,
  });
  const [expandedRegisters, setExpandedRegisters] = useState({});
  const cashRegisterDataRef = useRef({});

  // Initialize expanded state for all registers
  useEffect(() => {
    if (cashRegisters.length > 0) {
      const expanded = {};
      cashRegisters.forEach((r, index) => {
        // Expand first register by default, or all if only a few
        expanded[r.id] = index === 0 || cashRegisters.length <= 2;
      });
      setExpandedRegisters(expanded);
    }
  }, [cashRegisters]);

  useEffect(() => {
    if (revenue) {
      setFormData({
        total_revenue: revenue.total_revenue || '',
        mark_color: revenue.mark_color || null,
      });
    } else {
      setFormData({
        total_revenue: '',
        mark_color: null,
      });
    }
  }, [revenue, date]);

  // Build a map of existing cash register revenue data
  const existingDataByRegister = useCallback(() => {
    const map = {};
    cashRegisterRevenues.forEach((r) => {
      map[r.cash_register_id] = r;
    });
    return map;
  }, [cashRegisterRevenues]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCashRegisterChange = (registerId, data) => {
    cashRegisterDataRef.current[registerId] = data;
  };

  const toggleExpand = (registerId) => {
    setExpandedRegisters((prev) => ({
      ...prev,
      [registerId]: !prev[registerId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unitId) return;

    setSaving(true);
    try {
      // First save the main daily revenue
      const savedRevenue = await saveRevenue(formData);

      // Then save all cash register revenues if there are any
      if (cashRegisters.length > 0 && savedRevenue?.id) {
        await saveAllRevenues(cashRegisterDataRef.current);
      }

      toast.success('Napi adatok sikeresen mentve!');
    } catch (error) {
      console.error('Error saving daily revenue:', error);
    } finally {
      setSaving(false);
    }
  };

  // Calculate total from all cash registers
  const totalCashRegisterRevenue = cashRegisters.reduce((sum, register) => {
    const data = cashRegisterDataRef.current[register.id] || existingDataByRegister()[register.id] || {};
    return (
      sum +
      (parseFloat(data.vat_0_percent) || 0) +
      (parseFloat(data.vat_5_percent) || 0) +
      (parseFloat(data.vat_18_percent) || 0) +
      (parseFloat(data.vat_27_percent) || 0) +
      (parseFloat(data.tips) || 0)
    );
  }, 0);

  const loading = revenueLoading || registersLoading;

  if (!unitId) {
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">
          Válassz ki egy egységet a folytatáshoz
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Software revenue */}
      <Card title="Éttermi szoftver forgalom">
        <Input
          label="Teljes forgalom"
          type="number"
          step="0.01"
          value={formData.total_revenue}
          onChange={(e) => handleChange('total_revenue', e.target.value)}
          suffix="Ft"
          required
        />
      </Card>

      {/* Cash registers section */}
      {cashRegisters.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <div className="text-center py-6">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-600">
              Nincsenek aktív pénztárgépek
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Először vegyél fel pénztárgépeket az Egységek menüben
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-pepper-red" />
              Pénztárgépek ({cashRegisters.length})
            </h2>
            <div className="text-right">
              <div className="text-sm text-gray-500">Összes forgalom</div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(totalCashRegisterRevenue)}
              </div>
            </div>
          </div>

          {cashRegisters.map((register) => (
            <CashRegisterSection
              key={register.id}
              register={register}
              existingData={existingDataByRegister()[register.id]}
              onChange={handleCashRegisterChange}
              expanded={expandedRegisters[register.id]}
              onToggleExpand={() => toggleExpand(register.id)}
              unitName={unitName}
              date={date}
            />
          ))}
        </div>
      )}

      {/* Color marking */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-gray-600" />
            Megjelölés színnel
          </div>
        }
      >
        <p className="text-sm text-gray-500 mb-3">
          Jelöld meg ezt a napot egy színnel a könnyebb áttekinthetőség érdekében
        </p>
        <div className="flex flex-wrap gap-3">
          {MARK_COLORS.map((color) => (
            <button
              key={color.value || 'none'}
              type="button"
              onClick={() => handleChange('mark_color', color.value)}
              className={`
                w-12 h-12 rounded-lg border-2 transition-all flex items-center justify-center
                ${color.className}
                ${formData.mark_color === color.value
                  ? 'ring-2 ring-offset-2 ring-pepper-red scale-110'
                  : 'hover:scale-105'
                }
              `}
              title={color.label}
            >
              {formData.mark_color === color.value && (
                <svg className="w-6 h-6 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
        {formData.mark_color && (
          <p className="mt-3 text-sm text-gray-600">
            Kiválasztott szín: <span className="font-medium">{MARK_COLORS.find(c => c.value === formData.mark_color)?.label}</span>
          </p>
        )}
      </Card>

      {/* Submit button */}
      <div className="flex justify-end">
        <Button type="submit" loading={saving} size="lg">
          <Save className="h-4 w-4" />
          {revenue ? 'Frissítés' : 'Mentés'}
        </Button>
      </div>
    </form>
  );
}
