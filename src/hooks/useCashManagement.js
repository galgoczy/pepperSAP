import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { fetchHouseCashSeries } from '../lib/houseCashSeries';

/**
 * Hook for calculating running balances for a unit
 */
export function useUnitBalance(unitId) {
  const [balance, setBalance] = useState({ cash: 0, reserve: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!unitId) {
      setBalance({ cash: 0, reserve: 0 });
      setLoading(false);
      return;
    }

    try {
      // Single source of truth: the live daily house-cash series. Its latest
      // closing is the current balance and already accounts for register cash,
      // HUF discrepancies (elütés), official cash expenses, the official part of
      // EFO/wage payments (cash) and the non-official part (reserve), manual
      // incomes, approved transfers, and approved opening-balance revisions.
      // This keeps the főoldal balance consistent with the breakdown and the
      // daily report.
      const series = await fetchHouseCashSeries(unitId, null);
      const dates = series.orderedDates;
      if (dates.length > 0) {
        const last = series.byDate.get(dates[dates.length - 1]);
        setBalance({ cash: last.cashClosing, reserve: last.reserveClosing });
      } else {
        setBalance({ cash: 0, reserve: 0 });
      }
    } catch (error) {
      console.error('Error fetching unit balance:', error);
      toast.error('Hiba az egyenleg betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}

/**
 * Hook for central cash balance (admin only)
 */
export function useCentralBalance() {
  const [balance, setBalance] = useState({ cash: 0, reserve: 0 });
  const [pocketsTotal, setPocketsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const [
        transfersInResult,
        transfersOutResult,
        paymentsResult,
        revisionsResult,
        pocketsResult,
      ] = await Promise.all([
        // Transfers IN to central (approved)
        supabase
          .from('cash_transfers')
          .select('amount, transfer_type')
          .eq('destination_type', 'central')
          .eq('status', 'approved'),
        // Transfers OUT of central to a unit (approved) — reduce central balance
        supabase
          .from('cash_transfers')
          .select('amount, transfer_type')
          .eq('source_type', 'central')
          .eq('status', 'approved'),
        // Central payments
        supabase
          .from('central_payments')
          .select('amount, payment_type'),
        // Revisions
        supabase
          .from('cash_revisions')
          .select('discrepancy_amount, revision_type'),
        // Active pockets
        supabase
          .from('cash_pockets')
          .select('current_amount')
          .eq('status', 'active'),
      ]);

      // Transfers in
      const transfersInCash = (transfersInResult.data || [])
        .filter(t => t.transfer_type === 'cash')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const transfersInReserve = (transfersInResult.data || [])
        .filter(t => t.transfer_type === 'reserve')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      // Transfers OUT of central to units (approved) — reduce central balance
      const transfersOutCash = (transfersOutResult.data || [])
        .filter(t => t.transfer_type === 'cash')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const transfersOutReserve = (transfersOutResult.data || [])
        .filter(t => t.transfer_type === 'reserve')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      // Payments
      const paymentsCash = (paymentsResult.data || [])
        .filter(p => p.payment_type === 'cash')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const paymentsReserve = (paymentsResult.data || [])
        .filter(p => p.payment_type === 'reserve')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      // Revisions
      const revisionsCash = (revisionsResult.data || [])
        .filter(r => r.revision_type === 'cash')
        .reduce((sum, r) => sum + (parseFloat(r.discrepancy_amount) || 0), 0);
      const revisionsReserve = (revisionsResult.data || [])
        .filter(r => r.revision_type === 'reserve')
        .reduce((sum, r) => sum + (parseFloat(r.discrepancy_amount) || 0), 0);

      // Pockets (reduce cash)
      const totalPockets = (pocketsResult.data || [])
        .reduce((sum, p) => sum + (parseFloat(p.current_amount) || 0), 0);

      // Calculate balances
      const cashBalance = transfersInCash - transfersOutCash - paymentsCash + revisionsCash - totalPockets;
      const reserveBalance = transfersInReserve - transfersOutReserve - paymentsReserve + revisionsReserve;

      setBalance({ cash: cashBalance, reserve: reserveBalance });
      setPocketsTotal(totalPockets);
    } catch (error) {
      console.error('Error fetching central balance:', error);
      toast.error('Hiba a központi egyenleg betöltésekor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, pocketsTotal, loading, refetch: fetchBalance };
}

/**
 * Hook for managing transfers
 */
export function useTransfers(unitId, direction = 'all') {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = useCallback(async () => {
    try {
      let query = supabase
        .from('cash_transfers')
        .select(`
          *,
          source_unit:units!cash_transfers_source_unit_id_fkey(id, name),
          destination_unit:units!cash_transfers_destination_unit_id_fkey(id, name)
        `)
        .order('created_at', { ascending: false });

      if (unitId) {
        if (direction === 'incoming') {
          query = query.eq('destination_unit_id', unitId);
        } else if (direction === 'outgoing') {
          query = query.eq('source_unit_id', unitId);
        } else {
          query = query.or(`source_unit_id.eq.${unitId},destination_unit_id.eq.${unitId}`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast.error('Hiba az átküldések betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [unitId, direction]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const createTransfer = async (transferData) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      // Auto-approved transfers (e.g. bank cash withdrawals) need approval
      // metadata set at insert time, since they skip the approval step.
      const approvalFields = transferData.status === 'approved'
        ? { approved_by: userId, approved_at: new Date().toISOString() }
        : {};
      const { data, error } = await supabase
        .from('cash_transfers')
        .insert([{
          ...transferData,
          ...approvalFields,
          initiated_by: userId,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Átküldés létrehozva');
      fetchTransfers();
      return data;
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast.error('Hiba az átküldés létrehozásakor');
      throw error;
    }
  };

  const approveTransfer = async (transferId) => {
    try {
      const { error } = await supabase
        .from('cash_transfers')
        .update({
          status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (error) throw error;

      toast.success('Átküldés jóváhagyva');
      fetchTransfers();
    } catch (error) {
      console.error('Error approving transfer:', error);
      toast.error('Hiba a jóváhagyáskor');
      throw error;
    }
  };

  const modifyTransfer = async (transferId, newAmount) => {
    try {
      // Get current transfer to save original amount
      const { data: current } = await supabase
        .from('cash_transfers')
        .select('amount, original_amount')
        .eq('id', transferId)
        .single();

      const { error } = await supabase
        .from('cash_transfers')
        .update({
          amount: newAmount,
          original_amount: current.original_amount || current.amount,
          status: 'modified',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (error) throw error;

      toast.success('Átküldés módosítva és jóváhagyva');
      fetchTransfers();
    } catch (error) {
      console.error('Error modifying transfer:', error);
      toast.error('Hiba a módosításkor');
      throw error;
    }
  };

  // Edit a still-pending transfer's amount (before approval). Keeps it pending.
  const editPendingTransfer = async (transferId, newAmount) => {
    try {
      const { error } = await supabase
        .from('cash_transfers')
        .update({ amount: newAmount })
        .eq('id', transferId)
        .eq('status', 'pending');

      if (error) throw error;

      toast.success('Átküldés módosítva');
      fetchTransfers();
    } catch (error) {
      console.error('Error editing pending transfer:', error);
      toast.error('Hiba az átküldés módosításakor');
      throw error;
    }
  };

  // Delete a still-pending transfer (before approval).
  const deleteTransfer = async (transferId) => {
    try {
      const { error } = await supabase
        .from('cash_transfers')
        .delete()
        .eq('id', transferId)
        .eq('status', 'pending');

      if (error) throw error;

      toast.success('Átküldés törölve');
      fetchTransfers();
    } catch (error) {
      console.error('Error deleting transfer:', error);
      toast.error('Hiba az átküldés törlésekor');
      throw error;
    }
  };

  return {
    transfers,
    loading,
    refetch: fetchTransfers,
    createTransfer,
    approveTransfer,
    modifyTransfer,
    editPendingTransfer,
    deleteTransfer,
  };
}

/**
 * Hook for central payments (admin only)
 */
export function useCentralPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('central_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching central payments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const createPayment = async (paymentData) => {
    try {
      const { data, error } = await supabase
        .from('central_payments')
        .insert([{
          ...paymentData,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Kifizetés rögzítve');
      fetchPayments();
      return data;
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Hiba a kifizetés rögzítésekor');
      throw error;
    }
  };

  return { payments, loading, refetch: fetchPayments, createPayment };
}

/**
 * Hook for revisions (admin only)
 */
export function useRevisions() {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRevisions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cash_revisions')
        .select('*')
        .order('revision_date', { ascending: false });

      if (error) throw error;
      setRevisions(data || []);
    } catch (error) {
      console.error('Error fetching revisions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const createRevision = async (revisionData) => {
    try {
      const { data, error } = await supabase
        .from('cash_revisions')
        .insert([{
          ...revisionData,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Revízió rögzítve');
      fetchRevisions();
      return data;
    } catch (error) {
      console.error('Error creating revision:', error);
      toast.error('Hiba a revízió rögzítésekor');
      throw error;
    }
  };

  const updateRevision = async (revisionId, revisionData) => {
    try {
      const { error } = await supabase
        .from('cash_revisions')
        .update(revisionData)
        .eq('id', revisionId);

      if (error) throw error;

      toast.success('Revízió módosítva');
      fetchRevisions();
    } catch (error) {
      console.error('Error updating revision:', error);
      toast.error('Hiba a revízió módosításakor');
      throw error;
    }
  };

  const deleteRevision = async (revisionId) => {
    try {
      const { error } = await supabase
        .from('cash_revisions')
        .delete()
        .eq('id', revisionId);

      if (error) throw error;

      toast.success('Revízió törölve');
      fetchRevisions();
    } catch (error) {
      console.error('Error deleting revision:', error);
      toast.error('Hiba a revízió törlésekor');
      throw error;
    }
  };

  return { revisions, loading, refetch: fetchRevisions, createRevision, updateRevision, deleteRevision };
}

/**
 * Hook returning the number of pending opening-balance revision requests
 * (módosítási kérelmek waiting for admin approval), for badge indicators.
 */
export function usePendingOpeningBalanceRevisions() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      const { count: c, error } = await supabase
        .from('opening_balance_revisions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      setCount(c || 0);
    } catch (error) {
      console.error('Error counting pending opening balance revisions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return { count, loading, refetch: fetchCount };
}

/**
 * Hook for pockets (admin only)
 */
export function usePockets() {
  const [pockets, setPockets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPockets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cash_pockets')
        .select(`
          *,
          pocket_transactions(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPockets(data || []);
    } catch (error) {
      console.error('Error fetching pockets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPockets();
  }, [fetchPockets]);

  const createPocket = async (pocketData) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Create pocket
      const { data: pocket, error: pocketError } = await supabase
        .from('cash_pockets')
        .insert([{
          name: pocketData.name,
          description: pocketData.description,
          initial_amount: pocketData.amount,
          current_amount: pocketData.amount,
          expected_return_date: pocketData.expected_return_date,
          created_by: userId,
        }])
        .select()
        .single();

      if (pocketError) throw pocketError;

      // Create initial transaction
      await supabase
        .from('pocket_transactions')
        .insert([{
          pocket_id: pocket.id,
          amount: pocketData.amount,
          transaction_type: 'initial',
          notes: pocketData.description,
          created_by: userId,
        }]);

      toast.success('Zseb létrehozva');
      fetchPockets();
      return pocket;
    } catch (error) {
      console.error('Error creating pocket:', error);
      toast.error('Hiba a zseb létrehozásakor');
      throw error;
    }
  };

  const returnPartial = async (pocketId, amount, notes) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Get current pocket
      const { data: pocket } = await supabase
        .from('cash_pockets')
        .select('current_amount')
        .eq('id', pocketId)
        .single();

      const newAmount = pocket.current_amount - amount;

      // Update pocket
      await supabase
        .from('cash_pockets')
        .update({ current_amount: newAmount })
        .eq('id', pocketId);

      // Create return transaction
      await supabase
        .from('pocket_transactions')
        .insert([{
          pocket_id: pocketId,
          amount: -amount, // Negative for return
          transaction_type: 'return',
          notes,
          created_by: userId,
        }]);

      toast.success('Részleges visszafizetés rögzítve');
      fetchPockets();
    } catch (error) {
      console.error('Error returning partial:', error);
      toast.error('Hiba a visszafizetéskor');
      throw error;
    }
  };

  const closePocket = async (pocketId, notes) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Get current pocket
      const { data: pocket } = await supabase
        .from('cash_pockets')
        .select('current_amount')
        .eq('id', pocketId)
        .single();

      // Update pocket to closed
      await supabase
        .from('cash_pockets')
        .update({
          status: 'closed',
          current_amount: 0,
          closed_at: new Date().toISOString(),
          closed_by: userId,
        })
        .eq('id', pocketId);

      // Create close transaction
      await supabase
        .from('pocket_transactions')
        .insert([{
          pocket_id: pocketId,
          amount: -pocket.current_amount,
          transaction_type: 'close',
          notes,
          created_by: userId,
        }]);

      toast.success('Zseb lezárva');
      fetchPockets();
    } catch (error) {
      console.error('Error closing pocket:', error);
      toast.error('Hiba a zseb lezárásakor');
      throw error;
    }
  };

  const totalActivePockets = pockets
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + (parseFloat(p.current_amount) || 0), 0);

  return {
    pockets,
    activePockets: pockets.filter(p => p.status === 'active'),
    totalActivePockets,
    loading,
    refetch: fetchPockets,
    createPocket,
    returnPartial,
    closePocket,
  };
}

/**
 * Hook for central cash history (combines transfers, payments, revisions)
 */
export function useCashHistory(limit = 20) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      // Fetch all three data sources in parallel
      const [transfersResult, paymentsResult, revisionsResult] = await Promise.all([
        supabase
          .from('cash_transfers')
          .select(`
            id,
            amount,
            transfer_type,
            transfer_date,
            status,
            source_type,
            destination_type,
            source_unit:units!cash_transfers_source_unit_id_fkey(name),
            destination_unit:units!cash_transfers_destination_unit_id_fkey(name),
            notes
          `)
          .in('status', ['approved', 'modified'])
          .or('destination_type.eq.central,source_type.eq.central')
          .order('transfer_date', { ascending: false })
          .limit(limit),
        supabase
          .from('central_payments')
          .select('id, amount, payment_date, payment_type, supplier_name, item_description, notes')
          .order('payment_date', { ascending: false })
          .limit(limit),
        supabase
          .from('cash_revisions')
          .select('id, revision_date, revision_type, discrepancy_amount, notes')
          .order('revision_date', { ascending: false })
          .limit(limit),
      ]);

      // Transform and combine all records
      const transfers = (transfersResult.data || []).map(t => ({
        id: `transfer-${t.id}`,
        type: 'transfer',
        date: t.transfer_date,
        amount: t.destination_type === 'central' ? t.amount : -t.amount,
        cashType: t.transfer_type,
        description: t.destination_type === 'central'
          ? `Beérkezett: ${t.source_unit?.name || 'Ismeretlen'}`
          : `Kiküldve: ${t.destination_unit?.name || 'Ismeretlen'}`,
        notes: t.notes,
      }));

      const payments = (paymentsResult.data || []).map(p => ({
        id: `payment-${p.id}`,
        type: 'payment',
        date: p.payment_date,
        amount: -p.amount,
        cashType: p.payment_type,
        description: p.supplier_name || p.item_description || 'Kifizetés',
        notes: p.notes,
      }));

      const revisions = (revisionsResult.data || []).map(r => ({
        id: `revision-${r.id}`,
        type: 'revision',
        date: r.revision_date,
        amount: r.discrepancy_amount,
        cashType: r.revision_type,
        description: 'Revízió',
        notes: r.notes,
      }));

      // Combine and sort by date
      const combined = [...transfers, ...payments, ...revisions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);

      setHistory(combined);
    } catch (error) {
      console.error('Error fetching cash history:', error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, refetch: fetchHistory };
}
