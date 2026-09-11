// A számla-listák Excel exportja.
//
// Mindkét export ugyanazt az elvet követi: pontosan azt viszi ki, ami a szűrők
// és a kereső után a képernyőn van, a képernyőn látott sorrendben. Így az
// export mindig arról a listáról szól, amit a felhasználó épp néz.
//
// Az állapot (beérkezett / szkennelt / fizetett) két módon jelenik meg: külön
// oszlopokban, és a sor háttérszíneként — ugyanazzal a színnel, amit a
// Beérkezett számlák lista is használ (fizetett > szkennelt > beérkezett).

import * as XLSX from 'xlsx';
import { PAYMENT_METHODS, formatDate } from './utils';
import { defaultVatRate, vatAmountOf, VAT_RATE_CUSTOM } from './expenseVat';
import { PAYMENT_KIND_META } from '../hooks/usePaymentItems';
import { INVOICE_STATES, furthestState, statusLabel } from './invoiceStatus';

// Melyik "zsebből" megy a kifizetés:
//   bank      – bankszámláról (kártya, MOL kártya, átutalás, …)
//   house     – hivatalos készpénz (Házipénztár)
//   reserve   – nem hivatalos készpénz (Tartalék)
//   central   – központi pénztár
// Az EFO/bér tételeknek nincs is_official jelzőjük; a hivatalos részük a
// házipénztárt mozgatja, ezért oda soroljuk őket.
// A lista szűrője és az export is EZT használja, hogy a kettő ne térhessen el.
export function itemSource(item) {
  if (item.kind === 'central') return 'central';
  // A dolgozói számlát is a Központ fizeti (az egységnél csak az ÁFA fele
  // jelenik meg tartalék-költségként).
  if (item.is_employee_invoice) return 'central';
  const pm = item.payment_method;
  if (pm && pm !== 'cash') return 'bank';
  if (item.is_official === false) return 'reserve';
  return 'house';
}

export const SOURCE_LABELS = {
  bank: 'Bankszámla',
  house: 'Házipénztár',
  reserve: 'Tartalék',
  central: 'Központi pénztár',
};

// Az átutalásos számlák listázhatók a kelt vagy a teljesítés dátuma szerint;
// minden más tétel mindig a saját dátumával szerepel.
export function effectiveDate(item, dateBasis) {
  if (dateBasis === 'fulfillment' && item.payment_method === 'transfer') {
    return item.fulfillment_date || item.date;
  }
  return item.date;
}

const yesNo = (v) => (v ? 'igen' : '');

// ---------------------------------------------------------------------------
// Közös XLSX-építés

// A sor háttere a legelőrébb tartó állapot színe, a "Jelölés" oszlop pedig
// szövegesen is viszi ugyanazt — így az információ akkor sem vész el, ha a
// megnyitó program nem jeleníti meg a cellaszínt.
function writeSheet(wb, sheetName, headers, rows, sourceItems, numericHeaders) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  ws['!cols'] = headers.map((h) => {
    const longest = [h, ...rows.map((r) => String(r[h] ?? ''))].reduce(
      (max, v) => Math.max(max, v.length), 0
    );
    return { wch: Math.min(Math.max(longest + 2, 10), 42) };
  });
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 0), c: headers.length - 1 } }),
  };
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const numericCols = headers
    .map((h, i) => (numericHeaders.includes(h) ? i : -1))
    .filter((i) => i >= 0);

  headers.forEach((_, col) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cell]) ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E5E7EB' } } };
  });

  rows.forEach((_, index) => {
    const r = index + 1;
    const item = sourceItems[index];
    const rgb = item ? furthestState(item)?.xlsxRgb : null;
    headers.forEach((_h, col) => {
      const cell = XLSX.utils.encode_cell({ r, c: col });
      if (!ws[cell]) return;
      if (rgb) ws[cell].s = { ...(ws[cell].s || {}), fill: { fgColor: { rgb } } };
      if (numericCols.includes(col) && typeof ws[cell].v === 'number') ws[cell].z = '#,##0';
    });
  });

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return ws;
}

// Az utolsó sort (összesen) kiemeljük.
function styleTotalsRow(ws, headers, rowIndex, numericHeaders) {
  headers.forEach((h, col) => {
    const cell = XLSX.utils.encode_cell({ r: rowIndex, c: col });
    if (!ws[cell]) return;
    ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FECACA' } } };
    if (numericHeaders.includes(h) && typeof ws[cell].v === 'number') ws[cell].z = '#,##0';
  });
}

// A szűrés leírása külön munkalapon, hogy később is látszódjon, miről szól.
function addFilterSheet(wb, rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Szűrés');
}

