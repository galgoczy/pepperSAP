import { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Calculator,
  CreditCard,
  PowerOff,
  Pause,
  Play,
  ArrowRightLeft,
} from 'lucide-react';
import { useCashRegisters, useUnits } from '../../hooks/useSupabase';
import {
  Card,
  Button,
  Modal,
  ConfirmModal,
  Badge,
  Input,
  Select,
  DateInput,
  LoadingSpinner,
} from '../common';
import { getToday } from '../../lib/utils';
import toast from 'react-hot-toast';

const STATUS_BADGES = {
  active: { variant: 'success', label: 'Aktív', dot: true },
  inactive: { variant: 'default', label: 'Selejtezve', dot: true },
  suspended: { variant: 'warning', label: 'Szüneteltetve', dot: true },
};

export default function CashRegistersManager({ unitId, unitName }) {
  const {
    cashRegisters,
    assignments,
    loading,
    createCashRegister,
    updateCashRegister,
    updateAssignmentStart,
    deactivateCashRegister,
    suspendCashRegister,
    moveCashRegister,
    getCashRegisterRevenueCount,
    deleteCashRegister,
  } = useCashRegisters(unitId);
  const { units } = useUnits();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveData, setMoveData] = useState({ toUnitId: '', effectiveDate: getToday() });
  const [moveLoading, setMoveLoading] = useState(false);
  const [deleteRevenueCount, setDeleteRevenueCount] = useState(null);
  const [editingRegister, setEditingRegister] = useState(null);
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [formData, setFormData] = useState({
    ap_number: '',
    terminal_number: '',
    name: '',
    notes: '',
    default_change_amount: '',
    valid_from: getToday(),
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleOpenCreate = () => {
    setEditingRegister(null);
    setFormData({ ap_number: '', terminal_number: '', name: '', notes: '', default_change_amount: '', valid_from: getToday() });
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
      default_change_amount: register.default_change_amount ?? '',
      // The current "érvényes ettől" date at this unit (editable, e.g. to move
      // the start back when earlier closures turn out to exist).
      valid_from: assignments[register.id]?.start_date || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const validateApNumber = (value) => {
    // Format: AP + optional letter (A-Z) + 1-10 digits (e.g., AP12345678 or APA12345678)
    const pattern = /^AP[A-Z]?[0-9]{1,10}$/;
    return pattern.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validate AP number format
    if (!validateApNumber(formData.ap_number)) {
      setFormError('Az AP szám formátuma: AP + opcionális betű + max 10 számjegy (pl. APA12345678)');
      return;
    }

    setFormLoading(true);

    try {
      // valid_from is an assignment property, not a cash_registers column.
      const { valid_from, ...registerFields } = formData;
      const payload = {
        ...registerFields,
        default_change_amount:
          registerFields.default_change_amount === '' ? null : parseFloat(registerFields.default_change_amount),
      };
      if (editingRegister) {
        await updateCashRegister(editingRegister.id, payload);
        const currentStart = assignments[editingRegister.id]?.start_date || '';
        if (valid_from && valid_from !== currentStart) {
          try {
            await updateAssignmentStart(editingRegister.id, valid_from);
          } catch (assignError) {
            // The register fields are already saved; only the date failed.
            setFormError(assignError?.message || 'Az érvényesség dátumát nem sikerült módosítani.');
            return;
          }
        }
        toast.success('Pénztárgép sikeresen frissítve!');
      } else {
        await createCashRegister(payload, valid_from);
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
    } catch {
      toast.error('Hiba történt a selejtezés során!');
    }
  };

  const handleSuspendToggle = async (register) => {
    try {
      const isSuspended = register.status === 'suspended';
      await suspendCashRegister(register.id, !isSuspended);
      toast.success(isSuspended ? 'Pénztárgép aktiválva!' : 'Pénztárgép szüneteltetve!');
    } catch {
      toast.error('Hiba történt!');
    }
  };

  const handleOpenMove = (register) => {
    setSelectedRegister(register);
    setMoveData({ toUnitId: '', effectiveDate: getToday() });
    setIsMoveOpen(true);
  };

  const handleMove = async () => {
    if (!moveData.toUnitId) {
      toast.error('Válassz cél egységet!');
      return;
    }
    setMoveLoading(true);
    try {
      await moveCashRegister(selectedRegister.id, moveData.toUnitId, moveData.effectiveDate);
      toast.success('Pénztárgép áthelyezve! A múltbeli forgalom a régi egységnél marad.');
      setIsMoveOpen(false);
      setSelectedRegister(null);
    } catch {
      toast.error('Hiba történt az áthelyezés során!');
    } finally {
      setMoveLoading(false);
    }
  };

  const handleOpenDelete = async (register) => {
    setSelectedRegister(register);
    setDeleteRevenueCount(null);
    setIsDeleteOpen(true);
    // Check whether the register has recorded revenue (blocks deletion).
    const count = await getCashRegisterRevenueCount(register.id);
    setDeleteRevenueCount(count);
  };

  const handleDelete = async () => {
    try {
      await deleteCashRegister(selectedRegister.id);
      toast.success('Pénztárgép törölve!');
      setIsDeleteOpen(false);
      setSelectedRegister(null);
    } catch (error) {
      // The DB trigger blocks deletion when revenue exists.
      toast.error(error?.message || 'Hiba történt a törlés során!');
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
                    {assignments[register.id]?.start_date && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Érvényes: {assignments[register.id].start_date}-től
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
                    onClick={() => handleOpenMove(register)}
                    className="p-2 hover:bg-blue-50 rounded-lg"
                    title="Áthelyezés másik egységbe"
                  >
                    <ArrowRightLeft className="h-4 w-4 text-blue-500" />
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
                    onClick={() => handleOpenDelete(register)}
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
            placeholder="APA12345678"
            helper="Formátum: AP + opcionális betű + max 10 számjegy"
            disabled={!!editingRegister}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Érvényes ettől{!editingRegister && <span className="text-red-500 ml-1">*</span>}
            </label>
            <DateInput
              value={formData.valid_from}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              max={getToday()}
              required={!editingRegister}
            />
            <p className="text-xs text-gray-500">
              {editingRegister
                ? 'Ettől a naptól kínálja fel a napi rögzítés ennél az egységnél. Ha ' +
                  'korábbi zárások is voltak a gépen, told vissza a dátumot – a már ' +
                  'rögzített forgalomhoz nem nyúl, csak a korábbi napok is szerkeszthetők lesznek.'
                : 'Ettől a naptól jelenik meg a napi rögzítésnél. Korábbi statisztikába ' +
                  'nem kerül bele. Régi adat importjához állíts be korábbi dátumot.'}
            </p>
          </div>

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

          <Input
            label="Alapértelmezett váltópénz (opcionális)"
            type="number"
            step="1"
            min="0"
            value={formData.default_change_amount}
            onChange={(e) => setFormData({ ...formData, default_change_amount: e.target.value })}
            suffix="Ft"
            placeholder="pl. 30000"
            helper="A napi jelentésben ebből összegződik a váltópénz alapértéke"
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

      {/* Delete confirm (data-aware: blocked when revenue exists) */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedRegister(null);
        }}
        title="Pénztárgép törlése"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteOpen(false);
                setSelectedRegister(null);
              }}
            >
              Mégse
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleteRevenueCount === null || deleteRevenueCount > 0}
            >
              Törlés
            </Button>
          </>
        }
      >
        {deleteRevenueCount === null ? (
          <p className="text-sm text-gray-500">Adatok ellenőrzése…</p>
        ) : deleteRevenueCount > 0 ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Ehhez a pénztárgéphez <strong>{deleteRevenueCount}</strong> rögzített
            forgalmi nap tartozik, ezért <strong>nem törölhető</strong> (a múltbeli
            adatok elvesznének). Használd helyette a <strong>Selejtezés</strong>t –
            a régi adatok megmaradnak, a gép pedig eltűnik a napi rögzítésből.
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Ehhez a pénztárgéphez nincs rögzített forgalom. Biztosan véglegesen
            törlöd a(z) „{selectedRegister?.ap_number}" pénztárgépet? Ez a művelet
            visszavonhatatlan.
          </p>
        )}
      </Modal>

      {/* Move to another unit */}
      <Modal
        isOpen={isMoveOpen}
        onClose={() => {
          setIsMoveOpen(false);
          setSelectedRegister(null);
        }}
        title="Pénztárgép áthelyezése"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsMoveOpen(false);
                setSelectedRegister(null);
              }}
              disabled={moveLoading}
            >
              Mégse
            </Button>
            <Button onClick={handleMove} loading={moveLoading} disabled={!moveData.toUnitId}>
              Áthelyezés
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            A(z) <strong>{selectedRegister?.ap_number}</strong> pénztárgép másik
            egységbe helyezése. Az AP-szám változatlan marad. A megadott dátumig
            rögzített forgalom a jelenlegi egységnél (<strong>{unitName}</strong>)
            marad, az új forgalom az új egységhez kerül.
          </p>
          <Select
            label="Cél egység"
            value={moveData.toUnitId}
            onChange={(e) => setMoveData((p) => ({ ...p, toUnitId: e.target.value }))}
            options={units
              .filter((u) => u.id !== unitId && u.type === 'restaurant')
              .map((u) => ({ value: u.id, label: u.name }))}
            placeholder="Válassz egységet..."
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Áthelyezés dátuma<span className="text-red-500 ml-1">*</span>
            </label>
            <DateInput
              value={moveData.effectiveDate}
              onChange={(e) => setMoveData((p) => ({ ...p, effectiveDate: e.target.value }))}
              max={getToday()}
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
