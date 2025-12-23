import { useState } from 'react';
import { Plus, Edit, Trash2, Users, Mail, Shield } from 'lucide-react';
import { useUsers, useUnits } from '../hooks/useSupabase';
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
import toast from 'react-hot-toast';

const roleLabels = {
  admin: 'Adminisztrátor',
  unit: 'Éttermi egység',
  events: 'Rendezvény egység',
};

export default function UsersPage() {
  const { users, loading, updateUser, deleteUser } = useUsers();
  const { units } = useUnits();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', role: 'unit', unit_id: '' });
  const [formLoading, setFormLoading] = useState(false);

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      role: user.role,
      unit_id: user.unit_id || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await updateUser(editingUser.id, formData);
      toast.success('Felhasználó sikeresen frissítve!');
      setIsFormOpen(false);
    } catch {
      toast.error('Hiba történt!');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(deletingUser.id);
      toast.success('Felhasználó sikeresen törölve!');
      setIsDeleteOpen(false);
      setDeletingUser(null);
    } catch {
      toast.error('Hiba történt a törlés során!');
    }
  };

  const unitOptions = units.map((unit) => ({
    value: unit.id,
    label: unit.name,
  }));

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
          <h1 className="text-2xl font-bold text-gray-900">Felhasználók</h1>
          <p className="text-gray-500 mt-1">
            Felhasználói fiókok és jogosultságok kezelése
          </p>
        </div>

        <div className="text-sm text-gray-500 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
          <p>Új felhasználó hozzáadásához használd a Supabase Auth panelt.</p>
        </div>
      </div>

      {/* Users table */}
      <Card>
        {users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Még nincsenek felhasználók"
            description="A felhasználókat a Supabase Auth panelen keresztül hozhatod létre"
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Név</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Szerepkör</TableHeader>
                <TableHeader>Egység</TableHeader>
                <TableHeader align="right">Műveletek</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Mail className="h-4 w-4" />
                      {user.email || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === 'admin'
                          ? 'danger'
                          : user.role === 'events'
                          ? 'primary'
                          : 'info'
                      }
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.units?.name || '-'}</TableCell>
                  <TableCell align="right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Szerkesztés"
                      >
                        <Edit className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingUser(user);
                          setIsDeleteOpen(true);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg"
                        title="Törlés"
                        disabled={user.role === 'admin'}
                      >
                        <Trash2
                          className={`h-4 w-4 ${
                            user.role === 'admin'
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-500'
                          }`}
                        />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Edit form modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Felhasználó szerkesztése"
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
              Mentés
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Teljes név"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />

          <Select
            label="Szerepkör"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'admin', label: 'Adminisztrátor' },
              { value: 'unit', label: 'Éttermi egység' },
              { value: 'events', label: 'Rendezvény egység' },
            ]}
          />

          {formData.role !== 'admin' && (
            <Select
              label="Hozzárendelt egység"
              value={formData.unit_id}
              onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
              options={unitOptions}
              placeholder="Válassz egységet..."
            />
          )}
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingUser(null);
        }}
        onConfirm={handleDelete}
        title="Felhasználó törlése"
        message={`Biztosan törölni szeretnéd "${deletingUser?.full_name}" felhasználót? Ez a művelet visszavonhatatlan.`}
      />
    </div>
  );
}
