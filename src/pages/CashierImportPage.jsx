import { useState, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Building2,
  Calculator,
  Loader2,
  RefreshCw,
  Download,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnits } from '../hooks/useSupabase';
import { Card, Button, Modal } from '../components/common';
import { supabase } from '../lib/supabase';
import { formatCurrency, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// Sheet names to skip (not unit data)
const SKIP_SHEETS = ['2026 éves', '202602', '202601', 'ne használd'];

// Column offsets within a cash register block (relative to AP column)
const COL_OFFSETS = {
  novohost: 1,
  vat_0: 2,
  vat_5: 3,
  vat_18: 4,
  vat_27: 5,
  cash: 6,
  card: 7,      // NAV pénztárgép szerinti kártya
  terminal: 8,  // Terminál szerinti kártya
  tips: 9,
};

export default function CashierImportPage() {
  const { isAdmin } = useAuth();
  const { units } = useUnits();

  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheetData, setSheetData] = useState({});
  const [sheetMappings, setSheetMappings] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [step, setStep] = useState(1); // 1: upload, 2: mapping, 3: preview, 4: results

  // Parse Excel file
  const handleFileUpload = useCallback(async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    try {
      const data = await uploadedFile.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      setWorkbook(wb);

      // Parse each sheet
      const parsed = {};
      const mappings = {};

      for (const sheetName of wb.SheetNames) {
        if (SKIP_SHEETS.includes(sheetName)) continue;

        const ws = wb.Sheets[sheetName];
        const cashRegisters = findCashRegisters(ws);

        if (cashRegisters.length > 0) {
          const records = parseSheetData(ws, cashRegisters);
          parsed[sheetName] = {
            cashRegisters,
            records,
            totalRecords: records.length,
          };

          // Auto-map sheet name to unit
          const matchedUnit = units.find(u =>
            u.name.toLowerCase().includes(sheetName.toLowerCase()) ||
            sheetName.toLowerCase().includes(u.name.toLowerCase())
          );
          mappings[sheetName] = matchedUnit?.id || '';
        }
      }

      setSheetData(parsed);
      setSheetMappings(mappings);
      setStep(2);
      toast.success(`${Object.keys(parsed).length} fül beolvasva`);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast.error('Hiba az Excel beolvasásakor');
    }
  }, [units]);

  // Find all cash register columns in a sheet
  const findCashRegisters = (ws) => {
    const registers = [];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = ws[cellAddr];
      if (cell && typeof cell.v === 'string' && cell.v.startsWith('AP ')) {
        registers.push({
          col,
          apNumber: cell.v.replace(/\s+/g, ''), // Remove spaces: "AP A13611447" -> "APA13611447"
        });
      }
    }
    return registers;
  };

  // Parse data from a sheet
  const parseSheetData = (ws, cashRegisters) => {
    const records = [];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    for (let row = 1; row <= range.e.r; row++) {
      // Get date from column A (or first register's column)
      const dateCell = ws[XLSX.utils.encode_cell({ r: row, c: 0 })];
      if (!dateCell) continue;

      let dateValue = dateCell.v;
      let parsedDate = null;

      // Handle different date formats
      if (dateValue instanceof Date) {
        parsedDate = dateValue;
      } else if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        parsedDate = new Date(dateValue.substring(0, 10));
      } else if (typeof dateValue === 'number') {
        // Excel serial date
        parsedDate = XLSX.SSF.parse_date_code(dateValue);
        if (parsedDate) {
          parsedDate = new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d);
        }
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) continue;

      const dateStr = parsedDate.toISOString().split('T')[0];

      // Parse each cash register's data
      for (const register of cashRegisters) {
        const getValue = (offset) => {
          const cell = ws[XLSX.utils.encode_cell({ r: row, c: register.col + offset })];
          return cell?.v && typeof cell.v === 'number' ? cell.v : 0;
        };

        const vat_0 = getValue(COL_OFFSETS.vat_0);
        const vat_5 = getValue(COL_OFFSETS.vat_5);
        const vat_18 = getValue(COL_OFFSETS.vat_18);
        const vat_27 = getValue(COL_OFFSETS.vat_27);
        const cash = getValue(COL_OFFSETS.cash);
        const card = getValue(COL_OFFSETS.card);
        const terminal = getValue(COL_OFFSETS.terminal);
        const tips = getValue(COL_OFFSETS.tips);
        const novohost = getValue(COL_OFFSETS.novohost);

        // Skip rows with no data
        const total = vat_0 + vat_5 + vat_18 + vat_27;
        if (total === 0 && cash === 0 && card === 0) continue;

        records.push({
          date: dateStr,
          apNumber: register.apNumber,
          vat_0,
          vat_5,
          vat_18,
          vat_27,
          cash,
          card,
          terminal,
          tips,
          novohost,
          total,
          discrepancy: card - terminal, // NAV vs terminál eltérés
        });
      }
    }

    return records;
  };

  // Handle unit mapping change
  const handleMappingChange = (sheetName, unitId) => {
    setSheetMappings(prev => ({ ...prev, [sheetName]: unitId }));
  };

  // Aggregate records by date (sum multiple closings)
  const aggregateByDate = (records) => {
    const byDate = {};
    for (const rec of records) {
      const key = `${rec.date}_${rec.apNumber}`;
      if (!byDate[key]) {
        byDate[key] = { ...rec };
      } else {
        // Sum values for multiple closings on same day
        byDate[key].vat_0 += rec.vat_0;
        byDate[key].vat_5 += rec.vat_5;
        byDate[key].vat_18 += rec.vat_18;
        byDate[key].vat_27 += rec.vat_27;
        byDate[key].cash += rec.cash;
        byDate[key].card += rec.card;
        byDate[key].terminal += rec.terminal;
        byDate[key].tips += rec.tips;
        byDate[key].novohost += rec.novohost;
        byDate[key].total += rec.total;
        byDate[key].discrepancy = byDate[key].card - byDate[key].terminal;
      }
    }
    return Object.values(byDate);
  };

  // Import data to database
  const handleImport = async () => {
    setImporting(true);
    const results = { success: 0, errors: [], skipped: 0 };

    try {
      for (const [sheetName, data] of Object.entries(sheetData)) {
        const unitId = sheetMappings[sheetName];
        if (!unitId) {
          results.skipped += data.records.length;
          continue;
        }

        // Get or create cash registers for this unit
        const registerMap = {};
        for (const register of data.cashRegisters) {
          // Check if register exists
          const { data: existing } = await supabase
            .from('cash_registers')
            .select('id')
            .eq('ap_number', register.apNumber)
            .single();

          if (existing) {
            registerMap[register.apNumber] = existing.id;
          } else {
            // Create new register
            const { data: newReg, error } = await supabase
              .from('cash_registers')
              .insert({
                unit_id: unitId,
                ap_number: register.apNumber,
                status: 'active',
              })
              .select('id')
              .single();

            if (error) {
              console.error('Error creating register:', error);
              results.errors.push(`Pénztárgép létrehozás hiba: ${register.apNumber}`);
              continue;
            }
            registerMap[register.apNumber] = newReg.id;
          }
        }

        // Aggregate records by date
        const aggregated = aggregateByDate(data.records);

        // Import each record
        for (const rec of aggregated) {
          try {
            // Get or create daily_revenue entry
            let dailyRevenueId;
            const { data: existingDaily } = await supabase
              .from('daily_revenue')
              .select('id')
              .eq('unit_id', unitId)
              .eq('date', rec.date)
              .single();

            if (existingDaily) {
              dailyRevenueId = existingDaily.id;
            } else {
              // Create new daily_revenue entry
              const { data: newDaily, error } = await supabase
                .from('daily_revenue')
                .insert({
                  unit_id: unitId,
                  date: rec.date,
                  total_revenue: 0, // Will be updated by aggregation
                })
                .select('id')
                .single();

              if (error) throw error;
              dailyRevenueId = newDaily.id;
            }

            const registerId = registerMap[rec.apNumber];
            if (!registerId) continue;

            // Upsert cash_register_revenue
            const { error: upsertError } = await supabase
              .from('cash_register_revenue')
              .upsert({
                daily_revenue_id: dailyRevenueId,
                cash_register_id: registerId,
                vat_0_percent: rec.vat_0,
                vat_5_percent: rec.vat_5,
                vat_18_percent: rec.vat_18,
                vat_27_percent: rec.vat_27,
                cash_payment: rec.cash,
                card_payment: rec.card,
                terminal_card: rec.terminal,
                tips: rec.tips,
                discrepancy_amount: rec.discrepancy !== 0 ? rec.discrepancy : 0,
                discrepancy_note: rec.discrepancy !== 0 ? 'Excel import eltérés' : null,
              }, {
                onConflict: 'daily_revenue_id,cash_register_id',
              });

            if (upsertError) throw upsertError;
            results.success++;
          } catch (error) {
            console.error('Import error:', error);
            results.errors.push(`${rec.date} ${rec.apNumber}: ${error.message}`);
          }
        }
      }

      setImportResults(results);
      setStep(4);

      if (results.success > 0) {
        toast.success(`${results.success} rekord importálva!`);
      }
      if (results.errors.length > 0) {
        toast.error(`${results.errors.length} hiba történt`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Hiba az importálás során');
    } finally {
      setImporting(false);
    }
  };

  // Reset to start
  const handleReset = () => {
    setFile(null);
    setWorkbook(null);
    setSheetData({});
    setSheetMappings({});
    setImportResults(null);
    setStep(1);
  };

  // Get preview stats
  const getPreviewStats = () => {
    let totalRecords = 0;
    let totalRevenue = 0;
    let mappedSheets = 0;

    for (const [sheetName, data] of Object.entries(sheetData)) {
      if (sheetMappings[sheetName]) {
        mappedSheets++;
        const aggregated = aggregateByDate(data.records);
        totalRecords += aggregated.length;
        totalRevenue += aggregated.reduce((sum, r) => sum + r.total, 0);
      }
    }

    return { totalRecords, totalRevenue, mappedSheets };
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-500">Csak adminisztrátorok használhatják ezt a funkciót.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pénztárgép adatok importálása</h1>
          <p className="text-gray-500 mt-1">Excel fájlból napi forgalmi adatok betöltése</p>
        </div>
        {step > 1 && (
          <Button variant="secondary" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Újrakezdés
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[
          { num: 1, label: 'Fájl feltöltés' },
          { num: 2, label: 'Egység hozzárendelés' },
          { num: 3, label: 'Előnézet' },
          { num: 4, label: 'Eredmény' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              step >= s.num ? 'bg-pepper-red text-white' : 'bg-gray-200 text-gray-500'
            )}>
              {step > s.num ? <CheckCircle className="h-5 w-5" /> : s.num}
            </div>
            <span className={cn(
              'ml-2 text-sm',
              step >= s.num ? 'text-gray-900' : 'text-gray-400'
            )}>{s.label}</span>
            {idx < 3 && <ChevronRight className="h-4 w-4 mx-2 text-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: File Upload */}
      {step === 1 && (
        <Card className="p-8">
          <div className="text-center">
            <FileSpreadsheet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Excel fájl feltöltése</h2>
            <p className="text-gray-500 mb-6">
              Töltsd fel a pénztárgép összesítő Excel fájlt (.xlsx)
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-pepper-red text-white rounded-lg cursor-pointer hover:bg-pepper-red/90 transition-colors">
              <Upload className="h-5 w-5" />
              Fájl kiválasztása
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </Card>
      )}

      {/* Step 2: Sheet Mapping */}
      {step === 2 && (
        <Card>
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Fülek hozzárendelése egységekhez</h2>
            <p className="text-sm text-gray-500 mt-1">
              Válaszd ki, melyik Excel fül melyik egységhez tartozik
            </p>
          </div>
          <div className="divide-y">
            {Object.entries(sheetData).map(([sheetName, data]) => (
              <div key={sheetName} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <span className="font-medium">{sheetName}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {data.cashRegisters.length} pénztárgép, {data.totalRecords} rekord
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {data.cashRegisters.map(r => (
                      <span key={r.apNumber} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {r.apNumber}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-64">
                  <select
                    value={sheetMappings[sheetName] || ''}
                    onChange={(e) => handleMappingChange(sheetName, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                  >
                    <option value="">-- Válassz egységet --</option>
                    {units
                      .filter(u => u.type === 'restaurant' || u.type === 'other')
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <Button onClick={() => setStep(3)}>
              Tovább az előnézethez
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Hozzárendelt fülek</p>
                  <p className="text-xl font-bold">{getPreviewStats().mappedSheets}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Importálandó rekord</p>
                  <p className="text-xl font-bold">{getPreviewStats().totalRecords}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calculator className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Összes forgalom</p>
                  <p className="text-xl font-bold">{formatCurrency(getPreviewStats().totalRevenue)}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Adatok előnézete</h2>
            </div>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3">Egység</th>
                    <th className="text-left py-2 px-3">Dátum</th>
                    <th className="text-left py-2 px-3">Pénztárgép</th>
                    <th className="text-right py-2 px-3">Forgalom</th>
                    <th className="text-right py-2 px-3">Készpénz</th>
                    <th className="text-right py-2 px-3">Kártya</th>
                    <th className="text-right py-2 px-3">Terminál</th>
                    <th className="text-right py-2 px-3">Eltérés</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(sheetData)
                    .filter(([sheetName]) => sheetMappings[sheetName])
                    .flatMap(([sheetName, data]) => {
                      const unit = units.find(u => u.id === sheetMappings[sheetName]);
                      return aggregateByDate(data.records).slice(0, 50).map((rec, idx) => (
                        <tr key={`${sheetName}-${idx}`} className="hover:bg-gray-50">
                          <td className="py-2 px-3">{unit?.name}</td>
                          <td className="py-2 px-3">{rec.date}</td>
                          <td className="py-2 px-3 font-mono text-xs">{rec.apNumber}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(rec.total)}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(rec.cash)}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(rec.card)}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(rec.terminal)}</td>
                          <td className={cn(
                            'py-2 px-3 text-right font-medium',
                            rec.discrepancy !== 0 ? 'text-red-600' : 'text-gray-400'
                          )}>
                            {rec.discrepancy !== 0 ? formatCurrency(rec.discrepancy) : '-'}
                          </td>
                        </tr>
                      ));
                    })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Vissza
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importálás...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Importálás indítása
                  </>
                )}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Step 4: Results */}
      {step === 4 && importResults && (
        <Card className="p-8">
          <div className="text-center">
            {importResults.success > 0 ? (
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : (
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            )}
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Import befejezve
            </h2>
            <div className="space-y-2 mb-6">
              <p className="text-green-600">
                ✓ {importResults.success} rekord sikeresen importálva
              </p>
              {importResults.skipped > 0 && (
                <p className="text-gray-500">
                  ○ {importResults.skipped} rekord kihagyva (nincs egység hozzárendelve)
                </p>
              )}
              {importResults.errors.length > 0 && (
                <div className="text-left bg-red-50 rounded-lg p-4 mt-4">
                  <p className="text-red-600 font-medium mb-2">
                    ✗ {importResults.errors.length} hiba:
                  </p>
                  <ul className="text-sm text-red-500 list-disc list-inside max-h-40 overflow-auto">
                    {importResults.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4">
              <Button variant="secondary" onClick={handleReset}>
                Új import
              </Button>
              <Button onClick={() => window.location.href = '/daily'}>
                Napi adatok megtekintése
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
