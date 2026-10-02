import { useState } from 'react';
import { Send, Download, Building2, Wallet, Edit2, Trash2, History, LayoutGrid, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { useAppSettings } from '../hooks/useAppSettings';
import {
  useUnitBalance,
  useCentralBalance,
  useTransfers,
  useCentralPayments,
  useRevisions,
  usePockets,
  useCashHistory,
  usePendingOpeningBalanceRevisions,
} from '../hooks/useCashManagement';
import { Card, Button, Input, Select, Modal, Badge, DateInput } from '../components/common';
import { Textarea } from '../components/common/Input';
import BalanceCard from '../components/cash/BalanceCard';
import TransferForm from '../components/cash/TransferForm';
import TransferList from '../components/cash/TransferList';
import PocketList from '../components/cash/PocketList';
import BalanceBreakdownModal from '../components/cash/BalanceBreakdownModal';
import OpeningBalanceRevisionsPanel from '../components/cash/OpeningBalanceRevisionsPanel';
import { formatCurrency, formatDate, getToday } from '../lib/utils';

// Pending (not yet approved) transfers per pocket, so a balance card can flag
// amounts not yet included in the balance. `match` selects the transfers that
// belong to the entity (a unit or central).
function pendingPockets(transfers, match) {
  const pending = (transfers || []).filter((t) => t.status === 'pending' && match(t));
  return {
    pendingCash: pending.some((t) => t.transfer_type === 'cash'),
    pendingReserve: pending.some((t) => t.transfer_type === 'reserve'),
  };
}

export default function CashManagementPage() {
  const { isAdmin, unitId, profile } = useAuth();
  const { units } = useUnits();

  // For admin, show central view. For unit users, show their unit view.
  if (isAdmin) {
    return <AdminCashView units={units} />;
  }

  return <UnitCashView unitId={unitId} units={units} />;
}

// Unit view (for non-admin users)
function UnitCashView({ unitId, units }) {
  const { settings } = useAppSettings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Házipénztár</h1>
          <p className="text-gray-500 mt-1">Egyenleg és átküldések kezelése</p>
        </div>
      </div>
      <UnitCashViewContent unitId={unitId} units={units} isAdmin={false} showReserve={settings.showReserve} />
    </div>
  );
}

// Reusable unit cash view content (used by both regular users and admin when viewing a unit)
function UnitCashViewContent({ unitId, units, isAdmin = false, showReserve = true }) {
  const { user } = useAuth();
  const { balance, loading: balanceLoading, refetch: refetchBalance } = useUnitBalance(unitId);
  const {
    transfers,
    loading: transfersLoading,
    createTransfer,
    approveTransfer,
    modifyTransfer,
    editPendingTransfer,
    deleteTransfer,
  } = useTransfers(unitId);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showBankWithdrawal, setShowBankWithdrawal] = useState(false);
  const [showIncomingTransfer, setShowIncomingTransfer] = useState(false);
  const [breakdownPocket, setBreakdownPocket] = useState(null);

  const restaurantUnits = units.filter(u => u.type === 'restaurant');
  const incomingTransfers = transfers.filter(
    t => t.destination_unit_id === unitId && t.status === 'pending'
  );
  const allTransfers = transfers;

  const handleTransferSuccess = async (data) => {
    await createTransfer(data);
    refetchBalance();
  };

  const handleApprove = async (id) => {
    await approveTransfer(id);
    refetchBalance();
  };

  const handleModify = async (id, amount) => {
    await modifyTransfer(id, amount);
    refetchBalance();
  };

  const handleEdit = async (id, amount) => {
    await editPendingTransfer(id, amount);
    refetchBalance();
  };

  const handleDelete = async (id) => {
    await deleteTransfer(id);
    refetchBalance();
  };

  return (
    <>
      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setShowBankWithdrawal(true)}>
          Készpénzfelvét (bank)
        </Button>
        <Button variant="secondary" onClick={() => setShowIncomingTransfer(true)}>
          <Download className="h-4 w-4" />
          Nekem küldtek!
        </Button>
        <Button onClick={() => setShowTransferForm(true)}>
          <Send className="h-4 w-4" />
          Átküldés
        </Button>
      </div>

      {/* Balance */}
      <BalanceCard
        title="Jelenlegi egyenleg"
        cash={balance.cash}
        reserve={balance.reserve}
        loading={balanceLoading}
        showReserve={showReserve}
        onSelectPocket={setBreakdownPocket}
        {...pendingPockets(transfers, () => true)}
      />

      <BalanceBreakdownModal
        isOpen={!!breakdownPocket}
        onClose={() => setBreakdownPocket(null)}
        unitId={unitId}
        pocket={breakdownPocket || 'cash'}
        title={breakdownPocket === 'reserve' ? 'Tartalék - összetétel' : 'Készpénz - összetétel'}
      />

      {/* Incoming transfers needing approval */}
      {incomingTransfers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Bejövő átküldések jóváhagyásra ({incomingTransfers.length})
          </h2>
          <TransferList
            transfers={incomingTransfers}
            loading={transfersLoading}
            onApprove={handleApprove}
            onModify={handleModify}
            currentUnitId={unitId}
            isAdmin={isAdmin}
            showActions={true}
          />
        </div>
      )}

      {/* All transfers */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Összes átküldés</h2>
        <TransferList
          transfers={allTransfers}
          loading={transfersLoading}
          onApprove={handleApprove}
          onModify={handleModify}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentUnitId={unitId}
          currentUserId={user?.id}
          isAdmin={isAdmin}
          showActions={true}
        />
      </div>

      {/* Transfer form modal */}
      <TransferForm
        isOpen={showTransferForm}
        onClose={() => setShowTransferForm(false)}
        onSubmit={handleTransferSuccess}
        units={restaurantUnits}
        sourceUnitId={unitId}
        sourceType="unit"
        isAdmin={isAdmin}
      />

      {/* Bank cash withdrawal into this unit's own house cash */}
      <BankWithdrawalModal
        isOpen={showBankWithdrawal}
        onClose={() => setShowBankWithdrawal(false)}
        units={restaurantUnits}
        fixedUnitId={unitId}
        onSubmit={async (data) => {
          await createTransfer(data);
          refetchBalance();
        }}
      />

      {/* Money received FROM somewhere (default: Központ) into this unit */}
      <IncomingTransferModal
        isOpen={showIncomingTransfer}
        onClose={() => setShowIncomingTransfer(false)}
        units={restaurantUnits}
        unitId={unitId}
        onSubmit={async (data) => {
          await createTransfer(data);
          refetchBalance();
        }}
      />
    </>
  );
}

