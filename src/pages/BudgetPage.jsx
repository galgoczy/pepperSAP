import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Save,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Copy,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Modal } from '../components/common';
import { supabase } from '../lib/supabase';
import { formatCurrency, cn } from '../lib/utils';
import toast from 'react-hot-toast';

// Budget statuses
const BUDGET_STATUSES = [
  { value: 'draft', label: 'Tervezet', color: 'gray', icon: Edit2 },
  { value: 'approved', label: 'Jóváhagyott', color: 'blue', icon: CheckCircle },
  { value: 'locked', label: 'Lezárt', color: 'green', icon: Lock },
];

export default function BudgetPage() {
  const { isAdmin, profile } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Current period
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  // Budget form
  const [budgetForm, setBudgetForm] = useState({
    unit_id: '',
    category: '',
    planned_revenue: '',
    planned_cost: '',
    planned_wage_cost: '',
    planned_material_cost: '',
    planned_overhead: '',
    notes: '',
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch budgets for current month
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budget_targets')
        .select(`
          *,
          unit:units!budget_targets_unit_id_fkey(id, name, type)
        `)
        .eq('year_month', currentMonth)
        .order('created_at');
      if (budgetsError) throw budgetsError;

      // Fetch units
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name');
      if (unitsError) throw unitsError;

      setBudgets(budgetsData || []);
      setUnits(unitsData || []);
    } catch (error) {
      console.error('Error fetching budget data:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigate months
  const navigateMonth = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + direction;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  // Format month for display
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const months = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június',
                    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
    return `${year}. ${months[parseInt(month) - 1]}`;
  };

  // Calculate totals
  const getTotals = () => {
    const unitBudgets = budgets.filter(b => b.unit_id);
    return {
      revenue: unitBudgets.reduce((sum, b) => sum + (parseFloat(b.planned_revenue) || 0), 0),
      cost: unitBudgets.reduce((sum, b) => sum + (parseFloat(b.planned_cost) || 0), 0),
      margin: unitBudgets.reduce((sum, b) => sum + (parseFloat(b.planned_margin) || 0), 0),
    };
  };

  // Open modal for new/edit
  const openModal = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setBudgetForm({
        unit_id: budget.unit_id || '',
        category: budget.category || '',
        planned_revenue: budget.planned_revenue || '',
        planned_cost: budget.planned_cost || '',
        planned_wage_cost: budget.planned_wage_cost || '',
        planned_material_cost: budget.planned_material_cost || '',
        planned_overhead: budget.planned_overhead || '',
        notes: budget.notes || '',
      });
    } else {
      setEditingBudget(null);
      setBudgetForm({
        unit_id: '',
        category: '',
        planned_revenue: '',
        planned_cost: '',
        planned_wage_cost: '',
        planned_material_cost: '',
        planned_overhead: '',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  // Save budget
  const handleSaveBudget = async (e) => {
    e.preventDefault();

    if (!budgetForm.unit_id && !budgetForm.category) {
      toast.error('Válassz egységet vagy kategóriát');
      return;
    }

    try {
      const plannedCost = parseFloat(budgetForm.planned_cost) || 0;
      const plannedRevenue = parseFloat(budgetForm.planned_revenue) || 0;

      const data = {
        year_month: currentMonth,
        unit_id: budgetForm.unit_id || null,
        category: budgetForm.category || null,
        planned_revenue: plannedRevenue,
        planned_cost: plannedCost,
        planned_margin: plannedRevenue - plannedCost,
        planned_wage_cost: budgetForm.planned_wage_cost ? parseFloat(budgetForm.planned_wage_cost) : null,
        planned_material_cost: budgetForm.planned_material_cost ? parseFloat(budgetForm.planned_material_cost) : null,
        planned_overhead: budgetForm.planned_overhead ? parseFloat(budgetForm.planned_overhead) : null,
        notes: budgetForm.notes || null,
        updated_by: profile?.id,
      };

      if (editingBudget) {
        const { error } = await supabase
          .from('budget_targets')
          .update(data)
          .eq('id', editingBudget.id);
        if (error) throw error;
        toast.success('Budget frissítve!');
      } else {
        data.created_by = profile?.id;
        data.status = 'draft';
        const { error } = await supabase
          .from('budget_targets')
          .insert(data);
        if (error) throw error;
        toast.success('Budget létrehozva!');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error(error.message?.includes('duplicate') ? 'Ez az egység már rendelkezik budget-tel erre a hónapra' : 'Hiba a mentéskor');
    }
  };

  // Delete budget
  const handleDeleteBudget = async (budget) => {
    if (budget.status === 'locked') {
      toast.error('Lezárt budget nem törölhető');
      return;
    }
    if (!confirm('Biztosan törlöd ezt a budget sort?')) return;

    try {
      const { error } = await supabase
        .from('budget_targets')
        .delete()
        .eq('id', budget.id);
      if (error) throw error;
      toast.success('Budget törölve!');
      fetchData();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Hiba a törléskor');
    }
  };

  // Update budget status
  const handleStatusChange = async (budget, newStatus) => {
    try {
      const { error } = await supabase
        .from('budget_targets')
        .update({ status: newStatus, updated_by: profile?.id })
        .eq('id', budget.id);
      if (error) throw error;
      toast.success(`Státusz: ${BUDGET_STATUSES.find(s => s.value === newStatus)?.label}`);
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Hiba a státusz frissítésekor');
    }
  };

  // Copy from previous month
  const handleCopyFromPrevious = async () => {
    const [year, month] = currentMonth.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear--;
    }
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    try {
      // Get previous month's budgets
      const { data: prevBudgets, error: fetchError } = await supabase
        .from('budget_targets')
        .select('*')
        .eq('year_month', prevMonthStr);
      if (fetchError) throw fetchError;

      if (!prevBudgets || prevBudgets.length === 0) {
        toast.error('Nincs adat az előző hónapban');
        return;
      }

      // Create new budgets for current month
      const newBudgets = prevBudgets.map(b => ({
        year_month: currentMonth,
        unit_id: b.unit_id,
        category: b.category,
        planned_revenue: b.planned_revenue,
        planned_cost: b.planned_cost,
        planned_margin: b.planned_margin,
        planned_wage_cost: b.planned_wage_cost,
        planned_material_cost: b.planned_material_cost,
        planned_overhead: b.planned_overhead,
        notes: `Másolva: ${prevMonthStr}`,
        status: 'draft',
        created_by: profile?.id,
      }));

      const { error: insertError } = await supabase
        .from('budget_targets')
        .insert(newBudgets);
      if (insertError) throw insertError;

      toast.success(`${newBudgets.length} budget másolva az előző hónapból!`);
      setIsCopyModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error copying budgets:', error);
      toast.error('Hiba a másoláskor');
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const s = BUDGET_STATUSES.find(st => st.value === status);
    if (!s) return null;
    const StatusIcon = s.icon;
    const colorClasses = {
      gray: 'bg-gray-100 text-gray-700',
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
    };
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full', colorClasses[s.color])}>
        <StatusIcon className="h-3 w-3" />
        {s.label}
      </span>
    );
  };

  // Get units without budget
  const unitsWithoutBudget = units.filter(u =>
    !budgets.some(b => b.unit_id === u.id)
  );

  const totals = getTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget tervezés</h1>
          <p className="text-gray-500 mt-1">Tervadatok rögzítése időszakra</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsCopyModalOpen(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Másolás előző hónapból
            </Button>
            <Button onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Új budget
            </Button>
          </div>
        )}
      </div>

      {/* Period selector */}
      <Card>
        <div className="p-4 flex items-center justify-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[200px]">
            <h2 className="text-xl font-bold text-gray-900">{formatMonth(currentMonth)}</h2>
            <p className="text-sm text-gray-500">{currentMonth}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tervezett bevétel</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.revenue)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tervezett költség</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.cost)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tervezett fedezet</p>
                <p className={cn(
                  'text-2xl font-bold',
                  totals.margin >= 0 ? 'text-blue-600' : 'text-red-600'
                )}>{formatCurrency(totals.margin)}</p>
              </div>
              <div className={cn(
                'p-3 rounded-lg',
                totals.margin >= 0 ? 'bg-blue-100' : 'bg-red-100'
              )}>
                <DollarSign className={cn(
                  'h-6 w-6',
                  totals.margin >= 0 ? 'text-blue-600' : 'text-red-600'
                )} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Budget list */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Egységek budget-je - {formatMonth(currentMonth)}</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Betöltés...</div>
        ) : budgets.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nincs budget erre a hónapra</p>
            {isAdmin && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="secondary" onClick={() => setIsCopyModalOpen(true)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Másolás előző hónapból
                </Button>
                <Button onClick={() => openModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Új budget
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Egység/Kategória</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Terv bevétel</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Terv költség</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Terv fedezet</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Státusz</th>
                  {isAdmin && <th className="text-right py-3 px-4 font-medium text-gray-600">Műveletek</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {budgets.map(budget => (
                  <tr key={budget.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Building2 className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {budget.unit?.name || budget.category || '-'}
                          </p>
                          {budget.unit?.type && (
                            <p className="text-xs text-gray-500">{budget.unit.type}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-green-600">
                      {formatCurrency(budget.planned_revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-red-600">
                      {formatCurrency(budget.planned_cost)}
                    </td>
                    <td className={cn(
                      'py-3 px-4 text-right font-bold',
                      (budget.planned_margin || 0) >= 0 ? 'text-blue-600' : 'text-red-600'
                    )}>
                      {formatCurrency(budget.planned_margin)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(budget.status)}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          {budget.status !== 'locked' && (
                            <>
                              <button
                                onClick={() => openModal(budget)}
                                className="p-2 text-gray-400 hover:text-pepper-red rounded-lg hover:bg-gray-100"
                                title="Szerkesztés"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(budget, budget.status === 'draft' ? 'approved' : 'locked')}
                                className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100"
                                title={budget.status === 'draft' ? 'Jóváhagyás' : 'Lezárás'}
                              >
                                {budget.status === 'draft' ? <CheckCircle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteBudget(budget)}
                                className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                                title="Törlés"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {budget.status === 'locked' && (
                            <button
                              onClick={() => handleStatusChange(budget, 'approved')}
                              className="p-2 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-gray-100"
                              title="Feloldás"
                            >
                              <Unlock className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td className="py-3 px-4">Összesen</td>
                  <td className="py-3 px-4 text-right text-green-600">{formatCurrency(totals.revenue)}</td>
                  <td className="py-3 px-4 text-right text-red-600">{formatCurrency(totals.cost)}</td>
                  <td className={cn(
                    'py-3 px-4 text-right',
                    totals.margin >= 0 ? 'text-blue-600' : 'text-red-600'
                  )}>{formatCurrency(totals.margin)}</td>
                  <td colSpan={isAdmin ? 2 : 1}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBudget ? 'Budget szerkesztése' : 'Új budget'}
        size="lg"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          {/* Unit or Category selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Egység</label>
              <select
                value={budgetForm.unit_id}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, unit_id: e.target.value, category: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                disabled={!!budgetForm.category}
              >
                <option value="">Válassz egységet...</option>
                {unitsWithoutBudget.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
                {editingBudget?.unit && (
                  <option value={editingBudget.unit_id}>{editingBudget.unit.name}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vagy kategória</label>
              <select
                value={budgetForm.category}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, category: e.target.value, unit_id: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                disabled={!!budgetForm.unit_id}
              >
                <option value="">Válassz kategóriát...</option>
                <option value="events">Rendezvények</option>
                <option value="K0">K0 - Költséghely</option>
                <option value="K00">K00 - Overhead</option>
              </select>
            </div>
          </div>

          {/* Main values */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tervezett bevétel (Ft)</label>
              <input
                type="number"
                value={budgetForm.planned_revenue}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, planned_revenue: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tervezett költség (Ft)</label>
              <input
                type="number"
                value={budgetForm.planned_cost}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, planned_cost: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                placeholder="0"
              />
            </div>
          </div>

          {/* Margin preview */}
          {(budgetForm.planned_revenue || budgetForm.planned_cost) && (
            <div className={cn(
              'p-3 rounded-lg border',
              (parseFloat(budgetForm.planned_revenue) || 0) - (parseFloat(budgetForm.planned_cost) || 0) >= 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-red-50 border-red-200'
            )}>
              <p className="text-sm">
                Tervezett fedezet: <span className="font-bold">
                  {formatCurrency((parseFloat(budgetForm.planned_revenue) || 0) - (parseFloat(budgetForm.planned_cost) || 0))}
                </span>
              </p>
            </div>
          )}

          {/* Detailed cost breakdown */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Költség részletezés (opcionális)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bérköltség</label>
                <input
                  type="number"
                  value={budgetForm.planned_wage_cost}
                  onChange={(e) => setBudgetForm(prev => ({ ...prev, planned_wage_cost: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Anyagköltség</label>
                <input
                  type="number"
                  value={budgetForm.planned_material_cost}
                  onChange={(e) => setBudgetForm(prev => ({ ...prev, planned_material_cost: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rezsi/overhead</label>
                <input
                  type="number"
                  value={budgetForm.planned_overhead}
                  onChange={(e) => setBudgetForm(prev => ({ ...prev, planned_overhead: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red text-sm"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Megjegyzés</label>
            <textarea
              value={budgetForm.notes}
              onChange={(e) => setBudgetForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Opcionális megjegyzés..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              {editingBudget ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Copy Modal */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        title="Budget másolása"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Az előző hónap budget adatai átmásolásra kerülnek a jelenlegi hónapba ({formatMonth(currentMonth)}).
          </p>
          <p className="text-sm text-gray-500">
            A már meglévő sorok nem lesznek felülírva.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsCopyModalOpen(false)}>
              Mégse
            </Button>
            <Button onClick={handleCopyFromPrevious}>
              <Copy className="h-4 w-4 mr-2" />
              Másolás
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
