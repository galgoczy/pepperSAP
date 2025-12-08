import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Modal } from '../components/common';
import ExpenseList from '../components/expenses/ExpenseList';
import ExpenseForm from '../components/expenses/ExpenseForm';

export default function ExpensesPage() {
  const { isAdmin, unitId } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kifizetések</h1>
          <p className="text-gray-500 mt-1">
            Számlák és kiadások nyilvántartása
          </p>
        </div>

        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Új kifizetés
        </Button>
      </div>

      {/* Expense list */}
      <Card>
        <ExpenseList
          unitId={isAdmin ? null : unitId}
          onEdit={handleEdit}
          isAdmin={isAdmin}
        />
      </Card>

      {/* Expense form modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={handleClose}
        title={editingExpense ? 'Kifizetés szerkesztése' : 'Új kifizetés'}
        size="lg"
      >
        <ExpenseForm
          expense={editingExpense}
          unitId={isAdmin ? null : unitId}
          onSuccess={handleClose}
          onCancel={handleClose}
        />
      </Modal>
    </div>
  );
}
