import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Printer,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEvent } from '../hooks/useEvents';
import {
  Card,
  Button,
  Modal,
  ConfirmModal,
  Badge,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  EmptyState,
  LoadingSpinner,
} from '../components/common';
import EventForm from '../components/events/EventForm';
import EventRevenueForm from '../components/events/EventRevenueForm';
import EventExpenseForm from '../components/events/EventExpenseForm';
import { formatDate, formatCurrency, EVENT_TYPES, PAYMENT_METHODS } from '../lib/utils';

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, unitId } = useAuth();

  const {
    event,
    revenues,
    expenses,
    loading,
    updateEvent,
    deleteEvent,
    createRevenue,
    updateRevenue,
    deleteRevenue,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useEvent(id);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRevenueOpen, setIsRevenueOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!event) {
    return (
      <Card>
        <EmptyState
          title="Rendezvény nem található"
          description="A keresett rendezvény nem létezik vagy törlésre került"
          action={
            <Button onClick={() => navigate('/events')}>
              Vissza a listához
            </Button>
          }
        />
      </Card>
    );
  }

  const totalRevenue = revenues.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const profit = totalRevenue - totalExpenses;

  const handleDelete = async () => {
    await deleteEvent();
    navigate('/events');
  };

  const handleDeleteRevenue = async () => {
    if (deleteTarget?.type === 'revenue') {
      await deleteRevenue(deleteTarget.id);
    } else if (deleteTarget?.type === 'expense') {
      await deleteExpense(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 no-print">
        <button
          onClick={() => navigate('/events')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="primary">
              {EVENT_TYPES[event.event_type] || event.event_type}
            </Badge>
            <span className="text-gray-500">{formatDate(event.event_date)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Nyomtatás
          </Button>
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4" />
            Szerkesztés
          </Button>
          <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Összes bevétel</p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600 font-medium">Összes költség</p>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
          </div>
        </Card>

        <Card className={profit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${profit >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              {profit >= 0 ? (
                <TrendingUp className={`h-6 w-6 ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              ) : (
                <TrendingDown className="h-6 w-6 text-orange-600" />
              )}
            </div>
            <div>
              <p className={`text-sm font-medium ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                Eredmény
              </p>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Description */}
      {event.description && (
        <Card title="Leírás">
          <p className="text-gray-600">{event.description}</p>
        </Card>
      )}

      {/* Revenues */}
      <Card
        title="Bevételek"
        action={
          <Button size="sm" onClick={() => setIsRevenueOpen(true)} className="no-print">
            <Plus className="h-4 w-4" />
            Új bevétel
          </Button>
        }
      >
        {revenues.length === 0 ? (
          <EmptyState
            title="Még nincsenek bevételek"
            description="Add hozzá az első bevételi tételt"
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Partner</TableHeader>
                <TableHeader>Dátum</TableHeader>
                <TableHeader>Fizetés</TableHeader>
                <TableHeader align="right">Összeg</TableHeader>
                <TableHeader align="right" className="no-print">Műveletek</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {revenues.map((revenue) => (
                <TableRow key={revenue.id}>
                  <TableCell className="font-medium">{revenue.partner_name}</TableCell>
                  <TableCell>{formatDate(revenue.invoice_date)}</TableCell>
                  <TableCell>{PAYMENT_METHODS[revenue.payment_method]}</TableCell>
                  <TableCell align="right" className="font-semibold text-green-600">
                    {formatCurrency(revenue.amount, revenue.currency)}
                  </TableCell>
                  <TableCell align="right" className="no-print">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditingRevenue(revenue);
                          setIsRevenueOpen(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: 'revenue', id: revenue.id })}
                        className="p-1 hover:bg-red-50 rounded"
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

      {/* Expenses */}
      <Card
        title="Költségek"
        action={
          <Button size="sm" onClick={() => setIsExpenseOpen(true)} className="no-print">
            <Plus className="h-4 w-4" />
            Új költség
          </Button>
        }
      >
        {expenses.length === 0 ? (
          <EmptyState
            title="Még nincsenek költségek"
            description="Add hozzá az első költség tételt"
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Szállító</TableHeader>
                <TableHeader>Tétel</TableHeader>
                <TableHeader>Dátum</TableHeader>
                <TableHeader>Fizetés</TableHeader>
                <TableHeader align="right">Összeg</TableHeader>
                <TableHeader align="right" className="no-print">Műveletek</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.supplier_name}</TableCell>
                  <TableCell>{expense.item_description || '-'}</TableCell>
                  <TableCell>{formatDate(expense.invoice_date)}</TableCell>
                  <TableCell>{PAYMENT_METHODS[expense.payment_method]}</TableCell>
                  <TableCell align="right" className="font-semibold text-red-600">
                    {formatCurrency(expense.amount, expense.currency)}
                  </TableCell>
                  <TableCell align="right" className="no-print">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditingExpense(expense);
                          setIsExpenseOpen(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: 'expense', id: expense.id })}
                        className="p-1 hover:bg-red-50 rounded"
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

      {/* Edit Event Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Rendezvény szerkesztése"
        size="md"
      >
        <EventForm
          event={event}
          onSuccess={async (data) => {
            await updateEvent(data);
            setIsEditOpen(false);
          }}
          onCancel={() => setIsEditOpen(false)}
        />
      </Modal>

      {/* Delete Event Confirm */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Rendezvény törlése"
        message={`Biztosan törölni szeretnéd a "${event.name}" rendezvényt? Ez a művelet visszavonhatatlan és törli az összes kapcsolódó bevételt és költséget.`}
      />

      {/* Revenue Form Modal */}
      <Modal
        isOpen={isRevenueOpen}
        onClose={() => {
          setIsRevenueOpen(false);
          setEditingRevenue(null);
        }}
        title={editingRevenue ? 'Bevétel szerkesztése' : 'Új bevétel'}
        size="lg"
      >
        <EventRevenueForm
          revenue={editingRevenue}
          eventId={id}
          unitId={event.unit_id}
          onSuccess={async (data) => {
            if (editingRevenue) {
              await updateRevenue(editingRevenue.id, data);
            } else {
              await createRevenue(data);
            }
            setIsRevenueOpen(false);
            setEditingRevenue(null);
          }}
          onCancel={() => {
            setIsRevenueOpen(false);
            setEditingRevenue(null);
          }}
        />
      </Modal>

      {/* Expense Form Modal */}
      <Modal
        isOpen={isExpenseOpen}
        onClose={() => {
          setIsExpenseOpen(false);
          setEditingExpense(null);
        }}
        title={editingExpense ? 'Költség szerkesztése' : 'Új költség'}
        size="lg"
      >
        <EventExpenseForm
          expense={editingExpense}
          eventId={id}
          unitId={event.unit_id}
          onSuccess={async (data) => {
            if (editingExpense) {
              await updateExpense(editingExpense.id, data);
            } else {
              await createExpense(data);
            }
            setIsExpenseOpen(false);
            setEditingExpense(null);
          }}
          onCancel={() => {
            setIsExpenseOpen(false);
            setEditingExpense(null);
          }}
        />
      </Modal>

      {/* Delete Revenue/Expense Confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteRevenue}
        title={deleteTarget?.type === 'revenue' ? 'Bevétel törlése' : 'Költség törlése'}
        message="Biztosan törölni szeretnéd ezt a tételt? Ez a művelet visszavonhatatlan."
      />
    </div>
  );
}
