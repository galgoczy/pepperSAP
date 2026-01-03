import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Save,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Building2,
  Banknote,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Info,
  LogIn,
} from 'lucide-react';
import { useUnits } from '../hooks/useSupabase';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input, LoadingSpinner, Modal } from '../components/common';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { MicrosoftGraphClient, refreshAccessToken, startMicrosoftAuth } from '../lib/microsoft';
import toast from 'react-hot-toast';

// Hungarian month names for display
const MONTH_NAMES = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
];

// Special categories (not regular units)
const SPECIAL_CATEGORIES = [
  { id: 'K0', name: 'K0', description: 'Költséghely' },
  { id: 'K00', name: 'K00', description: 'Költséghely' },
  { id: 'bank_costs', name: 'Bankköltségek', description: 'Globális költség' },
];

// Excel column name to database unit name mapping
// Excel columns: K00, KR, MÁK, Knorr69, Knorr86, Knorr105, RSR, KTI, Pepsi, K0
const EXCEL_UNIT_NAME_MAP = {
  'Knorr69': 'Knorr 69',
  'Knorr86': 'Knorr 86',
  'Knorr105': 'Knorr 105',
  // Add more mappings if needed
};

// Get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get previous month in YYYY-MM format (default for data entry)
function getPreviousMonth() {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
}

// Parse YYYY-MM to year and month index
function parseYearMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  return { year, month };
}

// Format YYYY-MM to display string
function formatYearMonth(yearMonth) {
  const { year, month } = parseYearMonth(yearMonth);
  return `${year}. ${MONTH_NAMES[month - 1]}`;
}

