import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button, Input, Select, DatePicker } from '../common';
import { Textarea } from '../common/Input';
import { getToday, formatCurrency } from '../../lib/utils';

const VAT_OPTIONS = [
  { value: '27', label: '27%' },
  { value: '18', label: '18%' },
  { value: '5', label: '5%' },
  { value: '0', label: '0%' },
];

export default function EventRevenueForm({ revenue, eventId, unitId, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    unit_id: unitId || '',
    partner_name: '',
    net_amount: '',
    vat_rate: '27',
    currency: 'HUF',
    payment_method: 'transfer',
    invoice_date: getToday(),
    payment_deadline: '',
    fulfillment_date: '',
    notes: '',
  });

  // Calculate gross amount from net and VAT
  const calculateGross = (net, vatRate) => {
    const netValue = parseFloat(net) || 0;
    const rate = parseFloat(vatRate) || 0;
    return Math.round(netValue * (1 + rate / 100));
  };

  const grossAmount = calculateGross(formData.net_amount, formData.vat_rate);

  useEffect(() => {
    if (revenue) {
      // If we have gross amount but no net, calculate net from gross
      let netAmount = revenue.net_amount;
      if (!netAmount && revenue.amount) {
        const rate = parseFloat(revenue.vat_rate) || 27;
        netAmount = Math.round(parseFloat(revenue.amount) / (1 + rate / 100));
      }

      setFormData({
        unit_id: revenue.unit_id || unitId || '',
        partner_name: revenue.partner_name || '',
        net_amount: netAmount || '',
        vat_rate: String(revenue.vat_rate ?? 27),
        currency: revenue.currency || 'HUF',
        payment_method: revenue.payment_method || 'transfer',
        invoice_date: revenue.invoice_date || getToday(),
        payment_deadline: revenue.payment_deadline || '',
        fulfillment_date: revenue.fulfillment_date || '',
        notes: revenue.notes || '',
      });
    } else {
      setFormData((prev) => ({ ...prev, unit_id: unitId }));
    }
  }, [revenue, unitId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send both net and gross amounts
      const dataToSave = {
        ...formData,
        net_amount: parseFloat(formData.net_amount) || 0,
        vat_rate: parseInt(formData.vat_rate) || 27,
        amount: grossAmount, // Gross amount for total calculations
      };
      await onSuccess(dataToSave);
    } catch (error) {
      console.error('Error saving revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethodOptions = [
    { value: 'card', label: 'Bankkartya' },
    { value: 'transfer', label: 'Atutalas' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Partner neve"
        value={formData.partner_name}
        onChange={(e) => handleChange('partner_name', e.target.value)}
        required
        placeholder="pl. ABC Kft."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Input
          label="Netto osszeg"
          type="number"
          step="1"
          value={formData.net_amount}
          onChange={(e) => handleChange('net_amount', e.target.value)}
          required
        />
        <Select
          label="AFA kulcs"
          value={formData.vat_rate}
          onChange={(e) => handleChange('vat_rate', e.target.value)}
          options={VAT_OPTIONS}
        />
        <Select
          label="Deviza"
          value={formData.currency}
          onChange={(e) => handleChange('currency', e.target.value)}
          options={[
            { value: 'HUF', label: 'HUF' },
            { value: 'EUR', label: 'EUR' },
          ]}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brutto osszeg
          </label>
          <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-md text-green-700 font-semibold">
            {formatCurrency(grossAmount, formData.currency)}
          </div>
        </div>
      </div>

      <Select
        label="Fizetes modja"
        value={formData.payment_method}
        onChange={(e) => handleChange('payment_method', e.target.value)}
        options={paymentMethodOptions}
        required
      />

      <div className="grid gap-4 md:grid-cols-3">
        <DatePicker
          label="Szamla datuma"
          value={formData.invoice_date}
          onChange={(e) => handleChange('invoice_date', e.target.value)}
          required
        />

        <DatePicker
          label="Fizetesi hatarido"
          value={formData.payment_deadline}
          onChange={(e) => handleChange('payment_deadline', e.target.value)}
        />

        <DatePicker
          label="Teljesites datuma"
          value={formData.fulfillment_date}
          onChange={(e) => handleChange('fulfillment_date', e.target.value)}
        />
      </div>

      <Textarea
        label="Megjegyzes"
        value={formData.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        rows={2}
        placeholder="Egyeb megjegyzesek..."
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Megse
        </Button>
        <Button type="submit" loading={loading}>
          <Save className="h-4 w-4" />
          {revenue ? 'Mentes' : 'Rogzites'}
        </Button>
      </div>
    </form>
  );
}
