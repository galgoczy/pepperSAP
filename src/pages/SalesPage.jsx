import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Filter,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Bell,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Modal } from '../components/common';
import { supabase } from '../lib/supabase';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import toast from 'react-hot-toast';

// Event types
const EVENT_TYPES = [
  { value: 'call', label: 'Hívás', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Egyeztetés', icon: Calendar },
  { value: 'inquiry', label: 'Megkeresés', icon: FileText },
  { value: 'offer', label: 'Ajánlat', icon: FileText },
  { value: 'contract', label: 'Szerződés', icon: CheckCircle },
  { value: 'delivery', label: 'Teljesítés', icon: CheckCircle },
  { value: 'followup', label: 'Utókommunikáció', icon: Clock },
  { value: 'complaint', label: 'Panasz', icon: AlertTriangle },
];

// Priority levels
const PRIORITIES = [
  { value: 'normal', label: '! Hétköznapi', color: 'gray' },
  { value: 'notable', label: '!! Említésre méltó', color: 'blue' },
  { value: 'high', label: '!!! Kiemelt', color: 'orange' },
  { value: 'followup', label: '!!!U Utókövetés', color: 'red' },
];

export default function SalesPage() {
  const { isAdmin, profile } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState(new Set());

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    eventType: '',
    priority: '',
    showFollowups: false,
  });

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  // Event form
  const [eventForm, setEventForm] = useState({
    company_id: '',
    event_type: 'call',
    event_date: new Date().toISOString().split('T')[0],
    our_contact_id: '',
    priority: 'normal',
    amount: '',
    probability: '',
    notes: '',
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch customer companies only
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select(`
          *,
          our_contact:user_profiles!companies_our_contact_id_fkey(id, full_name)
        `)
        .or('type.eq.customer,type.eq.both')
        .order('name');
      if (companiesError) throw companiesError;

      // Fetch sales events
      const { data: eventsData, error: eventsError } = await supabase
        .from('sales_events')
        .select(`
          *,
          our_contact:user_profiles!sales_events_our_contact_id_fkey(id, full_name)
        `)
        .order('event_date', { ascending: false });
      if (eventsError) throw eventsError;

      // Fetch users
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .order('full_name');

      // Filter companies by search
      let filteredCompanies = companiesData || [];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredCompanies = filteredCompanies.filter(c =>
          c.name.toLowerCase().includes(searchLower)
        );
      }

      // Filter for followups
      let filteredEvents = eventsData || [];
      if (filters.showFollowups) {
        filteredEvents = filteredEvents.filter(e => e.priority === 'followup');
      }
      if (filters.eventType) {
        filteredEvents = filteredEvents.filter(e => e.event_type === filters.eventType);
      }
      if (filters.priority) {
        filteredEvents = filteredEvents.filter(e => e.priority === filters.priority);
      }

      setCompanies(filteredCompanies);
      setEvents(filteredEvents);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle company expansion
  const toggleCompany = (companyId) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  // Get events for a company
  const getCompanyEvents = (companyId) => {
    return events.filter(e => e.company_id === companyId);
  };

  // Get followup items
  const getFollowupItems = () => {
    return events.filter(e => e.priority === 'followup');
  };

  // Calculate pipeline stats
  const getPipelineStats = () => {
    const offers = events.filter(e => e.event_type === 'offer');
    const contracts = events.filter(e => e.event_type === 'contract');
    const deliveries = events.filter(e => e.event_type === 'delivery');

    const offerValue = offers.reduce((sum, e) => {
      const amount = parseFloat(e.amount) || 0;
      const prob = (parseFloat(e.probability) || 0) / 100;
      return sum + (amount * prob);
    }, 0);

    const contractValue = contracts.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const deliveredValue = deliveries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    return {
      offers: offers.length,
      offerValue,
      contracts: contracts.length,
      contractValue,
      deliveries: deliveries.length,
      deliveredValue,
    };
  };

  // Open event modal
  const openEventModal = (companyId, event = null) => {
    setSelectedCompanyId(companyId);
    if (event) {
      setEditingEvent(event);
      setEventForm({
        company_id: event.company_id,
        event_type: event.event_type,
        event_date: event.event_date,
        our_contact_id: event.our_contact_id || '',
        priority: event.priority,
        amount: event.amount || '',
        probability: event.probability || '',
        notes: event.notes || '',
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        company_id: companyId,
        event_type: 'call',
        event_date: new Date().toISOString().split('T')[0],
        our_contact_id: profile?.id || '',
        priority: 'normal',
        amount: '',
        probability: '',
        notes: '',
      });
    }
    setIsEventModalOpen(true);
  };

  // Save event
  const handleSaveEvent = async (e) => {
    e.preventDefault();

    try {
      const data = {
        ...eventForm,
        company_id: eventForm.company_id || selectedCompanyId,
        our_contact_id: eventForm.our_contact_id || null,
        amount: eventForm.amount ? parseFloat(eventForm.amount) : null,
        probability: eventForm.probability ? parseInt(eventForm.probability) : null,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('sales_events')
          .update(data)
          .eq('id', editingEvent.id);
        if (error) throw error;
        toast.success('Esemény frissítve!');
      } else {
        const { error } = await supabase
          .from('sales_events')
          .insert(data);
        if (error) throw error;
        toast.success('Esemény létrehozva!');
      }

      setIsEventModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Hiba a mentéskor');
    }
  };

  // Delete event
  const handleDeleteEvent = async (event) => {
    if (!confirm('Biztosan törlöd ezt az eseményt?')) return;

    try {
      const { error } = await supabase
        .from('sales_events')
        .delete()
        .eq('id', event.id);
      if (error) throw error;
      toast.success('Esemény törölve!');
      fetchData();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Hiba a törléskor');
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority) => {
    const p = PRIORITIES.find(pr => pr.value === priority);
    if (!p) return null;

    const colorClasses = {
      gray: 'bg-gray-100 text-gray-700',
      blue: 'bg-blue-100 text-blue-700',
      orange: 'bg-orange-100 text-orange-700',
      red: 'bg-red-100 text-red-700 animate-pulse',
    };

    return (
      <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', colorClasses[p.color])}>
        {p.label}
      </span>
    );
  };

  // Get event type info
  const getEventTypeInfo = (type) => {
    return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[0];
  };

  const stats = getPipelineStats();
  const followups = getFollowupItems();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 mt-1">Ügyfélkapcsolatok és értékesítési pipeline</p>
        </div>
      </div>

      {/* Followup Alert */}
      {followups.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800">
                  {followups.length} utókövetést igénylő esemény
                </h3>
                <p className="text-sm text-red-600">
                  Ezek az ügyek figyelmet igényelnek
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, showFollowups: !prev.showFollowups }))}
              >
                {filters.showFollowups ? 'Összes mutatása' : 'Csak ezek'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Aktív ajánlatok</p>
                <p className="text-2xl font-bold text-gray-900">{stats.offers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Súlyozott érték: {formatCurrency(stats.offerValue)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Szerződések</p>
                <p className="text-2xl font-bold text-gray-900">{stats.contracts}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Érték: {formatCurrency(stats.contractValue)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Teljesítve</p>
                <p className="text-2xl font-bold text-gray-900">{stats.deliveries}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Érték: {formatCurrency(stats.deliveredValue)}
            </p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Keresés cégre..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
          </div>
          <select
            value={filters.eventType}
            onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden esemény</option>
            {EVENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden fontosság</option>
            {PRIORITIES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Companies & Events */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Betöltés...</div>
        ) : companies.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nincsenek ügyfél cégek</p>
            <p className="text-sm text-gray-400 mt-1">
              Először adj hozzá ügyfél típusú céget az Ügyfelek menüpont alatt
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {companies.map(company => {
              const companyEvents = getCompanyEvents(company.id);
              const isExpanded = expandedCompanies.has(company.id);
              const hasFollowup = companyEvents.some(e => e.priority === 'followup');

              return (
                <div key={company.id}>
                  {/* Company row */}
                  <div
                    className={cn(
                      'flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50',
                      isExpanded && 'bg-gray-50',
                      hasFollowup && 'border-l-4 border-l-red-500'
                    )}
                    onClick={() => toggleCompany(company.id)}
                  >
                    <div className="text-gray-400">
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{company.name}</p>
                      {company.our_contact && (
                        <p className="text-sm text-gray-500">
                          Kapcsolattartó: {company.our_contact.full_name}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {companyEvents.length} esemény
                    </div>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEventModal(company.id);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Esemény
                      </Button>
                    )}
                  </div>

                  {/* Events list */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t">
                      {companyEvents.length === 0 ? (
                        <div className="p-4 pl-16 text-sm text-gray-500">
                          Nincsenek események
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {companyEvents.map(event => {
                            const typeInfo = getEventTypeInfo(event.event_type);
                            const TypeIcon = typeInfo.icon;

                            return (
                              <div
                                key={event.id}
                                className={cn(
                                  'flex items-start gap-4 p-4 pl-16',
                                  event.priority === 'followup' && 'bg-red-50'
                                )}
                              >
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                  <TypeIcon className="h-4 w-4 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-gray-900">{typeInfo.label}</span>
                                    {getPriorityBadge(event.priority)}
                                    {event.amount && (
                                      <span className="text-sm text-green-600 font-medium">
                                        {formatCurrency(event.amount)}
                                      </span>
                                    )}
                                    {event.probability && (
                                      <span className="text-sm text-blue-600">
                                        {event.probability}% esély
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {formatDate(event.event_date)}
                                    {event.our_contact && ` • ${event.our_contact.full_name}`}
                                  </p>
                                  {event.notes && (
                                    <p className="text-sm text-gray-600 mt-2">{event.notes}</p>
                                  )}
                                </div>
                                {isAdmin && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => openEventModal(company.id, event)}
                                      className="p-1.5 text-gray-400 hover:text-pepper-red rounded hover:bg-white"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEvent(event)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-white"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
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
        )}
      </Card>

      {/* Event Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={editingEvent ? 'Esemény szerkesztése' : 'Új esemény'}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kapcsolattartónk</label>
              <select
                value={eventForm.our_contact_id}
                onChange={(e) => setEventForm(prev => ({ ...prev, our_contact_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                <option value="">Válassz...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fontosság</label>
              <select
                value={eventForm.priority}
                onChange={(e) => setEventForm(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Probability - shown for offer, contract, delivery */}
          {['offer', 'contract', 'delivery'].includes(eventForm.event_type) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Összeg (Ft)</label>
                <input
                  type="number"
                  value={eventForm.amount}
                  onChange={(e) => setEventForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                  placeholder="0"
                />
              </div>
              {eventForm.event_type === 'offer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valószínűség (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={eventForm.probability}
                    onChange={(e) => setEventForm(prev => ({ ...prev, probability: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                    placeholder="50"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Megjegyzés</label>
            <textarea
              value={eventForm.notes}
              onChange={(e) => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Részletek..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsEventModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              {editingEvent ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
