import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Megaphone,
  Mail,
  Phone,
  Calendar,
  Users,
  Target,
  TrendingUp,
  Edit2,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  BarChart3,
  Send,
  Eye,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Modal } from '../components/common';
import { supabase } from '../lib/supabase';
import { formatDate, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// Campaign types
const CAMPAIGN_TYPES = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Telefonos', icon: Phone },
  { value: 'event', label: 'Rendezvény', icon: Calendar },
  { value: 'other', label: 'Egyéb', icon: Megaphone },
];

// Campaign statuses
const STATUSES = [
  { value: 'draft', label: 'Tervezet', color: 'bg-gray-100 text-gray-700' },
  { value: 'active', label: 'Aktív', color: 'bg-green-100 text-green-700' },
  { value: 'paused', label: 'Szünetel', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'Befejezett', color: 'bg-blue-100 text-blue-700' },
  { value: 'cancelled', label: 'Törölt', color: 'bg-red-100 text-red-700' },
];

// Company types for filtering
const COMPANY_TYPES = [
  { value: 'customer', label: 'Ügyfél' },
  { value: 'supplier', label: 'Beszállító' },
  { value: 'both', label: 'Mindkettő' },
];

// Supplier categories
const SUPPLIER_CATEGORIES = [
  { value: 'vegetables', label: 'Zöldség' },
  { value: 'bakery', label: 'Pékáru' },
  { value: 'eggs', label: 'Tojás' },
  { value: 'meat', label: 'Hús' },
  { value: 'game', label: 'Vad' },
  { value: 'fish', label: 'Hal' },
  { value: 'softdrinks', label: 'Üdítő' },
  { value: 'alcohol', label: 'Alkohol' },
  { value: 'mixed', label: 'Vegyes' },
];

