// Melyik házipénztár-zsebből megy ki egy kifizetés?
//
// Egy egység házipénztára két zseb: Készpénz (hivatalos) és Tartalék (nem
// hivatalos). Mindkettő FIZIKAI készpénz. Ami nem készpénzben ment ki
// (bankkártya, MOL kártya, átutalás, elszámoló), az a bankszámlát terheli, a
// házipénztárat egyik zsebét sem – akár hivatalos, akár nem.
//
// Ez a szabály korábban négy helyen külön-külön élt, és a nem hivatalos
// számlánál egyik sem nézte a fizetési módot: a bankkártyával fizetett, nem
// hivatalos számla is a Tartalékot csökkentette. Most mind innen dolgozik
// (houseCashSeries – ez a mérleg –, a napi rögzítés és a napi PDF).
//
// Visszatérési érték: 'cash' | 'reserve' | null (nem mozgat házipénztárat).

// Dolgozói számla: a teljes összeget a Központ készpénze állja, az egységnél
// csak az ÁFA fele terheli a Tartalékot (expenseVat.employeeInvoiceReserveCost).
// Ezt a hívók külön kezelik, ezért itt null.
export function expenseCashPocket(e) {
  if (e.is_employee_invoice) return null;
  if (e.payment_method !== 'cash') return null;
  return e.is_official ? 'cash' : 'reserve';
}

// EFO: a hivatalos rész készpénzben a Készpénz zsebből megy – átutalásnál a
// bankszámláról, akkor a házipénztárat nem érinti. Az extra (nem hivatalos)
// rész mindig készpénz a Tartalékból.
export function efoOfficialMovesCash(p) {
  return p.payment_method !== 'transfer';
}

// Rövid magyarázat a Házipénztár bontásához: miért ebből a zsebből ment ki.
const METHOD_LABELS = {
  cash: 'készpénz',
  card: 'bankkártya',
  mol_card: 'MOL kártya',
  transfer: 'átutalás',
  clearing: 'elszámoló',
};
export const paymentMethodLabel = (m) => METHOD_LABELS[m] || m || '–';
