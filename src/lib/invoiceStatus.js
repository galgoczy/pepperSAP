// A számlák admin-oldali állapotai: beérkezett / szkennelt / fizetett.
//
// Ezek csak nyilvántartási jelölések, az egységek adatrögzítését és az
// összegeket nem érintik. A "fizetett" csak átutalásos számlánál értelmezett.
//
// Egy helyen tartjuk, mert három dolognak kell ugyanazt látnia: a Beérkezett
// számlák lista, a lista Excel exportja és a Kifizetések export.
//
// Színek: beérkezett = lazac, szkennelt = zöld, fizetett = sárga.

export const INVOICE_STATES = [
  {
    key: 'received',
    label: 'Beérkezett',
    dot: 'bg-[#FA8072] border-[#FA8072]',
    // Faint version shown before the mark is set, so the colour still identifies it.
    dotIdle: 'bg-[#FA8072]/25 border-[#FA8072]/50 hover:bg-[#FA8072]/50',
    row: 'bg-[#FA8072]/25',
    text: 'text-[#B4483C]',
    atField: 'received_at',
    byField: 'received_by',
    // A képernyőn látott halvány sorszín Excelben (ugyanaz 25%-os keverésben).
    xlsxRgb: 'FEDFDC',
  },
  {
    key: 'scanned',
    label: 'Szkennelt',
    dot: 'bg-green-500 border-green-500',
    dotIdle: 'bg-green-500/25 border-green-500/50 hover:bg-green-500/50',
    row: 'bg-green-500/25',
    text: 'text-green-700',
    atField: 'scanned_at',
    byField: 'scanned_by',
    xlsxRgb: 'C8F0D7',
  },
  {
    key: 'paid',
    label: 'Fizetett',
    dot: 'bg-yellow-400 border-yellow-400',
    dotIdle: 'bg-yellow-400/25 border-yellow-400/50 hover:bg-yellow-400/50',
    row: 'bg-yellow-400/25',
    text: 'text-yellow-700',
    atField: 'paid_at',
    byField: 'paid_by',
    transferOnly: true,
    xlsxRgb: 'FEF2C4',
  },
];

// A "fizetett" csak átutalásnál értelmezett, ezért a többinél meg sem jelenik.
export function statesFor(item) {
  return INVOICE_STATES.filter((s) => !s.transferOnly || item?.payment_method === 'transfer');
}

// A legelőrébb tartó bejelölt állapot adja a sor színét (fizetett > szkennelt >
// beérkezett). Ha egyik sincs bejelölve, nincs szín.
export function furthestState(item) {
  return [...statesFor(item)].reverse().find((s) => item?.[s.key]) || null;
}

// Rövid, olvasható állapot a listákhoz és az exporthoz.
export function statusLabel(item) {
  const state = furthestState(item);
  return state ? state.label : 'Nincs jelölve';
}
