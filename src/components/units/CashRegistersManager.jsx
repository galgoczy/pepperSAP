import { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Calculator,
  CreditCard,
  Power,
  PowerOff,
  Pause,
  Play,
} from 'lucide-react';
import { useCashRegisters } from '../../hooks/useSupabase';
import {
  Card,
  Button,
  Modal,
  ConfirmModal,
  Badge,
  Input,
  LoadingSpinner,
} from '../common';
import toast from 'react-hot-toast';

const STATUS_BADGES = {
  active: { variant: 'success', label: 'Aktív', dot: true },
  inactive: { variant: 'default', label: 'Selejtezve', dot: true },
  suspended: { variant: 'warning', label: 'Szüneteltetve', dot: true },
};

export default function CashRegistersManager({ unitId, unitName }) {
  const {
    cashRegisters,
    loading,
    createCashRegister,
    updateCashRegister,
    deactivateCashRegister,
    suspendCashRegister,
    deleteCashRegister,
  } = useCashRegisters(unitId);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [editingRegister, setEditingRegister] = useState(null);
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [formData, setFormData] = useState({
    ap_number: '',
    terminal_number: '',
    name: '',
    notes: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleOpenCreate = () => {
    setEditingRegister(null);
    setFormData({ ap_number: '', terminal_number: '', name: '', notes: '' });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (register) => {
    setEditingRegister(register);
    setFormData({
      ap_number: register.ap_number,
      terminal_number: register.terminal_number || '',
      name: register.name || '',
      notes: register.notes || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const validateApNumber = (value) => {
    const pattern = /^AP[0-9]{1,10}$/;
    return pattern.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validate AP number format
    if (!validateApNumber(formData.ap_number)) {
      setFormError('Az AP szám formátuma: AP + max 10 számjegy (pl. AP1234567890)');
      return;
    }

    setFormLoading(true);

    try {
      if (editingRegister) {
        await updateCashRegister(editingRegister.id, formData);
        toast.success('Pénztárgép sikeresen frissítve!');
      } else {
        await createCashRegister(formData);
        toast.success('Pénztárgép sikeresen létrehozva!');
      }
      setIsFormOpen(false);
    } catch (error) {
      if (error.code === '23505') {
        setFormError('Ez az AP szám már létezik a rendszerben!');
      } else {
        toast.error('Hiba történt a mentés során!');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateCashRegister(selectedRegister.id);
      toast.success('Pénztárgép selejtezve!');
      setIsDeactivateOpen(false);
      setSelectedRegister(null);
    } catch (error) {
      toast.error('Hiba történt a selejtezés során!');
    }
  };

  const handleSuspendToggle = async (register) => {
    try {
      const isSuspended = register.status === 'suspended';
      await suspendCashRegister(register.id, !isSuspended);
      toast.success(isSuspended ? 'Pénztárgép aktiválva!' : 'Pénztárgép szüneteltetve!');
    } catch (error) {
      toast.error('Hiba történt!');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCashRegister(selectedRegister.id);
      toast.success('Pénztárgép törölve!');
      setIsDeleteOpen(false);
      setSelectedRegister(null);
    } catch (error) {
      toast.error('Hiba történt a törlés során!');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const activeRegisters = cashRegisters.filter((r) => r.status !== 'inactive');
  const inactiveRegisters = cashRegisters.filter((r) => r.status === 'inactive');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {unitName} - Pénztárgépek
          </h3>
          <p className="text-sm text-gray-500">
            Pénztárgépek és bankkártya terminálok kezelése
          </p>
        </div>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="h-4 w-4" />
          Új pénztárgép
        </Button>
      </div>

      {/* Active registers */}
      {activeRegisters.length === 0 ? (
        <Card className="text-center py-8">
          <Calculator className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Még nincsenek pénztárgépek</p>
          <Button onClick={handleOpenCreate} className="mt-4" size="sm">
            <Plus className="h-4 w-4" />
            Pénztárgép hozzáadása
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeRegisters.map((register) => (
            <Card key={register.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-pepper-red bg-opacity-10 rounded-lg">
                    <Calculator className="h-6 w-6 text-pepper-red" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-gray-900">
                        {register.ap_number}
                      </span>
                      {register.name && (
                        <span className="text-gray-500">({register.name})</span>
                      )}
                      <Badge {...STATUS_BADGES[register.status]} />
                    </div>
                    {register.terminal_number && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <CreditCard className="h-4 w-4" />
                        Terminál: {register.terminal_number}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {register.status === 'active' && (
                    <button
                      onClick={() => handleSuspendToggle(register)}
                      className="p-2 hover:bg-yellow-50 rounded-lg"
                      title="Szüneteltetés"
                    >
                      <Pause className="h-4 w-4 text-yellow-600" />
                    </button>
                  )}
                  {register.status === 'suspended' && (
                    <button
                      onClick={() => handleSuspendToggle(register)}
                      className="p-2 hover:bg-green-50 rounded-lg"
                      title="Aktiválás"
                    >
                      <Play className="h-4 w-4 text-green-600" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(register)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Szerkesztés"
                  >
                    <Edit className="h-4 w-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRegister(register);
                      setIsDeactivateOpen(true);
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg"
                    title="Selejtezés"
                  >
                    <PowerOff className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Inactive registers (collapsed) */}
      {inactiveRegisters.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Selejtezett pénztárgépek ({inactiveRegisters.length})
          </summary>
          <div className="mt-2 space-y-2">
            {inactiveRegisters.map((register) => (
              <Card key={register.id} className="p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="font-mono text-gray-500">
                        {register.ap_number}
                      </span>
                      {register.name && (
                        <span className="text-gray-400 ml-2">({register.name})</span>
                      )}
                    </div>
                    <Badge {...STATUS_BADGES[register.status]} />
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRegister(register);
                      setIsDeleteOpen(true);
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg"
                    title="Véglegesen törlés"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </details>
      )}

      {/* Form modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingRegister ? 'Pénztárgép szerkesztése' : 'Új pénztárgép'}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsFormOpen(false)}
              disabled={formLoading}
            >
              Mégse
            </Button>
            <Button onClick={handleSubmit} loading={formLoading}>
              {editingRegister ? 'Mentés' : 'Létrehozás'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {formError}
            </div>
          )}

          <Input
            label="AP szám"
            value={formData.ap_number}
            onChange={(e) =>
              setFormData({ ...formData, ap_number: e.target.value.toUpperCase() })
            }
            required
            placeholder="AP1234567890"
            helper="Formátum: AP + max 10 számjegy"
            disabled={!!editingRegister}
          />

          <Input
            label="Terminál szám"
            value={formData.terminal_number}
            onChange={(e) =>
              setFormData({ ...formData, terminal_number: e.target.value })
            }
            placeholder="A bankkártya terminál azonosítója"
          />

          <Input
            label="Megnevezés (opcionális)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="pl. Főkassza, Terasz kassza"
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Megjegyzés (opcionális)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
              placeholder="Egyéb megjegyzések..."
            />
          </div>
        </form>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmModal
        isOpen={isDeactivateOpen}
        onClose={() => {
          setIsDeactivateOpen(false);
          setSelectedRegister(null);
        }}
        onConfirm={handleDeactivate}
        title="Pénztárgép selejtezése"
        message={`Biztosan selejtezni szeretnéd a "${selectedRegister?.ap_number}" pénztárgépet? A selejtezett pénztárgépek nem jelennek meg a napi adatrögzítésnél.`}
        confirmText="Selejtezés"
        variant="danger"
      />

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedRegister(null);
        }}
        onConfirm={handleDelete}
        title="Pénztárgép törlése"
        message={`Biztosan véglegesen törölni szeretnéd a "${selectedRegister?.ap_number}" pénztárgépet? Ez a művelet visszavonhatatlan.`}
        confirmText="Törlés"
        variant="danger"
      />
    </div>
  );
}
