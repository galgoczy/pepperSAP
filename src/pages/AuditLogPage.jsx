import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Plus,
  Edit2,
  Trash2,
  User,
  Calendar,
  Database,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Search,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from '../components/common';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

// Action colors and icons
const ACTION_INFO = {
  INSERT: { label: 'Létrehozás', icon: Plus, color: 'bg-green-100 text-green-700' },
  UPDATE: { label: 'Módosítás', icon: Edit2, color: 'bg-blue-100 text-blue-700' },
  DELETE: { label: 'Törlés', icon: Trash2, color: 'bg-red-100 text-red-700' },
};

// Table name translations
const TABLE_NAMES = {
  daily_revenue: 'Napi bevétel',
  cash_register_revenue: 'Pénztárgép forgalom',
  expenses: 'Kifizetések',
  deals: 'Üzleti lehetőségek',
  companies: 'Cégek',
  company_contacts: 'Kapcsolattartók',
  budget_entries: 'Budget tételek',
  events: 'Rendezvények',
  documents: 'Dokumentumok',
  user_profiles: 'Felhasználók',
  units: 'Egységek',
  cash_registers: 'Pénztárgépek',
  sales_events: 'Sales események',
  support_tickets: 'Támogatási jegyek',
};

// Format date for display
const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Format JSON value for display
const formatValue = (value) => {
  if (value === null || value === undefined) return <span className="text-gray-400 italic">null</span>;
  if (typeof value === 'boolean') return value ? 'igen' : 'nem';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return formatDateTime(value);
  }
  return String(value);
};

export default function AuditLogPage() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState(new Set());

  // Filters
  const [filters, setFilters] = useState({
    table: '',
    action: '',
    user: '',
    dateFrom: '',
    dateTo: '',
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;

  // Fetch logs
  const fetchLogs = useCallback(async (reset = false) => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const currentPage = reset ? 0 : page;

      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (filters.table) {
        query = query.eq('table_name', filters.table);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.user) {
        query = query.or(`user_name.ilike.%${filters.user}%,user_email.ilike.%${filters.user}%`);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;

      if (reset) {
        setLogs(data || []);
        setPage(0);
      } else {
        setLogs(prev => currentPage === 0 ? (data || []) : [...prev, ...(data || [])]);
      }

      setHasMore((data || []).length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Hiba az audit log betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, filters]);

  useEffect(() => {
    fetchLogs(true);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more
  const loadMore = () => {
    setPage(prev => prev + 1);
    fetchLogs(false);
  };

  // Toggle log expansion
  const toggleLog = (logId) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  // Get unique tables from logs
  const uniqueTables = [...new Set(logs.map(l => l.table_name))].sort();

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Csak adminisztrátorok tekinthetik meg az audit logot.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-500 mt-1">
            Adatváltozások nyomon követése
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => fetchLogs(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Frissítés
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Szűrők</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tábla</label>
              <select
                value={filters.table}
                onChange={(e) => setFilters(prev => ({ ...prev, table: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                <option value="">Mind</option>
                {Object.entries(TABLE_NAMES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Művelet</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                <option value="">Mind</option>
                <option value="INSERT">Létrehozás</option>
                <option value="UPDATE">Módosítás</option>
                <option value="DELETE">Törlés</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Felhasználó</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.user}
                  onChange={(e) => setFilters(prev => ({ ...prev, user: e.target.value }))}
                  placeholder="Név vagy email..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dátum (-tól)</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dátum (-ig)</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
          </div>
          {(filters.table || filters.action || filters.user || filters.dateFrom || filters.dateTo) && (
            <button
              onClick={() => setFilters({ table: '', action: '', user: '', dateFrom: '', dateTo: '' })}
              className="mt-3 text-sm text-pepper-red hover:text-pepper-red/80"
            >
              Szűrők törlése
            </button>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
            <p className="text-sm text-gray-500">Megjelenített</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {logs.filter(l => l.action === 'INSERT').length}
            </p>
            <p className="text-sm text-gray-500">Létrehozás</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {logs.filter(l => l.action === 'UPDATE').length}
            </p>
            <p className="text-sm text-gray-500">Módosítás</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {logs.filter(l => l.action === 'DELETE').length}
            </p>
            <p className="text-sm text-gray-500">Törlés</p>
          </div>
        </Card>
      </div>

      {/* Logs List */}
      <Card>
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Betöltés...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nincsenek audit log bejegyzések</p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map(log => {
              const actionInfo = ACTION_INFO[log.action] || ACTION_INFO.UPDATE;
              const ActionIcon = actionInfo.icon;
              const isExpanded = expandedLogs.has(log.id);
              const tableName = TABLE_NAMES[log.table_name] || log.table_name;

              return (
                <div key={log.id}>
                  <div
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleLog(log.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Expand toggle */}
                      <div className="text-gray-400 pt-1">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>

                      {/* Action icon */}
                      <div className={cn('p-2 rounded-lg', actionInfo.color)}>
                        <ActionIcon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', actionInfo.color)}>
                            {actionInfo.label}
                          </span>
                          <span className="font-medium text-gray-900">{tableName}</span>
                          {log.changed_fields && log.changed_fields.length > 0 && (
                            <span className="text-xs text-gray-500">
                              ({log.changed_fields.length} mező)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(log.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.user_name || log.user_email || 'Ismeretlen'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            #{log.record_id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-16 bg-gray-50 border-t">
                      <div className="py-4 space-y-4">
                        {/* Changed fields for UPDATE */}
                        {log.action === 'UPDATE' && log.changed_fields && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Módosított mezők</h4>
                            <div className="space-y-2">
                              {log.changed_fields
                                .filter(field => field !== 'updated_at')
                                .map(field => (
                                  <div key={field} className="flex items-start gap-2 text-sm bg-white p-2 rounded-lg">
                                    <span className="font-medium text-gray-700 min-w-[120px]">{field}:</span>
                                    <span className="text-red-600 line-through">
                                      {formatValue(log.old_data?.[field])}
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-green-600">
                                      {formatValue(log.new_data?.[field])}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* New data for INSERT */}
                        {log.action === 'INSERT' && log.new_data && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Létrehozott adat</h4>
                            <pre className="text-xs bg-white p-3 rounded-lg overflow-x-auto">
                              {JSON.stringify(log.new_data, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Old data for DELETE */}
                        {log.action === 'DELETE' && log.old_data && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Törölt adat</h4>
                            <pre className="text-xs bg-white p-3 rounded-lg overflow-x-auto text-red-600">
                              {JSON.stringify(log.old_data, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Technical info */}
                        <div className="text-xs text-gray-500 pt-2 border-t">
                          <p><strong>Record ID:</strong> {log.record_id}</p>
                          <p><strong>Table:</strong> {log.table_name}</p>
                          {log.user_email && <p><strong>Email:</strong> {log.user_email}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {hasMore && logs.length > 0 && (
          <div className="p-4 border-t text-center">
            <Button
              variant="secondary"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? 'Betöltés...' : 'Több betöltése'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
