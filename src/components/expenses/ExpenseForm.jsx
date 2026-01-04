import { useState, useEffect } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import { useUnits } from '../../hooks/useSupabase';
import { Button, Input, Select, DatePicker, ConfirmModal } from '../common';
import { Textarea } from '../common/Input';
import { getToday } from '../../lib/utils';

export default function ExpenseForm({ expense, unitId, onSuccess, onCancel, onDelete }) {
  const { isAdmin, unitId: userUnitId } = useAuth();
  const { units } = useUnits();
  const { createExpense, updateExpense, deleteExpense } = useExpenses();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    notes: '',
  });

  useEffect(() => {
    if (expense) {
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
        is_official: expense.is_official ?? true,
        notes: expense.notes || '',
      });
    }
  }, [expense, unitId, userUnitId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (expense) {
        await updateExpense(expense.id, formData);
      } else {
        await createExpense(formData);
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

  const restaurantUnits = units.filter((u) => u.type === 'restaurant');

  const paymentMethodOptions = [
    { value: 'cash', label: 'Készpénz' },
    { value: 'card', label: 'Bankkártya' },
    { value: 'mol_card', label: 'MOL kártya' },
    { value: 'transfer', label: 'Átutalás' },
    { value: 'clearing', label: 'Elszámoló' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Unit selector for admin */}
      {isAdmin && (
        <Select
          label="Egység"
          value={formData.unit_id}
          onChange={(e) => handleChange('unit_id', e.target.value)}
          options={restaurantUnits.map((u) => ({ value: u.id, label: u.name }))}
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

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_official"
          checked={formData.is_official}
          onChange={(e) => handleChange('is_official', e.target.checked)}
          className="h-4 w-4 text-pepper-red rounded border-gray-300 focus:ring-pepper-red"
        />
        <label htmlFor="is_official" className="text-sm text-gray-700">
          Hivatalos kifizetés (számlával)
        </label>
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
