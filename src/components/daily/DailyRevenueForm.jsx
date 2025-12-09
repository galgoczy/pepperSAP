import { useState, useEffect } from 'react';
import { Save, AlertTriangle, Palette } from 'lucide-react';
import { useDailyRevenue } from '../../hooks/useDailyRevenue';
import { Card, Button, Input, Select, LoadingSpinner } from '../common';
import { Textarea } from '../common/Input';
import { formatCurrency } from '../../lib/utils';
import { validateCardPayments, validateSzepPayments } from '../../lib/validations';

// Color options for marking entries
const MARK_COLORS = [
  { value: null, label: 'Nincs', className: 'bg-gray-100 border-gray-300' },
  { value: 'red', label: 'Piros', className: 'bg-red-500 border-red-600' },
  { value: 'yellow', label: 'Sárga', className: 'bg-yellow-400 border-yellow-500' },
  { value: 'green', label: 'Zöld', className: 'bg-green-500 border-green-600' },
  { value: 'blue', label: 'Kék', className: 'bg-blue-500 border-blue-600' },
  { value: 'purple', label: 'Lila', className: 'bg-purple-500 border-purple-600' },
];

export default function DailyRevenueForm({ date, unitId }) {
  const { revenue, loading, saveRevenue } = useDailyRevenue(unitId, date);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    total_revenue: '',
    vat_0_percent: '',
    vat_5_percent: '',
    vat_18_percent: '',
    vat_27_percent: '',
    tips: '',
    discrepancy_amount: '',
    discrepancy_currency: 'HUF',
    discrepancy_note: '',
    cash_payment: '',
    card_payment: '',
    szep_card_payment: '',
    terminal_card: '',
    terminal_szep: '',
    terminal_discrepancy_note: '',
    mark_color: null,
  });

  useEffect(() => {
    if (revenue) {
      setFormData({
        total_revenue: revenue.total_revenue || '',
        vat_0_percent: revenue.vat_0_percent || '',
        vat_5_percent: revenue.vat_5_percent || '',
        vat_18_percent: revenue.vat_18_percent || '',
        vat_27_percent: revenue.vat_27_percent || '',
        tips: revenue.tips || '',
        discrepancy_amount: revenue.discrepancy_amount || '',
        discrepancy_currency: revenue.discrepancy_currency || 'HUF',
        discrepancy_note: revenue.discrepancy_note || '',
        cash_payment: revenue.cash_payment || '',
        card_payment: revenue.card_payment || '',
        szep_card_payment: revenue.szep_card_payment || '',
        terminal_card: revenue.terminal_card || '',
        terminal_szep: revenue.terminal_szep || '',
        terminal_discrepancy_note: revenue.terminal_discrepancy_note || '',
        mark_color: revenue.mark_color || null,
      });
    } else {
      // Reset form for new date
      setFormData({
        total_revenue: '',
        vat_0_percent: '',
        vat_5_percent: '',
        vat_18_percent: '',
        vat_27_percent: '',
        tips: '',
        discrepancy_amount: '',
        discrepancy_currency: 'HUF',
        discrepancy_note: '',
        cash_payment: '',
        card_payment: '',
        szep_card_payment: '',
        terminal_card: '',
        terminal_szep: '',
        terminal_discrepancy_note: '',
        mark_color: null,
      });
    }
  }, [revenue, date]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unitId) return;

    setSaving(true);
    try {
      await saveRevenue(formData);
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const cashRegisterTotal =
    (parseFloat(formData.vat_0_percent) || 0) +
    (parseFloat(formData.vat_5_percent) || 0) +
    (parseFloat(formData.vat_18_percent) || 0) +
    (parseFloat(formData.vat_27_percent) || 0) +
    (parseFloat(formData.tips) || 0);

  // Validate card payments
  const cardValidation = validateCardPayments(
    parseFloat(formData.card_payment) || 0,
    parseFloat(formData.terminal_card) || 0
  );

  const szepValidation = validateSzepPayments(
    parseFloat(formData.szep_card_payment) || 0,
    parseFloat(formData.terminal_szep) || 0
  );

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

      {/* Cash register by VAT */}
      <Card title="Pénztárgép forgalom ÁFA szerint">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="0% ÁFA"
            type="number"
            step="0.01"
            value={formData.vat_0_percent}
            onChange={(e) => handleChange('vat_0_percent', e.target.value)}
            suffix="Ft"
          />
          <Input
            label="5% ÁFA"
            type="number"
            step="0.01"
            value={formData.vat_5_percent}
            onChange={(e) => handleChange('vat_5_percent', e.target.value)}
            suffix="Ft"
          />
          <Input
            label="18% ÁFA"
            type="number"
            step="0.01"
            value={formData.vat_18_percent}
            onChange={(e) => handleChange('vat_18_percent', e.target.value)}
            suffix="Ft"
          />
          <Input
            label="27% ÁFA"
            type="number"
            step="0.01"
            value={formData.vat_27_percent}
            onChange={(e) => handleChange('vat_27_percent', e.target.value)}
            suffix="Ft"
          />
          <Input
            label="Borravaló"
            type="number"
            step="0.01"
            value={formData.tips}
            onChange={(e) => handleChange('tips', e.target.value)}
            suffix="Ft"
          />
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">
              Pénztárgép összesen:
            </span>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(cashRegisterTotal)}
            </span>
          </div>
        </div>
      </Card>

      {/* Discrepancy */}
      <Card title="Elütés">
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Összeg"
            type="number"
            step="0.01"
            value={formData.discrepancy_amount}
            onChange={(e) => handleChange('discrepancy_amount', e.target.value)}
          />
          <Select
            label="Deviza"
            value={formData.discrepancy_currency}
            onChange={(e) => handleChange('discrepancy_currency', e.target.value)}
            options={[
              { value: 'HUF', label: 'HUF' },
              { value: 'EUR', label: 'EUR' },
            ]}
          />
          <div className="md:col-span-3">
            <Textarea
              label="Indoklás"
              value={formData.discrepancy_note}
              onChange={(e) => handleChange('discrepancy_note', e.target.value)}
              rows={2}
              placeholder="Elütés indoklása..."
            />
          </div>
        </div>
      </Card>

      {/* Payment methods */}
      <Card title="Fizetési módok (Pénztárgép)">
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Készpénz"
            type="number"
            step="0.01"
            value={formData.cash_payment}
            onChange={(e) => handleChange('cash_payment', e.target.value)}
            suffix="Ft"
          />
          <Input
            label="Bankkártya"
            type="number"
            step="0.01"
            value={formData.card_payment}
            onChange={(e) => handleChange('card_payment', e.target.value)}
            suffix="Ft"
            error={!cardValidation.isValid ? `Eltérés: ${formatCurrency(cardValidation.difference)}` : null}
          />
          <Input
            label="SZÉP kártya"
            type="number"
            step="0.01"
            value={formData.szep_card_payment}
            onChange={(e) => handleChange('szep_card_payment', e.target.value)}
            suffix="Ft"
            error={!szepValidation.isValid ? `Eltérés: ${formatCurrency(szepValidation.difference)}` : null}
          />
        </div>
      </Card>

      {/* Terminal data */}
      <Card title="Bankkártya terminál forgalom">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Bankkártya (terminál)"
            type="number"
            step="0.01"
            value={formData.terminal_card}
            onChange={(e) => handleChange('terminal_card', e.target.value)}
            suffix="Ft"
            className={!cardValidation.isValid ? 'ring-2 ring-red-500' : ''}
          />
          <Input
            label="SZÉP kártya (terminál)"
            type="number"
            step="0.01"
            value={formData.terminal_szep}
            onChange={(e) => handleChange('terminal_szep', e.target.value)}
            suffix="Ft"
            className={!szepValidation.isValid ? 'ring-2 ring-red-500' : ''}
          />
        </div>

        {/* Discrepancy warning */}
        {(!cardValidation.isValid || !szepValidation.isValid) && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">
                  Eltérés a pénztárgép és terminál között!
                </h4>
                <ul className="text-sm text-red-700 mt-1 space-y-1">
                  {!cardValidation.isValid && (
                    <li>
                      Bankkártya eltérés: {formatCurrency(cardValidation.difference)}
                    </li>
                  )}
                  {!szepValidation.isValid && (
                    <li>
                      SZÉP kártya eltérés: {formatCurrency(szepValidation.difference)}
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <Textarea
              label="Eltérés indoklása"
              value={formData.terminal_discrepancy_note}
              onChange={(e) => handleChange('terminal_discrepancy_note', e.target.value)}
              rows={2}
              placeholder="Kérjük, indokolja az eltérést..."
              className="mt-3"
              required={!cardValidation.isValid || !szepValidation.isValid}
            />
          </div>
        )}
      </Card>

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
