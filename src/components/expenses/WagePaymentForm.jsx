import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useUnits } from '../../hooks/useSupabase';
import { Button, Input, Select, Textarea } from '../common';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function WagePaymentForm({ onSuccess, onCancel, unitId: propUnitId }) {
  const { isAdmin, unitId: authUnitId } = useAuth();
  const { units } = useUnits();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    unit_id: propUnitId || authUnitId || '',
    payment_date: new Date().toISOString().split('T')[0],
    worker_name: '',
    official_amount: '',
    extra_amount: '',
    notes: '',
  });

  useEffect(() => {
    if (!formData.unit_id && (propUnitId || authUnitId)) {
      setFormData(prev => ({ ...prev, unit_id: propUnitId || authUnitId }));
    }
  }, [propUnitId, authUnitId, formData.unit_id]);

  const unitOptions = units
    .filter(u => u.type === 'restaurant')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(u => ({ value: u.id, label: u.name }));

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const totalAmount = (parseFloat(formData.official_amount) || 0) + (parseFloat(formData.extra_amount) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.worker_name.trim()) {
      toast.error('Add meg a dolgozó nevét!');
      return;
    }

    if (!formData.unit_id) {
      toast.error('Válassz egységet!');
      return;
    }

    const officialAmount = parseFloat(formData.official_amount) || 0;
    const extraAmount = parseFloat(formData.extra_amount) || 0;
    const total = officialAmount + extraAmount;

    if (total <= 0) {
      toast.error('Az összeg nem lehet 0!');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('wage_payments')
        .insert([{
          unit_id: formData.unit_id,
          payment_date: formData.payment_date,
          worker_name: formData.worker_name.trim(),
          official_amount: officialAmount,
          extra_amount: extraAmount,
          total_amount: total,
          notes: formData.notes.trim() || null,
        }]);

      if (error) throw error;
      toast.success('Heti bér rögzítve');
      onSuccess?.();
    } catch (error) {
      console.error('Error saving wage payment:', error);
      toast.error('Hiba a mentéskor');
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
        value={formData.worker_name}
        onChange={(e) => handleChange('worker_name', e.target.value)}
        placeholder="pl. Kiss János"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Hivatalos összeg"
          type="number"
          step="1"
          min="0"
          value={formData.official_amount}
          onChange={(e) => handleChange('official_amount', e.target.value)}
          suffix="Ft"
        />

        <Input
          label="Extra összeg"
          type="number"
          step="1"
          min="0"
          value={formData.extra_amount}
          onChange={(e) => handleChange('extra_amount', e.target.value)}
          suffix="Ft"
        />
      </div>

      {totalAmount > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Összes kifizetés:</span>
            <span className="font-semibold text-lg">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      )}

      <Textarea
        label="Megjegyzés (opcionális)"
        value={formData.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        rows={2}
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Mégse
        </Button>
        <Button type="submit" loading={saving}>
          Mentés
        </Button>
      </div>
    </form>
  );
}