// Navigate month
function navigateMonth(yearMonth, direction) {
  const { year, month } = parseYearMonth(yearMonth);
  const date = new Date(year, month - 1 + direction, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function MonthlyFinancialDataPage() {
  const { units, loading: unitsLoading } = useUnits();
  const [selectedMonth, setSelectedMonth] = useState(getPreviousMonth());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  // Get restaurant units only - memoize to prevent infinite re-renders
  const restaurantUnits = useMemo(
    () => units.filter(u => u.type === 'restaurant'),
    [units]
  );

  // Fetch existing data for the selected month
  const fetchData = useCallback(async () => {
    if (unitsLoading) return;

    setLoading(true);
    try {
      const { data: monthlyData, error } = await supabase
        .from('monthly_financial_data')
        .select('*')
        .eq('year_month', selectedMonth);

      if (error) throw error;

      // Build data map keyed by unit_id or category
      const dataMap = {};

      // Initialize with empty data for all units
      for (const unit of restaurantUnits) {
        dataMap[`unit_${unit.id}`] = {
          unit_id: unit.id,
          category: null,
          paid_wages: 0,
          wage_contributions: 0,
          raw_material_distribution: 0,
          wage_distribution: 0,
          subvention: 0,
          transfer_expenses: 0,
          equipment_expenses: 0,
          rent_utilities: 0,
        };
      }

      // Initialize special categories
      for (const cat of SPECIAL_CATEGORIES) {
        dataMap[`cat_${cat.id}`] = {
          unit_id: null,
          category: cat.id,
          paid_wages: 0,
          wage_contributions: 0,
          k0_revenue: 0,
          bank_costs_amount: 0,
          transfer_expenses: 0,
        };
      }

      // Fill with existing data
      for (const row of monthlyData || []) {
        const key = row.unit_id ? `unit_${row.unit_id}` : `cat_${row.category}`;
        if (dataMap[key]) {
          dataMap[key] = { ...dataMap[key], ...row };
        }
      }

      setData(dataMap);
      setOriginalData(JSON.parse(JSON.stringify(dataMap)));
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, restaurantUnits, unitsLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(data) !== JSON.stringify(originalData);

  // Calculate distribution totals for validation warning
  const rawMaterialDistTotal = Object.values(data)
    .filter(d => d.unit_id)
    .reduce((sum, d) => sum + (parseFloat(d.raw_material_distribution) || 0), 0);

  const wageDistTotal = Object.values(data)
    .filter(d => d.unit_id)
    .reduce((sum, d) => sum + (parseFloat(d.wage_distribution) || 0), 0);

  // Update a field value
  const handleChange = (key, field, value) => {
    setData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  // Save all data
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [];

      for (const [key, row] of Object.entries(data)) {
        // Skip if no changes
        if (JSON.stringify(row) === JSON.stringify(originalData[key])) continue;

        const record = {
          year_month: selectedMonth,
          unit_id: row.unit_id || null,
          category: row.category || null,
          paid_wages: parseFloat(row.paid_wages) || 0,
          wage_contributions: parseFloat(row.wage_contributions) || 0,
          raw_material_distribution: parseFloat(row.raw_material_distribution) || 0,
          wage_distribution: parseFloat(row.wage_distribution) || 0,
          subvention: parseFloat(row.subvention) || 0,
          k0_revenue: parseFloat(row.k0_revenue) || 0,
          bank_costs_amount: parseFloat(row.bank_costs_amount) || 0,
          transfer_expenses: parseFloat(row.transfer_expenses) || 0,
          equipment_expenses: parseFloat(row.equipment_expenses) || 0,
          rent_utilities: parseFloat(row.rent_utilities) || 0,
        };

        updates.push(record);
      }

      if (updates.length === 0) {
        toast.success('Nincs változás mentésre');
        return;
      }

      // Upsert records
      for (const record of updates) {
        const { error } = await supabase
          .from('monthly_financial_data')
          .upsert(record, {
            onConflict: record.unit_id ? 'year_month,unit_id' : 'year_month,category',
          });

        if (error) throw error;
      }

      toast.success('Adatok sikeresen mentve!');
      setOriginalData(JSON.parse(JSON.stringify(data)));
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Hiba a mentés során');
    } finally {
      setSaving(false);
    }
  };

  if (unitsLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Havi pénzügyi adatok</h1>
          <p className="text-gray-500 mt-1">
            Kézi adatrögzítés és Excel import a havi táblához
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsExcelImportOpen(true)}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel import
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Mentés...' : 'Mentés'}
          </Button>
        </div>
      </div>

      {/* Month selector */}
      <Card>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setSelectedMonth(navigateMonth(selectedMonth, -1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {formatYearMonth(selectedMonth)}
            </h2>
            <p className="text-sm text-gray-500">Kiválasztott időszak</p>
          </div>

          <Button
            variant="ghost"
            onClick={() => setSelectedMonth(navigateMonth(selectedMonth, 1))}
            disabled={selectedMonth >= getCurrentMonth()}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      {/* Distribution warnings */}
      {(Math.abs(rawMaterialDistTotal) > 0.01 || Math.abs(wageDistTotal) > 0.01) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Disztribúciós figyelmeztetés</p>
            {Math.abs(rawMaterialDistTotal) > 0.01 && (
              <p>Nyersanyag disztribúció összege: {formatCurrency(rawMaterialDistTotal)} (elvárva: 0)</p>
            )}
            {Math.abs(wageDistTotal) > 0.01 && (
              <p>Bér disztribúció összege: {formatCurrency(wageDistTotal)} (elvárva: 0)</p>
            )}
          </div>
        </div>
      )}

      {/* Units data entry */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-500" />
          Egységek
        </h3>

        {restaurantUnits.map(unit => {
          const key = `unit_${unit.id}`;
          const unitData = data[key] || {};

          return (
            <Card key={unit.id} className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">{unit.name}</h4>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Kézi beviteli mezők */}
                <Input
                  label="Kifizetett bér"
                  type="number"
                  value={unitData.paid_wages || ''}
                  onChange={(e) => handleChange(key, 'paid_wages', e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Bérjárulékok"
                  type="number"
                  value={unitData.wage_contributions || ''}
                  onChange={(e) => handleChange(key, 'wage_contributions', e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Nyersanyag disztribúció"
                  type="number"
                  value={unitData.raw_material_distribution || ''}
                  onChange={(e) => handleChange(key, 'raw_material_distribution', e.target.value)}
                  placeholder="0 (+/-)"
                />
                <Input
                  label="Bér disztribúció"
                  type="number"
                  value={unitData.wage_distribution || ''}
                  onChange={(e) => handleChange(key, 'wage_distribution', e.target.value)}
                  placeholder="0 (+/-)"
                />
                <Input
                  label="Szubvenció"
                  type="number"
                  value={unitData.subvention || ''}
                  onChange={(e) => handleChange(key, 'subvention', e.target.value)}
                  placeholder="0"
                />

                {/* Excel importból származó mezők (szürke háttér) */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <Input
                    label="Utalásos költségek"
                    type="number"
                    value={unitData.transfer_expenses || ''}
                    onChange={(e) => handleChange(key, 'transfer_expenses', e.target.value)}
                    placeholder="Excel import"
                  />
                  <p className="text-xs text-gray-500 mt-1">Excel-ből</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <Input
                    label="Eszközbeszerzés/javítás"
                    type="number"
                    value={unitData.equipment_expenses || ''}
                    onChange={(e) => handleChange(key, 'equipment_expenses', e.target.value)}
                    placeholder="Excel import"
                  />
                  <p className="text-xs text-gray-500 mt-1">Excel-ből</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <Input
                    label="Bérlet - közmű"
                    type="number"
                    value={unitData.rent_utilities || ''}
                    onChange={(e) => handleChange(key, 'rent_utilities', e.target.value)}
                    placeholder="Excel import"
                  />
                  <p className="text-xs text-gray-500 mt-1">Excel-ből</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Special categories */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Banknote className="h-5 w-5 text-gray-500" />
          Speciális kategóriák
        </h3>

        {/* K0 */}
        <Card className="p-4 border-l-4 border-l-orange-500">
          <h4 className="font-medium text-gray-900 mb-4">K0 - Költséghely</h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="K0 Bevétel"
              type="number"
              value={data['cat_K0']?.k0_revenue || ''}
              onChange={(e) => handleChange('cat_K0', 'k0_revenue', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Kifizetett bér"
              type="number"
              value={data['cat_K0']?.paid_wages || ''}
              onChange={(e) => handleChange('cat_K0', 'paid_wages', e.target.value)}
              placeholder="0"
            />
            <Input
              label="Bérjárulékok"
              type="number"
              value={data['cat_K0']?.wage_contributions || ''}
              onChange={(e) => handleChange('cat_K0', 'wage_contributions', e.target.value)}
              placeholder="0"
            />
            <div className="bg-gray-50 rounded-lg p-3">
              <Input
                label="Utalásos költségek"
                type="number"
                value={data['cat_K0']?.transfer_expenses || ''}
                onChange={(e) => handleChange('cat_K0', 'transfer_expenses', e.target.value)}
                placeholder="Excel import"
              />
              <p className="text-xs text-gray-500 mt-1">Excel-ből</p>
            </div>
          </div>
        </Card>

        {/* K00 */}
        <Card className="p-4 border-l-4 border-l-purple-500">
          <h4 className="font-medium text-gray-900 mb-4">K00 - Költséghely</h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <Input
                label="Utalásos költségek"
                type="number"
                value={data['cat_K00']?.transfer_expenses || ''}
                onChange={(e) => handleChange('cat_K00', 'transfer_expenses', e.target.value)}
                placeholder="Excel import"
              />
              <p className="text-xs text-gray-500 mt-1">Excel-ből</p>
            </div>
          </div>
        </Card>

        {/* Bank costs */}
        <Card className="p-4 border-l-4 border-l-blue-500">
          <h4 className="font-medium text-gray-900 mb-4">Bankköltségek - Globális</h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Bankköltségek összesen"
              type="number"
              value={data['cat_bank_costs']?.bank_costs_amount || ''}
              onChange={(e) => handleChange('cat_bank_costs', 'bank_costs_amount', e.target.value)}
              placeholder="0"
            />
          </div>
        </Card>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Megjegyzés</p>
          <ul className="list-disc list-inside space-y-1">
            <li>A szürkével jelölt mezők Excel-ből importálhatók</li>
            <li>A disztribúciók (+/-) összege nullára kell jöjjön</li>
            <li>Bevétel és készpénzes költség adatok az app-ból jönnek automatikusan</li>
          </ul>
        </div>
      </div>

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        selectedMonth={selectedMonth}
        units={restaurantUnits}
        onImportComplete={(importedData) => {
          // Merge imported data
          setData(prev => {
            const newData = { ...prev };
            for (const [key, values] of Object.entries(importedData)) {
              if (newData[key]) {
                newData[key] = { ...newData[key], ...values };
              }
            }
            return newData;
          });
          toast.success('Excel adatok sikeresen importálva!');
        }}
      />
    </div>
  );
}

// Excel Import Modal Component
function ExcelImportModal({ isOpen, onClose, selectedMonth, units, onImportComplete }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [worksheets, setWorksheets] = useState([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [graphClient, setGraphClient] = useState(null);
  const [connectedUser, setConnectedUser] = useState(null);

  // Check for existing Microsoft connection
  useEffect(() => {
    if (!isOpen) return;

    const checkConnection = async () => {
      try {
        console.log('Checking SharePoint connection...');
        const { data: tokens, error: tokenError } = await supabase
          .from('microsoft_tokens')
          .select('*')
          .eq('is_storage_account', true)
          .single();

        console.log('Token query result:', { tokens: tokens ? 'found' : 'not found', error: tokenError });

        if (tokenError) {
          console.error('Token query error:', tokenError);
          setConnected(false);
          return;
        }

        if (!tokens?.access_token) {
          console.log('No access token found');
          setConnected(false);
          return;
        }

        let accessToken = tokens.access_token;
        let client = new MicrosoftGraphClient(accessToken);

        // Test the connection, refresh token if expired
        try {
          console.log('Token found, testing connection...');
          await client.getMe();
          console.log('getMe() successful');
        } catch (meError) {
          console.error('getMe() failed, trying to refresh token:', meError);

          // Try to refresh the token
          if (tokens.refresh_token) {
            try {
              console.log('Refreshing token...');
              const newTokens = await refreshAccessToken(tokens.refresh_token);
              console.log('Token refreshed successfully');

              // Save new tokens to database
              await supabase
                .from('microsoft_tokens')
                .update({
                  access_token: newTokens.accessToken,
                  refresh_token: newTokens.refreshToken,
                  expires_at: newTokens.expiresAt.toISOString(),
                })
                .eq('id', tokens.id);

              // Use new access token
              accessToken = newTokens.accessToken;
              client = new MicrosoftGraphClient(accessToken);

              // Test again
              await client.getMe();
              console.log('getMe() successful after token refresh');
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              toast.error('SharePoint token lejárt. Kérlek csatlakozz újra a Dokumentumok oldalon.');
              setConnected(false);
              return;
            }
          } else {
            console.error('No refresh token available');
            toast.error('SharePoint token lejárt. Kérlek csatlakozz újra a Dokumentumok oldalon.');
            setConnected(false);
            return;
          }
        }

        setGraphClient(client);
        setConnected(true);

        // Get connected user info
        try {
          const me = await client.getMe();
          setConnectedUser(me.mail || me.userPrincipalName);
        } catch {
          // Ignore - user info is optional
        }

        // Load files from PepperHouse Documents
        try {
          const folder = await client.getFolderByPath('PepperHouse Documents');
          console.log('Folder found:', folder.name);
          const contents = await client.listFolder(folder.id);
          const excelFiles = contents.value.filter(f =>
            f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
          );
          console.log('Excel files found:', excelFiles.length);
          setFiles(excelFiles);
        } catch (folderError) {
          console.error('Folder access error:', folderError);
          // Still connected, just no files
          setFiles([]);
        }
      } catch (error) {
        console.error('SharePoint connection check failed:', error);
        setConnected(false);
      }
    };

    checkConnection();
  }, [isOpen]);

  // Handle SharePoint reconnection
  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      const tokens = await startMicrosoftAuth();
      const client = new MicrosoftGraphClient(tokens.accessToken);
      const user = await client.getMe();
      const userEmail = user.mail || user.userPrincipalName;

      // Save tokens to database
      await supabase.from('microsoft_tokens').upsert({
        user_email: userEmail,
        user_name: user.displayName,
        user_id: profile?.id || null,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt.toISOString(),
        is_storage_account: true,
      }, {
        onConflict: 'is_storage_account',
      });

      setGraphClient(client);
      setConnectedUser(userEmail);
      setConnected(true);

      // Load files
      try {
        const folder = await client.getFolderByPath('PepperHouse Documents');
        const contents = await client.listFolder(folder.id);
        const excelFiles = contents.value.filter(f =>
          f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        );
        setFiles(excelFiles);
      } catch {
        setFiles([]);
      }

      toast.success('SharePoint sikeresen csatlakoztatva!');
    } catch (error) {
      console.error('Reconnect failed:', error);
      toast.error(error.message || 'Csatlakozás sikertelen');
    } finally {
      setReconnecting(false);
    }
  };

  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    setLoading(true);
    try {
      const sheets = await graphClient.getExcelWorksheets(file.id);
      setWorksheets(sheets.value || []);
      if (sheets.value?.length > 0) {
        setSelectedWorksheet(sheets.value[0].name);
      }
    } catch (error) {
      console.error('Error loading worksheets:', error);
      toast.error('Hiba a munkalapok betöltésekor');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile || !selectedWorksheet) return;

    setLoading(true);
    try {
      const { month } = parseYearMonth(selectedMonth);
      const monthName = MONTH_NAMES[month - 1];

      // Use new function that reads all 3 expense sections
      const importedData = await graphClient.readMonthlyExpensesFromExcel(
        selectedFile.id,
        selectedWorksheet,
        monthName
      );

      setPreviewData(importedData);
    } catch (error) {
      console.error('Error reading Excel:', error);
      toast.error(error.message || 'Hiba az Excel olvasásakor');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!previewData) return;

    // Convert preview data to app format
    const importedData = {};

    for (const [excelName, values] of Object.entries(previewData)) {
      // Map Excel name to database name if mapping exists
      const dbName = EXCEL_UNIT_NAME_MAP[excelName] || excelName;

      // Find matching unit (try exact match first, then case-insensitive)
      const unit = units.find(u => u.name === dbName) ||
                   units.find(u => u.name.toLowerCase() === dbName.toLowerCase());

      if (unit) {
        importedData[`unit_${unit.id}`] = {
          transfer_expenses: values.transfer_expenses || 0,
          rent_utilities: values.rent_utilities || 0,
          equipment_expenses: values.equipment_expenses || 0,
        };
      } else if (excelName === 'K0') {
        importedData['cat_K0'] = { transfer_expenses: values.transfer_expenses || 0 };
      } else if (excelName === 'K00') {
        importedData['cat_K00'] = { transfer_expenses: values.transfer_expenses || 0 };
      }
    }

    onImportComplete(importedData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excel import" size="lg">
      <div className="space-y-4">
        {!connected ? (
          <div className="text-center py-8">
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              SharePoint kapcsolat szükséges az Excel importhoz
            </p>
            <Button
              onClick={handleReconnect}
              disabled={reconnecting}
              className="mx-auto"
            >
              {reconnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {reconnecting ? 'Csatlakozás...' : 'Csatlakozás SharePoint-hoz'}
            </Button>
          </div>
        ) : (
          <>
            {/* Connected user info */}
            {connectedUser && (
              <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-green-700">
                  Csatlakozva: <strong>{connectedUser}</strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReconnect}
                  disabled={reconnecting}
                >
                  {reconnecting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Másik fiók
                </Button>
              </div>
            )}

            {/* File selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excel fájl kiválasztása
              </label>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {files.map(file => (
                  <button
                    key={file.id}
                    onClick={() => handleFileSelect(file)}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                      selectedFile?.id === file.id
                        ? 'border-pepper-red bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{file.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Worksheet selector */}
            {worksheets.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Munkalap
                </label>
                <select
                  value={selectedWorksheet}
                  onChange={(e) => setSelectedWorksheet(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {worksheets.map(ws => (
                    <option key={ws.name} value={ws.name}>{ws.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Preview button */}
            {selectedFile && selectedWorksheet && (
              <Button
                variant="secondary"
                onClick={handlePreview}
                disabled={loading}
                className="w-full"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Előnézet
              </Button>
            )}

            {/* Preview data */}
            {previewData && (
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Egység</th>
                      <th className="px-3 py-2 text-right">Utalásos</th>
                      <th className="px-3 py-2 text-right">Rezsi</th>
                      <th className="px-3 py-2 text-right">Eszköz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(previewData).map(([name, values]) => (
                      <tr key={name} className="border-t">
                        <td className="px-3 py-2 font-medium">{name}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(values.transfer_expenses || 0)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(values.rent_utilities || 0)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(values.equipment_expenses || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Import button */}
            {previewData && (
              <Button onClick={handleImport} className="w-full">
                <CheckCircle className="h-4 w-4" />
                Importálás
              </Button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