function download(wb, prefix, filters) {
  const stamp = `${filters.startDate || ''}_${filters.endDate || ''}`.replace(/[^0-9_-]/g, '');
  XLSX.writeFile(wb, `${prefix}_${stamp || 'export'}.xlsx`);
}

// ---------------------------------------------------------------------------
// 1) Kifizetések lista (számla + EFO + heti bér + központ)

const PAYMENT_HEADERS = [
  'Fajta', 'Név', 'Bizonylat', 'Tétel', 'Egység', 'Dátum', 'Fizetés módja', 'Típus',
  'Hivatalos', 'Dolgozói számla', 'ÁFA kulcs', 'ÁFA tartalom',
  'Állapot', 'Beérkezett', 'Szkennelt', 'Fizetett',
  'Deviza', 'Összeg',
];
const PAYMENT_NUMERIC = ['ÁFA tartalom', 'Összeg'];

// A migráció előtt rögzített számláknál nincs eltárolt kulcs; ilyenkor a
// megállapodás szerinti alapértelmezés érvényes (hivatalos 27%, egyébként 0%).
function rateOf(item) {
  return (
    item.vat_rate ||
    defaultVatRate({ isOfficial: item.is_official, isEmployeeInvoice: item.is_employee_invoice })
  );
}

function paymentRow(item, dateBasis) {
  // Az ÁFA csak a számlákra értelmezett; az EFO/bér/központi tételeknél üresen
  // marad, nem írunk oda félrevezető 27%-ot.
  const isInvoice = item.kind === 'expense';
  const rate = isInvoice ? rateOf(item) : null;
  const vat = isInvoice
    ? vatAmountOf({ amount: item.amount, vat_rate: rate, vat_amount: item.vat_amount })
    : null;
  // A "fizetett" csak átutalásnál értelmezett.
  const paidApplies = item.payment_method === 'transfer';

  return {
    'Fajta': PAYMENT_KIND_META[item.kind]?.label || item.kind || '',
    'Név': item.name || '',
    'Bizonylat': item.reference || '',
    'Tétel': item.description || '',
    'Egység': item.units?.name || '',
    'Dátum': effectiveDate(item, dateBasis) || '',
    'Fizetés módja': item.payment_method
      ? PAYMENT_METHODS[item.payment_method] || item.payment_method
      : '',
    'Típus': SOURCE_LABELS[itemSource(item)] || '',
    'Hivatalos': isInvoice ? (item.is_official ? 'igen' : 'nem') : '',
    'Dolgozói számla': yesNo(item.is_employee_invoice),
    'ÁFA kulcs': !isInvoice ? '' : rate === VAT_RATE_CUSTOM ? 'egyedi' : `${rate}%`,
    'ÁFA tartalom': vat == null ? '' : Math.round(vat),
    'Állapot': statusLabel(item),
    'Beérkezett': yesNo(item.received),
    'Szkennelt': yesNo(item.scanned),
    'Fizetett': paidApplies ? yesNo(item.paid) : '',
    'Deviza': item.currency || 'HUF',
    'Összeg': item.amount || 0,
  };
}

// `items`: a MÁR szűrt és rendezett lista (ami a képernyőn van).
export function exportPaymentsToExcel(items, filters = {}) {
  const list = items || [];
  const rows = list.map((item) => paymentRow(item, filters.dateBasis));

  const totalsRow = {};
  PAYMENT_HEADERS.forEach((h) => { totalsRow[h] = ''; });
  totalsRow['Fajta'] = 'Összesen';
  totalsRow['Tétel'] = `${list.length} tétel`;
  totalsRow['ÁFA tartalom'] = rows.reduce(
    (s, r) => s + (typeof r['ÁFA tartalom'] === 'number' ? r['ÁFA tartalom'] : 0), 0
  );
  totalsRow['Összeg'] = list.reduce((s, i) => s + (i.amount || 0), 0);

  const wb = XLSX.utils.book_new();
  const ws = writeSheet(
    wb, 'Kifizetések', PAYMENT_HEADERS, [...rows, totalsRow],
    [...list, null], PAYMENT_NUMERIC
  );
  styleTotalsRow(ws, PAYMENT_HEADERS, rows.length + 1, PAYMENT_NUMERIC);

  const { startDate, endDate, search, kindFilter, paymentFilter, sourceFilter, dateBasis, unitName } = filters;
  addFilterSheet(wb, [
    ['Kifizetések export'],
    ['Készült', new Date().toLocaleString('hu-HU')],
    ['Időszak', `${startDate || ''} - ${endDate || ''}`],
    ['Dátum alapja', dateBasis === 'fulfillment' ? 'Teljesítés (átutalásnál)' : 'Kelt'],
    ['Egység', unitName || 'Minden egység'],
    ['Keresés', search ? search.trim() : '(nincs)'],
    ['Ktg fajtája', kindFilter ? PAYMENT_KIND_META[kindFilter]?.label || kindFilter : 'Minden fajta'],
    ['Fizetési mód', paymentFilter
      ? (paymentFilter === 'cash_card' ? 'Készpénz + bankkártya' : PAYMENT_METHODS[paymentFilter] || paymentFilter)
      : 'Összes'],
    ['Típus', sourceFilter ? SOURCE_LABELS[sourceFilter] || sourceFilter : 'Minden típus'],
    ['Tételek száma', list.length],
  ]);

  download(wb, 'kifizetesek', filters);
}

