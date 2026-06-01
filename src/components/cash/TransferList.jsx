import { useState } from 'react';
import { Check, Edit2, ArrowRight, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Card, Button, Badge, Modal, Input } from '../common';
import { formatCurrency, formatDate } from '../../lib/utils';

const STATUS_BADGES = {
  pending: { variant: 'warning', label: 'Függőben', icon: Clock },
  approved: { variant: 'success', label: 'Jóváhagyva', icon: CheckCircle },
  modified: { variant: 'info', label: 'Módosítva', icon: Edit2 },
  cancelled: { variant: 'error', label: 'Törölve', icon: XCircle },
};

export default function TransferList({
  transfers,
  loading,
  onApprove,
  onModify,
  onEdit,
  onDelete,
  currentUnitId,
  currentUserId,
  isAdmin,
  showActions = true,
}) {
  const [modifyModal, setModifyModal] = useState(null);
  const [newAmount, setNewAmount] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (transfers.length === 0) {
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">Nincsenek átküldések</p>
      </Card>
    );
  }

  const handleModifyClick = (transfer) => {
    setModifyModal(transfer);
    setNewAmount(transfer.amount.toString());
  };

  const handleModifySubmit = () => {
    if (modifyModal && newAmount) {
      onModify(modifyModal.id, parseFloat(newAmount));
      setModifyModal(null);
      setNewAmount('');
    }
  };

  const getSourceName = (transfer) => {
    if (transfer.source_type === 'central') return 'Központ';
    return transfer.source_unit?.name || 'Ismeretlen';
  };

  const getDestinationName = (transfer) => {
    if (transfer.destination_type === 'central') return 'Központ';
    return transfer.destination_unit?.name || 'Ismeretlen';
  };

  const handleEditClick = (transfer) => {
    setEditModal(transfer);
    setEditAmount(transfer.amount.toString());
  };

  const handleEditSubmit = () => {
    if (editModal && editAmount) {
      onEdit(editModal.id, parseFloat(editAmount));
      setEditModal(null);
      setEditAmount('');
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const canApprove = (transfer) => {
    if (!showActions) return false;
    if (transfer.status !== 'pending') return false;
    if (isAdmin) return true;
    // Non-admin can approve if they are the destination
    return transfer.destination_unit_id === currentUnitId;
  };

  // A still-pending transfer can be edited/deleted before approval by an admin,
  // by the person who initiated it, OR by a user of the unit that sent it
  // (so the originating unit can always manage its own outgoing transfer, even
  // if initiated_by is missing/old or a different colleague created it).
  const canManageOwn = (transfer) => {
    if (!showActions) return false;
    if (transfer.status !== 'pending') return false;
    if (!onEdit && !onDelete) return false;
    if (isAdmin) return true;
    if (currentUserId && transfer.initiated_by === currentUserId) return true;
    // The sending unit owns its outgoing transfer while it is pending.
    if (currentUnitId && transfer.source_unit_id === currentUnitId) return true;
    return false;
  };

  return (
    <>
      <Card>
        <div className="space-y-3">
          {transfers.map((transfer) => {
            const status = STATUS_BADGES[transfer.status];
            const StatusIcon = status.icon;

            return (
              <div
                key={transfer.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Source -> Destination */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{getSourceName(transfer)}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{getDestinationName(transfer)}</span>
                    </div>

                    {/* Status badge */}
                    <Badge variant={status.variant} size="sm">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>

                    {/* Type badge */}
                    <Badge variant={transfer.transfer_type === 'cash' ? 'info' : 'secondary'} size="sm">
                      {transfer.transfer_type === 'cash' ? 'Készpénz' : 'Tartalék'}
                    </Badge>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(transfer.amount)}
                    </p>
                    {transfer.original_amount && transfer.original_amount !== transfer.amount && (
                      <p className="text-xs text-gray-500 line-through">
                        {formatCurrency(transfer.original_amount)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Details row */}
                <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                  <span>{formatDate(transfer.transfer_date)}</span>
                  {transfer.notes && (
                    <span className="italic">{transfer.notes}</span>
                  )}
                </div>

                {/* Actions */}
                {(canApprove(transfer) || canManageOwn(transfer)) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canApprove(transfer) && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onApprove(transfer.id)}
                        >
                          <Check className="h-4 w-4" />
                          Jóváhagyás
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleModifyClick(transfer)}
                        >
                          <Edit2 className="h-4 w-4" />
                          Módosítás
                        </Button>
                      </>
                    )}
                    {canManageOwn(transfer) && onEdit && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditClick(transfer)}
                      >
                        <Edit2 className="h-4 w-4" />
                        Szerkesztés
                      </Button>
                    )}
                    {canManageOwn(transfer) && onDelete && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleteConfirm(transfer)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Törlés
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modify Modal */}
      <Modal
        isOpen={!!modifyModal}
        onClose={() => setModifyModal(null)}
        title="Összeg módosítása"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Eredeti összeg: <strong>{modifyModal && formatCurrency(modifyModal.amount)}</strong>
          </p>
          <Input
            label="Új összeg"
            type="number"
            step="1"
            min="0"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            suffix="Ft"
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setModifyModal(null)}>
              Mégse
            </Button>
            <Button onClick={handleModifySubmit}>
              Mentés és jóváhagyás
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit (pending, before approval) Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="Átküldés szerkesztése"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Jóváhagyás előtt módosíthatod az összeget. Az átküldés továbbra is függőben marad.
          </p>
          <Input
            label="Összeg"
            type="number"
            step="1"
            min="0"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            suffix="Ft"
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setEditModal(null)}>
              Mégse
            </Button>
            <Button onClick={handleEditSubmit}>
              Mentés
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete (pending, before approval) confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Átküldés törlése"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Biztosan törlöd ezt a függőben lévő átküldést
            {deleteConfirm && <> (<strong>{formatCurrency(deleteConfirm.amount)}</strong>)</>}? Ez a művelet nem vonható vissza.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Mégse
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Törlés
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
