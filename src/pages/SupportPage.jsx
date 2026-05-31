import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquarePlus,
  Bug,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Tag,
  MessageSquare,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Modal } from '../components/common';
import { supabase } from '../lib/supabase';
import { formatDate, cn } from '../lib/utils';
import toast from 'react-hot-toast';

// Ticket categories
const CATEGORIES = [
  { value: 'bug', label: 'Hibabejelentés', icon: Bug, color: 'text-red-600 bg-red-100' },
  { value: 'feature', label: 'Fejlesztési javaslat', icon: Lightbulb, color: 'text-yellow-600 bg-yellow-100' },
  { value: 'question', label: 'Kérdés', icon: HelpCircle, color: 'text-blue-600 bg-blue-100' },
  { value: 'other', label: 'Egyéb', icon: MoreHorizontal, color: 'text-gray-600 bg-gray-100' },
];

// Severity levels
const SEVERITIES = [
  { value: 'low', label: 'Alacsony', color: 'bg-gray-100 text-gray-700' },
  { value: 'normal', label: 'Normál', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Magas', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Kritikus', color: 'bg-red-100 text-red-700' },
];

// Status options
const STATUSES = [
  { value: 'new', label: 'Új', icon: MessageSquarePlus, color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'Folyamatban', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'resolved', label: 'Megoldva', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: 'Lezárva', icon: XCircle, color: 'bg-gray-100 text-gray-700' },
];

