import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  AlertTriangle,
  MessageSquareWarning,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  User,
  Building2,
  Calendar,
  Tag,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Filter,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Modal } from '../components/common';
import { supabase } from '../lib/supabase';
import { formatDate, cn } from '../lib/utils';
import toast from 'react-hot-toast';

// Complaint types
const COMPLAINT_TYPES = [
  { value: 'service', label: 'Szolgáltatás' },
  { value: 'product', label: 'Termék' },
  { value: 'delivery', label: 'Szállítás' },
  { value: 'billing', label: 'Számlázás' },
  { value: 'other', label: 'Egyéb' },
];

// Priority levels
const PRIORITIES = [
  { value: 'low', label: 'Alacsony', color: 'bg-gray-100 text-gray-700' },
  { value: 'normal', label: 'Normál', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Magas', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Sürgős', color: 'bg-red-100 text-red-700' },
];

// Statuses
const STATUSES = [
  { value: 'new', label: 'Új', icon: MessageSquareWarning, color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'Folyamatban', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'escalated', label: 'Eszkalálva', icon: ArrowUpCircle, color: 'bg-red-100 text-red-700' },
  { value: 'resolved', label: 'Megoldva', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: 'Lezárva', icon: XCircle, color: 'bg-gray-100 text-gray-700' },
];

// Sources
const SOURCES = [
  { value: 'direct', label: 'Személyes', icon: User },
  { value: 'phone', label: 'Telefon', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'web', label: 'Webes', icon: Globe },
  { value: 'social', label: 'Közösségi', icon: MessageSquare },
];

// Resolution types
const RESOLUTION_TYPES = [
  { value: 'refund', label: 'Visszatérítés' },
  { value: 'replacement', label: 'Csere' },
  { value: 'credit', label: 'Jóváírás' },
  { value: 'apology', label: 'Elnézéskérés' },
  { value: 'other', label: 'Egyéb' },
];

