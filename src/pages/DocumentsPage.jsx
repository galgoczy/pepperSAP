import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Upload,
  FileText,
  Download,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Link2,
  ExternalLink,
  FolderOpen,
  Calendar,
  Building2,
  Tag,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Modal, Input, Select } from '../components/common';
import { supabase } from '../lib/supabase';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { startMicrosoftAuth, isAzureConfigured, MicrosoftGraphClient } from '../lib/microsoft';
import toast from 'react-hot-toast';

export default function DocumentsPage() {
  const { isAdmin, profile } = useAuth();

  // State
  const [documents, setDocuments] = useState([]);
  const [topics, setTopics] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [storageConnected, setStorageConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    topicId: '',
    unitId: '',
    year: '',
    accessLevel: '',
  });

  // Upload form
  const [uploadForm, setUploadForm] = useState({
    file: null,
    title: '',
    description: '',
    topicId: '',
    unitId: '',
    documentDate: '',
    tags: '',
    accessLevel: 'admin',
  });
  const [uploading, setUploading] = useState(false);

  // Topic form
  const [topicForm, setTopicForm] = useState({ name: '', description: '' });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch topics
      const { data: topicsData } = await supabase
        .from('document_topics')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setTopics(topicsData || []);

      // Fetch units
      const { data: unitsData } = await supabase
        .from('units')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      setUnits(unitsData || []);

      // Build documents query
      let query = supabase
        .from('documents')
        .select(`
          *,
          topic:document_topics(id, name),
          unit:units(id, name),
          uploader:user_profiles(id, full_name)
        `)
        .neq('sync_status', 'deleted')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.topicId) {
        query = query.eq('topic_id', filters.topicId);
      }
      if (filters.unitId) {
        query = query.eq('unit_id', filters.unitId);
      }
      if (filters.year) {
        query = query.eq('year', parseInt(filters.year));
      }
      if (filters.accessLevel) {
        query = query.eq('access_level', filters.accessLevel);
      }

      const { data: docsData, error } = await query;

      if (error) throw error;

      // Filter by search (client-side)
      let filteredDocs = docsData || [];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredDocs = filteredDocs.filter(
          (doc) =>
            doc.title.toLowerCase().includes(searchLower) ||
            doc.file_name.toLowerCase().includes(searchLower) ||
            doc.description?.toLowerCase().includes(searchLower) ||
            doc.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
        );
      }

      setDocuments(filteredDocs);

      // Check if storage is connected
      const { data: tokenData } = await supabase
        .from('microsoft_tokens')
        .select('id, user_email, user_name')
        .eq('is_storage_account', true)
        .single();

      setStorageConnected(!!tokenData);
      if (tokenData) {
        setConnectedAccount({
          email: tokenData.user_email,
          name: tokenData.user_name,
        });
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Hiba a dokumentumok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get unique years from documents
  const years = [...new Set(documents.map((d) => d.year).filter(Boolean))].sort((a, b) => b - a);

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm((prev) => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
      }));
    }
  };

  // Handle upload
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadForm.file) {
      toast.error('Válassz ki egy fájlt!');
      return;
    }

    if (!uploadForm.title.trim()) {
      toast.error('Add meg a dokumentum címét!');
      return;
    }

    if (!uploadForm.topicId) {
      toast.error('Válassz témakört!');
      return;
    }

    setUploading(true);

    try {
      // For now, we'll just save metadata to the database
      // SharePoint upload will be implemented when Azure is set up
      const year = uploadForm.documentDate
        ? new Date(uploadForm.documentDate).getFullYear()
        : new Date().getFullYear();

      const tags = uploadForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase.from('documents').insert({
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim() || null,
        file_name: uploadForm.file.name,
        file_size: uploadForm.file.size,
        mime_type: uploadForm.file.type,
        topic_id: uploadForm.topicId,
        unit_id: uploadForm.unitId || null,
        document_date: uploadForm.documentDate || null,
        year,
        tags,
        access_level: uploadForm.accessLevel,
        uploaded_by: profile?.id,
        sync_status: 'pending', // Will be synced to SharePoint later
      });

      if (error) throw error;

      toast.success('Dokumentum sikeresen feltöltve!');
      setIsUploadOpen(false);
      setUploadForm({
        file: null,
        title: '',
        description: '',
        topicId: '',
        unitId: '',
        documentDate: '',
        tags: '',
        accessLevel: 'admin',
      });
      fetchData();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Hiba a feltöltés során');
    } finally {
      setUploading(false);
    }
  };

  // Handle add topic
  const handleAddTopic = async (e) => {
    e.preventDefault();

    if (!topicForm.name.trim()) {
      toast.error('Add meg a témakör nevét!');
      return;
    }

    try {
      const { error } = await supabase.from('document_topics').insert({
        name: topicForm.name.trim(),
        description: topicForm.description.trim() || null,
        sort_order: topics.length + 1,
      });

      if (error) throw error;

      toast.success('Témakör sikeresen létrehozva!');
      setIsTopicModalOpen(false);
      setTopicForm({ name: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding topic:', error);
      toast.error('Hiba a témakör létrehozásakor');
    }
  };

  // Handle delete document
  const handleDelete = async (doc) => {
    if (!confirm(`Biztosan törlöd a "${doc.title}" dokumentumot?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .update({ sync_status: 'deleted' })
        .eq('id', doc.id);

      if (error) throw error;

      toast.success('Dokumentum törölve!');
      fetchData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Hiba a törlés során');
    }
  };

  // Handle SharePoint connection
  const handleConnectSharePoint = async () => {
    if (!isAzureConfigured()) {
      toast.error('Azure nincs konfigurálva. Add hozzá a VITE_AZURE_CLIENT_ID és VITE_AZURE_TENANT_ID értékeket a .env.local fájlhoz.');
      return;
    }

    setConnecting(true);

    try {
      // Start OAuth flow
      const tokens = await startMicrosoftAuth();

      // Get user info from Microsoft Graph
      const client = new MicrosoftGraphClient(tokens.accessToken);
      const user = await client.getMe();

      // Save tokens to database
      const userEmail = user.mail || user.userPrincipalName;
      const { error } = await supabase.from('microsoft_tokens').upsert({
        user_email: userEmail,
        user_name: user.displayName,
        user_id: profile?.id || null,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt.toISOString(),
        is_storage_account: true, // This is the main storage account
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_email',
      });

      if (error) throw error;

      toast.success(`SharePoint csatlakoztatva: ${user.mail || user.userPrincipalName}`);
      setStorageConnected(true);
      setConnectedAccount({
        email: user.mail || user.userPrincipalName,
        name: user.displayName,
      });
      setIsConnectModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('SharePoint connection error:', error);
      toast.error(error.message || 'Hiba a SharePoint csatlakoztatásakor');
    } finally {
      setConnecting(false);
    }
  };

  // Handle disconnect SharePoint
  const handleDisconnectSharePoint = async () => {
    if (!confirm('Biztosan leválasztod a SharePoint-ot?')) return;

    try {
      const { error } = await supabase
        .from('microsoft_tokens')
        .delete()
        .eq('is_storage_account', true);

      if (error) throw error;

      toast.success('SharePoint leválasztva');
      setStorageConnected(false);
      setConnectedAccount(null);
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Hiba a leválasztáskor');
    }
  };

  // Handle toggle access
  const handleToggleAccess = async (doc) => {
    const newAccess = doc.access_level === 'admin' ? 'all' : 'admin';

    try {
      const { error } = await supabase
        .from('documents')
        .update({ access_level: newAccess })
        .eq('id', doc.id);

      if (error) throw error;

      toast.success(`Hozzáférés: ${newAccess === 'all' ? 'Mindenki' : 'Csak admin'}`);
      fetchData();
    } catch (error) {
      console.error('Error updating access:', error);
      toast.error('Hiba a hozzáférés módosításakor');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file icon based on mime type
  const getFileIcon = (mimeType) => {
    if (!mimeType) return FileText;
    if (mimeType.includes('pdf')) return FileText;
    if (mimeType.includes('image')) return FileText;
    if (mimeType.includes('word') || mimeType.includes('document')) return FileText;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return FileText;
    return FileText;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dokumentumok</h1>
          <p className="text-gray-500 mt-1">
            Dokumentumok kezelése és SharePoint szinkronizálás
          </p>
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button variant="secondary" onClick={() => setIsTopicModalOpen(true)}>
                <FolderOpen className="h-4 w-4" />
                Új témakör
              </Button>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="h-4 w-4" />
                Feltöltés
              </Button>
            </>
          )}
        </div>
      </div>

      {/* SharePoint connection status */}
      {isAdmin && !storageConnected && (
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">SharePoint nincs csatlakoztatva</p>
              <p className="text-sm text-amber-600">
                A dokumentumok helyi tárolásban vannak. Csatlakoztasd a SharePoint-ot a szinkronizáláshoz.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setIsConnectModalOpen(true)}>
              <Link2 className="h-4 w-4" />
              Csatlakoztatás
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Keresés..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
                />
              </div>
            </div>

            {/* Topic filter */}
            <select
              value={filters.topicId}
              onChange={(e) => setFilters((prev) => ({ ...prev, topicId: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
            >
              <option value="">Minden témakör</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>

            {/* Unit filter */}
            <select
              value={filters.unitId}
              onChange={(e) => setFilters((prev) => ({ ...prev, unitId: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
            >
              <option value="">Minden egység</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>

            {/* Year filter */}
            <select
              value={filters.year}
              onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
            >
              <option value="">Minden év</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Access level filter (admin only) */}
            {isAdmin && (
              <select
                value={filters.accessLevel}
                onChange={(e) => setFilters((prev) => ({ ...prev, accessLevel: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
              >
                <option value="">Minden hozzáférés</option>
                <option value="admin">Csak admin</option>
                <option value="all">Mindenki</option>
              </select>
            )}

            {/* Refresh */}
            <Button variant="secondary" onClick={fetchData}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Document list */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-pepper-red" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nincsenek dokumentumok</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setIsUploadOpen(true)}>
                <Upload className="h-4 w-4" />
                Első dokumentum feltöltése
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dokumentum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Témakör
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Egység
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dátum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Méret
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hozzáférés
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Műveletek
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => {
                  const FileIcon = getFileIcon(doc.mime_type);
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <FileIcon className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{doc.title}</p>
                            <p className="text-sm text-gray-500">{doc.file_name}</p>
                            {doc.tags?.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {doc.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {doc.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{doc.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {doc.topic?.name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {doc.unit?.name || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {doc.document_date ? formatDate(doc.document_date) : '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatFileSize(doc.file_size)}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleToggleAccess(doc)}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                              doc.access_level === 'all'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {doc.access_level === 'all' ? (
                              <>
                                <Eye className="h-3 w-3" />
                                Mindenki
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3" />
                                Admin
                              </>
                            )}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {doc.sharepoint_web_url && (
                            <a
                              href={doc.sharepoint_web_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-500 hover:text-pepper-red rounded-lg hover:bg-gray-100"
                              title="Megnyitás SharePoint-ban"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            className="p-2 text-gray-500 hover:text-pepper-red rounded-lg hover:bg-gray-100"
                            title="Letöltés"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(doc)}
                              className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100"
                              title="Törlés"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Dokumentum feltöltése"
        size="lg"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fájl kiválasztása *
            </label>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                uploadForm.file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-pepper-red'
              )}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {uploadForm.file ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900">{uploadForm.file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(uploadForm.file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadForm((prev) => ({ ...prev, file: null }));
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Kattints vagy húzd ide a fájlt</p>
                </>
              )}
            </div>
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cím *
            </label>
            <input
              type="text"
              value={uploadForm.title}
              onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
              placeholder="Dokumentum címe"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leírás
            </label>
            <textarea
              value={uploadForm.description}
              onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
              placeholder="Rövid leírás (opcionális)"
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Témakör *
            </label>
            <select
              value={uploadForm.topicId}
              onChange={(e) => setUploadForm((prev) => ({ ...prev, topicId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
            >
              <option value="">Válassz témakört...</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Egység
              </label>
              <select
                value={uploadForm.unitId}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, unitId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
              >
                <option value="">Nincs megadva</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dátum
              </label>
              <input
                type="date"
                value={uploadForm.documentDate}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, documentDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Címkék
            </label>
            <input
              type="text"
              value={uploadForm.tags}
              onChange={(e) => setUploadForm((prev) => ({ ...prev, tags: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
              placeholder="Címkék vesszővel elválasztva (pl: fontos, 2024, szerződés)"
            />
          </div>

          {/* Access level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hozzáférés
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="accessLevel"
                  value="admin"
                  checked={uploadForm.accessLevel === 'admin'}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, accessLevel: e.target.value }))}
                  className="text-pepper-red focus:ring-pepper-red"
                />
                <span className="text-sm">Csak adminok</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="accessLevel"
                  value="all"
                  checked={uploadForm.accessLevel === 'all'}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, accessLevel: e.target.value }))}
                  className="text-pepper-red focus:ring-pepper-red"
                />
                <span className="text-sm">Mindenki</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsUploadOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" loading={uploading}>
              <Upload className="h-4 w-4" />
              Feltöltés
            </Button>
          </div>
        </form>
      </Modal>

      {/* Topic Modal */}
      <Modal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        title="Új témakör"
        size="sm"
      >
        <form onSubmit={handleAddTopic} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Témakör neve *
            </label>
            <input
              type="text"
              value={topicForm.name}
              onChange={(e) => setTopicForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
              placeholder="pl: Beszerzési szerződések"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leírás
            </label>
            <textarea
              value={topicForm.description}
              onChange={(e) => setTopicForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
              placeholder="Rövid leírás (opcionális)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsTopicModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              Létrehozás
            </Button>
          </div>
        </form>
      </Modal>

      {/* Connect SharePoint Modal */}
      <Modal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        title="SharePoint csatlakoztatása"
        size="md"
      >
        <div className="space-y-4">
          {storageConnected && connectedAccount ? (
            <>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <h3 className="font-medium text-green-800">SharePoint csatlakoztatva</h3>
                    <p className="text-sm text-green-600">
                      {connectedAccount.name} ({connectedAccount.email})
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setIsConnectModalOpen(false)}>
                  Bezárás
                </Button>
                <Button variant="danger" onClick={handleDisconnectSharePoint}>
                  Leválasztás
                </Button>
              </div>
            </>
          ) : isAzureConfigured() ? (
            <>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Microsoft 365 bejelentkezés</h3>
                <p className="text-sm text-blue-600">
                  Jelentkezz be az info@pepperhouse.hu fiókkal a SharePoint csatlakoztatásához.
                  A dokumentumok ezen a fiókon lesznek tárolva.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">Mappa struktúra:</p>
                <div className="p-3 bg-gray-50 rounded-lg font-mono text-xs">
                  <p>📁 PepperHouse Documents</p>
                  <p className="ml-4">📁 Számlák</p>
                  <p className="ml-8">📁 2024</p>
                  <p className="ml-8">📁 2025</p>
                  <p className="ml-4">📁 Szerződések</p>
                  <p className="ml-4">📁 HR dokumentumok</p>
                  <p className="ml-4">📁 ...</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => setIsConnectModalOpen(false)}>
                  Mégse
                </Button>
                <Button onClick={handleConnectSharePoint} loading={connecting}>
                  <Link2 className="h-4 w-4" />
                  Bejelentkezés Microsoft 365-tel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-amber-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800">Azure konfiguráció szükséges</h3>
                    <p className="text-sm text-amber-600 mt-1">
                      A SharePoint csatlakoztatásához be kell állítani az Azure App Registration-t
                      és hozzá kell adni a környezeti változókat.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">Hiányzó konfiguráció:</p>
                <div className="p-3 bg-gray-50 rounded-lg font-mono text-xs">
                  <p>VITE_AZURE_CLIENT_ID=your-client-id</p>
                  <p>VITE_AZURE_TENANT_ID=your-tenant-id</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-3">
                  A dokumentáció: <code className="bg-gray-100 px-1 rounded">docs/AZURE_SETUP_GUIDE.md</code>
                </p>
                <Button variant="secondary" onClick={() => setIsConnectModalOpen(false)}>
                  Bezárás
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
