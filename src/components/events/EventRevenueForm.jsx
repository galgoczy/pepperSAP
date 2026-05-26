import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button, Input, Select, DatePicker } from '../common';
import { Textarea } from '../common/Input';
import { getToday, formatCurrency } from '../../lib/utils';

const VAT_OPTIONS = [
  { value: '27', label: '27%' },
  { value: '18', label: '18%' },
  { value: '5', label: '5%' },
  { value: '0', label: '0%' },
];

const CURRENCY_OPTIONS = [
  { value: 'HUF', label: 'HUF' },
  { value: 'EUR', label: 'EUR' },
];

const emptyLineItem = {
  description: '',
  vat_rate: '27',
  currency: 'HUF',
  gross_amount: '',
};

export default function EventRevenueForm({ revenue, unitId, onSuccess, onCancel }) {
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

  const [lineItems, setLineItems] = useState([{ ...emptyLineItem }]);

  // Calculate gross amount from net and VAT
  const calculateGross = (net, vatRate) => {
    const netValue = parseFloat(net) || 0;
    const rate = parseFloat(vatRate) || 0;
    return Math.round(netValue * (1 + rate / 100));
  };

  const grossAmount = calculateGross(formData.net_amount, formData.vat_rate);

  // Calculate sum of line items
  const lineItemsTotal = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.gross_amount) || 0);
  }, 0);

  // Check if there's a mismatch between gross and line items total
  const hasLineItemsMismatch = lineItems.some(item => item.gross_amount) &&
    lineItemsTotal !== grossAmount && grossAmount > 0;

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

      // Load existing line items or create empty one
      if (revenue.line_items && Array.isArray(revenue.line_items) && revenue.line_items.length > 0) {
        setLineItems(revenue.line_items);
      } else {
        setLineItems([{ ...emptyLineItem }]);
      }
    } else {
      setFormData((prev) => ({ ...prev, unit_id: unitId }));
      setLineItems([{ ...emptyLineItem }]);
    }
  }, [revenue, unitId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLineItemChange = (index, field, value) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { ...emptyLineItem }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter out empty line items
      const validLineItems = lineItems.filter(item =>
        item.description || item.gross_amount
      );

      // Send both net and gross amounts
      const dataToSave = {
        ...formData,
        net_amount: parseFloat(formData.net_amount) || 0,
        vat_rate: parseInt(formData.vat_rate) || 27,
        amount: grossAmount, // Gross amount for total calculations
        line_items: validLineItems.length > 0 ? validLineItems : null,
      };
      await onSuccess(dataToSave);
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

      <div className="grid gap-4 md:grid-cols-4">
        <Input
          label="Nettó összeg"
          type="number"
          step="1"
          value={formData.net_amount}
          onChange={(e) => handleChange('net_amount', e.target.value)}
          required
        />
        <Select
          label="ÁFA kulcs"
          value={formData.vat_rate}
          onChange={(e) => handleChange('vat_rate', e.target.value)}
          options={VAT_OPTIONS}
        />
        <Select
          label="Deviza"
          value={formData.currency}
          onChange={(e) => handleChange('currency', e.target.value)}
          options={CURRENCY_OPTIONS}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bruttó összeg
          </label>
          <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-md text-green-700 font-semibold">
            {formatCurrency(grossAmount, formData.currency)}
          </div>
        </div>
      </div>

      <Select
        label="Fizetés módja"
        value={formData.payment_method}
        onChange={(e) => handleChange('payment_method', e.target.value)}
        options={paymentMethodOptions}
        required
      />

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

      {/* Line Items Section */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Tételek bontása</h4>
          <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
            <Plus className="h-3 w-3" />
            Új tétel
          </Button>
        </div>

        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <div key={index} className="grid gap-2 grid-cols-12 items-end">
              <div className="col-span-5">
                {index === 0 && (
                  <label className="block text-xs text-gray-500 mb-1">Tétel megnevezése</label>
                )}
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                  placeholder="pl. Étel, Ital, Személyzet..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pepper-red focus:border-pepper-red"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && (
                  <label className="block text-xs text-gray-500 mb-1">ÁFA</label>
                )}
                <select
                  value={item.vat_rate}
                  onChange={(e) => handleLineItemChange(index, 'vat_rate', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pepper-red focus:border-pepper-red"
                >
                  {VAT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                {index === 0 && (
                  <label className="block text-xs text-gray-500 mb-1">Deviza</label>
                )}
                <select
                  value={item.currency}
                  onChange={(e) => handleLineItemChange(index, 'currency', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pepper-red focus:border-pepper-red"
                >
                  {CURRENCY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                {index === 0 && (
                  <label className="block text-xs text-gray-500 mb-1">Bruttó</label>
                )}
                <input
                  type="number"
                  step="1"
                  value={item.gross_amount}
                  onChange={(e) => handleLineItemChange(index, 'gross_amount', e.target.value)}
                  placeholder="0"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pepper-red focus:border-pepper-red"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Line items total */}
        {lineItems.some(item => item.gross_amount) && (
          <div className={`flex items-center justify-between pt-2 border-t ${hasLineItemsMismatch ? 'border-red-200' : 'border-gray-200'}`}>
            <span className="text-sm text-gray-600">Tételek összesen:</span>
            <div className="flex items-center gap-2">
              {hasLineItemsMismatch && (
                <div className="flex items-center gap-1 text-red-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">Eltérés!</span>
                </div>
              )}
              <span className={`font-semibold ${hasLineItemsMismatch ? 'text-red-600' : 'text-gray-900'}`}>
                {formatCurrency(lineItemsTotal, formData.currency)}
              </span>
            </div>
          </div>
        )}

        {hasLineItemsMismatch && (
          <p className="text-xs text-red-500">
            A tételek összege ({formatCurrency(lineItemsTotal)}) nem egyezik a bruttó összeggel ({formatCurrency(grossAmount)})
          </p>
        )}
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
