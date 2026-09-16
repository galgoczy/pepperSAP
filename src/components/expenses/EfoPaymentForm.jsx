import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useUnits } from '../../hooks/useSupabase';
import { Button, Input, Select, ConfirmModal } from '../common';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

const QUALIFICATION_THRESHOLD = 22000;
const NON_QUALIFICATION_THRESHOLD = 19000;

export default function EfoPaymentForm({ onSuccess, onCancel, onDelete, unitId: propUnitId, defaultDate, payment }) {
  const { isAdmin, unitId: authUnitId } = useAuth();
  const { units } = useUnits();
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState(() => ({
    unit_id: payment?.unit_id || propUnitId || authUnitId || '',
    payment_date: payment?.payment_date || defaultDate || new Date().toISOString().split('T')[0],
    employee_name: payment?.employee_name || '',
    total_amount: payment?.total_amount != null ? String(payment.total_amount) : '',
    requires_qualification: payment?.requires_qualification ?? true,
    payment_method: payment?.payment_method || 'cash',
    notes: payment?.notes || '',
  }));

  useEffect(() => {
    // Only sync defaults when creating a new record (no existing payment).
    if (payment) return;
    if (!formData.unit_id && (propUnitId || authUnitId)) {
      setFormData(prev => ({ ...prev, unit_id: propUnitId || authUnitId }));
    }
    if (defaultDate && formData.payment_date !== defaultDate) {
      setFormData(prev => ({ ...prev, payment_date: defaultDate }));
    }
  }, [payment, propUnitId, authUnitId, formData.unit_id, defaultDate, formData.payment_date]);

  const unitOptions = units
    .filter(u => u.type === 'restaurant')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(u => ({ value: u.id, label: u.name }));

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateAmounts = (totalAmount, requiresQualification) => {
    const total = parseFloat(totalAmount) || 0;
    const threshold = requiresQualification ? QUALIFICATION_THRESHOLD : NON_QUALIFICATION_THRESHOLD;

    if (total <= threshold) {
      return { official_amount: total, extra_amount: 0 };
    }

    return {
      official_amount: threshold,
      extra_amount: total - threshold,
    };
  };

  const threshold = formData.requires_qualification ? QUALIFICATION_THRESHOLD : NON_QUALIFICATION_THRESHOLD;
  const previewAmounts = calculateAmounts(formData.total_amount, formData.requires_qualification);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employee_name.trim()) {
      toast.error('Add meg a dolgozó nevét!');
      return;
    }

    if (!formData.unit_id) {
      toast.error('Válassz egységet!');
      return;
    }

    const totalAmount = parseFloat(formData.total_amount);
    if (!totalAmount || totalAmount <= 0) {
      toast.error('Add meg az összeg értékét!');
      return;
    }

    setSaving(true);
    try {
      const { official_amount, extra_amount } = calculateAmounts(
        formData.total_amount,
        formData.requires_qualification
      );

      const record = {
        unit_id: formData.unit_id,
        payment_date: formData.payment_date,
        employee_name: formData.employee_name.trim(),
        total_amount: totalAmount,
        requires_qualification: formData.requires_qualification,
        official_amount,
        extra_amount,
        payment_method: formData.payment_method,
        notes: formData.notes.trim() || null,
      };

      if (payment) {
        const { error } = await supabase
          .from('efo_payments')
          .update(record)
          .eq('id', payment.id);
        if (error) throw error;
        toast.success('EFO kifizetés módosítva');
      } else {
        const { error } = await supabase
          .from('efo_payments')
          .insert([record]);
        if (error) throw error;
        toast.success('EFO kifizetés rögzítve');
      }
      onSuccess?.();
    } catch (error) {
      console.error('Error saving EFO payment:', error);
      toast.error('Hiba a mentéskor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!payment) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('efo_payments')
        .delete()
        .eq('id', payment.id);
      if (error) throw error;
      toast.success('EFO kifizetés törölve');
      onDelete?.();
      onSuccess?.();
    } catch (error) {
      console.error('Error deleting EFO payment:', error);
      toast.error('Hiba a törléskor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isAdmin && (
        <Select
          label="Egység"
          value={formData.unit_id}
          onChange={(e) => handleChange('unit_id', e.target.value)}
          options={[{ value: '', label: 'Válassz egységet...' }, ...unitOptions]}
          required
        />
      )}

      <Input
        label="Dátum"
        type="date"
        value={formData.payment_date}
        onChange={(e) => handleChange('payment_date', e.target.value)}
        required
      />

      <Input
        label="Dolgozó neve"
        value={formData.employee_name}
        onChange={(e) => handleChange('employee_name', e.target.value)}
        placeholder="pl. Kiss János"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Teljes összeg"
          type="number"
          step="1"
          value={formData.total_amount}
          onChange={(e) => handleChange('total_amount', e.target.value)}
          required
          suffix="Ft"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fizetési mód
          </label>
          <select
            value={formData.payment_method}
            onChange={(e) => handleChange('payment_method', e.target.value)}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pepper-red focus:ring-pepper-red"
          >
            <option value="cash">Készpénz</option>
            <option value="transfer">Átutalás</option>
          </select>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.requires_qualification}
            onChange={(e) => handleChange('requires_qualification', e.target.checked)}
            className="rounded border-gray-300 text-pepper-red focus:ring-pepper-red h-5 w-5"
          />
          <div>
            <span className="font-medium text-gray-900">Szakképesítést igénylő munkakör</span>
            <p className="text-sm text-gray-500">
              Küszöb: {formData.requires_qualification ? '22 000' : '19 000'} Ft
            </p>
          </div>
        </label>
      </div>

      {parseFloat(formData.total_amount) > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Számított felosztás:</p>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-500">Hivatalos: </span>
              <span className="font-medium text-green-600">
                {formatCurrency(previewAmounts.official_amount)}
              </span>
            </div>
            {previewAmounts.extra_amount > 0 && (
              <div>
                <span className="text-gray-500">Tartalék: </span>
                <span className="font-medium text-amber-600">
                  {formatCurrency(previewAmounts.extra_amount)}
                </span>
              </div>
            )}
          </div>
          {parseFloat(formData.total_amount) > threshold && (
            <p className="text-xs text-amber-600 mt-1">
              A {formatCurrency(threshold)} feletti összeg tartalékba kerül
            </p>
          )}
        </div>
      )}

      <Input
        label="Megjegyzés (opcionális)"
        value={formData.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        placeholder="pl. túlóra, bónusz, stb."
      />

      <div className="flex justify-between gap-2 pt-4">
        {payment ? (
          <Button type="button" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4" />
            Törlés
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Mégse
          </Button>
          <Button type="submit" loading={saving}>
            {payment ? 'Mentés' : 'Rögzítés'}
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="EFO kifizetés törlése"
        message="Biztosan törölni szeretnéd ezt az EFO kifizetést? Ez a művelet visszavonhatatlan."
        confirmText="Törlés"
        confirmVariant="danger"
      />
    </form>
  );
}