// ---------------------------------------------------------------------------
// 2) Beérkezett számlák lista (állapot-nyilvántartás)

const INVOICE_HEADERS = [
  'Név', 'Számlaszám', 'Tétel', 'Egység', 'Kelt', 'Teljesítés', 'Fizetési határidő',
  'Fizetés módja', 'Állapot', 'Beérkezett', 'Beérkezett ekkor',
  'Szkennelt', 'Szkennelt ekkor', 'Fizetett', 'Fizetett ekkor',
  'Deviza', 'Összeg',
];
const INVOICE_NUMERIC = ['Összeg'];

const STATE_FILTER_LABELS = {
  not_received: 'Be nem érkezett',
  not_scanned: 'Nem szkennelt',
  not_paid: 'Nem fizetett – átutalás',
};

// `items`: nyers számla sorok (expenses / central_payments), már szűrve+rendezve.
export function exportInvoiceStatusToExcel(items, filters = {}) {
  const list = items || [];
  const at = (item, state) => (item[state.key] && item[state.atField] ? formatDate(item[state.atField]) : '');
  const paidApplies = (item) => item.payment_method === 'transfer';

  const rows = list.map((item) => ({
    'Név': item.supplier_name || '',
    'Számlaszám': item.invoice_number || '',
    'Tétel': item.item_description || '',
    'Egység': item.units?.name || '',
    'Kelt': item.invoice_date || '',
    'Teljesítés': item.fulfillment_date || '',
    'Fizetési határidő': item.payment_deadline || '',
    'Fizetés módja': item.payment_method
      ? PAYMENT_METHODS[item.payment_method] || item.payment_method
      : '',
    'Állapot': statusLabel(item),
    'Beérkezett': yesNo(item.received),
    'Beérkezett ekkor': at(item, INVOICE_STATES[0]),
    'Szkennelt': yesNo(item.scanned),
    'Szkennelt ekkor': at(item, INVOICE_STATES[1]),
    'Fizetett': paidApplies(item) ? yesNo(item.paid) : '',
    'Fizetett ekkor': paidApplies(item) ? at(item, INVOICE_STATES[2]) : '',
    'Deviza': item.currency || 'HUF',
    'Összeg': parseFloat(item.amount) || 0,
  }));

  const totalsRow = {};
  INVOICE_HEADERS.forEach((h) => { totalsRow[h] = ''; });
  totalsRow['Név'] = 'Összesen';
  totalsRow['Tétel'] = `${list.length} számla`;
  totalsRow['Összeg'] = list.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  const wb = XLSX.utils.book_new();
  const ws = writeSheet(
    wb, 'Számlák', INVOICE_HEADERS, [...rows, totalsRow],
    [...list, null], INVOICE_NUMERIC
  );
  styleTotalsRow(ws, INVOICE_HEADERS, rows.length + 1, INVOICE_NUMERIC);

  const { startDate, endDate, search, stateFilter, methodFilter, unitName } = filters;
  addFilterSheet(wb, [
    ['Számlák (állapot) export'],
    ['Készült', new Date().toLocaleString('hu-HU')],
    ['Időszak', `${startDate || ''} - ${endDate || ''}`],
    ['Egység', unitName || 'Minden egység'],
    ['Keresés', search ? search.trim() : '(nincs)'],
    ['Állapot szűrő', stateFilter ? STATE_FILTER_LABELS[stateFilter] || stateFilter : 'Minden számla'],
    ['Fizetési mód', methodFilter
      ? (methodFilter === 'cash_card' ? 'Készpénz + bankkártya' : PAYMENT_METHODS[methodFilter] || methodFilter)
      : 'Összes'],
    ['Tételek száma', list.length],
    [],
    ['Sorszínek', 'beérkezett = lazac, szkennelt = zöld, fizetett = sárga'],
  ]);

  download(wb, 'szamlak_allapot', filters);
}