export default function CampaignsPage() {
  const { user, isAdmin } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
  });

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedTargets, setSelectedTargets] = useState([]);

  // Campaign form
  const [form, setForm] = useState({
    name: '',
    description: '',
    campaign_type: 'email',
    start_date: '',
    end_date: '',
  });

  // Target filters
  const [targetFilters, setTargetFilters] = useState({
    company_type: '',
    supplier_category: '',
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          owner:user_profiles!campaigns_owner_id_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Fetch companies for target selection
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select(`
          *,
          contacts:company_contacts(id, name, email, phone)
        `)
        .order('name');

      if (companiesError) throw companiesError;

      setCampaigns(campaignsData || []);
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      result = result.filter(c => c.status === filters.status);
    }

    if (filters.type) {
      result = result.filter(c => c.campaign_type === filters.type);
    }

    return result;
  }, [campaigns, filters]);

  // Filter companies for target selection
  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    if (targetFilters.company_type) {
      result = result.filter(c =>
        c.type === targetFilters.company_type || c.type === 'both'
      );
    }

    if (targetFilters.supplier_category) {
      result = result.filter(c => c.supplier_category === targetFilters.supplier_category);
    }

    return result;
  }, [companies, targetFilters]);

  // Stats
  const stats = useMemo(() => ({
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    totalTargets: campaigns.reduce((sum, c) => sum + (c.target_count || 0), 0),
    totalResponded: campaigns.reduce((sum, c) => sum + (c.responded_count || 0), 0),
  }), [campaigns]);

  // Open campaign modal
  const openCampaignModal = (campaign = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setForm({
        name: campaign.name,
        description: campaign.description || '',
        campaign_type: campaign.campaign_type,
        start_date: campaign.start_date || '',
        end_date: campaign.end_date || '',
      });
    } else {
      setEditingCampaign(null);
      setForm({
        name: '',
        description: '',
        campaign_type: 'email',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
      });
    }
    setIsModalOpen(true);
  };

  // Save campaign
  const handleSaveCampaign = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Add meg a kampány nevét!');
      return;
    }

    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        campaign_type: form.campaign_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        owner_id: user.id,
        created_by: user.id,
      };

      if (editingCampaign) {
        const { error } = await supabase
          .from('campaigns')
          .update(data)
          .eq('id', editingCampaign.id);
        if (error) throw error;
        toast.success('Kampány frissítve!');
      } else {
        const { error } = await supabase
          .from('campaigns')
          .insert(data);
        if (error) throw error;
        toast.success('Kampány létrehozva!');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Hiba a mentéskor');
    }
  };

  // Update campaign status
  const updateStatus = async (campaign, newStatus) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);
      if (error) throw error;
      toast.success('Státusz frissítve!');
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Hiba a frissítéskor');
    }
  };

  // Delete campaign
  const handleDelete = async (campaign) => {
    if (!confirm(`Biztosan törlöd a "${campaign.name}" kampányt?`)) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaign.id);
      if (error) throw error;
      toast.success('Kampány törölve!');
      fetchData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Hiba a törléskor');
    }
  };

  // Open target selection modal
  const openTargetModal = (campaign) => {
    setSelectedCampaign(campaign);
    setSelectedTargets([]);
    setTargetFilters({ company_type: '', supplier_category: '' });
    setIsTargetModalOpen(true);
  };

  // Add targets to campaign
  const addTargets = async () => {
    if (selectedTargets.length === 0) {
      toast.error('Válassz ki célközönséget!');
      return;
    }

    try {
      const targets = selectedTargets.map(companyId => ({
        campaign_id: selectedCampaign.id,
        company_id: companyId,
      }));

      const { error } = await supabase
        .from('campaign_targets')
        .insert(targets);

      if (error) throw error;

      toast.success(`${selectedTargets.length} cég hozzáadva a kampányhoz!`);
      setIsTargetModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error adding targets:', error);
      toast.error('Hiba a célközönség hozzáadásakor');
    }
  };

  // Export targets to Excel
  const exportTargets = async (campaign) => {
    try {
      const { data: targets, error } = await supabase
        .from('campaign_targets')
        .select(`
          *,
          company:companies(id, name, email, phone, address, type),
          contact:company_contacts(id, name, email, phone)
        `)
        .eq('campaign_id', campaign.id);

      if (error) throw error;

      if (!targets || targets.length === 0) {
        toast.error('Nincs célközönség a kampányban');
        return;
      }

      // Prepare data for Excel
      const rows = targets.map(t => ({
        'Cég': t.company?.name || '',
        'Email': t.company?.email || t.contact?.email || '',
        'Telefon': t.company?.phone || t.contact?.phone || '',
        'Cím': t.company?.address || '',
        'Típus': t.company?.type || '',
        'Státusz': t.status,
        'Kiküldve': t.sent_at ? formatDate(t.sent_at) : '',
        'Megnyitva': t.opened_at ? formatDate(t.opened_at) : '',
        'Válaszolt': t.responded_at ? formatDate(t.responded_at) : '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Célközönség');
      XLSX.writeFile(wb, `kampany_celkozonseg_${campaign.name.replace(/\s+/g, '_')}.xlsx`);

      toast.success('Export sikeres!');
    } catch (error) {
      console.error('Error exporting targets:', error);
      toast.error('Hiba az exportálásnál');
    }
  };

  // Get type info
  const getTypeInfo = (type) => {
    return CAMPAIGN_TYPES.find(t => t.value === type) || CAMPAIGN_TYPES[3];
  };

  // Get status info
  const getStatusInfo = (status) => {
    return STATUSES.find(s => s.value === status) || STATUSES[0];
  };

  // Toggle company selection
  const toggleCompanySelection = (companyId) => {
    setSelectedTargets(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      }
      return [...prev, companyId];
    });
  };

  // Select all filtered companies
  const selectAllFiltered = () => {
    const allIds = filteredCompanies.map(c => c.id);
    setSelectedTargets(prev => {
      const newSet = new Set([...prev, ...allIds]);
      return Array.from(newSet);
    });
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedTargets([]);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Csak adminisztrátorok kezelhetik a kampányokat.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kampányok</h1>
          <p className="text-gray-500 mt-1">Marketing kampányok kezelése</p>
        </div>
        <Button onClick={() => openCampaignModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Új kampány
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">Összes</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-sm text-gray-500">Aktív</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
            <p className="text-sm text-gray-500">Befejezett</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.totalTargets}</p>
            <p className="text-sm text-gray-500">Célzott cég</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-pepper-red">{stats.totalResponded}</p>
            <p className="text-sm text-gray-500">Válasz</p>
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
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden típus</option>
            {CAMPAIGN_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Campaigns List */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Betöltés...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-8 text-center">
            <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nincsenek kampányok</p>
            <Button className="mt-4" onClick={() => openCampaignModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Első kampány
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredCampaigns.map(campaign => {
              const typeInfo = getTypeInfo(campaign.campaign_type);
              const statusInfo = getStatusInfo(campaign.status);
              const TypeIcon = typeInfo.icon;
              const responseRate = campaign.target_count > 0
                ? ((campaign.responded_count || 0) / campaign.target_count * 100).toFixed(1)
                : 0;

              return (
                <div key={campaign.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    {/* Type icon */}
                    <div className="p-2 bg-pepper-red/10 rounded-lg">
                      <TypeIcon className="h-5 w-5 text-pepper-red" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{campaign.name}</span>
                        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">{campaign.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        {campaign.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(campaign.start_date)}
                            {campaign.end_date && ` - ${formatDate(campaign.end_date)}`}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {campaign.target_count || 0} célzott
                        </span>
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          {campaign.sent_count || 0} kiküldve
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {campaign.responded_count || 0} válasz ({responseRate}%)
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => openTargetModal(campaign)}
                        className="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-gray-100"
                        title="Célközönség"
                      >
                        <Target className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => exportTargets(campaign)}
                        className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-gray-100"
                        title="Export"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => updateStatus(campaign, 'active')}
                          className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-gray-100"
                          title="Indítás"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      {campaign.status === 'active' && (
                        <>
                          <button
                            onClick={() => updateStatus(campaign, 'paused')}
                            className="p-2 text-gray-400 hover:text-yellow-600 rounded-lg hover:bg-gray-100"
                            title="Szüneteltetés"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateStatus(campaign, 'completed')}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100"
                            title="Befejezés"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {campaign.status === 'paused' && (
                        <button
                          onClick={() => updateStatus(campaign, 'active')}
                          className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-gray-100"
                          title="Folytatás"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openCampaignModal(campaign)}
                        className="p-2 text-gray-400 hover:text-pepper-red rounded-lg hover:bg-gray-100"
                        title="Szerkesztés"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(campaign)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                        title="Törlés"
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

      {/* Campaign Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCampaign ? 'Kampány szerkesztése' : 'Új kampány'}
        size="lg"
      >
        <form onSubmit={handleSaveCampaign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kampány neve *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="pl. Tavaszi akció 2026"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leírás</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Kampány részletei..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Típus</label>
            <div className="grid grid-cols-2 gap-2">
              {CAMPAIGN_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, campaign_type: type.value }))}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                      form.campaign_type === type.value
                        ? 'border-pepper-red bg-pepper-red/5'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kezdés</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Befejezés</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              {editingCampaign ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Target Selection Modal */}
      <Modal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        title={`Célközönség - ${selectedCampaign?.name || ''}`}
        size="xl"
      >
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Cég típus</label>
              <select
                value={targetFilters.company_type}
                onChange={(e) => setTargetFilters(prev => ({ ...prev, company_type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                <option value="">Mind</option>
                {COMPANY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Beszállító kategória</label>
              <select
                value={targetFilters.supplier_category}
                onChange={(e) => setTargetFilters(prev => ({ ...prev, supplier_category: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                <option value="">Mind</option>
                {SUPPLIER_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selection info */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {filteredCompanies.length} cég szűrve, {selectedTargets.length} kiválasztva
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAllFiltered}
                className="text-sm text-pepper-red hover:text-pepper-red/80"
              >
                Mind kiválasztása
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Törlés
              </button>
            </div>
          </div>

          {/* Companies list */}
          <div className="max-h-[400px] overflow-y-auto border rounded-lg">
            {filteredCompanies.length === 0 ? (
              <p className="p-4 text-center text-gray-500">Nincs találat a szűrőkkel</p>
            ) : (
              <div className="divide-y">
                {filteredCompanies.map(company => (
                  <label
                    key={company.id}
                    className={cn(
                      'flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50',
                      selectedTargets.includes(company.id) && 'bg-pepper-red/5'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTargets.includes(company.id)}
                      onChange={() => toggleCompanySelection(company.id)}
                      className="rounded border-gray-300 text-pepper-red focus:ring-pepper-red"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{company.name}</p>
                      <p className="text-xs text-gray-500">
                        {company.email || 'Nincs email'} • {company.phone || 'Nincs telefon'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {company.contacts?.length || 0} kontakt
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsTargetModalOpen(false)}>
              Mégse
            </Button>
            <Button onClick={addTargets} disabled={selectedTargets.length === 0}>
              <Users className="h-4 w-4 mr-2" />
              {selectedTargets.length} cég hozzáadása
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
