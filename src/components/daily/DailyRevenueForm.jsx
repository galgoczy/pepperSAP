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
    guest_count: '',
    mark_color: null,
    software_revenue_manual_override: false,
  });
  const [expandedRegisters, setExpandedRegisters] = useState({});
  const cashRegisterDataRef = useRef({});
  const [perRegisterSoftwareSum, setPerRegisterSoftwareSum] = useState(0);

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
        guest_count: revenue.guest_count || '',
        mark_color: revenue.mark_color || null,
        software_revenue_manual_override: revenue.software_revenue_manual_override || false,
      });
    } else {
      setFormData({
        total_revenue: '',
        guest_count: '',
        mark_color: null,
        software_revenue_manual_override: false,
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

  // Initialize perRegisterSoftwareSum from existing data
  useEffect(() => {
    const sum = cashRegisterRevenues.reduce(
      (total, r) => total + (parseFloat(r.software_revenue) || 0),
      0
    );
    setPerRegisterSoftwareSum(sum);
  }, [cashRegisterRevenues]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCashRegisterChange = (registerId, data) => {
    cashRegisterDataRef.current[registerId] = data;

    // Calculate sum of per-register software revenues
    const sum = Object.values(cashRegisterDataRef.current).reduce(
      (total, regData) => total + (parseFloat(regData?.software_revenue) || 0),
      0
    );
    setPerRegisterSoftwareSum(sum);

    // Auto-update total if not in manual override mode and there's a sum
    if (!formData.software_revenue_manual_override && sum > 0) {
      setFormData(prev => ({ ...prev, total_revenue: sum.toString() }));
    }
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
      // Pass the savedRevenue.id to handle new entries where revenue?.id was null
      if (cashRegisters.length > 0 && savedRevenue?.id) {
        await saveAllRevenues(cashRegisterDataRef.current, savedRevenue.id);
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
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Teljes forgalom
              </label>
              {perRegisterSoftwareSum > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.software_revenue_manual_override}
                    onChange={(e) => {
                      const isManual = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        software_revenue_manual_override: isManual,
                        // If switching to auto mode, use the sum
                        total_revenue: isManual ? prev.total_revenue : perRegisterSoftwareSum.toString(),
                      }));
                    }}
                    className="h-4 w-4 text-pepper-red rounded border-gray-300 focus:ring-pepper-red"
                  />
                  Kézi megadás
                </label>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              value={formData.total_revenue}
              onChange={(e) => {
                handleChange('total_revenue', e.target.value);
                // If user manually edits and there's a sum, switch to manual mode
                if (perRegisterSoftwareSum > 0) {
                  handleChange('software_revenue_manual_override', true);
                }
              }}
              suffix="Ft"
              required
            />
            {perRegisterSoftwareSum > 0 && !formData.software_revenue_manual_override && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Automatikusan összegezve a pénztárgépekből
              </p>
            )}
            {perRegisterSoftwareSum > 0 && formData.software_revenue_manual_override && (
              <p className="text-xs text-gray-500 mt-1">
                Pénztárgépek összege: {formatCurrency(perRegisterSoftwareSum)}
              </p>
            )}
          </div>
          <Input
            label="Fogyasztói létszám"
            type="number"
            step="1"
            min="0"
            value={formData.guest_count}
            onChange={(e) => handleChange('guest_count', e.target.value)}
            suffix="fő"
          />
        </div>
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
