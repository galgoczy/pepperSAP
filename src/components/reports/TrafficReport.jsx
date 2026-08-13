import { useState, useEffect, useCallback } from 'react';
import { Download, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase';
import { fetchHouseCashSeries, openingForDate } from '../../lib/houseCashSeries';
import { Card, Button, LoadingSpinner } from '../common';
import { formatCurrency, formatDate } from '../../lib/utils';

const MONTH_NAMES = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December',
];

// The optional revenue kinds; each is only shown when the unit has it enabled in
// unit_revenue_settings (so a unit only sees what applies to it).
const OPTIONAL_REVENUES = [
  { key: 'vip', label: 'VIP', field: 'vip_revenue', setting: 'show_vip' },
  { key: 'protocol', label: 'Protokoll', field: 'protocol_gross', setting: 'show_protocol' },
  { key: 'event', label: 'Rendezvény', field: 'event_revenue_gross', setting: 'show_event_revenue' },
  { key: 'ordit', label: 'Ordit', field: 'ordit_gross', setting: 'show_ordit' },
  { key: 'mckinsey', label: 'McKinsey', field: 'mckinsey_gross', setting: 'show_mckinsey' },
];

export function currentYearMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}
function shiftYearMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${y}. ${MONTH_NAMES[m - 1]}`;
}
// Every day of the month as YYYY-MM-DD (local components, no timezone drift).
function daysOfMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) =>
    `${ym}-${String(i + 1).padStart(2, '0')}`
  );
}

const PDF_LOGO_URL = `${import.meta.env.BASE_URL}Pepperhouse_logo_2021_rgb_horizontal_white.png`;
const PDF_LOGO_ASPECT = 2777 / 516;
async function loadImageDataUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
function sanitizeForPdf(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/ő/g, 'ö').replace(/Ő/g, 'Ö').replace(/ű/g, 'ü').replace(/Ű/g, 'Ü');
}

// Monthly traffic report for one unit: the day's revenues on the left, the house
// cash movement (cash + reserve together) on the right.
export default function TrafficReport({ unitId, unitName = '', yearMonth: ymProp, onYearMonthChange }) {
  const [internalYm, setInternalYm] = useState(currentYearMonth());
  const ym = ymProp || internalYm;
  const setYm = onYearMonthChange || setInternalYm;

  const [rows, setRows] = useState([]);
  const [activeRevenues, setActiveRevenues] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!unitId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const days = daysOfMonth(ym);
      const start = days[0];
      const end = days[days.length - 1];

      const [seriesRes, revenuesRes, settingsRes] = await Promise.all([
        fetchHouseCashSeries(unitId, end),
        supabase
          .from('daily_revenue')
          .select('date, total_revenue, vip_revenue, protocol_gross, mckinsey_gross, ordit_gross, event_revenue_gross, cash_register_revenue(card_payment)')
          .eq('unit_id', unitId)
          .gte('date', start)
          .lte('date', end),
        supabase
          .from('unit_revenue_settings')
          .select('*')
          .eq('unit_id', unitId)
          .maybeSingle(),
      ]);

      const settings = settingsRes.data || {};
      // Default to the same defaults the daily form uses when there is no row.
      const enabled = OPTIONAL_REVENUES.filter((r) => {
        const v = settings[r.setting];
        if (v === undefined || v === null) {
          return r.setting === 'show_vip' || r.setting === 'show_protocol';
        }
        return !!v;
      });
      setActiveRevenues(enabled);

      const revByDate = new Map();
      (revenuesRes.data || []).forEach((r) => revByDate.set(r.date, r));

      const built = days.map((d) => {
        const rev = revByDate.get(d);
        const s = seriesRes.byDate.get(d);
        const opening = s
          ? { cash: s.cashOpening, reserve: s.reserveOpening }
          : openingForDate(seriesRes, d);

        const software = parseFloat(rev?.total_revenue) || 0;
        const card = (rev?.cash_register_revenue || []).reduce(
          (sum, cr) => sum + (parseFloat(cr.card_payment) || 0), 0
        );
        const optional = {};
        enabled.forEach((o) => { optional[o.key] = parseFloat(rev?.[o.field]) || 0; });
        // "Összes" = the software revenue plus every other revenue kind shown.
        // The card column is a payment method, not extra revenue, so it is not added.
        const totalRevenue = software + enabled.reduce((sum, o) => sum + optional[o.key], 0);

        // House cash side: cash pocket and reserve are reported together.
        const openingCash = (opening.cash || 0) + (opening.reserve || 0);
        const cashIncome = s ? s.registerCash - s.cashDiscrepancies : 0;
        const reserveIncome = s ? s.reserveDiff : 0;
        const otherIncome = s ? s.otherCashIncome + s.otherReserveIncome : 0;
        const spent = s ? s.cashExpenses + s.reserveExpenses : 0;
        const transfers = s ? s.cashTransfers + s.reserveTransfers : 0;
        const closing = s ? s.cashClosing + s.reserveClosing : openingCash;
        const notes = s
          ? [...(s.cashPaymentItems || []), ...(s.reservePaymentItems || [])]
              .map((i) => i.label).join(', ')
          : '';

        return {
          date: d, software, card, optional, totalRevenue,
          openingCash, cashIncome, reserveIncome, otherIncome,
          spent, transfers, closing, notes,
        };
      });

      setRows(built);
    } catch (e) {
      console.error('Error loading traffic report:', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [unitId, ym]);

  useEffect(() => { load(); }, [load]);

  const sum = (key) => rows.reduce((s, r) => s + (r[key] || 0), 0);
  const sumOptional = (k) => rows.reduce((s, r) => s + (r.optional[k] || 0), 0);
  const lastClosing = rows.length ? rows[rows.length - 1].closing : 0;

  const headers = [
    'Dátum', 'Szoftver', 'Bankkártya (pg)',
    ...activeRevenues.map((r) => r.label),
    'Összes', 'Nyitó készpénz', 'Kp bevétel', 'Tartalék bevétel', 'Egyéb bevétel',
    'Költött', 'Átküldés', 'Zárás', 'Megjegyzések',
  ];

  const rowValues = (r) => [
    formatDate(r.date), r.software, r.card,
    ...activeRevenues.map((o) => r.optional[o.key] || 0),
    r.totalRevenue, r.openingCash, r.cashIncome, r.reserveIncome, r.otherIncome,
    r.spent, r.transfers, r.closing, r.notes,
  ];

  const fileBase = `forgalmi_jelentes_${(unitName || 'egyseg').toLowerCase().replace(/\s+/g, '_')}_${ym}`;

  const handleExcel = () => {
    const aoa = [headers];
    rows.forEach((r) => aoa.push(rowValues(r)));
    aoa.push([
      'Összesen', sum('software'), sum('card'),
      ...activeRevenues.map((o) => sumOptional(o.key)),
      sum('totalRevenue'), '', sum('cashIncome'), sum('reserveIncome'), sum('otherIncome'),
      sum('spent'), sum('transfers'), lastClosing, '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = headers.map((h, i) => ({ wch: i === 0 ? 12 : (h === 'Megjegyzések' ? 50 : 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Forgalmi jelentés');
    XLSX.writeFile(wb, `${fileBase}.xlsx`);
  };

  const handlePdf = async () => {
    const logo = await loadImageDataUrl(PDF_LOGO_URL);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(211, 47, 47);
    doc.rect(0, 0, pageWidth, 26, 'F');
    if (logo) {
      const h = 9;
      doc.addImage(logo, 'PNG', (pageWidth - h * PDF_LOGO_ASPECT) / 2, 4, h * PDF_LOGO_ASPECT, h);
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('PEPPER HOUSE', pageWidth / 2, 12, { align: 'center' });
    }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(sanitizeForPdf('Forgalmi jelentés'), pageWidth / 2, 21, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf(unitName || 'Egység'), pageWidth / 2, 33, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(sanitizeForPdf(monthLabel(ym)), pageWidth / 2, 39, { align: 'center' });

    const money = (v) => (typeof v === 'number' ? Math.round(v).toLocaleString('hu-HU') : v);

    autoTable(doc, {
      startY: 44,
      head: [headers.map(sanitizeForPdf)],
      body: rows.map((r) => rowValues(r).map((v, i) =>
        i === 0 || i === headers.length - 1 ? sanitizeForPdf(String(v)) : money(v)
      )),
      foot: [[
        'Összesen', money(sum('software')), money(sum('card')),
        ...activeRevenues.map((o) => money(sumOptional(o.key))),
        money(sum('totalRevenue')), '', money(sum('cashIncome')), money(sum('reserveIncome')),
        money(sum('otherIncome')), money(sum('spent')), money(sum('transfers')), money(lastClosing), '',
      ]],
      styles: { fontSize: 6.5, cellPadding: 1.2 },
      headStyles: { fillColor: [211, 47, 47], fontSize: 6.5 },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 16 },
        [headers.length - 1]: { cellWidth: 45, fontSize: 5.5, textColor: [110, 110, 110] },
      },
      margin: { left: 8, right: 8 },
    });

    doc.save(`${fileBase}.pdf`);
  };

  const current = currentYearMonth();

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Forgalmi jelentés{unitName ? ` – ${unitName}` : ''}
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setYm(shiftYearMonth(ym, -1))}
              title="Előző hónap"
              className="p-1 rounded text-gray-500 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[110px] text-center">
              {monthLabel(ym)}
            </span>
            <button
              type="button"
              onClick={() => setYm(shiftYearMonth(ym, 1))}
              disabled={ym >= current}
              title="Következő hónap"
              className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={handleExcel} disabled={loading || !rows.length}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePdf} disabled={loading || !rows.length}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-gray-600">
                <th className="px-2 py-2 text-left whitespace-nowrap">Dátum</th>
                <th className="px-2 py-2 text-right">Szoftver</th>
                <th className="px-2 py-2 text-right whitespace-nowrap">Bankkártya</th>
                {activeRevenues.map((o) => (
                  <th key={o.key} className="px-2 py-2 text-right">{o.label}</th>
                ))}
                <th className="px-2 py-2 text-right font-semibold">Összes</th>
                <th className="px-2 py-2 text-right whitespace-nowrap">Nyitó kp</th>
                <th className="px-2 py-2 text-right whitespace-nowrap">Kp bevétel</th>
                <th className="px-2 py-2 text-right whitespace-nowrap">Tartalék bev.</th>
                <th className="px-2 py-2 text-right whitespace-nowrap">Egyéb bev.</th>
                <th className="px-2 py-2 text-right">Költött</th>
                <th className="px-2 py-2 text-right">Átküldés</th>
                <th className="px-2 py-2 text-right font-semibold">Zárás</th>
                <th className="px-2 py-2 text-left">Megjegyzések</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.date} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="px-2 py-1.5 text-right">{formatCurrency(r.software)}</td>
                  <td className="px-2 py-1.5 text-right">{formatCurrency(r.card)}</td>
                  {activeRevenues.map((o) => (
                    <td key={o.key} className="px-2 py-1.5 text-right">
                      {formatCurrency(r.optional[o.key] || 0)}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(r.totalRevenue)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-500">{formatCurrency(r.openingCash)}</td>
                  <td className="px-2 py-1.5 text-right text-green-700">{formatCurrency(r.cashIncome)}</td>
                  <td className="px-2 py-1.5 text-right text-blue-700">{formatCurrency(r.reserveIncome)}</td>
                  <td className="px-2 py-1.5 text-right">{formatCurrency(r.otherIncome)}</td>
                  <td className="px-2 py-1.5 text-right text-red-600">{formatCurrency(r.spent)}</td>
                  <td className="px-2 py-1.5 text-right text-amber-700">
                    {r.transfers ? formatCurrency(r.transfers) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold">{formatCurrency(r.closing)}</td>
                  <td className="px-2 py-1.5 text-xs text-gray-500 max-w-[260px] truncate" title={r.notes}>
                    {r.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold bg-gray-50">
                <td className="px-2 py-2">Összesen</td>
                <td className="px-2 py-2 text-right">{formatCurrency(sum('software'))}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(sum('card'))}</td>
                {activeRevenues.map((o) => (
                  <td key={o.key} className="px-2 py-2 text-right">{formatCurrency(sumOptional(o.key))}</td>
                ))}
                <td className="px-2 py-2 text-right">{formatCurrency(sum('totalRevenue'))}</td>
                <td className="px-2 py-2"></td>
                <td className="px-2 py-2 text-right text-green-700">{formatCurrency(sum('cashIncome'))}</td>
                <td className="px-2 py-2 text-right text-blue-700">{formatCurrency(sum('reserveIncome'))}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(sum('otherIncome'))}</td>
                <td className="px-2 py-2 text-right text-red-600">{formatCurrency(sum('spent'))}</td>
                <td className="px-2 py-2 text-right text-amber-700">{formatCurrency(sum('transfers'))}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(lastClosing)}</td>
                <td className="px-2 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
