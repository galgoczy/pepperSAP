import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button, Input, Select, DatePicker } from '../common';
import { Textarea } from '../common/Input';
import { getToday } from '../../lib/utils';

export default function EventRevenueForm({ revenue, eventId, unitId, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    unit_id: unitId || '',
    partner_name: '',
    amount: '',
    currency: 'HUF',
    payment_method: 'transfer',
    invoice_date: getToday(),
    payment_deadline: '',
    fulfillment_date: '',
    notes: '',
  });

  useEffect(() => {
    if (revenue) {
      setFormData({
        unit_id: revenue.unit_id || unitId || '',
        partner_name: revenue.partner_name || '',
        amount: revenue.amount || '',
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
      await onSuccess(formData);
    } catch (error) {
      console.error('Error saving revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethodOptions = [
    { value: 'card', label: 'Bankkártya' },
    { value: 'transfer', label: 'Átutalás' },
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Összeg"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            required
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
        </div>

        <Select
          label="Fizetés módja"
          value={formData.payment_method}
          onChange={(e) => handleChange('payment_method', e.target.value)}
          options={paymentMethodOptions}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DatePicker
          label="Számla dátuma"
          value={formData.invoice_date}
          onChange={(e) => handleChange('invoice_date', e.target.value)}
          required
        />

        <DatePicker
          label="Fizetési határidő"
          value={formData.payment_deadline}
          onChange={(e) => handleChange('payment_deadline', e.target.value)}
        />

        <DatePicker
          label="Teljesítés dátuma"
          value={formData.fulfillment_date}
          onChange={(e) => handleChange('fulfillment_date', e.target.value)}
        />
      </div>

      <Textarea
        label="Megjegyzés"
        value={formData.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        rows={2}
        placeholder="Egyéb megjegyzések..."
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Mégse
        </Button>
        <Button type="submit" loading={loading}>
          <Save className="h-4 w-4" />
          {revenue ? 'Mentés' : 'Rögzítés'}
        </Button>
      </div>
    </form>
  );
}
