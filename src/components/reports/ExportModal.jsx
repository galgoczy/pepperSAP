import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal, Button, Select } from '../common';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

const exportTypes = [
  { value: 'cash_register', label: 'Pénztárgép és bankkártya forgalom' },
  { value: 'cash_revenue', label: 'Készpénz bevételek' },
  { value: 'full_monthly', label: 'Teljes havi forgalom' },
  { value: 'expenses', label: 'Kifizetések' },
  { value: 'events', label: 'Rendezvények' },
];

export default function ExportModal({ isOpen, onClose, startDate, endDate, unitId }) {
  const [exportType, setExportType] = useState('full_monthly');
  const [format, setFormat] = useState('xlsx');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      let data = [];
      let filename = '';

      // Fetch data based on export type
      if (exportType === 'cash_register' || exportType === 'full_monthly') {
        let query = supabase
          .from('daily_revenue')
          .select('*, units(name)')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date');

        if (unitId) {
          query = query.eq('unit_id', unitId);
        }

        const { data: revenues } = await query;

        data = (revenues || []).map((r) => ({
          Dátum: formatDate(r.date),
          Egység: r.units?.name || '',
          'Szoftver forgalom': r.total_revenue || 0,
          '0% ÁFA': r.vat_0_percent || 0,
          '5% ÁFA': r.vat_5_percent || 0,
          '18% ÁFA': r.vat_18_percent || 0,
          '27% ÁFA': r.vat_27_percent || 0,
          Borravaló: r.tips || 0,
          Készpénz: r.cash_payment || 0,
          Bankkártya: r.card_payment || 0,
          'SZÉP kártya': r.szep_card_payment || 0,
          'Terminál kártya': r.terminal_card || 0,
          'Terminál SZÉP': r.terminal_szep || 0,
        }));

        filename = `forgalom_${startDate}_${endDate}`;
      } else if (exportType === 'cash_revenue') {
        let query = supabase
          .from('house_cash')
          .select('*, units(name)')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date');

        if (unitId) {
          query = query.eq('unit_id', unitId);
        }

        const { data: cashData } = await query;

        data = (cashData || []).map((c) => ({
          Dátum: formatDate(c.date),
          Egység: c.units?.name || '',
          Váltópénz: c.change_amount || 0,
          'Hivatalos napi': c.official_daily_cash || 0,
          'Hivatalos egyéb': c.official_other_income || 0,
          'Hivatalos kifizetés': c.official_cash_expenses || 0,
          'EFO kifizetés': c.official_employment_expenses || 0,
          'Hivatalos összesen': c.official_total || 0,
          'Egyéb különbözet': c.other_difference || 0,
          'Egyéb bevétel': c.other_extra_income || 0,
          'Egyéb kiadás': c.other_expenses || 0,
          'Egyéb összesen': c.other_total || 0,
        }));

        filename = `hazipenztar_${startDate}_${endDate}`;
      } else if (exportType === 'expenses') {
        let query = supabase
          .from('expenses')
          .select('*, units(name)')
          .gte('invoice_date', startDate)
          .lte('invoice_date', endDate)
          .order('invoice_date');

        if (unitId) {
          query = query.eq('unit_id', unitId);
        }

        const { data: expenses } = await query;

        data = (expenses || []).map((e) => ({
          Dátum: formatDate(e.invoice_date),
          Egység: e.units?.name || '',
          Szállító: e.supplier_name,
          'Számla szám': e.invoice_number || '',
          Összeg: e.amount || 0,
          Deviza: e.currency,
          Tétel: e.item_description || '',
          'Fizetés módja': e.payment_method,
          'Fizetési határidő': e.payment_deadline ? formatDate(e.payment_deadline) : '',
          Hivatalos: e.is_official ? 'Igen' : 'Nem',
          Megjegyzés: e.notes || '',
        }));

        filename = `kifizetes_${startDate}_${endDate}`;
      } else if (exportType === 'events') {
        let query = supabase
          .from('events')
          .select('*')
          .gte('event_date', startDate)
          .lte('event_date', endDate)
          .order('event_date');

        if (unitId) {
          query = query.eq('unit_id', unitId);
        }

        const { data: events } = await query;

        if (events?.length) {
          const eventIds = events.map((e) => e.id);

          const [revenuesResult, expensesResult] = await Promise.all([
            supabase.from('event_revenues').select('event_id, amount').in('event_id', eventIds),
            supabase.from('event_expenses').select('event_id, amount').in('event_id', eventIds),
          ]);

          const revenueByEvent = {};
          const expenseByEvent = {};

          (revenuesResult.data || []).forEach((r) => {
            revenueByEvent[r.event_id] = (revenueByEvent[r.event_id] || 0) + parseFloat(r.amount);
          });

          (expensesResult.data || []).forEach((e) => {
            expenseByEvent[e.event_id] = (expenseByEvent[e.event_id] || 0) + parseFloat(e.amount);
          });

          data = events.map((event) => ({
            Dátum: formatDate(event.event_date),
            Név: event.name,
            Típus: event.event_type,
            Bevétel: revenueByEvent[event.id] || 0,
            Költség: expenseByEvent[event.id] || 0,
            Eredmény: (revenueByEvent[event.id] || 0) - (expenseByEvent[event.id] || 0),
            Leírás: event.description || '',
          }));
        }

        filename = `rendezvenyek_${startDate}_${endDate}`;
      }

      if (data.length === 0) {
        toast.error('Nincs exportálható adat');
        return;
      }

      // Export based on format
      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Export');
        XLSX.writeFile(wb, `${filename}.xlsx`);
      } else {
        // CSV export
        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map((row) =>
            headers.map((h) => {
              const val = row[h];
              if (typeof val === 'string' && val.includes(',')) {
                return `"${val}"`;
              }
              return val;
            }).join(',')
          ),
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast.success('Export sikeres!');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Hiba történt az export során');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adatok exportálása"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Mégse
          </Button>
          <Button onClick={handleExport} loading={loading}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg text-sm">
          <p className="text-gray-600">
            Időszak: <span className="font-medium">{formatDate(startDate)}</span> -{' '}
            <span className="font-medium">{formatDate(endDate)}</span>
          </p>
        </div>

        <Select
          label="Export típusa"
          value={exportType}
          onChange={(e) => setExportType(e.target.value)}
          options={exportTypes}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Fájl formátum
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="xlsx"
                checked={format === 'xlsx'}
                onChange={(e) => setFormat(e.target.value)}
                className="text-pepper-red focus:ring-pepper-red"
              />
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <span className="text-sm">Excel (.xlsx)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === 'csv'}
                onChange={(e) => setFormat(e.target.value)}
                className="text-pepper-red focus:ring-pepper-red"
              />
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm">CSV (.csv)</span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
