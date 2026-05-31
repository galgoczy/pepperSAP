import { useState, useEffect, useCallback, Fragment } from 'react';
import { Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Card, Button, LoadingSpinner } from '../common';
import { useAppSettings } from '../../hooks/useAppSettings';
import { fetchHouseCashSeries } from '../../lib/houseCashSeries';
import { formatCurrency, formatDate } from '../../lib/utils';

function sanitizeForPdf(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/ő/g, 'ö').replace(/Ő/g, 'Ö').replace(/ű/g, 'ü').replace(/Ű/g, 'Ü');
}
function pdfHuf(n) {
  return (parseFloat(n) || 0).toLocaleString('hu-HU') + ' Ft';
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

// Keep only the series rows within [startDate, endDate].
function rowsInRange(series, startDate, endDate) {
  return series.orderedDates
    .filter((d) => (!startDate || d >= startDate) && (!endDate || d <= endDate))
    .map((d) => series.byDate.get(d));
}

// One pocket's daily table (Pénztár zseb or Tartalék) for a single unit.
function PocketTable({ rows, pocket }) {
  const [openRow, setOpenRow] = useState(null);
  const isCash = pocket === 'cash';

  const get = (row) => isCash
    ? {
        opening: row.cashOpening, revenue: row.cashRevenue - row.cashDiscrepancies,
        expenses: row.cashExpenses, transfers: row.cashTransfers,
        closing: row.cashClosing, items: row.cashPaymentItems,
      }
    : {
        opening: row.reserveOpening, revenue: row.reserveRevenue,
        expenses: row.reserveExpenses, transfers: row.reserveTransfers,
        closing: row.reserveClosing, items: row.reservePaymentItems,
      };

  const totalRevenue = rows.reduce((s, r) => s + get(r).revenue, 0);
  const totalExpenses = rows.reduce((s, r) => s + get(r).expenses, 0);
  const totalTransfers = rows.reduce((s, r) => s + get(r).transfers, 0);
  const lastClosing = rows.length ? get(rows[rows.length - 1]).closing : 0;

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 py-3">Nincs adat ebben az időszakban</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-2 pr-3">Dátum</th>
            <th className="py-2 px-2 text-right">Bevétel</th>
            <th className="py-2 px-2 text-right">Kifizetések</th>
            <th className="py-2 px-2 text-right">Átküldés</th>
            <th className="py-2 px-2 text-right">Zárás</th>
            <th className="py-2 pl-2">Kifizetések megnevezése</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const g = get(row);
            const open = openRow === row.date;
            return (
              <Fragment key={row.date}>
                <tr
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setOpenRow(open ? null : row.date)}
                >
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      {formatDate(row.date)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-green-700">{formatCurrency(g.revenue)}</td>
                  <td className="py-2 px-2 text-right text-red-600">-{formatCurrency(g.expenses)}</td>
                  <td className="py-2 px-2 text-right text-amber-700">{g.transfers ? formatCurrency(g.transfers) : '-'}</td>
                  <td className="py-2 px-2 text-right font-semibold">{formatCurrency(g.closing)}</td>
                  <td className="py-2 pl-2 text-gray-500 truncate max-w-[200px]">
                    {g.items.map((i) => i.label).join(', ') || '-'}
                  </td>
                </tr>
                {open && (
                  <tr className="bg-gray-50">
                    <td colSpan={6} className="py-2 px-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Bevétel / mozgás</p>
                          <div className="flex justify-between"><span className="text-gray-500">Nyitó</span><span>{formatCurrency(g.opening)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Bevétel</span><span className="text-green-700">{formatCurrency(g.revenue)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Átküldés</span><span>{formatCurrency(g.transfers)}</span></div>
                          <div className="flex justify-between font-semibold border-t mt-1 pt-1"><span>Zárás</span><span>{formatCurrency(g.closing)}</span></div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Kifizetések tételesen</p>
                          {g.items.length === 0 ? (
                            <p className="text-gray-400">Nincs kifizetés</p>
                          ) : (
                            g.items.map((i, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="text-gray-600 truncate pr-2">{i.label}</span>
                                <span className="text-red-600 whitespace-nowrap">-{formatCurrency(i.amount)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-semibold">
            <td className="py-2 pr-3">Összesen</td>
            <td className="py-2 px-2 text-right text-green-700">{formatCurrency(totalRevenue)}</td>
            <td className="py-2 px-2 text-right text-red-600">-{formatCurrency(totalExpenses)}</td>
            <td className="py-2 px-2 text-right text-amber-700">{formatCurrency(totalTransfers)}</td>
            <td className="py-2 px-2 text-right"></td>
            <td className="py-2 pl-2"></td>
          </tr>
          <tr className={`${isCash ? 'bg-emerald-50' : 'bg-blue-50'}`}>
            <td className="py-2 pr-3 font-bold" colSpan={4}>
              Aktuális zárás (utolsó nap)
            </td>
            <td className={`py-2 px-2 text-right text-lg font-bold ${isCash ? 'text-emerald-800' : 'text-blue-900'}`}>
              {formatCurrency(lastClosing)}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function UnitSection({ unitName, cashRows, reserveRows, showReserve }) {
  return (
    <div className="space-y-6">
      {unitName && <h3 className="text-lg font-bold text-gray-900">{unitName}</h3>}
      <div>
        <h4 className="font-semibold text-emerald-700 mb-2">Pénztár zseb - napi változások</h4>
        <PocketTable rows={cashRows} pocket="cash" />
      </div>
      {showReserve && (
        <div>
          <h4 className="font-semibold text-blue-700 mb-2">Tartalék - napi változások</h4>
          <PocketTable rows={reserveRows} pocket="reserve" />
        </div>
      )}
    </div>
  );
}

export default function HouseCashReport({ unitId, units, startDate, endDate }) {
  const { settings } = useAppSettings();
  const showReserve = settings.showReserve;
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]); // [{ unitId, unitName, cashRows, reserveRows }]

  const restaurantUnits = (units || []).filter((u) => u.type === 'restaurant');
  // When no unitId is selected (admin "all units"), report every restaurant unit.
  const targetUnits = unitId
    ? restaurantUnits.filter((u) => u.id === unitId)
    : restaurantUnits;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        targetUnits.map(async (u) => {
          const series = await fetchHouseCashSeries(u.id, endDate);
          return {
            unitId: u.id,
            unitName: u.name,
            cashRows: rowsInRange(series, startDate, endDate),
            reserveRows: rowsInRange(series, startDate, endDate),
          };
        })
      );
      setSections(results);
    } catch (e) {
      console.error('Error loading house cash report:', e);
      setSections([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, startDate, endDate, units]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePdf = async () => {
    const logo = await loadImageDataUrl(PDF_LOGO_URL);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightMargin = pageWidth - 15;

    const drawHeader = () => {
      doc.setFillColor(211, 47, 47);
      doc.rect(0, 0, pageWidth, 28, 'F');
      if (logo) {
        const h = 10;
        doc.addImage(logo, 'PNG', (pageWidth - h * PDF_LOGO_ASPECT) / 2, 4, h * PDF_LOGO_ASPECT, h);
      } else {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18); doc.setFont('helvetica', 'bold');
        doc.text('PEPPER HOUSE', pageWidth / 2, 13, { align: 'center' });
      }
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12); doc.setFont('helvetica', 'normal');
      doc.text(sanitizeForPdf('Házipénztár jelentés'), pageWidth / 2, 22, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    };

    let first = true;
    sections.forEach((sec) => {
      if (!first) doc.addPage();
      first = false;
      drawHeader();
      let y = 36;
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf(sec.unitName), pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`, pageWidth / 2, y, { align: 'center' });
      y += 10;

      const renderPocket = (title, rows, pocket) => {
        const isCash = pocket === 'cash';
        const get = (r) => isCash
          ? { rev: r.cashRevenue - r.cashDiscrepancies, exp: r.cashExpenses, tr: r.cashTransfers, close: r.cashClosing, items: r.cashPaymentItems }
          : { rev: r.reserveRevenue, exp: r.reserveExpenses, tr: r.reserveTransfers, close: r.reserveClosing, items: r.reservePaymentItems };

        doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        doc.text(sanitizeForPdf(title), 15, y); y += 7;
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text('Dátum', 15, y);
        doc.text('Bevétel', 70, y, { align: 'right' });
        doc.text('Kifiz.', 100, y, { align: 'right' });
        doc.text('Átküldés', 130, y, { align: 'right' });
        doc.text('Zárás', rightMargin, y, { align: 'right' });
        y += 4;
        doc.setFont('helvetica', 'normal');
        let tRev = 0, tExp = 0, tTr = 0, lastClose = 0;
        rows.forEach((r) => {
          if (y > 275) { doc.addPage(); drawHeader(); y = 36; }
          const g = get(r);
          tRev += g.rev; tExp += g.exp; tTr += g.tr; lastClose = g.close;
          doc.text(sanitizeForPdf(formatDate(r.date)), 15, y);
          doc.text(pdfHuf(g.rev), 70, y, { align: 'right' });
          doc.text('-' + pdfHuf(g.exp), 100, y, { align: 'right' });
          doc.text(g.tr ? pdfHuf(g.tr) : '-', 130, y, { align: 'right' });
          doc.text(pdfHuf(g.close), rightMargin, y, { align: 'right' });
          y += 4;
          const names = g.items.map((i) => i.label).join(', ');
          if (names) {
            doc.setFontSize(7); doc.setTextColor(120);
            const lines = doc.splitTextToSize(sanitizeForPdf('  ' + names), rightMargin - 18);
            doc.text(lines, 18, y); y += lines.length * 3.2;
            doc.setFontSize(8); doc.setTextColor(0);
          }
        });
        doc.setFont('helvetica', 'bold');
        doc.line(15, y, rightMargin, y); y += 4;
        doc.text('Összesen', 15, y);
        doc.text(pdfHuf(tRev), 70, y, { align: 'right' });
        doc.text('-' + pdfHuf(tExp), 100, y, { align: 'right' });
        doc.text(pdfHuf(tTr), 130, y, { align: 'right' });
        y += 5;
        doc.text(sanitizeForPdf('Aktuális zárás:'), 15, y);
        doc.text(pdfHuf(lastClose), rightMargin, y, { align: 'right' });
        y += 10;
        doc.setFont('helvetica', 'normal');
      };

      renderPocket('Pénztár zseb', sec.cashRows, 'cash');
      if (showReserve) renderPocket('Tartalék', sec.reserveRows, 'reserve');
    });

    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFontSize(8); doc.setTextColor(128);
      doc.text(sanitizeForPdf('Nyomtatva: ' + new Date().toLocaleString('hu-HU')), pageWidth / 2, 290, { align: 'center' });
      doc.setTextColor(0);
    }
    doc.save(sanitizeForPdf(`hazipenztar_jelentes_${startDate}_${endDate}.pdf`));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end no-print">
        <Button variant="outline" onClick={handlePdf}>
          <Printer className="h-4 w-4" />
          PDF letöltés
        </Button>
      </div>
      {sections.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-8">Nincs megjeleníthető egység</p></Card>
      ) : (
        sections.map((sec) => (
          <Card key={sec.unitId}>
            <UnitSection
              unitName={targetUnits.length > 1 ? sec.unitName : null}
              cashRows={sec.cashRows}
              reserveRows={sec.reserveRows}
              showReserve={showReserve}
            />
          </Card>
        ))
      )}
    </div>
  );
}
