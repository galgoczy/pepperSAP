import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Users, Banknote, CreditCard, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, Button, Input, LoadingSpinner } from '../common';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

const QUALIFICATION_THRESHOLD = 22000;
const NON_QUALIFICATION_THRESHOLD = 19000;

export default function EfoPayments({ unitId, date }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    employee_name: '',
    total_amount: '',
    requires_qualification: true,
    payment_method: 'cash',
    notes: '',
  });

  const fetchPayments = useCallback(async () => {
    if (!unitId || !date) {
      setPayments([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('efo_payments')
        .select('*')
        .eq('unit_id', unitId)
        .eq('payment_date', date)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching EFO payments:', error);
      toast.error('Hiba az EFO kifizetések betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, date]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const calculateAmounts = (totalAmount, requiresQualification) => {
    const total = parseFloat(totalAmount) || 0;
    const threshold = requiresQualification ? QUALIFICATION_THRESHOLD : NON_QUALIFICATION_THRESHOLD;

    if (total <= threshold) {
      return {
        official_amount: total,
        extra_amount: 0,
      };
    }

    return {
      official_amount: threshold,
      extra_amount: total - threshold,
    };
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      employee_name: '',
      total_amount: '',
      requires_qualification: true,
      payment_method: 'cash',
      notes: '',
    });
    setEditingPayment(null);
    setShowForm(false);
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setFormData({
      employee_name: payment.employee_name,
      total_amount: payment.total_amount.toString(),
      requires_qualification: payment.requires_qualification,
      payment_method: payment.payment_method,
      notes: payment.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a kifizetést?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('efo_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
      toast.success('Kifizetés törölve');
      fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Hiba a kifizetés törlésekor');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employee_name.trim()) {
      toast.error('Add meg a dolgozó nevét!');
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

      const dataToSave = {
        unit_id: unitId,
        payment_date: date,
        employee_name: formData.employee_name.trim(),
        total_amount: totalAmount,
        requires_qualification: formData.requires_qualification,
        official_amount,
        extra_amount,
        payment_method: formData.payment_method,
        notes: formData.notes.trim() || null,
      };

      if (editingPayment) {
        const { error } = await supabase
          .from('efo_payments')
          .update(dataToSave)
          .eq('id', editingPayment.id);

        if (error) throw error;
        toast.success('Kifizetés frissítve');
      } else {
        const { error } = await supabase
          .from('efo_payments')
          .insert([dataToSave]);

        if (error) throw error;
        toast.success('Kifizetés rögzítve');
      }

      resetForm();
      fetchPayments();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Hiba a kifizetés mentésekor');
    } finally {
      setSaving(false);
    }
  };

  // Calculate preview amounts for the form
  const previewAmounts = calculateAmounts(formData.total_amount, formData.requires_qualification);
  const threshold = formData.requires_qualification ? QUALIFICATION_THRESHOLD : NON_QUALIFICATION_THRESHOLD;

  // Calculate totals
  const totals = payments.reduce(
    (acc, p) => ({
      total: acc.total + parseFloat(p.total_amount || 0),
      official: acc.official + parseFloat(p.official_amount || 0),
      extra: acc.extra + parseFloat(p.extra_amount || 0),
    }),
    { total: 0, official: 0, extra: 0 }
  );

  if (loading) {
    return (
      <Card title="EFO kifizetések">
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-600" />
          EFO kifizetések
        </div>
      }
    >
      <div className="space-y-4">
        {/* Summary */}
        {payments.length > 0 && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Összes kifizetés</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.total)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Hivatalos összeg</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(totals.official)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tartalék (extra)</p>
              <p className="text-lg font-semibold text-amber-600">{formatCurrency(totals.extra)}</p>
            </div>
          </div>
        )}

        {/* Payments list */}
        {payments.length > 0 && (
          <div className="divide-y divide-gray-100">
            {payments.map((payment) => (
              <div key={payment.id} className="py-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{payment.employee_name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        payment.requires_qualification
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {payment.requires_qualification ? 'Szakképzett' : 'Nem szakk.'}
                    </span>
                    {payment.payment_method === 'cash' ? (
                      <Banknote className="h-4 w-4 text-green-600" />
                    ) : (
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    Összesen: {formatCurrency(payment.total_amount)} →
                    Hivatalos: <span className="text-green-600">{formatCurrency(payment.official_amount)}</span>
                    {parseFloat(payment.extra_amount) > 0 && (
                      <> + Tartalék: <span className="text-amber-600">{formatCurrency(payment.extra_amount)}</span></>
                    )}
                  </div>
                  {payment.notes && (
                    <p className="text-xs text-gray-400 mt-1">{payment.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(payment)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(payment.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit form */}
        {showForm ? (
          <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-white space-y-4">
            <h4 className="font-medium text-gray-900">
              {editingPayment ? 'Kifizetés szerkesztése' : 'Új kifizetés'}
            </h4>

            <Input
              label="Dolgozó neve"
              value={formData.employee_name}
              onChange={(e) => handleChange('employee_name', e.target.value)}
              required
              placeholder="pl. Kiss János"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Preview calculation */}
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

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                <X className="h-4 w-4" />
                Mégse
              </Button>
              <Button type="submit" loading={saving}>
                <Check className="h-4 w-4" />
                {editingPayment ? 'Mentés' : 'Hozzáadás'}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            Új EFO kifizetés
          </Button>
        )}

        {/* Info */}
        <p className="text-xs text-gray-400">
          EFO kifizetések: a küszöbérték (szakképzett: 22 000 Ft, nem szakképzett: 19 000 Ft)
          feletti összeg automatikusan tartalékba kerül.
        </p>
      </div>
    </Card>
  );
}
