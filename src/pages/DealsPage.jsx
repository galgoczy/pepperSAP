import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Building2,
  Calendar,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Percent,
  Clock,
  BarChart3,
  Filter,
  User,
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
  History,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Modal } from '../components/common';
import { supabase } from '../lib/supabase';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import toast from 'react-hot-toast';

// Deal statuses with default probabilities
const DEAL_STATUSES = [
  { value: 'lead', label: 'Érdeklődés', defaultProb: 10, color: 'gray', icon: Target },
  { value: 'negotiation', label: 'Tárgyalás', defaultProb: 30, color: 'blue', icon: Clock },
  { value: 'proposal', label: 'Ajánlat', defaultProb: 60, color: 'yellow', icon: DollarSign },
  { value: 'won', label: 'Megnyert', defaultProb: 100, color: 'green', icon: Trophy },
  { value: 'lost', label: 'Elvesztett', defaultProb: 0, color: 'red', icon: XCircle },
];

// Status color classes
const STATUS_COLORS = {
  lead: 'bg-gray-100 text-gray-700 border-gray-300',
  negotiation: 'bg-blue-100 text-blue-700 border-blue-300',
  proposal: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  won: 'bg-green-100 text-green-700 border-green-300',
  lost: 'bg-red-100 text-red-700 border-red-300',
};

