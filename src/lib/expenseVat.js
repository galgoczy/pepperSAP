// Számlák ÁFA kulcsa és a dolgozói számla pénzmozgása – egy helyen, hogy az
// űrlap, a házipénztár és a jelentések soha ne számoljanak másképp.
//
// ÁFA kulcs: '0' | '5' | '18' | '27' | 'custom'
//   - a százalékos kulcsoknál az ÁFA tartalmat az Összeg mezőből számoljuk,
//     BRUTTÓ szemlélettel: 27%-nál az összeg 27/127-e (127 000 Ft → 27 000 Ft),
//   - 'custom' (egyedi) esetén a felhasználó forintban adja meg az ÁFA-t. Ez
//     akkor kell, ha egy számlán többféle kulcs szerepel.
//
// Dolgozói számla: nem az egység, hanem a KÖZPONT készpénzét terheli a teljes
// összeggel, az egység tartaléka pedig a számla ÁFA tartalmának FELÉVEL csökken.

export const VAT_RATE_CUSTOM = 'custom';

export const VAT_RATE_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '18', label: '18%' },
  { value: '27', label: '27%' },
  { value: VAT_RATE_CUSTOM, label: 'Egyedi (ÁFA forintban)' },
];

const num = (v) => (v == null || v === '' ? 0 : Number(v) || 0);

// Az alapértelmezett kulcs. A dolgozói számlánál mindig 27%, egyébként a
// hivatalos/nem hivatalos kategória dönt.
export function defaultVatRate({ isOfficial, isEmployeeInvoice } = {}) {
  if (isEmployeeInvoice) return '27';
  return isOfficial ? '27' : '0';
}

// A számla ÁFA tartalma forintban.
export function vatAmountOf(expense) {
  if (!expense) return 0;
  const rate = expense.vat_rate ?? '27';
  if (rate === VAT_RATE_CUSTOM) return num(expense.vat_amount);
  const r = num(rate);
  if (r <= 0) return 0;
  return num(expense.amount) * (r / (100 + r));
}

// Dolgozói számla: ennyivel csökken az EGYSÉG tartaléka (az ÁFA fele). A teljes
// összeg ettől függetlenül a Központ készpénzét terheli.
export function employeeInvoiceReserveCost(expense) {
  return vatAmountOf(expense) / 2;
}

export function isEmployeeInvoice(expense) {
  return !!expense?.is_employee_invoice;
}

// Rövid címke a listákhoz / jelentésekhez.
export function vatRateLabel(expense) {
  const rate = expense?.vat_rate ?? '27';
  if (rate === VAT_RATE_CUSTOM) return 'Egyedi ÁFA';
  return `${rate}%`;
}
