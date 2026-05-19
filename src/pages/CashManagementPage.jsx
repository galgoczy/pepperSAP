import { useState } from 'react';
import { Send, Building2, Wallet } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import {
  useUnitBalance,
  useCentralBalance,
  useTransfers,
  useCentralPayments,
  useRevisions,
  usePockets,
} from '../hooks/useCashManagement';
import { Card, Button, Input, Select, Modal } from '../components/common';
import { Textarea } from '../components/common/Input';
import BalanceCard from '../components/cash/BalanceCard';
import TransferForm from '../components/cash/TransferForm';
import TransferList from '../components/cash/TransferList';
import PocketList from '../components/cash/PocketList';
import { formatCurrency, formatDate, getToday } from '../lib/utils';

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
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Házipénztár</h1>
          <p className="text-gray-500 mt-1">Egyenleg és átküldések kezelése</p>
        </div>
      </div>
      <UnitCashViewContent unitId={unitId} units={units} isAdmin={false} />
    </div>
  );
}

// Reusable unit cash view content (used by both regular users and admin when viewing a unit)
function UnitCashViewContent({ unitId, units, isAdmin = false }) {
  const { balance, loading: balanceLoading, refetch: refetchBalance } = useUnitBalance(unitId);
  const {
    transfers,
    loading: transfersLoading,
    createTransfer,
    approveTransfer,
    modifyTransfer,
  } = useTransfers(unitId);
  const [showTransferForm, setShowTransferForm] = useState(false);

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

  return (
    <>
      {/* Action button */}
      <div className="flex justify-end">
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
          currentUnitId={unitId}
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
    </>
  );
}

// Admin/Central view
function AdminCashView({ units }) {
  const [activeTab, setActiveTab] = useState('central');
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const { balance: centralBalance, pocketsTotal, loading: centralLoading, refetch: refetchCentral } = useCentralBalance();
  const {
    transfers,
    loading: transfersLoading,
    createTransfer,
    approveTransfer,
    modifyTransfer,
  } = useTransfers(null); // null = all transfers
  const { payments, loading: paymentsLoading, createPayment } = useCentralPayments();
  const { revisions, loading: revisionsLoading, createRevision } = useRevisions();
  const {
    pockets,
    activePockets,
    totalActivePockets,
    loading: pocketsLoading,
    createPocket,
    returnPartial,
    closePocket,
  } = usePockets();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  const restaurantUnits = units.filter(u => u.type === 'restaurant');
  const pendingTransfers = transfers.filter(t => t.status === 'pending');

  const handleApprove = async (id) => {
    await approveTransfer(id);
    refetchCentral();
  };

  const handleModify = async (id, amount) => {
    await modifyTransfer(id, amount);
    refetchCentral();
  };

  const tabs = [
    { id: 'central', label: 'Központ', icon: Building2 },
    { id: 'transfers', label: `Átküldések${pendingTransfers.length > 0 ? ` (${pendingTransfers.length})` : ''}` },
    { id: 'payments', label: 'Kifizetések' },
    { id: 'revisions', label: 'Revíziók' },
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
            onChange={(e) => setSelectedUnitId(e.target.value || null)}
            options={unitOptions}
            className="w-48"
          />
        </div>
        {/* Render UnitCashView for selected unit */}
        <UnitCashViewContent unitId={selectedUnitId} units={units} isAdmin={true} />
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
          onChange={(e) => setSelectedUnitId(e.target.value || null)}
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
      {activeTab === 'central' && (
        <div className="space-y-6">
          <BalanceCard
            title="Központi pénztár"
            cash={centralBalance.cash}
            reserve={centralBalance.reserve}
            pocketsTotal={pocketsTotal}
            loading={centralLoading}
          />

          {/* Quick actions */}
          <div className="flex gap-3">
            <Button onClick={() => setShowPaymentModal(true)}>
              Kifizetés rögzítése
            </Button>
            <Button variant="secondary" onClick={() => setShowRevisionModal(true)}>
              Revízió
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
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Összes átküldés</h2>
          <TransferList
            transfers={transfers}
            loading={transfersLoading}
            onApprove={handleApprove}
            onModify={handleModify}
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
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Revíziók</h2>
            <Button onClick={() => setShowRevisionModal(true)}>
              Új revízió
            </Button>
          </div>
          <RevisionsList revisions={revisions} loading={revisionsLoading} />
        </div>
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

      {/* Payment Modal */}
      <CentralPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={async (data) => {
          await createPayment(data);
          refetchCentral();
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
function RevisionsList({ revisions, loading }) {
  if (loading) {
    return <Card><div className="animate-pulse h-32 bg-gray-200 rounded"></div></Card>;
  }

  if (revisions.length === 0) {
    return <Card><p className="text-center text-gray-500 py-6">Nincsenek revíziók</p></Card>;
  }

  return (
    <Card>
      <div className="space-y-3">
        {revisions.map((revision) => (
          <div key={revision.id} className="p-4 border border-gray-200 rounded-lg">
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
              <p className={`text-lg font-bold ${revision.discrepancy_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revision.discrepancy_amount >= 0 ? '+' : ''}{formatCurrency(revision.discrepancy_amount)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
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