// Event types for quick add
const EVENT_TYPES = [
  { value: 'call', label: 'Hívás', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Egyeztetés', icon: Calendar },
  { value: 'followup', label: 'Utókommunikáció', icon: MessageSquare },
];

export default function DealsPage() {
  const { isAdmin, profile } = useAuth();
  const [deals, setDeals] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyContacts, setCompanyContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [salesEvents, setSalesEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
  });

  // View mode
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'pipeline'

  // Expanded deals for showing events
  const [expandedDeals, setExpandedDeals] = useState(new Set());

  // Modals
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDealForEvent, setSelectedDealForEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    event_type: 'call',
    event_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Deal form
  const [dealForm, setDealForm] = useState({
    company_id: '',
    name: '',
    description: '',
    expected_value: '',
    status: 'lead',
    probability: 10,
    expected_close_date: '',
    our_contact_id: '',
    company_contact_id: '',
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch deals with relations
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          *,
          company:companies!deals_company_id_fkey(id, name),
          our_contact:user_profiles!deals_our_contact_id_fkey(id, full_name),
          company_contact:company_contacts!deals_company_contact_id_fkey(id, name)
        `)
        .order('expected_close_date', { ascending: true, nullsFirst: false });
      if (dealsError) throw dealsError;

      // Fetch customer companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .or('type.eq.customer,type.eq.both')
        .order('name');
      if (companiesError) throw companiesError;

      // Fetch company contacts
      const { data: contactsData } = await supabase
        .from('company_contacts')
        .select('id, company_id, name')
        .order('name');

      // Fetch users
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .order('full_name');

      // Fetch sales events (for deals that have company_id - we match by company)
      const { data: eventsData } = await supabase
        .from('sales_events')
        .select(`
          *,
          our_contact:user_profiles!sales_events_our_contact_id_fkey(id, full_name)
        `)
        .order('event_date', { ascending: false });

      setDeals(dealsData || []);
      setCompanies(companiesData || []);
      setCompanyContacts(contactsData || []);
      setUsers(usersData || []);
      setSalesEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching deals data:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter deals
  const filteredDeals = useMemo(() => {
    let result = [...deals];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(d =>
        d.name.toLowerCase().includes(searchLower) ||
        d.company?.name?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      result = result.filter(d => d.status === filters.status);
    }

    return result;
  }, [deals, filters]);

  // Calculate pipeline stats
  const pipelineStats = useMemo(() => {
    const openDeals = deals.filter(d => !['won', 'lost'].includes(d.status));
    const wonDeals = deals.filter(d => d.status === 'won');
    const lostDeals = deals.filter(d => d.status === 'lost');

    const totalOpen = openDeals.reduce((sum, d) => sum + (parseFloat(d.expected_value) || 0), 0);
    const weightedOpen = openDeals.reduce((sum, d) => {
      const value = parseFloat(d.expected_value) || 0;
      const prob = (d.probability || 0) / 100;
      return sum + (value * prob);
    }, 0);
    const totalWon = wonDeals.reduce((sum, d) => sum + (parseFloat(d.expected_value) || 0), 0);
    const totalLost = lostDeals.reduce((sum, d) => sum + (parseFloat(d.expected_value) || 0), 0);

    return {
      openCount: openDeals.length,
      totalOpen,
      weightedOpen,
      wonCount: wonDeals.length,
      totalWon,
      lostCount: lostDeals.length,
      totalLost,
    };
  }, [deals]);

  // Calculate forecast by month
  const monthlyForecast = useMemo(() => {
    const openDeals = deals.filter(d => !['won', 'lost'].includes(d.status));
    const forecast = {};

    openDeals.forEach(deal => {
      if (deal.expected_close_date) {
        const month = deal.expected_close_date.slice(0, 7); // YYYY-MM
        if (!forecast[month]) {
          forecast[month] = { total: 0, weighted: 0, count: 0 };
        }
        const value = parseFloat(deal.expected_value) || 0;
        const prob = (deal.probability || 0) / 100;
        forecast[month].total += value;
        forecast[month].weighted += value * prob;
        forecast[month].count += 1;
      }
    });

    // Sort by month
    return Object.entries(forecast)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }, [deals]);

  // Get deals by status for pipeline view
  const dealsByStatus = useMemo(() => {
    const result = {};
    DEAL_STATUSES.forEach(s => {
      result[s.value] = filteredDeals.filter(d => d.status === s.value);
    });
    return result;
  }, [filteredDeals]);

  // Open deal modal
  const openDealModal = (deal = null) => {
    if (deal) {
      setEditingDeal(deal);
      setDealForm({
        company_id: deal.company_id,
        name: deal.name,
        description: deal.description || '',
        expected_value: deal.expected_value || '',
        status: deal.status,
        probability: deal.probability || 10,
        expected_close_date: deal.expected_close_date || '',
        our_contact_id: deal.our_contact_id || '',
        company_contact_id: deal.company_contact_id || '',
      });
    } else {
      setEditingDeal(null);
      setDealForm({
        company_id: '',
        name: '',
        description: '',
        expected_value: '',
        status: 'lead',
        probability: 10,
        expected_close_date: '',
        our_contact_id: profile?.id || '',
        company_contact_id: '',
      });
    }
    setIsDealModalOpen(true);
  };

  // Handle status change - auto-update probability
  const handleStatusChange = (status) => {
    const statusInfo = DEAL_STATUSES.find(s => s.value === status);
    setDealForm(prev => ({
      ...prev,
      status,
      probability: statusInfo?.defaultProb || prev.probability,
    }));
  };

  // Save deal
  const handleSaveDeal = async (e) => {
    e.preventDefault();

    if (!dealForm.company_id || !dealForm.name) {
      toast.error('Cég és megnevezés megadása kötelező');
      return;
    }

    try {
      const data = {
        company_id: dealForm.company_id,
        name: dealForm.name,
        description: dealForm.description || null,
        expected_value: dealForm.expected_value ? parseFloat(dealForm.expected_value) : null,
        status: dealForm.status,
        probability: parseInt(dealForm.probability) || 0,
        expected_close_date: dealForm.expected_close_date || null,
        our_contact_id: dealForm.our_contact_id || null,
        company_contact_id: dealForm.company_contact_id || null,
        actual_close_date: ['won', 'lost'].includes(dealForm.status)
          ? new Date().toISOString().split('T')[0]
          : null,
      };

      if (editingDeal) {
        const { error } = await supabase
          .from('deals')
          .update(data)
          .eq('id', editingDeal.id);
        if (error) throw error;
        toast.success('Deal frissítve!');
      } else {
        const { error } = await supabase
          .from('deals')
          .insert(data);
        if (error) throw error;
        toast.success('Deal létrehozva!');
      }

      setIsDealModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving deal:', error);
      toast.error('Hiba a mentéskor');
    }
  };

  // Delete deal
  const handleDeleteDeal = async (deal) => {
    if (!confirm(`Biztosan törlöd a "${deal.name}" deal-t?`)) return;

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', deal.id);
      if (error) throw error;
      toast.success('Deal törölve!');
      fetchData();
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast.error('Hiba a törléskor');
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const s = DEAL_STATUSES.find(st => st.value === status);
    if (!s) return null;
    return (
      <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full border', STATUS_COLORS[status])}>
        {s.label}
      </span>
    );
  };

  // Format month for display
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const months = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'];
    return `${year}. ${months[parseInt(month) - 1]}`;
  };

  // Get available company contacts for selected company
  const availableContacts = companyContacts.filter(c => c.company_id === dealForm.company_id);

  // Get events for a deal (by company_id, or deal_id if set)
  const getDealEvents = (deal) => {
    return salesEvents.filter(e =>
      e.deal_id === deal.id ||
      (e.company_id === deal.company_id && !e.deal_id)
    ).slice(0, 5); // Last 5 events
  };

  // Get last contact date for a deal
  const getLastContactDate = (deal) => {
    const events = getDealEvents(deal);
    if (events.length === 0) return null;
    return events[0].event_date;
  };

  // Toggle deal expansion
  const toggleDealExpansion = (dealId) => {
    setExpandedDeals(prev => {
      const next = new Set(prev);
      if (next.has(dealId)) {
        next.delete(dealId);
      } else {
        next.add(dealId);
      }
      return next;
    });
  };

  // Open event modal for a deal
  const openEventModalForDeal = (deal) => {
    setSelectedDealForEvent(deal);
    setEventForm({
      event_type: 'call',
      event_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsEventModalOpen(true);
  };

  // Save event for deal
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!selectedDealForEvent) return;

    try {
      const data = {
        company_id: selectedDealForEvent.company_id,
        deal_id: selectedDealForEvent.id,
        event_type: eventForm.event_type,
        event_date: eventForm.event_date,
        our_contact_id: profile?.id || null,
        priority: 'normal',
        notes: eventForm.notes || null,
      };

      const { error } = await supabase
        .from('sales_events')
        .insert(data);
      if (error) throw error;

      toast.success('Esemény rögzítve!');
      setIsEventModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Hiba a mentéskor');
    }
  };

  // Calculate days until expected close
  const getDaysUntilClose = (deal) => {
    if (!deal.expected_close_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const closeDate = new Date(deal.expected_close_date);
    const diffTime = closeDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get deals closing soon (within 7 days)
  const dealsClosingSoon = useMemo(() => {
    return deals.filter(d => {
      if (['won', 'lost'].includes(d.status)) return false;
      const days = getDaysUntilClose(d);
      return days !== null && days >= 0 && days <= 7;
    });
  }, [deals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Üzleti lehetőségek</h1>
          <p className="text-gray-500 mt-1">Sales pipeline és forecast</p>
        </div>
        {isAdmin && (
          <Button onClick={() => openDealModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Új deal
          </Button>
        )}
      </div>

      {/* Deals closing soon alert */}
      {dealsClosingSoon.length > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <h3 className="font-medium text-orange-800">
                  {dealsClosingSoon.length} deal hamarosan lejár (7 napon belül)
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {dealsClosingSoon.slice(0, 3).map(deal => (
                    <span key={deal.id} className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded">
                      {deal.name} - {getDaysUntilClose(deal)} nap
                    </span>
                  ))}
                  {dealsClosingSoon.length > 3 && (
                    <span className="text-sm text-orange-600">+{dealsClosingSoon.length - 3} további</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Nyitott dealek</p>
                <p className="text-2xl font-bold text-gray-900">{pipelineStats.openCount}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Összérték: {formatCurrency(pipelineStats.totalOpen)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Súlyozott forecast</p>
                <p className="text-2xl font-bold text-pepper-red">{formatCurrency(pipelineStats.weightedOpen)}</p>
              </div>
              <div className="p-3 bg-pepper-red/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-pepper-red" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              (érték × valószínűség)
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Megnyert</p>
                <p className="text-2xl font-bold text-green-600">{pipelineStats.wonCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Érték: {formatCurrency(pipelineStats.totalWon)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Elvesztett</p>
                <p className="text-2xl font-bold text-gray-400">{pipelineStats.lostCount}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <XCircle className="h-6 w-6 text-gray-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Érték: {formatCurrency(pipelineStats.totalLost)}
            </p>
          </div>
        </Card>
      </div>

      {/* Monthly Forecast */}
      {monthlyForecast.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              Havi forecast (várható zárás alapján)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-gray-500">Hónap</th>
                    <th className="text-right py-2 font-medium text-gray-500">Dealek</th>
                    <th className="text-right py-2 font-medium text-gray-500">Összérték</th>
                    <th className="text-right py-2 font-medium text-gray-500">Súlyozott</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyForecast.map(({ month, total, weighted, count }) => (
                    <tr key={month} className="border-b last:border-0">
                      <td className="py-2 font-medium">{formatMonth(month)}</td>
                      <td className="py-2 text-right">{count} db</td>
                      <td className="py-2 text-right">{formatCurrency(total)}</td>
                      <td className="py-2 text-right font-semibold text-pepper-red">
                        {formatCurrency(weighted)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-2">Összesen</td>
                    <td className="py-2 text-right">
                      {monthlyForecast.reduce((sum, m) => sum + m.count, 0)} db
                    </td>
                    <td className="py-2 text-right">
                      {formatCurrency(monthlyForecast.reduce((sum, m) => sum + m.total, 0))}
                    </td>
                    <td className="py-2 text-right text-pepper-red">
                      {formatCurrency(monthlyForecast.reduce((sum, m) => sum + m.weighted, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Keresés deal vagy cég nevére..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden státusz</option>
            {DEAL_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'pipeline' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Pipeline
            </button>
          </div>
        </div>
      </Card>

      {/* Deals View */}
      {loading ? (
        <Card>
          <div className="p-8 text-center text-gray-500">Betöltés...</div>
        </Card>
      ) : filteredDeals.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nincsenek dealek</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => openDealModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Első deal létrehozása
              </Button>
            )}
          </div>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card>
          <div className="divide-y">
            {filteredDeals.map(deal => {
              const weightedValue = (parseFloat(deal.expected_value) || 0) * ((deal.probability || 0) / 100);
              const dealEvents = getDealEvents(deal);
              const lastContactDate = getLastContactDate(deal);
              const isExpanded = expandedDeals.has(deal.id);
              const daysUntil = getDaysUntilClose(deal);

              return (
                <div key={deal.id}>
                  <div
                    className={cn(
                      'p-4 hover:bg-gray-50 transition-colors',
                      daysUntil !== null && daysUntil <= 7 && daysUntil >= 0 && 'border-l-4 border-l-orange-400'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleDealExpansion(deal.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 mt-1"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className={cn(
                        'p-2 rounded-lg',
                        deal.status === 'won' ? 'bg-green-100' :
                        deal.status === 'lost' ? 'bg-red-100' :
                        'bg-gray-100'
                      )}>
                        <Building2 className={cn(
                          'h-5 w-5',
                          deal.status === 'won' ? 'text-green-600' :
                          deal.status === 'lost' ? 'text-red-600' :
                          'text-gray-600'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{deal.name}</span>
                          {getStatusBadge(deal.status)}
                          {daysUntil !== null && daysUntil <= 7 && daysUntil >= 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                              {daysUntil === 0 ? 'Ma lejár!' : `${daysUntil} nap`}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{deal.company?.name}</p>
                        {deal.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{deal.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                          {deal.expected_value && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatCurrency(deal.expected_value)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Percent className="h-3.5 w-3.5" />
                            {deal.probability}%
                          </span>
                          {deal.expected_value && (
                            <span className="font-medium text-pepper-red">
                              Súlyozott: {formatCurrency(weightedValue)}
                            </span>
                          )}
                          {deal.expected_close_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(deal.expected_close_date)}
                            </span>
                          )}
                          {deal.our_contact && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {deal.our_contact.full_name}
                            </span>
                          )}
                          {/* Last contact indicator */}
                          <span className={cn(
                            'flex items-center gap-1',
                            lastContactDate ? 'text-green-600' : 'text-orange-500'
                          )}>
                            <History className="h-3.5 w-3.5" />
                            {lastContactDate ? `Utolsó: ${formatDate(lastContactDate)}` : 'Nincs esemény'}
                          </span>
                          <span className="text-gray-400">
                            {dealEvents.length} esemény
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEventModalForDeal(deal)}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100"
                            title="Esemény rögzítése"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDealModal(deal)}
                            className="p-2 text-gray-400 hover:text-pepper-red rounded-lg hover:bg-gray-100"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeal(deal)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded events section */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t px-4 py-3 ml-14">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Kapcsolódó események
                        </h4>
                        {isAdmin && (
                          <Button size="sm" variant="secondary" onClick={() => openEventModalForDeal(deal)}>
                            <Plus className="h-3 w-3 mr-1" />
                            Esemény
                          </Button>
                        )}
                      </div>
                      {dealEvents.length === 0 ? (
                        <p className="text-sm text-gray-500">Nincs még rögzített esemény</p>
                      ) : (
                        <div className="space-y-2">
                          {dealEvents.map(event => {
                            const eventType = EVENT_TYPES.find(t => t.value === event.event_type);
                            const EventIcon = eventType?.icon || MessageSquare;
                            return (
                              <div key={event.id} className="flex items-start gap-3 text-sm bg-white p-2 rounded-lg">
                                <div className="p-1.5 bg-gray-100 rounded">
                                  <EventIcon className="h-3.5 w-3.5 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{eventType?.label || event.event_type}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-500">{formatDate(event.event_date)}</span>
                                    {event.our_contact && (
                                      <>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-gray-500">{event.our_contact.full_name}</span>
                                      </>
                                    )}
                                  </div>
                                  {event.notes && (
                                    <p className="text-gray-600 mt-0.5 line-clamp-2">{event.notes}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        /* Pipeline View */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {DEAL_STATUSES.filter(s => s.value !== 'lost').map(status => (
            <div key={status.value} className="space-y-3">
              <div className={cn(
                'p-3 rounded-lg border-2',
                status.value === 'lead' && 'bg-gray-50 border-gray-200',
                status.value === 'negotiation' && 'bg-blue-50 border-blue-200',
                status.value === 'proposal' && 'bg-yellow-50 border-yellow-200',
                status.value === 'won' && 'bg-green-50 border-green-200',
              )}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{status.label}</span>
                  <span className="text-sm text-gray-500">{dealsByStatus[status.value]?.length || 0}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(
                    dealsByStatus[status.value]?.reduce((sum, d) => sum + (parseFloat(d.expected_value) || 0), 0) || 0
                  )}
                </p>
              </div>
              <div className="space-y-2">
                {dealsByStatus[status.value]?.map(deal => (
                  <Card
                    key={deal.id}
                    className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => isAdmin && openDealModal(deal)}
                  >
                    <p className="font-medium text-gray-900 text-sm line-clamp-1">{deal.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{deal.company?.name}</p>
                    {deal.expected_value && (
                      <p className="text-sm font-semibold text-pepper-red mt-2">
                        {formatCurrency(deal.expected_value)}
                      </p>
                    )}
                    {deal.expected_close_date && (
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(deal.expected_close_date)}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deal Modal */}
      <Modal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        title={editingDeal ? 'Deal szerkesztése' : 'Új deal'}
        size="lg"
      >
        <form onSubmit={handleSaveDeal} className="space-y-4">
          {/* Company selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cég *</label>
            <select
              value={dealForm.company_id}
              onChange={(e) => setDealForm(prev => ({ ...prev, company_id: e.target.value, company_contact_id: '' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              required
            >
              <option value="">Válassz céget...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Deal name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal megnevezése *</label>
            <input
              type="text"
              value={dealForm.name}
              onChange={(e) => setDealForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="pl. Éves szerződés megújítás, Új projekt - webfejlesztés"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leírás</label>
            <textarea
              value={dealForm.description}
              onChange={(e) => setDealForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="További részletek..."
            />
          </div>

          {/* Value and dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Várható érték (Ft)</label>
              <input
                type="number"
                value={dealForm.expected_value}
                onChange={(e) => setDealForm(prev => ({ ...prev, expected_value: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Várható zárás</label>
              <input
                type="date"
                value={dealForm.expected_close_date}
                onChange={(e) => setDealForm(prev => ({ ...prev, expected_close_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
          </div>

          {/* Status and probability */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Státusz</label>
              <select
                value={dealForm.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                {DEAL_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label} ({s.defaultProb}%)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valószínűség (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={dealForm.probability}
                onChange={(e) => setDealForm(prev => ({ ...prev, probability: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
          </div>

          {/* Weighted value preview */}
          {dealForm.expected_value && (
            <div className="p-3 bg-pepper-red/5 rounded-lg border border-pepper-red/20">
              <p className="text-sm text-gray-600">
                Súlyozott érték: <span className="font-semibold text-pepper-red">
                  {formatCurrency((parseFloat(dealForm.expected_value) || 0) * ((parseInt(dealForm.probability) || 0) / 100))}
                </span>
                <span className="text-gray-400 ml-2">
                  ({formatCurrency(dealForm.expected_value)} × {dealForm.probability}%)
                </span>
              </p>
            </div>
          )}

          {/* Contacts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Felelős kolléga</label>
              <select
                value={dealForm.our_contact_id}
                onChange={(e) => setDealForm(prev => ({ ...prev, our_contact_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                <option value="">Válassz...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ügyfél kapcsolattartó</label>
              <select
                value={dealForm.company_contact_id}
                onChange={(e) => setDealForm(prev => ({ ...prev, company_contact_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                disabled={!dealForm.company_id}
              >
                <option value="">{dealForm.company_id ? 'Válassz...' : 'Először válassz céget'}</option>
                {availableContacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsDealModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              {editingDeal ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Event Modal for quick add */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={`Esemény rögzítése - ${selectedDealForEvent?.name || ''}`}
        size="md"
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Esemény típusa</label>
              <select
                value={eventForm.event_type}
                onChange={(e) => setEventForm(prev => ({ ...prev, event_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                {EVENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dátum</label>
              <input
                type="date"
                value={eventForm.event_date}
                onChange={(e) => setEventForm(prev => ({ ...prev, event_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Megjegyzés</label>
            <textarea
              value={eventForm.notes}
              onChange={(e) => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Mi történt az eseményen..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsEventModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              Rögzítés
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
