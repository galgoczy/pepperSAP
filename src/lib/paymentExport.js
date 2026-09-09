// A Kifizetések (Számlák) lista Excel exportja.
//
// Pontosan azt viszi ki, ami a szűrők és a kereső után a képernyőn van, a
// képernyőn látott sorrendben. Így az export mindig arról a listáról szól,
// amit a felhasználó épp néz — nem egy másik, "teljes" halmazról.
//
// A szín jelölés két helyen jelenik meg: külön "Jelölés" oszlopban szövegesen
// (ez mindig megmarad, bármilyen Excel nyitja meg), és a sor háttérszíneként.
// A háttérszínt ugyanúgy állítjuk be, ahogy a riport-export teszi.

import * as XLSX from 'xlsx';
import { PAYMENT_METHODS } from './utils';
import { defaultVatRate, vatAmountOf, VAT_RATE_CUSTOM } from './expenseVat';
import { PAYMENT_KIND_META } from '../hooks/usePaymentItems';
import { MARK_COLOR_LABELS, MARK_COLOR_RGB } from './markColors';

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

const HEADERS = [
  'Fajta',
  'Név',
  'Bizonylat',
  'Tétel',
  'Egység',
  'Dátum',
  'Fizetés módja',
  'Típus',
  'Hivatalos',
  'Dolgozói számla',
  'ÁFA kulcs',
  'ÁFA tartalom',
  'Jelölés',
  'Deviza',
  'Összeg',
];

// A migráció előtt rögzített számláknál nincs eltárolt kulcs; ilyenkor a
// megállapodás szerinti alapértelmezés érvényes (hivatalos 27%, egyébként 0%).
function rateOf(item) {
  return (
    item.vat_rate ||
    defaultVatRate({ isOfficial: item.is_official, isEmployeeInvoice: item.is_employee_invoice })
  );
}

function rowOf(item, dateBasis) {
  // Az ÁFA csak a számlákra értelmezett; az EFO/bér/központi tételeknél üresen
  // marad, nem írunk oda félrevezető 27%-ot.
  const isInvoice = item.kind === 'expense';
  const rate = isInvoice ? rateOf(item) : null;
  const vat = isInvoice
    ? vatAmountOf({ amount: item.amount, vat_rate: rate, vat_amount: item.vat_amount })
    : null;

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
    'Dolgozói számla': item.is_employee_invoice ? 'igen' : '',
    'ÁFA kulcs': !isInvoice ? '' : rate === VAT_RATE_CUSTOM ? 'egyedi' : `${rate}%`,
    'ÁFA tartalom': vat == null ? '' : Math.round(vat),
    'Jelölés': MARK_COLOR_LABELS[item.mark_color] || '',
    'Deviza': item.currency || 'HUF',
    'Összeg': item.amount || 0,
  };
}

// A szűrés leírása, hogy később is látszódjon, miről szól ez a kimutatás.
function filterSheetRows(filters) {
  const {
    startDate, endDate, search, kindFilter, paymentFilter, sourceFilter, dateBasis, unitName,
  } = filters || {};
  const rows = [
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
  ];
  return rows;
}

// `items`: a MÁR szűrt és rendezett lista (ami a képernyőn van).
export function exportPaymentsToExcel(items, filters = {}) {
  const list = items || [];
  const dateBasis = filters.dateBasis;
  const data = list.map((item) => rowOf(item, dateBasis));

  // Összesen sor: csak az összeg és az ÁFA oszlopban van értelme.
  const total = list.reduce((sum, i) => sum + (i.amount || 0), 0);
  const vatTotal = data.reduce(
    (sum, r) => sum + (typeof r['ÁFA tartalom'] === 'number' ? r['ÁFA tartalom'] : 0),
    0
  );
  const totalsRow = {};
  HEADERS.forEach((h) => { totalsRow[h] = ''; });
  totalsRow['Fajta'] = 'Összesen';
  totalsRow['Tétel'] = `${list.length} tétel`;
  totalsRow['ÁFA tartalom'] = vatTotal;
  totalsRow['Összeg'] = total;

  const ws = XLSX.utils.json_to_sheet([...data, totalsRow], { header: HEADERS });

  // Oszlopszélességek a leghosszabb tartalomhoz igazítva.
  ws['!cols'] = HEADERS.map((h) => {
    const longest = [h, ...data.map((r) => String(r[h] ?? ''))].reduce(
      (max, v) => Math.max(max, v.length), 0
    );
    return { wch: Math.min(Math.max(longest + 2, 10), 42) };
  });
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length, c: HEADERS.length - 1 } }) };
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const amountCol = HEADERS.indexOf('Összeg');
  const vatCol = HEADERS.indexOf('ÁFA tartalom');

  // Fejléc + a jelölt sorok háttere, és a pénz oszlopok formátuma.
  HEADERS.forEach((_, col) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cell]) ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E5E7EB' } } };
  });

  list.forEach((item, index) => {
    const r = index + 1;
    const rgb = MARK_COLOR_RGB[item.mark_color];
    HEADERS.forEach((h, col) => {
      const cell = XLSX.utils.encode_cell({ r, c: col });
      if (!ws[cell]) return;
      if (rgb) ws[cell].s = { ...(ws[cell].s || {}), fill: { fgColor: { rgb } } };
      if ((col === amountCol || col === vatCol) && typeof ws[cell].v === 'number') {
        ws[cell].z = '#,##0';
      }
    });
  });

  const totalsRowIndex = data.length + 1;
  HEADERS.forEach((_, col) => {
    const cell = XLSX.utils.encode_cell({ r: totalsRowIndex, c: col });
    if (!ws[cell]) return;
    ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FECACA' } } };
    if ((col === amountCol || col === vatCol) && typeof ws[cell].v === 'number') {
      ws[cell].z = '#,##0';
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kifizetések');

  const infoWs = XLSX.utils.aoa_to_sheet(filterSheetRows(filters));
  infoWs['!cols'] = [{ wch: 18 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, infoWs, 'Szűrés');

  const stamp = `${filters.startDate || ''}_${filters.endDate || ''}`.replace(/[^0-9_-]/g, '');
  XLSX.writeFile(wb, `kifizetesek_${stamp || 'export'}.xlsx`);
}
