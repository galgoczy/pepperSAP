import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Percent,
  Tag,
  Calendar,
  Users,
  Package,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calculator,
  Clock,
  Hash,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Modal } from '../components/common';
import { supabase } from '../lib/supabase';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import toast from 'react-hot-toast';

// Discount types
const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Százalékos', icon: Percent },
  { value: 'fixed_amount', label: 'Fix összeg', icon: DollarSign },
];

// Condition types
const CONDITION_TYPES = [
  { value: 'none', label: 'Nincs feltétel', icon: Tag, description: 'Mindig érvényes' },
  { value: 'quantity', label: 'Mennyiségi', icon: Hash, description: 'Minimum darabszám felett' },
  { value: 'period', label: 'Időszaki', icon: Calendar, description: 'Adott időszakban érvényes' },
  { value: 'value_threshold', label: 'Értékhatár', icon: DollarSign, description: 'Minimum érték felett' },
  { value: 'customer', label: 'Törzsvásárló', icon: Users, description: 'Kiválasztott ügyfeleknek' },
];

export default function DiscountsPage() {
  const { user, isAdmin } = useAuth();
  const [discounts, setDiscounts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    condition: '',
    showInactive: false,
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    discount_type: 'percentage',
    value: '',
    condition_type: 'none',
    min_quantity: '',
    min_value: '',
    valid_from: '',
    valid_to: '',
    customer_ids: [],
    is_active: true,
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('discount_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (!filters.showInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch companies for customer selection
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .or('type.eq.customer,type.eq.both')
        .order('name');

      setDiscounts(data || []);
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [filters.showInactive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter discounts
  const filteredDiscounts = useMemo(() => {
    let result = [...discounts];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(d =>
        d.name.toLowerCase().includes(searchLower) ||
        d.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.condition) {
      result = result.filter(d => d.condition_type === filters.condition);
    }

    return result;
  }, [discounts, filters]);

  // Stats
  const stats = useMemo(() => ({
    total: discounts.length,
    active: discounts.filter(d => d.is_active).length,
    percentage: discounts.filter(d => d.discount_type === 'percentage').length,
    quantity: discounts.filter(d => d.condition_type === 'quantity').length,
    period: discounts.filter(d => d.condition_type === 'period').length,
  }), [discounts]);

  // Open modal
  const openModal = (discount = null) => {
    if (discount) {
      setEditingDiscount(discount);
      setForm({
        name: discount.name,
        description: discount.description || '',
        discount_type: discount.discount_type,
        value: discount.value.toString(),
        condition_type: discount.condition_type,
        min_quantity: discount.min_quantity?.toString() || '',
        min_value: discount.min_value?.toString() || '',
        valid_from: discount.valid_from || '',
        valid_to: discount.valid_to || '',
        customer_ids: discount.customer_ids || [],
        is_active: discount.is_active,
      });
    } else {
      setEditingDiscount(null);
      setForm({
        name: '',
        description: '',
        discount_type: 'percentage',
        value: '',
        condition_type: 'none',
        min_quantity: '',
        min_value: '',
        valid_from: '',
        valid_to: '',
        customer_ids: [],
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  // Save discount
  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.value) {
      toast.error('Név és érték megadása kötelező!');
      return;
    }

    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        value: parseFloat(form.value),
        condition_type: form.condition_type,
        min_quantity: form.min_quantity ? parseInt(form.min_quantity) : null,
        min_value: form.min_value ? parseFloat(form.min_value) : null,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        customer_ids: form.customer_ids.length > 0 ? form.customer_ids : null,
        is_active: form.is_active,
        created_by: user.id,
      };

      if (editingDiscount) {
        const { error } = await supabase
          .from('discount_types')
          .update(data)
          .eq('id', editingDiscount.id);
        if (error) throw error;
        toast.success('Kedvezmény frissítve!');
      } else {
        const { error } = await supabase
          .from('discount_types')
          .insert(data);
        if (error) throw error;
        toast.success('Kedvezmény létrehozva!');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving discount:', error);
      toast.error('Hiba a mentéskor');
    }
  };

  // Toggle active status
  const toggleActive = async (discount) => {
    try {
      const { error } = await supabase
        .from('discount_types')
        .update({ is_active: !discount.is_active })
        .eq('id', discount.id);
      if (error) throw error;
      toast.success(discount.is_active ? 'Kedvezmény inaktiválva' : 'Kedvezmény aktiválva');
      fetchData();
    } catch (error) {
      console.error('Error toggling discount:', error);
      toast.error('Hiba a módosításkor');
    }
  };

  // Delete discount
  const handleDelete = async (discount) => {
    if (!confirm(`Biztosan törlöd a "${discount.name}" kedvezményt?`)) return;

    try {
      const { error } = await supabase
        .from('discount_types')
        .delete()
        .eq('id', discount.id);
      if (error) throw error;
      toast.success('Kedvezmény törölve!');
      fetchData();
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast.error('Hiba a törléskor');
    }
  };

  // Get condition info
  const getConditionInfo = (type) => {
    return CONDITION_TYPES.find(c => c.value === type) || CONDITION_TYPES[0];
  };

  // Format discount value
  const formatValue = (discount) => {
    if (discount.discount_type === 'percentage') {
      return `${discount.value}%`;
    }
    return formatCurrency(discount.value);
  };

  // Check if discount is currently valid (for period type)
  const isCurrentlyValid = (discount) => {
    if (discount.condition_type !== 'period') return true;
    const today = new Date().toISOString().split('T')[0];
    if (discount.valid_from && today < discount.valid_from) return false;
    if (discount.valid_to && today > discount.valid_to) return false;
    return true;
  };

  // Toggle customer selection
  const toggleCustomer = (customerId) => {
    setForm(prev => ({
      ...prev,
      customer_ids: prev.customer_ids.includes(customerId)
        ? prev.customer_ids.filter(id => id !== customerId)
        : [...prev.customer_ids, customerId]
    }));
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Percent className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Csak adminisztrátorok kezelhetik a kedvezményeket.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kedvezmények</h1>
          <p className="text-gray-500 mt-1">Kedvezmény típusok kezelése</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Új kedvezmény
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Összes</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-xs text-gray-500">Aktív</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.percentage}</p>
            <p className="text-xs text-gray-500">Százalékos</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.quantity}</p>
            <p className="text-xs text-gray-500">Mennyiségi</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.period}</p>
            <p className="text-xs text-gray-500">Időszaki</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Keresés..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
          </div>
          <select
            value={filters.condition}
            onChange={(e) => setFilters(prev => ({ ...prev, condition: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden feltétel</option>
            {CONDITION_TYPES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.showInactive}
              onChange={(e) => setFilters(prev => ({ ...prev, showInactive: e.target.checked }))}
              className="rounded border-gray-300 text-pepper-red focus:ring-pepper-red"
            />
            Inaktívak is
          </label>
        </div>
      </Card>

      {/* Discounts List */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Betöltés...</div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="p-8 text-center">
            <Percent className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nincsenek kedvezmények</p>
            <Button className="mt-4" onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Első kedvezmény
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredDiscounts.map(discount => {
              const conditionInfo = getConditionInfo(discount.condition_type);
              const ConditionIcon = conditionInfo.icon;
              const isValid = isCurrentlyValid(discount);

              return (
                <div
                  key={discount.id}
                  className={cn(
                    'p-4 hover:bg-gray-50',
                    !discount.is_active && 'opacity-50'
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                      'p-2 rounded-lg',
                      discount.discount_type === 'percentage'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    )}>
                      {discount.discount_type === 'percentage' ? (
                        <Percent className="h-5 w-5" />
                      ) : (
                        <DollarSign className="h-5 w-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{discount.name}</span>
                        <span className={cn(
                          'px-2 py-0.5 text-xs font-bold rounded-full',
                          discount.discount_type === 'percentage'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        )}>
                          {formatValue(discount)}
                        </span>
                        {!discount.is_active && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                            Inaktív
                          </span>
                        )}
                        {discount.condition_type === 'period' && !isValid && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                            Időszakon kívül
                          </span>
                        )}
                      </div>
                      {discount.description && (
                        <p className="text-sm text-gray-600 mt-1">{discount.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <ConditionIcon className="h-3 w-3" />
                          {conditionInfo.label}
                        </span>
                        {discount.condition_type === 'quantity' && (
                          <span>Min. {discount.min_quantity} db</span>
                        )}
                        {discount.condition_type === 'value_threshold' && (
                          <span>Min. {formatCurrency(discount.min_value)}</span>
                        )}
                        {discount.condition_type === 'period' && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(discount.valid_from)} - {formatDate(discount.valid_to)}
                          </span>
                        )}
                        {discount.condition_type === 'customer' && discount.customer_ids && (
                          <span>{discount.customer_ids.length} ügyfél</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleActive(discount)}
                        className={cn(
                          'p-2 rounded-lg hover:bg-gray-100',
                          discount.is_active ? 'text-green-600' : 'text-gray-400'
                        )}
                        title={discount.is_active ? 'Inaktiválás' : 'Aktiválás'}
                      >
                        {discount.is_active ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openModal(discount)}
                        className="p-2 text-gray-400 hover:text-pepper-red rounded-lg hover:bg-gray-100"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(discount)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDiscount ? 'Kedvezmény szerkesztése' : 'Új kedvezmény'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Megnevezés *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="pl. Mennyiségi kedvezmény 10%"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leírás</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Kedvezmény részletei..."
            />
          </div>

          {/* Type and Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Típus</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm(prev => ({ ...prev, discount_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                {DISCOUNT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Érték * {form.discount_type === 'percentage' ? '(%)' : '(Ft)'}
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm(prev => ({ ...prev, value: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                placeholder={form.discount_type === 'percentage' ? '0-100' : '0'}
                min="0"
                max={form.discount_type === 'percentage' ? '100' : undefined}
                step={form.discount_type === 'percentage' ? '0.1' : '1'}
                required
              />
            </div>
          </div>

          {/* Condition Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Feltétel</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CONDITION_TYPES.map(cond => {
                const Icon = cond.icon;
                return (
                  <button
                    key={cond.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, condition_type: cond.value }))}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-colors',
                      form.condition_type === cond.value
                        ? 'border-pepper-red bg-pepper-red/5'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-medium block">{cond.label}</span>
                      <span className="text-xs text-gray-500">{cond.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Condition-specific fields */}
          {form.condition_type === 'quantity' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum darabszám</label>
              <input
                type="number"
                value={form.min_quantity}
                onChange={(e) => setForm(prev => ({ ...prev, min_quantity: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                placeholder="10"
                min="1"
              />
            </div>
          )}

          {form.condition_type === 'value_threshold' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum érték (Ft)</label>
              <input
                type="number"
                value={form.min_value}
                onChange={(e) => setForm(prev => ({ ...prev, min_value: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                placeholder="100000"
                min="0"
              />
            </div>
          )}

          {form.condition_type === 'period' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Érvényesség kezdete</label>
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm(prev => ({ ...prev, valid_from: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Érvényesség vége</label>
                <input
                  type="date"
                  value={form.valid_to}
                  onChange={(e) => setForm(prev => ({ ...prev, valid_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                />
              </div>
            </div>
          )}

          {form.condition_type === 'customer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ügyfelek ({form.customer_ids.length} kiválasztva)
              </label>
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {companies.map(company => (
                  <label
                    key={company.id}
                    className={cn(
                      'flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-50',
                      form.customer_ids.includes(company.id) && 'bg-pepper-red/5'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={form.customer_ids.includes(company.id)}
                      onChange={() => toggleCustomer(company.id)}
                      className="rounded border-gray-300 text-pepper-red focus:ring-pepper-red"
                    />
                    <span className="text-sm">{company.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300 text-pepper-red focus:ring-pepper-red"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Aktív kedvezmény</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              {editingDiscount ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
