import { useState, useEffect, useCallback } from 'react';
import { Clock, Check, X, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../common';
import { formatCurrency, formatDate } from '../../lib/utils';
import { approveOpeningBalanceRevision, rejectOpeningBalanceRevision } from '../../lib/openingBalanceRevisions';
import toast from 'react-hot-toast';

// Admin panel listing all pending opening-balance revision requests across
// units, so they can be approved from the central házipénztár view. Each item
// shows which unit's cash it affects.
export default function OpeningBalanceRevisionsPanel() {
  const { user } = useAuth();
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const fetchRevisions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('opening_balance_revisions')
        .select('*, units (name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRevisions(data || []);
    } catch (error) {
      console.error('Error fetching opening balance revisions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const handleAction = async (revision, action) => {
    setSavingId(revision.id);
    try {
      if (action === 'approve') {
        await approveOpeningBalanceRevision(revision, user?.id);
        toast.success('Nyitó egyenleg revízió jóváhagyva');
      } else {
        await rejectOpeningBalanceRevision(revision, user?.id);
        toast.success('Nyitó egyenleg revízió elutasítva');
      }
      await fetchRevisions();
    } catch (error) {
      console.error('Error handling opening balance revision:', error);
      toast.error('Hiba a művelet során');
    } finally {
      setSavingId(null);
    }
  };

  if (loading || revisions.length === 0) return null;

  return (
    <Card>
      <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Clock className="h-5 w-5 text-yellow-600" />
        Nyitó egyenleg revíziók (jóváhagyásra)
      </h3>
      <div className="space-y-3">
        {revisions.map((revision) => (
          <div
            key={revision.id}
            className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  {revision.units?.name || 'Egység'} pénztára
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {formatDate(revision.target_date)} nyitó egyenlege
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {formatCurrency(revision.current_opening_balance)} →{' '}
                  <span className="font-semibold">{formatCurrency(revision.proposed_opening_balance)}</span>
                </p>
                {revision.reason && (
                  <p className="text-xs text-gray-500 mt-1">Ok: {revision.reason}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAction(revision, 'approve')}
                  loading={savingId === revision.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-3 w-3" />
                  Jóváhagy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(revision, 'reject')}
                  loading={savingId === revision.id}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                  Elutasít
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
