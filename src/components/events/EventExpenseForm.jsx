import { useState, useEffect } from 'react';
import { Save, FileText, Briefcase, ShoppingBag } from 'lucide-react';
import { Button, Input, Select, DatePicker } from '../common';
import { Textarea } from '../common/Input';
import { getToday, formatCurrency } from '../../lib/utils';

const VAT_OPTIONS = [
  { value: '27', label: '27%' },
  { value: '18', label: '18%' },
  { value: '5', label: '5%' },
  { value: '0', label: '0%' },
];

// Expense types: official (invoice), efo (employment), other (non-official)
const EXPENSE_TYPE_OPTIONS = [
  { value: 'official', label: 'Szamlas', icon: FileText },
  { value: 'efo', label: 'EFO', icon: Briefcase },
  { value: 'other', label: 'Nem szamlas', icon: ShoppingBag },
];

export default function EventExpenseForm({ expense, unitId, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    unit_id: unitId || '',
    supplier_name: '',
    invoice_number: '',
    net_amount: '',
    vat_rate: '27',
    currency: 'HUF',
    item_description: '',
    payment_method: 'transfer',
    invoice_date: getToday(),
    payment_deadline: '',
    fulfillment_date: '',
    expense_type: 'official', // official, efo, other
    notes: '',
  });

  // Calculate gross amount from net and VAT (only for official invoiced expenses)
  const calculateGross = (net, vatRate, expenseType) => {
    const netValue = parseFloat(net) || 0;
    if (expenseType !== 'official') {
      // EFO and non-official expenses don't have VAT
      return netValue;
    }
    const rate = parseFloat(vatRate) || 0;
    return Math.round(netValue * (1 + rate / 100));
  };

  const grossAmount = calculateGross(formData.net_amount, formData.vat_rate, formData.expense_type);
  const showVatOptions = formData.expense_type === 'official';

  useEffect(() => {
    if (expense) {
      // Determine expense type from existing data
      let expenseType = 'official';
      if (expense.is_efo) {
        expenseType = 'efo';
      } else if (expense.is_official === false) {
        expenseType = 'other';
      }

      // If we have gross amount but no net, calculate net from gross
      let netAmount = expense.net_amount;
      if (!netAmount && expense.amount) {
        if (expenseType === 'official') {
          const rate = parseFloat(expense.vat_rate) || 27;
          netAmount = Math.round(parseFloat(expense.amount) / (1 + rate / 100));
        } else {
          netAmount = expense.amount;
        }
      }

      setFormData({
        unit_id: expense.unit_id || unitId || '',
        supplier_name: expense.supplier_name || '',
        invoice_number: expense.invoice_number || '',
        net_amount: netAmount || '',
        vat_rate: String(expense.vat_rate ?? 27),
        currency: expense.currency || 'HUF',
        item_description: expense.item_description || '',
        payment_method: expense.payment_method || 'transfer',
        invoice_date: expense.invoice_date || getToday(),
        payment_deadline: expense.payment_deadline || '',
        fulfillment_date: expense.fulfillment_date || '',
        expense_type: expenseType,
        notes: expense.notes || '',
      });
    } else {
      setFormData((prev) => ({ ...prev, unit_id: unitId }));
    }
  }, [expense, unitId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert expense_type to is_official and is_efo flags
      const isOfficial = formData.expense_type === 'official';
      const isEfo = formData.expense_type === 'efo';

      const dataToSave = {
        ...formData,
        net_amount: parseFloat(formData.net_amount) || 0,
        vat_rate: isOfficial ? parseInt(formData.vat_rate) || 27 : null,
        amount: grossAmount, // Gross amount for total calculations
        is_official: isOfficial,
        is_efo: isEfo,
      };
      delete dataToSave.expense_type; // Don't send this to DB

      await onSuccess(dataToSave);
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethodOptions = [
    { value: 'cash', label: 'Keszpenz' },
    { value: 'card', label: 'Bankkartya' },
    { value: 'mol_card', label: 'MOL kartya' },
    { value: 'transfer', label: 'Atutalas' },
    { value: 'clearing', label: 'Elszamolo' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Expense Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Koltseg tipusa
        </label>
        <div className="flex gap-2">
          {EXPENSE_TYPE_OPTIONS.map((option) => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange('expense_type', option.value)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  formData.expense_type === option.value
                    ? option.value === 'official'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : option.value === 'efo'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-500 bg-gray-50 text-gray-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <IconComponent className="h-5 w-5" />
                <span className="font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {formData.expense_type === 'official' && 'Szamlaval igazolt koltseg - AFA-s netto osszeg'}
          {formData.expense_type === 'efo' && 'Foglalkoztatoi koltseg (EFO) - brutto osszeg'}
          {formData.expense_type === 'other' && 'Szamla nelkuli koltseg - brutto osszeg'}
        </p>
      </div>

      <Input
        label="Szallito neve"
        value={formData.supplier_name}
        onChange={(e) => handleChange('supplier_name', e.target.value)}
        required
        placeholder="pl. Alapanyag Beszallito Kft."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {formData.expense_type === 'official' && (
          <Input
            label="Szamla sorszam"
            value={formData.invoice_number}
            onChange={(e) => handleChange('invoice_number', e.target.value)}
            placeholder="pl. SZL-2024-001"
          />
        )}

        <div className={`grid gap-2 ${showVatOptions ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <Input
            label={showVatOptions ? 'Netto osszeg' : 'Osszeg'}
            type="number"
            step="1"
            value={formData.net_amount}
            onChange={(e) => handleChange('net_amount', e.target.value)}
            required
          />
          {showVatOptions && (
            <Select
              label="AFA kulcs"
              value={formData.vat_rate}
              onChange={(e) => handleChange('vat_rate', e.target.value)}
              options={VAT_OPTIONS}
            />
          )}
          <Select
            label="Deviza"
            value={formData.currency}
            onChange={(e) => handleChange('currency', e.target.value)}
            options={[
              { value: 'HUF', label: 'HUF' },
              { value: 'EUR', label: 'EUR' },
            ]}
          />
          {showVatOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brutto
              </label>
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-red-700 font-semibold text-sm">
                {formatCurrency(grossAmount, formData.currency)}
              </div>
            </div>
          )}
        </div>
      </div>

      <Input
        label="Tetel megnevezese"
        value={formData.item_description}
        onChange={(e) => handleChange('item_description', e.target.value)}
        placeholder="pl. Alapanyagok, dekoracio"
      />

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
          {expense ? 'Mentes' : 'Rogzites'}
        </Button>
      </div>
    </form>
  );
}
