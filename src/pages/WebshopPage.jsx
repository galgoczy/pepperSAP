import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Plus,
  Upload,
  Download,
  Calendar,
  Building2,
  TrendingUp,
  Package,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  FileSpreadsheet,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../lib/utils';
import * as XLSX from 'xlsx';

export default function WebshopPage() {
  const { profile, isAdmin, isEvents, isUnit, unitId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);

  // Check if user can view all units (admin or events)
  const canViewAllUnits = isAdmin || isEvents;
  // Check if user can add/import data (admin only)
  const canEdit = isAdmin;

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedUnit, setSelectedUnit] = useState('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    daysWithData: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Build query
      let query = supabase
        .from('webshop_daily_revenue')
        .select(`
          *,
          unit:units(id, name, short_name)
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false });

      // Filter by selected unit or user's own unit
      if (selectedUnit !== 'all') {
        query = query.eq('unit_id', selectedUnit);
      } else if (isUnit && unitId) {
        // Unit users can only see their own unit's data
        query = query.eq('unit_id', unitId);
      }

      const { data: revenue, error: revenueError } = await query;
      if (revenueError) throw revenueError;

      setRevenueData(revenue || []);

      // Calculate stats
      if (revenue && revenue.length > 0) {
        const totalRevenue = revenue.reduce((sum, r) => sum + Number(r.gross_revenue), 0);
        const totalOrders = revenue.reduce((sum, r) => sum + r.order_count, 0);
        setStats({
          totalRevenue,
          totalOrders,
          avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          daysWithData: revenue.length,
        });
      } else {
        setStats({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, daysWithData: 0 });
      }

      // Fetch top products for expanded rows
      const { data: products } = await supabase
        .from('webshop_top_products')
        .select('*')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('rank', { ascending: true });

      setTopProducts(products || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedUnit, isUnit, unitId]);

  const fetchUnits = async () => {
    const { data } = await supabase
      .from('units')
      .select('id, name, short_name')
      .eq('is_active', true)
      .order('name');
    setUnits(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('webshop_product_categories')
      .select('*')
      .order('name');
    setCategories(data || []);
  };

  useEffect(() => {
    fetchUnits();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getProductsForRow = (date, unitId) => {
    return topProducts.filter(
      (p) => p.date === date && p.unit_id === unitId
    ).slice(0, 5);
  };

  const handleExport = () => {
    const exportData = revenueData.map((r) => ({
      Dátum: r.date,
      Egység: r.unit?.name || '-',
      'Bruttó bevétel': r.gross_revenue,
      'Nettó bevétel': r.net_revenue,
      'Rendelések száma': r.order_count,
      'Átlag kosárérték': r.average_order_value,
      Forrás: r.source,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Webáruház forgalom');
    XLSX.writeFile(wb, `webshop_forgalom_${dateFrom}_${dateTo}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-pepper-red" />
            Webáruház forgalom
          </h1>
          <p className="text-gray-600 mt-1">
            Napi webáruház bevételek és top termékek
          </p>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-pepper-red text-white rounded-lg hover:bg-red-700"
            >
              <Plus className="h-4 w-4" />
              Új nap
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Összes bevétel</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rendelések</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders} db</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Átlag kosárérték</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.avgOrderValue)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Napok száma</p>
              <p className="text-2xl font-bold text-gray-900">{stats.daysWithData} nap</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dátum -tól
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border-gray-300 shadow-sm focus:ring-pepper-red focus:border-pepper-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dátum -ig
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border-gray-300 shadow-sm focus:ring-pepper-red focus:border-pepper-red"
            />
          </div>

          {canViewAllUnits && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Egység
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="rounded-lg border-gray-300 shadow-sm focus:ring-pepper-red focus:border-pepper-red"
              >
                <option value="all">Összes egység</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Frissítés
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dátum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Egység
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bruttó bevétel
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nettó bevétel
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rendelések
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Átlag
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Forrás
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Művelet
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Betöltés...
                  </td>
                </tr>
              ) : revenueData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    Nincs adat a megadott időszakban
                  </td>
                </tr>
              ) : (
                revenueData.map((row) => (
                  <>
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {row.unit?.short_name || row.unit?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        {formatCurrency(row.gross_revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {formatCurrency(row.net_revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {row.order_count} db
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {formatCurrency(row.average_order_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            row.source === 'api'
                              ? 'bg-green-100 text-green-800'
                              : row.source === 'import'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {row.source === 'api' ? 'API' : row.source === 'import' ? 'Import' : 'Manuális'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() =>
                            setExpandedRow(expandedRow === row.id ? null : row.id)
                          }
                          className="text-gray-400 hover:text-gray-600"
                          title="Top termékek"
                        >
                          {expandedRow === row.id ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedRow === row.id && (
                      <tr key={`${row.id}-products`}>
                        <td colSpan="8" className="px-6 py-4 bg-gray-50">
                          <div className="text-sm">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Top termékek - {formatDate(row.date)}
                            </h4>
                            {getProductsForRow(row.date, row.unit_id).length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {getProductsForRow(row.date, row.unit_id).map((product) => (
                                  <div
                                    key={product.id}
                                    className="flex items-center justify-between bg-white p-2 rounded border"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-gray-400">
                                        #{product.rank}
                                      </span>
                                      <span className="text-gray-900">{product.product_name}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-medium">
                                        {formatCurrency(product.gross_revenue)}
                                      </span>
                                      <span className="text-xs text-gray-500 ml-1">
                                        ({product.quantity_sold} db)
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500">Nincs top termék adat ehhez a naphoz</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddRevenueModal
          units={units}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchData();
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          units={units}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// Add Revenue Modal
function AddRevenueModal({ units, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    unit_id: '',
    gross_revenue: '',
    net_revenue: '',
    order_count: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.unit_id || !formData.gross_revenue) {
      setError('Egység és bruttó bevétel megadása kötelező');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('webshop_daily_revenue')
        .upsert(
          {
            date: formData.date,
            unit_id: formData.unit_id,
            gross_revenue: Number(formData.gross_revenue),
            net_revenue: Number(formData.net_revenue) || Number(formData.gross_revenue) * 0.787,
            order_count: Number(formData.order_count) || 0,
            notes: formData.notes,
            source: 'manual',
          },
          { onConflict: 'date,unit_id' }
        );

      if (insertError) throw insertError;
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Napi forgalom rögzítése</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dátum</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-pepper-red focus:border-pepper-red"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Egység</label>
              <select
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-pepper-red focus:border-pepper-red"
                required
              >
                <option value="">Válassz...</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bruttó bevétel (Ft)
              </label>
              <input
                type="number"
                value={formData.gross_revenue}
                onChange={(e) => setFormData({ ...formData, gross_revenue: e.target.value })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-pepper-red focus:border-pepper-red"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nettó bevétel (Ft)
              </label>
              <input
                type="number"
                value={formData.net_revenue}
                onChange={(e) => setFormData({ ...formData, net_revenue: e.target.value })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-pepper-red focus:border-pepper-red"
                placeholder="Automatikus, ha üres"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rendelések száma
            </label>
            <input
              type="number"
              value={formData.order_count}
              onChange={(e) => setFormData({ ...formData, order_count: e.target.value })}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-pepper-red focus:border-pepper-red"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Megjegyzés</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-pepper-red focus:border-pepper-red"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-pepper-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Mentés...' : 'Mentés'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Import Modal
function ImportModal({ units, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState([]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet);

      // Preview first 5 rows
      setPreview(json.slice(0, 5));
    } catch (err) {
      setError('Nem sikerült beolvasni a fájlt');
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Válassz ki egy fájlt');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);

      // Map units by name
      const unitMap = {};
      units.forEach((u) => {
        unitMap[u.name.toLowerCase()] = u.id;
        if (u.short_name) unitMap[u.short_name.toLowerCase()] = u.id;
      });

      const toInsert = [];
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Excel row number (1-indexed + header)

        // Try to find date column
        const dateValue = row['Dátum'] || row['date'] || row['Date'];
        if (!dateValue) {
          errors.push(`Sor ${rowNum}: Hiányzó dátum`);
          continue;
        }

        // Parse date
        let date;
        if (typeof dateValue === 'number') {
          // Excel serial date
          const excelEpoch = new Date(1899, 11, 30);
          date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
        } else {
          date = new Date(dateValue);
        }

        if (isNaN(date.getTime())) {
          errors.push(`Sor ${rowNum}: Érvénytelen dátum`);
          continue;
        }

        // Find unit
        const unitName = (row['Egység'] || row['unit'] || row['Unit'] || '').toLowerCase();
        const unitId = unitMap[unitName];
        if (!unitId) {
          errors.push(`Sor ${rowNum}: Ismeretlen egység: ${unitName}`);
          continue;
        }

        // Get revenue
        const grossRevenue = Number(row['Bruttó bevétel'] || row['Bruttó'] || row['gross_revenue'] || 0);
        const netRevenue = Number(row['Nettó bevétel'] || row['Nettó'] || row['net_revenue'] || grossRevenue * 0.787);
        const orderCount = Number(row['Rendelések'] || row['Rendelések száma'] || row['order_count'] || 0);

        toInsert.push({
          date: date.toISOString().split('T')[0],
          unit_id: unitId,
          gross_revenue: grossRevenue,
          net_revenue: netRevenue,
          order_count: orderCount,
          source: 'import',
          import_reference: file.name,
        });
      }

      if (toInsert.length === 0) {
        setError('Nincs importálható adat. Hibák: ' + errors.join(', '));
        setLoading(false);
        return;
      }

      // Upsert data
      const { error: insertError } = await supabase
        .from('webshop_daily_revenue')
        .upsert(toInsert, { onConflict: 'date,unit_id' });

      if (insertError) throw insertError;

      alert(`Sikeres import: ${toInsert.length} sor${errors.length > 0 ? `\nFigyelmeztetések: ${errors.length}` : ''}`);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel import
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-10 w-10 text-gray-400" />
              <span className="text-gray-600">
                {file ? file.name : 'Kattints vagy húzd ide a fájlt'}
              </span>
              <span className="text-xs text-gray-400">Excel (.xlsx, .xls) vagy CSV</span>
            </label>
          </div>

          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Elvárt oszlopok:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>Dátum (kötelező)</li>
              <li>Egység (kötelező - egység neve)</li>
              <li>Bruttó bevétel (kötelező)</li>
              <li>Nettó bevétel (opcionális)</li>
              <li>Rendelések száma (opcionális)</li>
            </ul>
          </div>

          {preview.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                Előnézet (első 5 sor)
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(preview[0]).map((key) => (
                        <th key={key} className="px-3 py-2 text-left">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-3 py-2">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Mégse
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !file}
              className="px-4 py-2 bg-pepper-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Importálás...' : 'Importálás'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
