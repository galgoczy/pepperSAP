import { Modal } from '../common';
import ExpenseForm from './ExpenseForm';
import EfoPaymentForm from './EfoPaymentForm';
import WagePaymentForm from './WagePaymentForm';

const TITLES = {
  expense: 'Kifizetés szerkesztése',
  efo: 'EFO kifizetés szerkesztése',
  wage: 'Heti bér szerkesztése',
};

// Opens the correct edit form for a normalized payment item (from
// usePaymentItems). Used everywhere payments are listed so editing/deleting
// EFO and wage payments works the same as regular invoices.
//
// `item` is the normalized payment item ({ kind, raw, ... }) or null/undefined
// when nothing is being edited. All three forms call onSuccess after a save or
// delete, so `onSaved` is wired there to refresh the list.
export default function PaymentEditModal({ item, unitId, onClose, onSaved }) {
  const kind = item?.kind;

  const handleDone = () => {
    onSaved?.();
    onClose?.();
  };

  return (
    <Modal
      isOpen={!!item}
      onClose={onClose}
      title={kind ? TITLES[kind] : ''}
      size="lg"
    >
      {kind === 'expense' && (
        <ExpenseForm
          expense={item.raw}
          unitId={unitId}
          onSuccess={handleDone}
          onCancel={onClose}
        />
      )}
      {kind === 'efo' && (
        <EfoPaymentForm
          payment={item.raw}
          unitId={unitId}
          onSuccess={handleDone}
          onCancel={onClose}
        />
      )}
      {kind === 'wage' && (
        <WagePaymentForm
          payment={item.raw}
          unitId={unitId}
          onSuccess={handleDone}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}