// "Nekem küldtek!" — the mirror image of an outgoing transfer: the unit records
// money/reserve it RECEIVED (default from Központ). It needs no approval, and
// lands in the admin's transfer list like any other transfer, because it IS one
// — only initiated from the receiving side.
function IncomingTransferModal({ isOpen, onClose, onSubmit, units, unitId }) {
  const [loading, setLoading] = useState(false);
  const initial = {
    amount: '',
    transfer_date: getToday(),
    transfer_type: 'cash',
    source: 'central',
    notes: '',
  };
  const [formData, setFormData] = useState(initial);
  const setField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fromCentral = formData.source === 'central';
      await onSubmit({
        source_type: fromCentral ? 'central' : 'unit',
        source_unit_id: fromCentral ? null : formData.source,
        destination_type: 'unit',
        destination_unit_id: unitId,
        amount: parseFloat(formData.amount),
        transfer_date: formData.transfer_date,
        transfer_type: formData.transfer_type,
        notes: formData.notes,
        // Recorded by the receiving side, so there is nothing left to approve.
        status: 'approved',
      });
      onClose();
      setFormData(initial);
    } catch {
      // Error handled in the hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nekem küldtek!" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          Ide rögzítsd, ha az egység készpénzt vagy tartalékot KAPOTT. Az összeg jóváhagyás nélkül
          bekerül a házipénztárba, a küldő pénztárából pedig kikerül — ugyanúgy, mintha a küldő
          rögzítette volna. Az admin az átküldések között látja és javíthatja.
        </p>
        <Input
          label="Összeg"
          type="number"
          step="1"
          min="1"
          value={formData.amount}
          onChange={(e) => setField('amount', e.target.value)}
          suffix="Ft"
          required
        />
        <Select
          label="Típus"
          value={formData.transfer_type}
          onChange={(e) => setField('transfer_type', e.target.value)}
          options={[
            { value: 'cash', label: 'Készpénz' },
            { value: 'reserve', label: 'Tartalék' },
          ]}
          required
        />
        <Select
          label="Kitől kaptad"
          value={formData.source}
          onChange={(e) => setField('source', e.target.value)}
          options={[
            { value: 'central', label: 'Központ' },
            ...units.filter((u) => u.id !== unitId).map((u) => ({ value: u.id, label: u.name })),
          ]}
          required
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Dátum<span className="text-red-500 ml-1">*</span>
          </label>
          <DateInput
            value={formData.transfer_date}
            onChange={(e) => setField('transfer_date', e.target.value)}
            max={getToday()}
            required
          />
        </div>
        <Textarea
          label="Megjegyzés"
          value={formData.notes}
          onChange={(e) => setField('notes', e.target.value)}
          rows={2}
          placeholder="Pl. kitől, milyen célra..."
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Mégse</Button>
          <Button type="submit" loading={loading}>
            <Download className="h-4 w-4" />
            Rögzítés
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Compact balance card for one unit in the "Minden egység" overview, with its
// own clickable cash/reserve breakdown.
function UnitBalanceMini({ unit, showReserve }) {
  const { balance, loading } = useUnitBalance(unit.id);
  const { transfers } = useTransfers(unit.id);
  const [breakdownPocket, setBreakdownPocket] = useState(null);

  return (
    <>
      <BalanceCard
        title={unit.name}
        cash={balance.cash}
        reserve={balance.reserve}
        loading={loading}
        showReserve={showReserve}
        compact
        onSelectPocket={setBreakdownPocket}
        {...pendingPockets(transfers, () => true)}
      />
      <BalanceBreakdownModal
        isOpen={!!breakdownPocket}
        onClose={() => setBreakdownPocket(null)}
        unitId={unit.id}
        pocket={breakdownPocket || 'cash'}
        title={breakdownPocket === 'reserve' ? `${unit.name} – Tartalék összetétel` : `${unit.name} – Készpénz összetétel`}
      />
    </>
  );
}

// Admin/Central view
function AdminCashView({ units }) {
  // Default tab is the all-units overview; the other tabs (central management,
  // transfers, payments, revisions, pockets) stay available.
  const [activeTab, setActiveTab] = useState('overview');
  // null = central/tabbed admin view, a unit id = that single unit's view.
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const { settings, updateSetting } = useAppSettings();
  const { balance: centralBalance, pocketsTotal, loading: centralLoading, refetch: refetchCentral } = useCentralBalance();
  const {
    transfers,
    loading: transfersLoading,
    createTransfer,
    approveTransfer,
    modifyTransfer,
    editPendingTransfer,
    deleteTransfer,
    updateBankWithdrawal,
    deleteBankWithdrawal,
    refetch: refetchTransfers,
  } = useTransfers(null); // null = all transfers
  const { payments, loading: paymentsLoading, createPayment, refetch: refetchPayments } = useCentralPayments();
  const { revisions, loading: revisionsLoading, createRevision, updateRevision, deleteRevision } = useRevisions();
  const { count: pendingRevisionCount, refetch: refetchPendingRevisions } = usePendingOpeningBalanceRevisions();
  const {
    pockets,
    activePockets,
    totalActivePockets,
    loading: pocketsLoading,
    createPocket,
    returnPartial,
    closePocket,
  } = usePockets();
  const { history, loading: historyLoading, refetch: refetchHistory } = useCashHistory(15);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showBankWithdrawal, setShowBankWithdrawal] = useState(false);

  const restaurantUnits = units.filter(u => u.type === 'restaurant');

  // Central -> unit transfer (becomes a pending transfer like any other; an
  // admin still approves it).
  const handleCentralTransfer = async (data) => {
    await createTransfer(data);
    refetchCentral();
    refetchTransfers();
  };
  const pendingTransfers = transfers.filter(t => t.status === 'pending');

  // Handle unit selection change - refetch data when switching back to central
  const handleUnitChange = (newUnitId) => {
    const wasViewingUnit = selectedUnitId !== null;
    const switchingToCentral = !newUnitId;

    setSelectedUnitId(newUnitId || null);

    // Refetch central data when switching back from unit view
    if (wasViewingUnit && switchingToCentral) {
      refetchCentral();
      refetchTransfers();
      refetchPayments();
      refetchHistory();
    }
  };

  const handleApprove = async (id) => {
    await approveTransfer(id);
    refetchCentral();
  };

  const handleModify = async (id, amount) => {
    await modifyTransfer(id, amount);
    refetchCentral();
  };

  const handleEdit = async (id, amount) => {
    await editPendingTransfer(id, amount);
    refetchCentral();
  };

  const handleDelete = async (id) => {
    await deleteTransfer(id);
    refetchCentral();
  };

  const tabs = [
    { id: 'overview', label: 'Áttekintés', icon: LayoutGrid },
    { id: 'central', label: 'Központ', icon: Building2 },
    { id: 'transfers', label: `Átküldések${pendingTransfers.length > 0 ? ` (${pendingTransfers.length})` : ''}` },
    { id: 'payments', label: 'Kifizetések' },
    { id: 'revisions', label: `Revíziók${pendingRevisionCount > 0 ? ` (${pendingRevisionCount})` : ''}` },
    { id: 'withdrawals', label: 'Készpénzfelvételek' },
    { id: 'pockets', label: 'Zsebek', icon: Wallet },
  ];

  const unitOptions = [
    { value: '', label: 'Központ' },
    ...restaurantUnits.map(u => ({ value: u.id, label: u.name })),
  ];

  const selectedUnit = restaurantUnits.find(u => u.id === selectedUnitId);

  // If a unit is selected, show UnitCashView for that unit
  if (selectedUnitId) {
    return (
      <div className="space-y-6">
        {/* Header with unit selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Házipénztárak</h1>
            <p className="text-gray-500 mt-1">
              Egység kezelése: <span className="font-medium text-gray-700">{selectedUnit?.name}</span>
            </p>
          </div>
          <Select
            value={selectedUnitId || ''}
            onChange={(e) => handleUnitChange(e.target.value)}
            options={unitOptions}
            className="w-48"
          />
        </div>
        {/* Render UnitCashView for selected unit */}
        <UnitCashViewContent unitId={selectedUnitId} units={units} isAdmin={true} showReserve={settings.showReserve} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with unit selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Házipénztárak</h1>
          <p className="text-gray-500 mt-1">Központi pénztár és átküldések kezelése</p>
        </div>
        <Select
          value={selectedUnitId || ''}
          onChange={(e) => handleUnitChange(e.target.value)}
          options={unitOptions}
          className="w-48"
        />
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-4 md:gap-8 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2
                ${
                  activeTab === tab.id
                    ? 'border-pepper-red text-pepper-red'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon && <tab.icon className="h-4 w-4" />}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Központ - a bit larger than the units */}
          <BalanceCard
            title="Központ"
            cash={centralBalance.cash}
            reserve={centralBalance.reserve}
            pocketsTotal={pocketsTotal}
            loading={centralLoading}
            showReserve={settings.showReserve}
            onSelectPocket={() => setActiveTab('central')}
            {...pendingPockets(transfers, (t) => t.source_type === 'central' || t.destination_type === 'central')}
          />

          {/* Collapsible: all units' house cash (collapsed by default; the
              admin's choice is remembered in this browser). "Egyéb" goes last. */}
          <div>
            <button
              type="button"
              onClick={() => updateSetting('allUnitsOpen', !settings.allUnitsOpen)}
              className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-pepper-red transition-colors"
            >
              {settings.allUnitsOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              Összes egység házipénztár
            </button>
            {settings.allUnitsOpen && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[
                  ...restaurantUnits.filter((u) => !/egyéb/i.test(u.name || '')),
                  ...restaurantUnits.filter((u) => /egyéb/i.test(u.name || '')),
                ].map((u) => (
                  <UnitBalanceMini key={u.id} unit={u} showReserve={settings.showReserve} />
                ))}
              </div>
            )}
          </div>

          {/* Recent transfers */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Legutóbbi átküldések</h2>
            <TransferList
              transfers={transfers.slice(0, 8)}
              loading={transfersLoading}
              onApprove={handleApprove}
              onModify={handleModify}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isAdmin={true}
              showActions={true}
            />
          </div>

          {/* Recent transactions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Legutóbbi tranzakciók</h2>
            <CashHistoryList history={history} loading={historyLoading} showReserve={settings.showReserve} />
          </div>
        </div>
      )}

      {activeTab === 'central' && (
        <div className="space-y-6">
          <BalanceCard
            title="Központi pénztár"
            cash={centralBalance.cash}
            reserve={centralBalance.reserve}
            pocketsTotal={pocketsTotal}
            loading={centralLoading}
            showReserve={settings.showReserve}
            {...pendingPockets(transfers, (t) => t.source_type === 'central' || t.destination_type === 'central')}
          />

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowPaymentModal(true)}>
              Kifizetés rögzítése
            </Button>
            <Button onClick={() => setShowTransferForm(true)}>
              <Send className="h-4 w-4" />
              Átküldés egységnek
            </Button>
            <Button variant="secondary" onClick={() => setShowRevisionModal(true)}>
              Revízió
            </Button>
            <Button variant="secondary" onClick={() => setShowBankWithdrawal(true)}>
              Készpénzfelvét (bank)
            </Button>
          </div>

          {/* Pending transfers to central */}
          {pendingTransfers.filter(t => t.destination_type === 'central').length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Bejövő átküldések jóváhagyásra
              </h2>
              <TransferList
                transfers={pendingTransfers.filter(t => t.destination_type === 'central')}
                loading={transfersLoading}
                onApprove={handleApprove}
                onModify={handleModify}
                isAdmin={true}
                showActions={true}
              />
            </div>
          )}

          {/* Cash History */}
          <CashHistoryList history={history} loading={historyLoading} showReserve={settings.showReserve} />
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="space-y-4">
          {/* Same "start a transfer" action the units have, here for Központ. */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Összes átküldés</h2>
            <Button onClick={() => setShowTransferForm(true)}>
              <Send className="h-4 w-4" />
              Átküldés egységnek
            </Button>
          </div>
          <TransferList
            transfers={transfers}
            loading={transfersLoading}
            onApprove={handleApprove}
            onModify={handleModify}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isAdmin={true}
            showActions={true}
          />
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Központi kifizetések</h2>
            <Button onClick={() => setShowPaymentModal(true)}>
              Új kifizetés
            </Button>
          </div>
          <CentralPaymentsList payments={payments} loading={paymentsLoading} />
        </div>
      )}

      {activeTab === 'revisions' && (
        <div className="space-y-4">
          {/* Pending opening-balance revision requests from units (per-unit) */}
          <OpeningBalanceRevisionsPanel onChange={refetchPendingRevisions} />

          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Revíziók</h2>
            <Button onClick={() => setShowRevisionModal(true)}>
              Új revízió
            </Button>
          </div>
          <RevisionsList
            revisions={revisions}
            loading={revisionsLoading}
            onUpdate={async (id, data) => {
              await updateRevision(id, data);
              refetchCentral();
            }}
            onDelete={async (id) => {
              await deleteRevision(id);
              refetchCentral();
            }}
          />
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <BankWithdrawalsList
          withdrawals={transfers.filter((t) => t.source_type === 'bank')}
          loading={transfersLoading}
          units={units}
          onUpdate={async (id, changes) => {
            await updateBankWithdrawal(id, changes);
            refetchCentral();
          }}
          onDelete={async (id) => {
            await deleteBankWithdrawal(id);
            refetchCentral();
          }}
        />
      )}

      {activeTab === 'pockets' && (
        <PocketList
          pockets={pockets}
          activePockets={activePockets}
          totalActivePockets={totalActivePockets}
          loading={pocketsLoading}
          onCreatePocket={createPocket}
          onReturnPartial={returnPartial}
          onClosePocket={closePocket}
        />
      )}

      {/* Central -> unit transfer */}
      <TransferForm
        isOpen={showTransferForm}
        onClose={() => setShowTransferForm(false)}
        onSubmit={handleCentralTransfer}
        units={restaurantUnits}
        sourceUnitId={null}
        sourceType="central"
        isAdmin={true}
      />

      {/* Payment Modal */}
      <CentralPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={async (data) => {
          await createPayment(data);
          refetchCentral();
        }}
      />

      {/* Bank cash withdrawal (auto-approved transfer) */}
      <BankWithdrawalModal
        isOpen={showBankWithdrawal}
        onClose={() => setShowBankWithdrawal(false)}
        units={restaurantUnits}
        onSubmit={async (data) => {
          await createTransfer(data);
          refetchCentral();
          refetchTransfers();
        }}
      />

      {/* Revision Modal */}
      <RevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        onSubmit={async (data) => {
          await createRevision(data);
          refetchCentral();
        }}
      />
    </div>
  );
}

