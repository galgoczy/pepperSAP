import { useState, useEffect } from 'react';
import { Save, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import { useUnits } from '../../hooks/useSupabase';
import { Button, Input, Select, DatePicker, ConfirmModal } from '../common';
import { Textarea } from '../common/Input';
import { getToday, formatCurrency } from '../../lib/utils';
import {
  VAT_RATE_OPTIONS,
  VAT_RATE_CUSTOM,
  defaultVatRate,
  vatAmountOf,
} from '../../lib/expenseVat';

const rateLabel = (rate) =>
  rate === VAT_RATE_CUSTOM ? 'Egyedi (ÁFA forintban)' : `${rate}%`;

export default function ExpenseForm({ expense, unitId, onSuccess, onCancel, onDelete }) {
  const { isAdmin, unitId: userUnitId } = useAuth();
  const { units } = useUnits();
  const { createExpense, updateExpense, deleteExpense } = useExpenses();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Ha a kategória váltása miatt magától változott az ÁFA kulcs, azt látványosan
  // kiírjuk – nehogy észrevétlenül rossz kulccsal mentsen valaki.
  const [vatNotice, setVatNotice] = useState(null);
  const [formData, setFormData] = useState({
    unit_id: unitId || userUnitId || '',
    supplier_name: '',
    invoice_number: '',
    amount: '',
    currency: 'HUF',
    item_description: '',
    payment_method: 'cash',
    invoice_date: getToday(),
    payment_deadline: '',
    fulfillment_date: '',
    is_official: true,
    is_employee_invoice: false,
    vat_rate: defaultVatRate({ isOfficial: true, isEmployeeInvoice: false }),
    vat_amount: '',
    notes: '',
  });

  useEffect(() => {
    if (expense) {
      const isOfficial = expense.is_official ?? true;
      const isEmployeeInvoice = expense.is_employee_invoice ?? false;
      setFormData({
        unit_id: expense.unit_id || unitId || userUnitId || '',
        supplier_name: expense.supplier_name || '',
        invoice_number: expense.invoice_number || '',
        amount: expense.amount || '',
        currency: expense.currency || 'HUF',
        item_description: expense.item_description || '',
        payment_method: expense.payment_method || 'cash',
        invoice_date: expense.invoice_date || getToday(),
        payment_deadline: expense.payment_deadline || '',
        fulfillment_date: expense.fulfillment_date || '',
        is_official: isOfficial,
        is_employee_invoice: isEmployeeInvoice,
        // A migráció előtt rögzített számláknál a megállapodás szerinti kulcs:
        // hivatalosnál 27%, nem hivatalosnál 0%.
        vat_rate: expense.vat_rate || defaultVatRate({ isOfficial, isEmployeeInvoice }),
        vat_amount: expense.vat_amount ?? '',
        notes: expense.notes || '',
      });
      setVatNotice(null);
    }
  }, [expense, unitId, userUnitId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // A hivatalos/nem hivatalos váltás átállítja az ÁFA kulcsot az új kategória
  // alapértelmezésére, és erről szólunk is. Dolgozói számlánál a kulcs mindig
  // 27% marad, azt a kategória nem írja felül.
  const handleOfficialChange = (checked) => {
    const nextRate = defaultVatRate({
      isOfficial: checked,
      isEmployeeInvoice: formData.is_employee_invoice,
    });
    if (!formData.is_employee_invoice && formData.vat_rate !== nextRate) {
      setVatNotice({
        from: formData.vat_rate,
        to: nextRate,
        reason: checked ? 'a számla hivatalos lett' : 'a számla nem hivatalos lett',
      });
      setFormData((prev) => ({
        ...prev,
        is_official: checked,
        vat_rate: nextRate,
        vat_amount: '',
      }));
      return;
    }
    setVatNotice(null);
    setFormData((prev) => ({ ...prev, is_official: checked }));
  };

  const handleEmployeeChange = (checked) => {
    const nextRate = defaultVatRate({
      isOfficial: formData.is_official,
      isEmployeeInvoice: checked,
    });
    if (checked && formData.vat_rate !== nextRate) {
      setVatNotice({
        from: formData.vat_rate,
        to: nextRate,
        reason: 'dolgozói számla lett',
      });
      setFormData((prev) => ({
        ...prev,
        is_employee_invoice: checked,
        vat_rate: nextRate,
        vat_amount: '',
      }));
      return;
    }
    setVatNotice(null);
    setFormData((prev) => ({ ...prev, is_employee_invoice: checked }));
  };

  // Kézi választás: ez a felhasználó döntése, a figyelmeztetés eltűnhet.
  const handleVatRateChange = (value) => {
    setVatNotice(null);
    setFormData((prev) => ({
      ...prev,
      vat_rate: value,
      vat_amount: value === VAT_RATE_CUSTOM ? prev.vat_amount : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Az ÁFA összeg csak egyedi kulcsnál értelmes; egyébként NULL-t mentünk,
      // hogy egy korábban beírt érték ne maradjon ott félrevezetően.
      const payload = {
        ...formData,
        vat_amount:
          formData.vat_rate === VAT_RATE_CUSTOM
            ? (formData.vat_amount === '' ? null : formData.vat_amount)
            : null,
      };
      if (expense) {
        await updateExpense(expense.id, payload);
      } else {
        await createExpense(payload);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    setLoading(true);
    try {
      await deleteExpense(expense.id);
      onDelete?.();
      onSuccess?.();
    } catch (error) {
      console.error('Error deleting expense:', error);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // Admins can book a cost on ANY unit — the restaurants, the events unit
  // (Rendezvény) and the central one (Központ) too — so the selector is not
  // limited to type === 'restaurant'. Restaurants are listed first.
  const selectableUnits = [...units].sort((a, b) => {
    const rank = (u) => (u.type === 'restaurant' ? 0 : 1);
    return rank(a) - rank(b) || (a.name || '').localeCompare(b.name || '', 'hu');
  });

  const paymentMethodOptions = [
    { value: 'cash', label: 'Készpénz' },
    { value: 'card', label: 'Bankkártya' },
    { value: 'mol_card', label: 'MOL kártya' },
    { value: 'transfer', label: 'Átutalás' },
    { value: 'clearing', label: 'Elszámoló' },
  ];

  const grossAmount = parseFloat(formData.amount) || 0;
  const vatAmount = vatAmountOf(formData);
  const showVatPreview = grossAmount > 0 || vatAmount > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Unit selector for admin */}
      {isAdmin && (
        <Select
          label="Egység"
          value={formData.unit_id}
          onChange={(e) => handleChange('unit_id', e.target.value)}
          options={selectableUnits.map((u) => ({ value: u.id, label: u.name }))}
          required
        />
      )}

      <Input
        label="Szállító neve"
        value={formData.supplier_name}
        onChange={(e) => handleChange('supplier_name', e.target.value)}
        required
        placeholder="pl. ABC Kft."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Számla sorszám"
          value={formData.invoice_number}
          onChange={(e) => handleChange('invoice_number', e.target.value)}
          placeholder="pl. SZL-2024-001"
        />

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
      </div>

      {/* Kategória és ÁFA – közvetlenül az összeg után, mert ez dönti el, melyik
          pénztárcát terheli a számla és mekkora összeggel. */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="is_official"
              checked={formData.is_official}
              onChange={(e) => handleOfficialChange(e.target.checked)}
              className="h-4 w-4 mt-0.5 text-pepper-red rounded border-gray-300 focus:ring-pepper-red"
            />
            <span className="text-sm text-gray-700">
              Hivatalos kifizetés (számlával)
              <span className="block text-xs text-gray-500">
                Készpénznél a Házipénztárt terheli. Kikapcsolva a Tartalékot.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="is_employee_invoice"
              checked={formData.is_employee_invoice}
              onChange={(e) => handleEmployeeChange(e.target.checked)}
              className="h-4 w-4 mt-0.5 text-pepper-red rounded border-gray-300 focus:ring-pepper-red"
            />
            <span className="text-sm text-gray-700">
              Dolgozói számla
              <span className="block text-xs text-gray-500">
                A teljes összeg a Központ készpénzéből megy, az egység tartalékát csak az ÁFA fele
                terheli.
              </span>
            </span>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="ÁFA kulcs"
            value={formData.vat_rate}
            onChange={(e) => handleVatRateChange(e.target.value)}
            options={VAT_RATE_OPTIONS}
          />
          {formData.vat_rate === VAT_RATE_CUSTOM && (
            <Input
              label="A számla ÁFA tartalma"
              type="number"
              step="0.01"
              value={formData.vat_amount}
              onChange={(e) => handleChange('vat_amount', e.target.value)}
              suffix="Ft"
              required
              placeholder="Írd be a számláról"
            />
          )}
        </div>

        {vatNotice && (
          <div className="rounded-lg border-2 border-amber-500 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold">
                  Az ÁFA kulcs megváltozott: {rateLabel(vatNotice.from)} → {rateLabel(vatNotice.to)}
                </p>
                <p className="mt-1 text-xs">
                  Azért, mert {vatNotice.reason}. Ha nem ez a helyes, állítsd át kézzel az ÁFA kulcsot.
                </p>
              </div>
            </div>
          </div>
        )}

        {showVatPreview && (
          <div className="text-xs text-gray-600">
            {formData.vat_rate === VAT_RATE_CUSTOM ? (
              <>ÁFA tartalom (kézzel megadva): <span className="font-semibold">{formatCurrency(vatAmount, formData.currency)}</span></>
            ) : (
              <>
                ÁFA tartalom a bruttó összegből:{' '}
                <span className="font-semibold">{formatCurrency(vatAmount, formData.currency)}</span>
              </>
            )}
            {formData.is_employee_invoice && (
              <span className="block mt-1 text-gray-800">
                Központ készpénze: <span className="font-semibold">−{formatCurrency(grossAmount, formData.currency)}</span>
                {' · '}
                Egység tartaléka: <span className="font-semibold">−{formatCurrency(vatAmount / 2, formData.currency)}</span>
              </span>
            )}
          </div>
        )}
      </div>

      <Input
        label="Tétel megnevezése"
        value={formData.item_description}
        onChange={(e) => handleChange('item_description', e.target.value)}
        placeholder="pl. Alapanyagok, tisztítószerek"
      />

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

      <Textarea
        label="Megjegyzés"
        value={formData.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        rows={2}
        placeholder="Egyéb megjegyzések..."
      />

      <div className="flex justify-between pt-4">
        {expense ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            Törlés
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Mégse
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="h-4 w-4" />
            {expense ? 'Mentés' : 'Rögzítés'}
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Kifizetés törlése"
        message="Biztosan törölni szeretnéd ezt a kifizetést? Ez a művelet visszavonhatatlan."
        confirmText="Törlés"
        confirmVariant="danger"
      />
    </form>
  );
}
