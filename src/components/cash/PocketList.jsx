import { useState } from 'react';
import { Wallet, Plus, RotateCcw, X, Calendar } from 'lucide-react';
import { Card, Button, Badge, Modal, Input } from '../common';
import { Textarea } from '../common/Input';
import { formatCurrency, formatDate, getToday } from '../../lib/utils';

export default function PocketList({
  pockets,
  activePockets,
  totalActivePockets,
  loading,
  onCreatePocket,
  onReturnPartial,
  onClosePocket,
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [returnModal, setReturnModal] = useState(null);
  const [closeModal, setCloseModal] = useState(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    amount: '',
    expected_return_date: '',
  });
  const [returnAmount, setReturnAmount] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  const handleCreate = async () => {
    await onCreatePocket({
      name: createForm.name,
      description: createForm.description,
      amount: parseFloat(createForm.amount),
      expected_return_date: createForm.expected_return_date || null,
    });
    setShowCreateModal(false);
    setCreateForm({ name: '', description: '', amount: '', expected_return_date: '' });
  };

  const handleReturn = async () => {
    await onReturnPartial(returnModal.id, parseFloat(returnAmount), returnNotes);
    setReturnModal(null);
    setReturnAmount('');
    setReturnNotes('');
  };

  const handleClose = async () => {
    await onClosePocket(closeModal.id, closeNotes);
    setCloseModal(null);
    setCloseNotes('');
  };

  return (
    <>
      <Card>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-600" />
              Zsebek
            </h3>
            {totalActivePockets > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Összesen elkülönítve: <strong className="text-amber-600">{formatCurrency(totalActivePockets)}</strong>
              </p>
            )}
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Új zseb
          </Button>
        </div>

        {/* Active pockets */}
        {activePockets.length === 0 ? (
          <p className="text-center text-gray-500 py-6">Nincsenek aktív zsebek</p>
        ) : (
          <div className="space-y-3">
            {activePockets.map((pocket) => (
              <div
                key={pocket.id}
                className="p-4 border border-amber-200 rounded-lg bg-amber-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{pocket.name}</h4>
                    {pocket.description && (
                      <p className="text-sm text-gray-600 mt-1">{pocket.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>Létrehozva: {formatDate(pocket.created_at)}</span>
                      {pocket.expected_return_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Várható: {formatDate(pocket.expected_return_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-amber-700">
                      {formatCurrency(pocket.current_amount)}
                    </p>
                    {pocket.initial_amount !== pocket.current_amount && (
                      <p className="text-xs text-gray-500">
                        Eredeti: {formatCurrency(pocket.initial_amount)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setReturnModal(pocket);
                      setReturnAmount('');
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Részleges visszafizetés
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCloseModal(pocket)}
                  >
                    <X className="h-4 w-4" />
                    Lezárás
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Closed pockets (collapsed) */}
        {pockets.filter(p => p.status === 'closed').length > 0 && (
          <details className="mt-6">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Lezárt zsebek ({pockets.filter(p => p.status === 'closed').length})
            </summary>
            <div className="mt-3 space-y-2">
              {pockets.filter(p => p.status === 'closed').map((pocket) => (
                <div
                  key={pocket.id}
                  className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{pocket.name}</span>
                      <Badge variant="secondary" size="sm" className="ml-2">Lezárt</Badge>
                    </div>
                    <span className="text-gray-500">
                      {formatCurrency(pocket.initial_amount)} • {formatDate(pocket.closed_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Új zseb létrehozása"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Név"
            value={createForm.name}
            onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="pl. Zsolti - rendezvény"
            required
          />
          <Textarea
            label="Leírás"
            value={createForm.description}
            onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
            placeholder="Opcionális megjegyzés..."
          />
          <Input
            label="Összeg"
            type="number"
            step="1"
            min="1"
            value={createForm.amount}
            onChange={(e) => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
            suffix="Ft"
            required
          />
          <Input
            label="Várható visszafizetés (opcionális)"
            type="date"
            value={createForm.expected_return_date}
            onChange={(e) => setCreateForm(prev => ({ ...prev, expected_return_date: e.target.value }))}
            min={getToday()}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Mégse
            </Button>
            <Button onClick={handleCreate} disabled={!createForm.name || !createForm.amount}>
              Létrehozás
            </Button>
          </div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal
        isOpen={!!returnModal}
        onClose={() => setReturnModal(null)}
        title="Részleges visszafizetés"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Zseb: <strong>{returnModal?.name}</strong><br />
            Jelenlegi összeg: <strong>{returnModal && formatCurrency(returnModal.current_amount)}</strong>
          </p>
          <Input
            label="Visszafizetett összeg"
            type="number"
            step="1"
            min="1"
            max={returnModal?.current_amount}
            value={returnAmount}
            onChange={(e) => setReturnAmount(e.target.value)}
            suffix="Ft"
            required
          />
          <Textarea
            label="Megjegyzés"
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setReturnModal(null)}>
              Mégse
            </Button>
            <Button onClick={handleReturn} disabled={!returnAmount}>
              Visszafizetés
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close Modal */}
      <Modal
        isOpen={!!closeModal}
        onClose={() => setCloseModal(null)}
        title="Zseb lezárása"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Zseb: <strong>{closeModal?.name}</strong><br />
            Visszakerülő összeg: <strong>{closeModal && formatCurrency(closeModal.current_amount)}</strong>
          </p>
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            A zseb lezárásával a teljes fennmaradó összeg visszakerül a központi pénztárba.
          </p>
          <Textarea
            label="Megjegyzés"
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setCloseModal(null)}>
              Mégse
            </Button>
            <Button onClick={handleClose}>
              Lezárás
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