// Central Payments List
function CentralPaymentsList({ payments, loading }) {
  if (loading) {
    return <Card><div className="animate-pulse h-32 bg-gray-200 rounded"></div></Card>;
  }

  if (payments.length === 0) {
    return <Card><p className="text-center text-gray-500 py-6">Nincsenek kifizetések</p></Card>;
  }

  return (
    <Card>
      <div className="space-y-3">
        {payments.map((payment) => (
          <div key={payment.id} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {payment.supplier_name || payment.item_description || 'Kifizetés'}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(payment.payment_date)} • {payment.payment_type === 'cash' ? 'Készpénz' : 'Tartalék'}
                  {payment.invoice_number && ` • ${payment.invoice_number}`}
                </p>
              </div>
              <p className="text-lg font-bold text-red-600">
                -{formatCurrency(payment.amount)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Revisions List
function RevisionsList({ revisions, loading, onUpdate, onDelete }) {
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  if (loading) {
    return <Card><div className="animate-pulse h-32 bg-gray-200 rounded"></div></Card>;
  }

  if (revisions.length === 0) {
    return <Card><p className="text-center text-gray-500 py-6">Nincsenek revíziók</p></Card>;
  }

  const handleDelete = async () => {
    if (deleteConfirm) {
      await onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <>
      <Card>
        <div className="space-y-3">
          {revisions.map((revision) => (
            <div
              key={revision.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => setEditModal(revision)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {revision.revision_type === 'cash' ? 'Készpénz' : 'Tartalék'} revízió
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(revision.revision_date)}
                    {revision.notes && ` • ${revision.notes}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`text-lg font-bold ${revision.discrepancy_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revision.discrepancy_amount >= 0 ? '+' : ''}{formatCurrency(revision.discrepancy_amount)}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditModal(revision); }}
                      className="p-1.5 text-gray-400 hover:text-pepper-red rounded"
                      title="Szerkesztés"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(revision); }}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      title="Törlés"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Edit Modal */}
      {editModal && (
        <RevisionEditModal
          revision={editModal}
          onClose={() => setEditModal(null)}
          onSubmit={async (data) => {
            await onUpdate(editModal.id, data);
            setEditModal(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Revízió törlése"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Biztosan törölni szeretnéd ezt a revíziót?
          </p>
          <p className="text-sm text-gray-500">
            {deleteConfirm?.revision_type === 'cash' ? 'Készpénz' : 'Tartalék'} revízió •{' '}
            {deleteConfirm && formatDate(deleteConfirm.revision_date)} •{' '}
            <span className={deleteConfirm?.discrepancy_amount >= 0 ? 'text-green-600' : 'text-red-600'}>
              {deleteConfirm?.discrepancy_amount >= 0 ? '+' : ''}{deleteConfirm && formatCurrency(deleteConfirm.discrepancy_amount)}
            </span>
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Mégse</Button>
            <Button variant="danger" onClick={handleDelete}>Törlés</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Revision Edit Modal
function RevisionEditModal({ revision, onClose, onSubmit }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    revision_date: revision.revision_date,
    revision_type: revision.revision_type,
    calculated_amount: revision.calculated_amount || '',
    physical_amount: revision.physical_amount || '',
    notes: revision.notes || '',
  });

  const discrepancy = (parseFloat(formData.physical_amount) || 0) - (parseFloat(formData.calculated_amount) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        discrepancy_amount: discrepancy,
        calculated_amount: parseFloat(formData.calculated_amount) || null,
        physical_amount: parseFloat(formData.physical_amount) || null,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Revízió szerkesztése" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Típus"
          value={formData.revision_type}
          onChange={(e) => setFormData(prev => ({ ...prev, revision_type: e.target.value }))}
          options={[
            { value: 'cash', label: 'Készpénz' },
            { value: 'reserve', label: 'Tartalék' },
          ]}
        />
        <Input
          label="Dátum"
          type="date"
          value={formData.revision_date}
          onChange={(e) => setFormData(prev => ({ ...prev, revision_date: e.target.value }))}
          max={getToday()}
          required
        />
        <Input
          label="Számított összeg (rendszer)"
          type="number"
          step="1"
          value={formData.calculated_amount}
          onChange={(e) => setFormData(prev => ({ ...prev, calculated_amount: e.target.value }))}
          suffix="Ft"
        />
        <Input
          label="Tényleges összeg (megszámolt)"
          type="number"
          step="1"
          value={formData.physical_amount}
          onChange={(e) => setFormData(prev => ({ ...prev, physical_amount: e.target.value }))}
          suffix="Ft"
        />
        {(formData.calculated_amount || formData.physical_amount) && (
          <div className={`p-3 rounded-lg ${discrepancy >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            Eltérés: <strong>{discrepancy >= 0 ? '+' : ''}{formatCurrency(discrepancy)}</strong>
          </div>
        )}
        <Textarea
          label="Megjegyzés"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
          placeholder="Mi okozta az eltérést?"
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Mégse</Button>
          <Button type="submit" loading={loading}>Mentés</Button>
        </div>
      </form>
    </Modal>
  );
}

// Central Payment Modal
function CentralPaymentModal({ isOpen, onClose, onSubmit }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: getToday(),
    payment_type: 'cash',
    supplier_name: '',
    invoice_number: '',
    item_description: '',
    notes: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      onClose();
      setFormData({
        amount: '',
        payment_date: getToday(),
        payment_type: 'cash',
        supplier_name: '',
        invoice_number: '',
        item_description: '',
        notes: '',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Központi kifizetés" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Összeg"
          type="number"
          step="1"
          min="1"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
          suffix="Ft"
          required
        />
        <Select
          label="Típus"
          value={formData.payment_type}
          onChange={(e) => setFormData(prev => ({ ...prev, payment_type: e.target.value }))}
          options={[
            { value: 'cash', label: 'Készpénz (számlával)' },
            { value: 'reserve', label: 'Tartalék (számla nélkül)' },
          ]}
        />
        <Input
          label="Dátum"
          type="date"
          value={formData.payment_date}
          onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
          max={getToday()}
          required
        />
        {formData.payment_type === 'cash' && (
          <>
            <Input
              label="Szállító neve"
              value={formData.supplier_name}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
            />
            <Input
              label="Számla sorszám"
              value={formData.invoice_number}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
            />
          </>
        )}
        <Input
          label="Leírás"
          value={formData.item_description}
          onChange={(e) => setFormData(prev => ({ ...prev, item_description: e.target.value }))}
        />
        <Textarea
          label="Megjegyzés"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Mégse</Button>
          <Button type="submit" loading={loading}>Mentés</Button>
        </div>
      </form>
    </Modal>
  );
}

// Bank cash withdrawal: recorded as an auto-approved transfer from the bank
// ('bank' source) into a chosen unit, or directly into Központ. No approval step.
// `fixedUnitId` locks the destination to one unit (used by the units themselves,
// who can only withdraw into their own house cash). Without it the admin picks
// the destination (a unit or Központ).
function BankWithdrawalModal({ isOpen, onClose, onSubmit, units, fixedUnitId = null }) {
  const [loading, setLoading] = useState(false);
  const initial = {
    amount: '',
    transfer_date: getToday(),
    destination: fixedUnitId || 'central',
    withdrawn_by_name: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initial);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const destination = fixedUnitId || formData.destination;
      const toCentral = !fixedUnitId && destination === 'central';
      await onSubmit({
        source_type: 'bank',
        source_unit_id: null,
        destination_type: toCentral ? 'central' : 'unit',
        destination_unit_id: toCentral ? null : destination,
        amount: parseFloat(formData.amount),
        transfer_date: formData.transfer_date,
        transfer_type: 'cash',
        withdrawn_by_name: formData.withdrawn_by_name.trim(),
        notes: formData.notes,
        status: 'approved',
      });
      onClose();
      setFormData(initial);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Készpénzfelvét (bankból)" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          A bankból felvett készpénz átküldésként kerül rögzítésre, jóváhagyás nélkül.
          {fixedUnitId
            ? ' Az egység házipénztára a felvett összeggel nő.'
            : ' A célhely pénztára (egység vagy Központ) a felvett összeggel nő.'}
        </p>
        <Input
          label="Összeg"
          type="number"
          step="1"
          min="1"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
          suffix="Ft"
          required
        />
        {!fixedUnitId && (
          <Select
            label="Hová kerül"
            value={formData.destination}
            onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
            options={[
              { value: 'central', label: 'Központ' },
              ...units.map(u => ({ value: u.id, label: u.name })),
            ]}
          />
        )}
        <Input
          label="Készpénzt felvette (név)"
          value={formData.withdrawn_by_name}
          onChange={(e) => setFormData(prev => ({ ...prev, withdrawn_by_name: e.target.value }))}
          placeholder="A pénzt ténylegesen felvevő személy neve"
          required
        />
        <Input
          label="Dátum"
          type="date"
          value={formData.transfer_date}
          onChange={(e) => setFormData(prev => ({ ...prev, transfer_date: e.target.value }))}
          max={getToday()}
          required
        />
        <Textarea
          label="Megjegyzés"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Mégse</Button>
          <Button type="submit" loading={loading}>Rögzítés</Button>
        </div>
      </form>
    </Modal>
  );
}

// Admin list of the bank cash withdrawals, where the amount (and the other
// details) can be corrected or the whole record removed.
function BankWithdrawalsList({ withdrawals, loading, units, onUpdate, onDelete }) {
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', transfer_date: '', withdrawn_by_name: '', notes: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const destinationName = (t) => {
    if (t.destination_type === 'central') return 'Központ';
    return t.destination_unit?.name
      || units.find((u) => u.id === t.destination_unit_id)?.name
      || 'Ismeretlen';
  };

  const openEdit = (t) => {
    setEditItem(t);
    setEditForm({
      amount: String(t.amount ?? ''),
      transfer_date: t.transfer_date || getToday(),
      withdrawn_by_name: t.withdrawn_by_name || '',
      notes: t.notes || '',
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(editItem.id, {
        amount: parseFloat(editForm.amount),
        transfer_date: editForm.transfer_date,
        withdrawn_by_name: editForm.withdrawn_by_name.trim(),
        notes: editForm.notes,
      });
      setEditItem(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Card><div className="animate-pulse h-32 bg-gray-200 rounded"></div></Card>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Legutóbbi készpénzfelvételek</h2>

      {withdrawals.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-6">Nincsenek készpénzfelvételek</p></Card>
      ) : (
        <Card>
          <div className="space-y-3">
            {withdrawals.map((t) => (
              <div key={t.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      Bank → {destinationName(t)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(t.transfer_date)}
                      {t.withdrawn_by_name && ` • Felvette: ${t.withdrawn_by_name}`}
                      {t.notes && ` • ${t.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-700">
                      +{formatCurrency(t.amount)}
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(t)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Edit modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Készpénzfelvét módosítása" size="md">
        <form onSubmit={submitEdit} className="space-y-4">
          <Input
            label="Összeg"
            type="number"
            step="1"
            min="1"
            value={editForm.amount}
            onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
            suffix="Ft"
            required
          />
          <Input
            label="Készpénzt felvette (név)"
            value={editForm.withdrawn_by_name}
            onChange={(e) => setEditForm((p) => ({ ...p, withdrawn_by_name: e.target.value }))}
            required
          />
          <Input
            label="Dátum"
            type="date"
            value={editForm.transfer_date}
            onChange={(e) => setEditForm((p) => ({ ...p, transfer_date: e.target.value }))}
            max={getToday()}
            required
          />
          <Textarea
            label="Megjegyzés"
            value={editForm.notes}
            onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
            rows={2}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditItem(null)}>Mégse</Button>
            <Button type="submit" loading={saving}>Mentés</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Készpénzfelvét törlése" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Biztosan törlöd ezt a készpénzfelvételt
            {deleteConfirm && <> (<strong>{formatCurrency(deleteConfirm.amount)}</strong>)</>}?
            A célhely házipénztára ennyivel csökken. Ez a művelet nem vonható vissza.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Mégse</Button>
            <Button
              variant="danger"
              onClick={async () => {
                await onDelete(deleteConfirm.id);
                setDeleteConfirm(null);
              }}
            >
              Törlés
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Revision Modal
function RevisionModal({ isOpen, onClose, onSubmit }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    revision_date: getToday(),
    revision_type: 'cash',
    calculated_amount: '',
    physical_amount: '',
    notes: '',
  });

  const discrepancy = (parseFloat(formData.physical_amount) || 0) - (parseFloat(formData.calculated_amount) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        discrepancy_amount: discrepancy,
        calculated_amount: parseFloat(formData.calculated_amount) || null,
        physical_amount: parseFloat(formData.physical_amount) || null,
      });
      onClose();
      setFormData({
        revision_date: getToday(),
        revision_type: 'cash',
        calculated_amount: '',
        physical_amount: '',
        notes: '',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Revízió rögzítése" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Típus"
          value={formData.revision_type}
          onChange={(e) => setFormData(prev => ({ ...prev, revision_type: e.target.value }))}
          options={[
            { value: 'cash', label: 'Készpénz' },
            { value: 'reserve', label: 'Tartalék' },
          ]}
        />
        <Input
          label="Dátum"
          type="date"
          value={formData.revision_date}
          onChange={(e) => setFormData(prev => ({ ...prev, revision_date: e.target.value }))}
          max={getToday()}
          required
        />
        <Input
          label="Számított összeg (rendszer)"
          type="number"
          step="1"
          value={formData.calculated_amount}
          onChange={(e) => setFormData(prev => ({ ...prev, calculated_amount: e.target.value }))}
          suffix="Ft"
        />
        <Input
          label="Tényleges összeg (megszámolt)"
          type="number"
          step="1"
          value={formData.physical_amount}
          onChange={(e) => setFormData(prev => ({ ...prev, physical_amount: e.target.value }))}
          suffix="Ft"
        />
        {(formData.calculated_amount || formData.physical_amount) && (
          <div className={`p-3 rounded-lg ${discrepancy >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            Eltérés: <strong>{discrepancy >= 0 ? '+' : ''}{formatCurrency(discrepancy)}</strong>
          </div>
        )}
        <Textarea
          label="Megjegyzés"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
          placeholder="Mi okozta az eltérést?"
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Mégse</Button>
          <Button type="submit" loading={loading} disabled={!formData.calculated_amount && !formData.physical_amount}>
            Mentés
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Cash History List
function CashHistoryList({ history, loading, showReserve }) {
  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  // Filter out reserve transactions if showReserve is false
  const filteredHistory = showReserve
    ? history
    : history.filter(h => h.cashType !== 'reserve');

  if (filteredHistory.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Számlatörténet</h3>
        </div>
        <p className="text-center text-gray-500 py-4">Nincs tranzakció</p>
      </Card>
    );
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'transfer': return 'Átküldés';
      case 'payment': return 'Kifizetés';
      case 'revision': return 'Revízió';
      default: return type;
    }
  };

  const getTypeVariant = (type) => {
    switch (type) {
      case 'transfer': return 'info';
      case 'payment': return 'warning';
      case 'revision': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Számlatörténet</h3>
      </div>
      <div className="space-y-2">
        {filteredHistory.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={getTypeVariant(item.type)} size="sm">
                    {getTypeLabel(item.type)}
                  </Badge>
                  {showReserve && (
                    <Badge variant={item.cashType === 'cash' ? 'success' : 'info'} size="sm">
                      {item.cashType === 'cash' ? 'Készpénz' : 'Tartalék'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-900 mt-1">{item.description}</p>
                <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
              </div>
            </div>
            <p className={`text-lg font-bold ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
