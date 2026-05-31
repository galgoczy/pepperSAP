import { useState, useEffect, useCallback } from 'react';
import { Edit3, Check, X, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input, Textarea, Modal } from '../common';
import { formatCurrency } from '../../lib/utils';
import { approveOpeningBalanceRevision, rejectOpeningBalanceRevision } from '../../lib/openingBalanceRevisions';
import toast from 'react-hot-toast';

export default function OpeningBalanceRevision({ unitId, date, currentBalance, onRevisionApproved, pocket = 'official' }) {
  const { isAdmin, user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [pendingRevision, setPendingRevision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pocketLabel = pocket === 'reserve' ? 'Tartalék nyitó' : 'Nyitó egyenleg';

  const [formData, setFormData] = useState({
    proposed_opening_balance: '',
    reason: '',
  });

  const fetchPendingRevision = useCallback(async () => {
    if (!unitId || !date) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('opening_balance_revisions')
        .select('*, units (name)')
        .eq('unit_id', unitId)
        .eq('target_date', date)
        .eq('pocket', pocket)
        .eq('status', 'pending')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setPendingRevision(data);
    } catch (error) {
      console.error('Error fetching revision:', error);
    } finally {
      setLoading(false);
    }
  }, [unitId, date, pocket]);

  useEffect(() => {
    fetchPendingRevision();
  }, [fetchPendingRevision]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!formData.proposed_opening_balance) {
      toast.error('Add meg a javasolt nyitó egyenleget!');
      return;
    }

    if (!formData.reason.trim()) {
      toast.error('Add meg a módosítás okát!');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('opening_balance_revisions')
        .insert([{
          unit_id: unitId,
          target_date: date,
          pocket,
          current_opening_balance: currentBalance || 0,
          proposed_opening_balance: parseFloat(formData.proposed_opening_balance),
          reason: formData.reason.trim(),
          requested_by: user?.id,
        }]);

      if (error) throw error;

      toast.success('Módosítási kérelem elküldve!');
      setShowModal(false);
      setFormData({ proposed_opening_balance: '', reason: '' });
      fetchPendingRevision();
    } catch (error) {
      console.error('Error submitting revision:', error);
      toast.error('Hiba a kérelem küldésekor');
    } finally {
      setSaving(false);
    }
  };

  const handleAdminAction = async (action) => {
    if (!pendingRevision) return;

    setSaving(true);
    try {
      if (action === 'approved') {
        await approveOpeningBalanceRevision(pendingRevision, user?.id);
        toast.success('Módosítás jóváhagyva!');
        onRevisionApproved?.();
      } else {
        await rejectOpeningBalanceRevision(pendingRevision, user?.id);
        toast.success('Módosítás elutasítva');
      }

      fetchPendingRevision();
    } catch (error) {
      console.error('Error handling revision:', error);
      toast.error('Hiba a művelet során');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  // Show pending revision status
  if (pendingRevision) {
    return (
      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">
              {pocketLabel} módosítási kérelem függőben
              {pendingRevision.units?.name && (
                <span className="font-normal"> — {pendingRevision.units.name} pénztára</span>
              )}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Javasolt érték: {formatCurrency(pendingRevision.proposed_opening_balance)}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Ok: {pendingRevision.reason}
            </p>

            {isAdmin && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => handleAdminAction('approved')}
                  loading={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-3 w-3" />
                  Jóváhagy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdminAction('rejected')}
                  loading={saving}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                  Elutasít
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="mt-2 text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
      >
        <Edit3 className="h-3 w-3" />
        {pocketLabel} módosítása
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${pocketLabel} módosítása`}
        size="md"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          {pocket === 'reserve' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              Ez a <span className="font-medium">tartalék</span> nyitó értékét módosítja (nem a Pénztár zsebet).
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Jelenlegi {pocketLabel.toLowerCase()}:</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(currentBalance || 0)}</p>
          </div>

          <Input
            label={`Javasolt ${pocketLabel.toLowerCase()}`}
            type="number"
            step="1"
            value={formData.proposed_opening_balance}
            onChange={(e) => setFormData(prev => ({ ...prev, proposed_opening_balance: e.target.value }))}
            suffix="Ft"
            required
          />

          <Textarea
            label="Módosítás oka"
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            rows={3}
            placeholder="Írd le, miért szükséges a módosítás..."
            required
          />

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-700">
                A módosítási kérelmet adminisztrátornak kell jóváhagynia. A jóváhagyás után az előző nap záró egyenlege is frissül.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Mégse
            </Button>
            <Button type="submit" loading={saving}>
              Kérelem küldése
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