export default function SupportPage() {
  const { user, profile, isAdmin } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [expandedTickets, setExpandedTickets] = useState(new Set());

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    showAll: false, // Admin only
  });

  // Form state
  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'bug',
    severity: 'normal',
  });

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      // Note: support_tickets.user_id / assigned_to reference auth.users, not
      // user_profiles, so we can't embed user_profiles here. The reporter's
      // name is stored directly on the ticket (reporter_name).
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      // Non-admin users only see their own tickets
      if (!isAdmin || !filters.showAll) {
        query = query.eq('user_id', user?.id);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Hiba a bejelentések betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin, filters]);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user, fetchTickets]);

  // Submit new ticket
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Kérlek add meg a tárgyat és a leírást!');
      return;
    }

    try {
      const ticketData = {
        user_id: user.id,
        reporter_name: profile?.full_name || user.email,
        reporter_email: user.email,
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category,
        severity: form.severity,
        browser_info: navigator.userAgent,
        page_url: window.location.href,
      };

      const { error } = await supabase
        .from('support_tickets')
        .insert(ticketData);

      if (error) throw error;

      toast.success('Bejelentés sikeresen elküldve!');
      setIsModalOpen(false);
      setForm({
        subject: '',
        description: '',
        category: 'bug',
        severity: 'normal',
      });
      fetchTickets();
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('Hiba a bejelentés küldésekor');
    }
  };

  // Update ticket status (admin only)
  const updateTicketStatus = async (ticketId, newStatus, notes = null) => {
    try {
      const updateData = {
        status: newStatus,
        ...(newStatus === 'resolved' && { resolved_at: new Date().toISOString() }),
        ...(notes && { resolution_notes: notes }),
      };

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Státusz frissítve!');
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Hiba a frissítéskor');
    }
  };

  // Toggle ticket expansion
  const toggleTicket = (ticketId) => {
    setExpandedTickets(prev => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  };

  // Get category info
  const getCategoryInfo = (category) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[3];
  };

  // Get severity info
  const getSeverityInfo = (severity) => {
    return SEVERITIES.find(s => s.value === severity) || SEVERITIES[1];
  };

  // Get status info
  const getStatusInfo = (status) => {
    return STATUSES.find(s => s.value === status) || STATUSES[0];
  };

  // Stats for admin
  const stats = isAdmin ? {
    total: tickets.length,
    new: tickets.filter(t => t.status === 'new').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  } : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Támogatás</h1>
          <p className="text-gray-500 mt-1">
            Hibabejelentés, fejlesztési javaslatok és kérdések
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Új bejelentés
        </Button>
      </div>

      {/* Admin Stats */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Összes</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
              <p className="text-sm text-gray-500">Új</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">Folyamatban</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-sm text-gray-500">Megoldva</p>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">Szűrés:</span>
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden státusz</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden kategória</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.showAll}
                onChange={(e) => setFilters(prev => ({ ...prev, showAll: e.target.checked }))}
                className="rounded border-gray-300 text-pepper-red focus:ring-pepper-red"
              />
              Összes felhasználó
            </label>
          )}
          <button
            onClick={fetchTickets}
            className="p-2 text-gray-500 hover:text-pepper-red rounded-lg hover:bg-gray-100"
            title="Frissítés"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </Card>

      {/* Tickets List */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Betöltés...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nincsenek bejelentések</p>
            <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Első bejelentés
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {tickets.map(ticket => {
              const category = getCategoryInfo(ticket.category);
              const severity = getSeverityInfo(ticket.severity);
              const status = getStatusInfo(ticket.status);
              const CategoryIcon = category.icon;
              const StatusIcon = status.icon;
              const isExpanded = expandedTickets.has(ticket.id);

              return (
                <div key={ticket.id}>
                  <div
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleTicket(ticket.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Expand toggle */}
                      <div className="text-gray-400 pt-1">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>

                      {/* Category icon */}
                      <div className={cn('p-2 rounded-lg', category.color)}>
                        <CategoryIcon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{ticket.subject}</span>
                          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', status.color)}>
                            {status.label}
                          </span>
                          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', severity.color)}>
                            {severity.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">{ticket.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(ticket.created_at)}
                          </span>
                          {isAdmin && ticket.reporter_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ticket.reporter_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            #{ticket.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>

                      {/* Admin actions */}
                      {isAdmin && ticket.status !== 'closed' && (
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {ticket.status === 'new' && (
                            <button
                              onClick={() => updateTicketStatus(ticket.id, 'in_progress')}
                              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                            >
                              Folyamatban
                            </button>
                          )}
                          {ticket.status === 'in_progress' && (
                            <button
                              onClick={() => updateTicketStatus(ticket.id, 'resolved')}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            >
                              Megoldva
                            </button>
                          )}
                          {ticket.status === 'resolved' && (
                            <button
                              onClick={() => updateTicketStatus(ticket.id, 'closed')}
                              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                              Lezárás
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-16 bg-gray-50 border-t">
                      <div className="py-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Leírás</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
                        </div>

                        {ticket.resolution_notes && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Megoldás</h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{ticket.resolution_notes}</p>
                          </div>
                        )}

                        {isAdmin && (
                          <div className="pt-4 border-t">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Technikai adatok</h4>
                            <div className="text-xs text-gray-500 space-y-1">
                              <p><strong>Böngésző:</strong> {ticket.browser_info}</p>
                              <p><strong>Oldal:</strong> {ticket.page_url}</p>
                              <p><strong>Email:</strong> {ticket.reporter_email}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* New Ticket Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Új bejelentés"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kategória</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, category: cat.value }))}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                      form.category === cat.value
                        ? 'border-pepper-red bg-pepper-red/5'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={cn('p-1.5 rounded', cat.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tárgy *</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Rövid összefoglaló a problémáról..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Részletes leírás *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Kérlek írd le részletesen a problémát, lépéseket a reprodukáláshoz..."
              required
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Súlyosság</label>
            <div className="flex gap-2">
              {SEVERITIES.map(sev => (
                <button
                  key={sev.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, severity: sev.value }))}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg border-2 transition-colors',
                    form.severity === sev.value
                      ? 'border-pepper-red bg-pepper-red/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <span className={cn('px-2 py-0.5 rounded-full text-xs', sev.color)}>
                    {sev.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Info box */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">A bejelentés automatikusan rögzíti:</p>
                <ul className="mt-1 text-xs space-y-0.5">
                  <li>• A böngésző és eszköz adatait</li>
                  <li>• Az aktuális oldal URL-jét</li>
                  <li>• A bejelentkezett felhasználót</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              <Send className="h-4 w-4 mr-2" />
              Beküldés
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
