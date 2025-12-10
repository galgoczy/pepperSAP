import { useState } from 'react';
import { Plus, Edit, Trash2, Building2, Calculator } from 'lucide-react';
import { useUnits } from '../hooks/useSupabase';
import {
  Card,
  Button,
  Modal,
  ConfirmModal,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  Badge,
  EmptyState,
  Input,
  Select,
  LoadingSpinner,
} from '../components/common';
import CashRegistersManager from '../components/units/CashRegistersManager';
import { UNIT_TYPES } from '../lib/utils';
import toast from 'react-hot-toast';

export default function UnitsPage() {
  const { units, loading, createUnit, updateUnit, deleteUnit } = useUnits();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCashRegistersOpen, setIsCashRegistersOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(null);
  const [selectedUnitForRegisters, setSelectedUnitForRegisters] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'restaurant' });
  const [formLoading, setFormLoading] = useState(false);

  const handleOpenCreate = () => {
    setEditingUnit(null);
    setFormData({ name: '', type: 'restaurant' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (unit) => {
    setEditingUnit(unit);
    setFormData({ name: unit.name, type: unit.type });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, formData);
        toast.success('Egység sikeresen frissítve!');
      } else {
        await createUnit(formData);
        toast.success('Egység sikeresen létrehozva!');
      }
      setIsFormOpen(false);
    } catch (error) {
      toast.error('Hiba történt!');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUnit(deletingUnit.id);
      toast.success('Egység sikeresen törölve!');
      setIsDeleteOpen(false);
      setDeletingUnit(null);
    } catch (error) {
      toast.error('Hiba történt a törlés során!');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Egységek</h1>
          <p className="text-gray-500 mt-1">
            Éttermi és rendezvény egységek kezelése
          </p>
        </div>

        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" />
          Új egység
        </Button>
      </div>

      {/* Units table */}
      <Card>
        {units.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Még nincsenek egységek"
            description="Hozd létre az első egységet a kezdéshez"
            action={
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                Új egység
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Név</TableHeader>
                <TableHeader>Típus</TableHeader>
                <TableHeader>Státusz</TableHeader>
                <TableHeader align="right">Műveletek</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>
                    <Badge variant={unit.type === 'restaurant' ? 'info' : 'primary'}>
                      {UNIT_TYPES[unit.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={unit.is_active ? 'success' : 'default'} dot>
                      {unit.is_active ? 'Aktív' : 'Inaktív'}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex justify-end gap-1">
                      {unit.type === 'restaurant' && (
                        <button
                          onClick={() => {
                            setSelectedUnitForRegisters(unit);
                            setIsCashRegistersOpen(true);
                          }}
                          className="p-2 hover:bg-pepper-red hover:bg-opacity-10 rounded-lg"
                          title="Pénztárgépek"
                        >
                          <Calculator className="h-4 w-4 text-pepper-red" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(unit)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Szerkesztés"
                      >
                        <Edit className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingUnit(unit);
                          setIsDeleteOpen(true);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg"
                        title="Törlés"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Form modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingUnit ? 'Egység szerkesztése' : 'Új egység'}
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
            <Button
              onClick={handleSubmit}
              loading={formLoading}
            >
              {editingUnit ? 'Mentés' : 'Létrehozás'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Egység neve"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="pl. Központi Étterem"
          />

          <Select
            label="Típus"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: 'restaurant', label: 'Étterem' },
              { value: 'events', label: 'Rendezvény' },
            ]}
          />
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingUnit(null);
        }}
        onConfirm={handleDelete}
        title="Egység törlése"
        message={`Biztosan törölni szeretnéd a "${deletingUnit?.name}" egységet? Ez a művelet visszavonhatatlan és törli az összes kapcsolódó adatot.`}
      />

      {/* Cash registers modal */}
      <Modal
        isOpen={isCashRegistersOpen}
        onClose={() => {
          setIsCashRegistersOpen(false);
          setSelectedUnitForRegisters(null);
        }}
        title="Pénztárgépek kezelése"
        size="lg"
      >
        {selectedUnitForRegisters && (
          <CashRegistersManager
            unitId={selectedUnitForRegisters.id}
            unitName={selectedUnitForRegisters.name}
          />
        )}
      </Modal>
    </div>
  );
}
