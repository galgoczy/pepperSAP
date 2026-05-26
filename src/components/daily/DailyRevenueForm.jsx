import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Palette, Calculator, AlertCircle, Star, Building, Landmark, Banknote } from 'lucide-react';
import { useDailyRevenue } from '../../hooks/useDailyRevenue';
import { useActiveCashRegisters, useAllCashRegisterRevenue } from '../../hooks/useCashRegisterRevenue';
import { Card, Button, Input, LoadingSpinner } from '../common';
import CashRegisterSection from './CashRegisterSection';
import EfoPayments from './EfoPayments';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

const VAT_RATES = [
  { value: 27, label: '27%' },
  { value: 18, label: '18%' },
  { value: 5, label: '5%' },
  { value: 0, label: '0%' },
];

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
    // VIP fields (info only)
    vip_loading: '',
    vip_revenue: '',
    // Protocol revenue
    protocol_net: '',
    protocol_gross: '',
    protocol_vat_rate: 27,
    // McKinsey revenue (Államkincstár only)
    mckinsey_net: '',
    mckinsey_gross: '',
    mckinsey_vat_rate: 27,
    // Extra cash revenue
    extra_cash_revenue: '',
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

  // Check if this is the Államkincstár unit
  const isAllamkincstar = unitName?.toLowerCase().includes('államkincstár') ||
                          unitName?.toLowerCase().includes('allamkincstar');

  useEffect(() => {
    if (revenue) {
      console.log('Revenue data loaded:', {
        total_revenue: revenue.total_revenue,
        guest_count: revenue.guest_count,
        raw_revenue: revenue
      });
      setFormData({
        total_revenue: revenue.total_revenue || '',
        guest_count: revenue.guest_count || '',
        mark_color: revenue.mark_color || null,
        software_revenue_manual_override: revenue.software_revenue_manual_override || false,
        // VIP fields
        vip_loading: revenue.vip_loading || '',
        vip_revenue: revenue.vip_revenue || '',
        // Protocol revenue
        protocol_net: revenue.protocol_net || '',
        protocol_gross: revenue.protocol_gross || '',
        protocol_vat_rate: revenue.protocol_vat_rate ?? 27,
        // McKinsey revenue
        mckinsey_net: revenue.mckinsey_net || '',
        mckinsey_gross: revenue.mckinsey_gross || '',
        mckinsey_vat_rate: revenue.mckinsey_vat_rate ?? 27,
        // Extra cash revenue
        extra_cash_revenue: revenue.extra_cash_revenue || '',
      });
    } else {
      setFormData({
        total_revenue: '',
        guest_count: '',
        mark_color: null,
        software_revenue_manual_override: false,
        vip_loading: '',
        vip_revenue: '',
        protocol_net: '',
        protocol_gross: '',
        protocol_vat_rate: 27,
        mckinsey_net: '',
        mckinsey_gross: '',
        mckinsey_vat_rate: 27,
        extra_cash_revenue: '',
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

  // Auto-calculate gross from net (or vice versa) for Protocol
  const handleProtocolNetChange = (value) => {
    const net = parseFloat(value) || 0;
    const vatRate = formData.protocol_vat_rate / 100;
    const gross = Math.round(net * (1 + vatRate));
    setFormData((prev) => ({
      ...prev,
      protocol_net: value,
      protocol_gross: gross > 0 ? gross.toString() : '',
    }));
  };

  const handleProtocolGrossChange = (value) => {
    const gross = parseFloat(value) || 0;
    const vatRate = formData.protocol_vat_rate / 100;
    const net = Math.round(gross / (1 + vatRate));
    setFormData((prev) => ({
      ...prev,
      protocol_gross: value,
      protocol_net: net > 0 ? net.toString() : '',
    }));
  };

  const handleProtocolVatChange = (value) => {
    const vatRate = parseFloat(value) / 100;
    const net = parseFloat(formData.protocol_net) || 0;
    const gross = Math.round(net * (1 + vatRate));
    setFormData((prev) => ({
      ...prev,
      protocol_vat_rate: parseFloat(value),
      protocol_gross: gross > 0 ? gross.toString() : '',
    }));
  };

  // Auto-calculate gross from net for McKinsey
  const handleMcKinseyNetChange = (value) => {
    const net = parseFloat(value) || 0;
    const vatRate = formData.mckinsey_vat_rate / 100;
    const gross = Math.round(net * (1 + vatRate));
    setFormData((prev) => ({
      ...prev,
      mckinsey_net: value,
      mckinsey_gross: gross > 0 ? gross.toString() : '',
    }));
  };

  const handleMcKinseyGrossChange = (value) => {
    const gross = parseFloat(value) || 0;
    const vatRate = formData.mckinsey_vat_rate / 100;
    const net = Math.round(gross / (1 + vatRate));
    setFormData((prev) => ({
      ...prev,
      mckinsey_gross: value,
      mckinsey_net: net > 0 ? net.toString() : '',
    }));
  };

  const handleMcKinseyVatChange = (value) => {
    const vatRate = parseFloat(value) / 100;
    const net = parseFloat(formData.mckinsey_net) || 0;
    const gross = Math.round(net * (1 + vatRate));
    setFormData((prev) => ({
      ...prev,
      mckinsey_vat_rate: parseFloat(value),
      mckinsey_gross: gross > 0 ? gross.toString() : '',
    }));
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
            label="Napi fogyasztói létszám"
            type="number"
            step="1"
            min="0"
            value={formData.guest_count}
            onChange={(e) => handleChange('guest_count', e.target.value)}
            suffix="fő"
          />
        </div>
      </Card>

      {/* VIP Section - info only */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            VIP
          </div>
        }
      >
        <p className="text-sm text-gray-500 mb-4">
          VIP adatok - csak tájékoztató jellegű, nem számít bele a forgalomba
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="VIP töltés"
            type="number"
            step="0.01"
            value={formData.vip_loading}
            onChange={(e) => handleChange('vip_loading', e.target.value)}
            suffix="Ft"
          />
          <Input
            label="VIP forgalom"
            type="number"
            step="0.01"
            value={formData.vip_revenue}
            onChange={(e) => handleChange('vip_revenue', e.target.value)}
            suffix="Ft"
          />
        </div>
      </Card>

      {/* Protocol Revenue Section */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-500" />
            Protokoll bevétel
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Nettó összeg"
              type="number"
              step="0.01"
              value={formData.protocol_net}
              onChange={(e) => handleProtocolNetChange(e.target.value)}
              suffix="Ft"
            />
            <Input
              label="Bruttó összeg"
              type="number"
              step="0.01"
              value={formData.protocol_gross}
              onChange={(e) => handleProtocolGrossChange(e.target.value)}
              suffix="Ft"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ÁFA kulcs
              </label>
              <select
                value={formData.protocol_vat_rate}
                onChange={(e) => handleProtocolVatChange(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pepper-red focus:ring-pepper-red"
              >
                {VAT_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* McKinsey Revenue Section - only for Államkincstár */}
      {isAllamkincstar && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-emerald-600" />
              McKinsey bevétel
            </div>
          }
        >
          <p className="text-sm text-gray-500 mb-4">
            Államkincstár specifikus bevétel
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Nettó összeg"
                type="number"
                step="0.01"
                value={formData.mckinsey_net}
                onChange={(e) => handleMcKinseyNetChange(e.target.value)}
                suffix="Ft"
              />
              <Input
                label="Bruttó összeg"
                type="number"
                step="0.01"
                value={formData.mckinsey_gross}
                onChange={(e) => handleMcKinseyGrossChange(e.target.value)}
                suffix="Ft"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ÁFA kulcs
                </label>
                <select
                  value={formData.mckinsey_vat_rate}
                  onChange={(e) => handleMcKinseyVatChange(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pepper-red focus:ring-pepper-red"
                >
                  {VAT_RATES.map((rate) => (
                    <option key={rate.value} value={rate.value}>
                      {rate.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Extra Cash Revenue */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-green-600" />
            Egyéb készpénz bevétel
          </div>
        }
      >
        <Input
          label="Összeg"
          type="number"
          step="0.01"
          value={formData.extra_cash_revenue}
          onChange={(e) => handleChange('extra_cash_revenue', e.target.value)}
          suffix="Ft"
          helper="Egyéb, pénztárgépen kívüli készpénz bevétel"
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

      {/* EFO Payments */}
      <EfoPayments unitId={unitId} date={date} />

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