export default function ComplaintsPage() {
  const { user, profile, isAdmin } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedComplaints, setExpandedComplaints] = useState(new Set());

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    type: '',
  });

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Form states
  const [form, setForm] = useState({
    company_id: '',
    subject: '',
    description: '',
    complaint_type: 'service',
    priority: 'normal',
    source: 'direct',
  });

  const [resolveForm, setResolveForm] = useState({
    resolution: '',
    resolution_type: 'apology',
    resolution_amount: '',
    customer_satisfied: null,
    satisfaction_notes: '',
  });

  const [escalateForm, setEscalateForm] = useState({
    escalated_to: '',
    escalation_reason: '',
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch complaints with relations
      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaints')
        .select(`
          *,
          company:companies(id, name),
          assigned:user_profiles!complaints_assigned_to_fkey(id, full_name),
          escalated:user_profiles!complaints_escalated_to_fkey(id, full_name),
          resolver:user_profiles!complaints_resolved_by_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (complaintsError) throw complaintsError;

      // Fetch companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      // Fetch users
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .order('full_name');

      setComplaints(complaintsData || []);
      setCompanies(companiesData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch history for a complaint
  const fetchHistory = async (complaintId) => {
    try {
      const { data, error } = await supabase
        .from('complaint_history')
        .select(`
          *,
          user:user_profiles!complaint_history_created_by_fkey(id, full_name)
        `)
        .eq('complaint_id', complaintId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(prev => ({ ...prev, [complaintId]: data || [] }));
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    let result = [...complaints];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(c =>
        c.subject.toLowerCase().includes(searchLower) ||
        c.reference_number?.toLowerCase().includes(searchLower) ||
        c.company?.name?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      result = result.filter(c => c.status === filters.status);
    }

    if (filters.priority) {
      result = result.filter(c => c.priority === filters.priority);
    }

    if (filters.type) {
      result = result.filter(c => c.complaint_type === filters.type);
    }

    return result;
  }, [complaints, filters]);

  // Stats
  const stats = useMemo(() => ({
    total: complaints.length,
    new: complaints.filter(c => c.status === 'new').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    escalated: complaints.filter(c => c.status === 'escalated').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    avgResolutionDays: (() => {
      const resolved = complaints.filter(c => c.resolved_at);
      if (resolved.length === 0) return 0;
      const totalDays = resolved.reduce((sum, c) => {
        const created = new Date(c.created_at);
        const resolvedAt = new Date(c.resolved_at);
        return sum + (resolvedAt - created) / (1000 * 60 * 60 * 24);
      }, 0);
      return (totalDays / resolved.length).toFixed(1);
    })(),
  }), [complaints]);

  // Open complaint modal
  const openComplaintModal = (complaint = null) => {
    if (complaint) {
      setEditingComplaint(complaint);
      setForm({
        company_id: complaint.company_id || '',
        subject: complaint.subject,
        description: complaint.description,
        complaint_type: complaint.complaint_type,
        priority: complaint.priority,
        source: complaint.source,
      });
    } else {
      setEditingComplaint(null);
      setForm({
        company_id: '',
        subject: '',
        description: '',
        complaint_type: 'service',
        priority: 'normal',
        source: 'direct',
      });
    }
    setIsModalOpen(true);
  };

  // Save complaint
  const handleSaveComplaint = async (e) => {
    e.preventDefault();

    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Tárgy és leírás megadása kötelező!');
      return;
    }

    try {
      const data = {
        company_id: form.company_id || null,
        subject: form.subject.trim(),
        description: form.description.trim(),
        complaint_type: form.complaint_type,
        priority: form.priority,
        source: form.source,
        created_by: user.id,
      };

      if (editingComplaint) {
        const { error } = await supabase
          .from('complaints')
          .update(data)
          .eq('id', editingComplaint.id);
        if (error) throw error;
        toast.success('Reklamáció frissítve!');
      } else {
        const { error } = await supabase
          .from('complaints')
          .insert(data);
        if (error) throw error;
        toast.success('Reklamáció létrehozva!');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving complaint:', error);
      toast.error('Hiba a mentéskor');
    }
  };

  // Update status
  const updateStatus = async (complaint, newStatus) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', complaint.id);
      if (error) throw error;
      toast.success('Státusz frissítve!');
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Hiba a frissítéskor');
    }
  };

  // Assign to user
  const assignTo = async (complaint, userId) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          assigned_to: userId,
          status: complaint.status === 'new' ? 'in_progress' : complaint.status,
        })
        .eq('id', complaint.id);
      if (error) throw error;
      toast.success('Felelős hozzárendelve!');
      fetchData();
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error('Hiba a hozzárendeléskor');
    }
  };

  // Open escalate modal
  const openEscalateModal = (complaint) => {
    setSelectedComplaint(complaint);
    setEscalateForm({
      escalated_to: '',
      escalation_reason: '',
    });
    setIsEscalateModalOpen(true);
  };

  // Handle escalation
  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalateForm.escalated_to || !escalateForm.escalation_reason.trim()) {
      toast.error('Válassz ki felelőst és add meg az okot!');
      return;
    }

    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          status: 'escalated',
          escalated_to: escalateForm.escalated_to,
          escalation_reason: escalateForm.escalation_reason.trim(),
        })
        .eq('id', selectedComplaint.id);
      if (error) throw error;
      toast.success('Reklamáció eszkalálva!');
      setIsEscalateModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error escalating:', error);
      toast.error('Hiba az eszkalálásnál');
    }
  };

  // Open resolve modal
  const openResolveModal = (complaint) => {
    setSelectedComplaint(complaint);
    setResolveForm({
      resolution: '',
      resolution_type: 'apology',
      resolution_amount: '',
      customer_satisfied: null,
      satisfaction_notes: '',
    });
    setIsResolveModalOpen(true);
  };

  // Handle resolution
  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolveForm.resolution.trim()) {
      toast.error('Add meg a megoldás leírását!');
      return;
    }

    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          status: 'resolved',
          resolution: resolveForm.resolution.trim(),
          resolution_type: resolveForm.resolution_type,
          resolution_amount: resolveForm.resolution_amount ? parseFloat(resolveForm.resolution_amount) : null,
          customer_satisfied: resolveForm.customer_satisfied,
          satisfaction_notes: resolveForm.satisfaction_notes.trim() || null,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', selectedComplaint.id);
      if (error) throw error;
      toast.success('Reklamáció megoldva!');
      setIsResolveModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error resolving:', error);
      toast.error('Hiba a megoldásnál');
    }
  };

  // Delete complaint
  const handleDelete = async (complaint) => {
    if (!confirm(`Biztosan törlöd a "${complaint.reference_number}" reklamációt?`)) return;

    try {
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', complaint.id);
      if (error) throw error;
      toast.success('Reklamáció törölve!');
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Hiba a törléskor');
    }
  };

  // Toggle expansion and fetch history
  const toggleComplaint = (complaintId) => {
    setExpandedComplaints(prev => {
      const next = new Set(prev);
      if (next.has(complaintId)) {
        next.delete(complaintId);
      } else {
        next.add(complaintId);
        if (!history[complaintId]) {
          fetchHistory(complaintId);
        }
      }
      return next;
    });
  };

  // Get info helpers
  const getStatusInfo = (status) => STATUSES.find(s => s.value === status) || STATUSES[0];
  const getPriorityInfo = (priority) => PRIORITIES.find(p => p.value === priority) || PRIORITIES[1];
  const getTypeLabel = (type) => COMPLAINT_TYPES.find(t => t.value === type)?.label || type;
  const getSourceInfo = (source) => SOURCES.find(s => s.value === source) || SOURCES[0];

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Csak adminisztrátorok kezelhetik a reklamációkat.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reklamációk</h1>
          <p className="text-gray-500 mt-1">Ügyfélpanaszok kezelése</p>
        </div>
        <Button onClick={() => openComplaintModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Új reklamáció
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Összes</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
            <p className="text-xs text-gray-500">Új</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            <p className="text-xs text-gray-500">Folyamatban</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.escalated}</p>
            <p className="text-xs text-gray-500">Eszkalált</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-xs text-gray-500">Megoldva</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.avgResolutionDays}</p>
            <p className="text-xs text-gray-500">Átl. nap</p>
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
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden státusz</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden prioritás</option>
            {PRIORITIES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden típus</option>
            {COMPLAINT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Complaints List */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Betöltés...</div>
        ) : filteredComplaints.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquareWarning className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nincsenek reklamációk</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredComplaints.map(complaint => {
              const statusInfo = getStatusInfo(complaint.status);
              const priorityInfo = getPriorityInfo(complaint.priority);
              const StatusIcon = statusInfo.icon;
              const isExpanded = expandedComplaints.has(complaint.id);

              return (
                <div key={complaint.id}>
                  <div
                    className={cn(
                      'p-4 hover:bg-gray-50 cursor-pointer',
                      complaint.priority === 'urgent' && 'border-l-4 border-l-red-500'
                    )}
                    onClick={() => toggleComplaint(complaint.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-gray-400 pt-1">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                      <div className={cn('p-2 rounded-lg', statusInfo.color)}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-400">{complaint.reference_number}</span>
                          <span className="font-semibold text-gray-900">{complaint.subject}</span>
                          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', statusInfo.color)}>
                            {statusInfo.label}
                          </span>
                          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', priorityInfo.color)}>
                            {priorityInfo.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">{complaint.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(complaint.created_at)}
                          </span>
                          {complaint.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {complaint.company.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {getTypeLabel(complaint.complaint_type)}
                          </span>
                          {complaint.assigned && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {complaint.assigned.full_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {complaint.status === 'new' && (
                          <select
                            onChange={(e) => e.target.value && assignTo(complaint, e.target.value)}
                            className="text-xs border rounded px-2 py-1"
                            defaultValue=""
                          >
                            <option value="">Kiosztás...</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                          </select>
                        )}
                        {['new', 'in_progress'].includes(complaint.status) && (
                          <button
                            onClick={() => openEscalateModal(complaint)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                            title="Eszkalálás"
                          >
                            <ArrowUpCircle className="h-4 w-4" />
                          </button>
                        )}
                        {['in_progress', 'escalated'].includes(complaint.status) && (
                          <button
                            onClick={() => openResolveModal(complaint)}
                            className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-gray-100"
                            title="Megoldás"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {complaint.status === 'resolved' && (
                          <button
                            onClick={() => updateStatus(complaint, 'closed')}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            title="Lezárás"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openComplaintModal(complaint)}
                          className="p-2 text-gray-400 hover:text-pepper-red rounded-lg hover:bg-gray-100"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(complaint)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-16 bg-gray-50 border-t">
                      <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Details */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Részletek</h4>
                          <div className="text-sm space-y-2">
                            <p><strong>Leírás:</strong> {complaint.description}</p>
                            <p><strong>Forrás:</strong> {getSourceInfo(complaint.source).label}</p>
                            {complaint.escalation_reason && (
                              <p><strong>Eszkaláció oka:</strong> {complaint.escalation_reason}</p>
                            )}
                            {complaint.resolution && (
                              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="font-medium text-green-800">Megoldás:</p>
                                <p className="text-green-700">{complaint.resolution}</p>
                                {complaint.resolution_amount && (
                                  <p className="text-green-600 mt-1">Összeg: {complaint.resolution_amount.toLocaleString()} Ft</p>
                                )}
                                {complaint.customer_satisfied !== null && (
                                  <div className="flex items-center gap-2 mt-2">
                                    {complaint.customer_satisfied ? (
                                      <ThumbsUp className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <ThumbsDown className="h-4 w-4 text-red-600" />
                                    )}
                                    <span>{complaint.customer_satisfied ? 'Ügyfél elégedett' : 'Ügyfél elégedetlen'}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* History */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Előzmények</h4>
                          {!history[complaint.id] ? (
                            <p className="text-sm text-gray-500">Betöltés...</p>
                          ) : history[complaint.id].length === 0 ? (
                            <p className="text-sm text-gray-500">Nincs előzmény</p>
                          ) : (
                            <div className="space-y-2">
                              {history[complaint.id].map(h => (
                                <div key={h.id} className="text-xs bg-white p-2 rounded border">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{h.action_type}</span>
                                    <span className="text-gray-400">{formatDate(h.created_at)}</span>
                                  </div>
                                  {h.notes && <p className="text-gray-600 mt-1">{h.notes}</p>}
                                  {h.user && <p className="text-gray-400 mt-1">— {h.user.full_name}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* New/Edit Complaint Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingComplaint ? 'Reklamáció szerkesztése' : 'Új reklamáció'}
        size="lg"
      >
        <form onSubmit={handleSaveComplaint} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cég</label>
            <select
              value={form.company_id}
              onChange={(e) => setForm(prev => ({ ...prev, company_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
            >
              <option value="">Válassz céget...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tárgy *</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Rövid összefoglaló..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leírás *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Részletes leírás..."
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Típus</label>
              <select
                value={form.complaint_type}
                onChange={(e) => setForm(prev => ({ ...prev, complaint_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                {COMPLAINT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioritás</label>
              <select
                value={form.priority}
                onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forrás</label>
              <select
                value={form.source}
                onChange={(e) => setForm(prev => ({ ...prev, source: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                {SOURCES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              {editingComplaint ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Escalate Modal */}
      <Modal
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
        title="Reklamáció eszkalálása"
        size="md"
      >
        <form onSubmit={handleEscalate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Eszkalálás címzettje *</label>
            <select
              value={escalateForm.escalated_to}
              onChange={(e) => setEscalateForm(prev => ({ ...prev, escalated_to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              required
            >
              <option value="">Válassz...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Eszkaláció oka *</label>
            <textarea
              value={escalateForm.escalation_reason}
              onChange={(e) => setEscalateForm(prev => ({ ...prev, escalation_reason: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Miért szükséges eszkalálni..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsEscalateModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Eszkalálás
            </Button>
          </div>
        </form>
      </Modal>

      {/* Resolve Modal */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Reklamáció megoldása"
        size="lg"
      >
        <form onSubmit={handleResolve} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Megoldás leírása *</label>
            <textarea
              value={resolveForm.resolution}
              onChange={(e) => setResolveForm(prev => ({ ...prev, resolution: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Hogyan lett megoldva a probléma..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Megoldás típusa</label>
              <select
                value={resolveForm.resolution_type}
                onChange={(e) => setResolveForm(prev => ({ ...prev, resolution_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                {RESOLUTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Összeg (Ft)</label>
              <input
                type="number"
                value={resolveForm.resolution_amount}
                onChange={(e) => setResolveForm(prev => ({ ...prev, resolution_amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ügyfél elégedettsége</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setResolveForm(prev => ({ ...prev, customer_satisfied: true }))}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border-2',
                  resolveForm.customer_satisfied === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <ThumbsUp className="h-4 w-4" />
                Elégedett
              </button>
              <button
                type="button"
                onClick={() => setResolveForm(prev => ({ ...prev, customer_satisfied: false }))}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border-2',
                  resolveForm.customer_satisfied === false
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <ThumbsDown className="h-4 w-4" />
                Elégedetlen
              </button>
            </div>
          </div>

          {resolveForm.customer_satisfied === false && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Megjegyzés</label>
              <textarea
                value={resolveForm.satisfaction_notes}
                onChange={(e) => setResolveForm(prev => ({ ...prev, satisfaction_notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                placeholder="Miért elégedetlen az ügyfél..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsResolveModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              <CheckCircle className="h-4 w-4 mr-2" />
              Megoldva
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
