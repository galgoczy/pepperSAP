import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button, Input, Select, Modal } from '../common';
import { Textarea } from '../common/Input';
import { getToday } from '../../lib/utils';

export default function TransferForm({
  isOpen,
  onClose,
  onSubmit,
  units,
  sourceUnitId,
  sourceType = 'unit',
  isAdmin = false,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    transfer_date: getToday(),
    transfer_type: 'cash',
    destination_type: 'central',
    destination_unit_id: '',
    notes: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        source_type: sourceType,
        source_unit_id: sourceUnitId,
        destination_type: formData.destination_type,
        destination_unit_id: formData.destination_type === 'central' ? null : formData.destination_unit_id,
        amount: parseFloat(formData.amount),
        transfer_date: formData.transfer_date,
        transfer_type: formData.transfer_type,
        notes: formData.notes,
      });
      onClose();
      setFormData({
        amount: '',
        transfer_date: getToday(),
        transfer_type: 'cash',
        destination_type: 'central',
        destination_unit_id: '',
        notes: '',
      });
    } catch (error) {
      // Error handled in hook
    } finally {
      setLoading(false);
    }
  };

  const destinationOptions = [
    { value: 'central', label: 'Központ' },
    ...units
      .filter(u => u.id !== sourceUnitId)
      .map(u => ({ value: u.id, label: u.name })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Átutalás küldése"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Összeg"
          type="number"
          step="1"
          min="1"
          value={formData.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          suffix="Ft"
          required
        />

        <Select
          label="Típus"
          value={formData.transfer_type}
          onChange={(e) => handleChange('transfer_type', e.target.value)}
          options={[
            { value: 'cash', label: 'Készpénz' },
            { value: 'reserve', label: 'Tartalék' },
          ]}
          required
        />

        <Input
          label="Dátum"
          type="date"
          value={formData.transfer_date}
          onChange={(e) => handleChange('transfer_date', e.target.value)}
          max={getToday()}
          required
        />

        <Select
          label="Cél"
          value={formData.destination_type === 'central' ? 'central' : formData.destination_unit_id}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'central') {
              handleChange('destination_type', 'central');
              handleChange('destination_unit_id', '');
            } else {
              handleChange('destination_type', 'unit');
              handleChange('destination_unit_id', value);
            }
          }}
          options={destinationOptions}
          required
        />

        <Textarea
          label="Megjegyzés"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={2}
          placeholder="Opcionális megjegyzés..."
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Mégse
          </Button>
          <Button type="submit" loading={loading}>
            <Send className="h-4 w-4" />
            Küldés
          </Button>
        </div>
      </form>
    </Modal>
  );
}
