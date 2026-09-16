// Format currency
export const formatCurrency = (amount, currency = 'HUF') => {
  if (amount === null || amount === undefined) return '-';

  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'HUF' ? 0 : 2,
    maximumFractionDigits: currency === 'HUF' ? 0 : 2,
  }).format(amount);
};

// Format date to Hungarian locale
export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const HU_WEEKDAYS = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];

// "2026.08.11. (kedd)" — people spot a wrong weekday far more reliably than a
// wrong digit, so the day name is shown wherever the entry date is confirmed.
// Parsed from the local date components so there is no timezone drift.
export const formatDateWithWeekday = (date) => {
  if (!date) return '-';
  const [y, m, d] = String(date).split('-').map(Number);
  if (!y || !m || !d) return formatDate(date);
  const dt = new Date(y, m - 1, d);
  return `${formatDate(date)} (${HU_WEEKDAYS[dt.getDay()]})`;
};

// Format datetime to Hungarian locale
export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Calculate total from array of items
export const calculateTotal = (items, field = 'amount') => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
};

// Display name for a user: full_name if set, otherwise the local part of the
// email (e.g. "rsr@pepperhouse.hu" -> "rsr"), falling back to "Ismeretlen".
export const getDisplayName = (profile) => {
  if (!profile) return 'Ismeretlen';
  if (profile.full_name && profile.full_name.trim()) return profile.full_name.trim();
  if (profile.email) return profile.email.split('@')[0];
  return 'Ismeretlen';
};

// Combine class names (clsx alternative)
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Format a Date to YYYY-MM-DD using LOCAL components (not UTC). Using
// toISOString() here would shift the date back a day in timezones ahead of UTC
// (e.g. Hungary), which broke the report month ranges.
const toLocalYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Get today's date in YYYY-MM-DD format
export const getToday = () => {
  return toLocalYmd(new Date());
};

// A mai nap hónapja "YYYY-MM" alakban.
export const currentYearMonth = () => getToday().slice(0, 7);

// Add (or subtract) days to a YYYY-MM-DD date string, returning YYYY-MM-DD
export const addDays = (ymd, days) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toLocalYmd(date);
};

// Hónap szintű léptetés és címkézés (a Számlák menü hónapváltójához).
const HU_MONTHS = [
  'január', 'február', 'március', 'április', 'május', 'június',
  'július', 'augusztus', 'szeptember', 'október', 'november', 'december',
];

// "2026-08" -> "2026. augusztus"
export const formatYearMonth = (ym) => {
  const [y, m] = String(ym || '').split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return '';
  return `${y}. ${HU_MONTHS[m - 1]}`;
};

// "2026-08" -> { start: '2026-08-01', end: '2026-08-31' }
export const monthRange = (ym) => {
  const [y, m] = String(ym || '').split('-').map(Number);
  if (!y || !m) return { start: '', end: '' };
  const last = new Date(y, m, 0).getDate();
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, '0')}` };
};

// shiftYearMonth('2026-01', -1) -> '2025-12'
export const shiftYearMonth = (ym, delta) => {
  const [y, m] = String(ym || '').split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Get first day of current month
export const getFirstDayOfMonth = () => {
  const date = new Date();
  return toLocalYmd(new Date(date.getFullYear(), date.getMonth(), 1));
};

// Get last day of current month
export const getLastDayOfMonth = () => {
  const date = new Date();
  return toLocalYmd(new Date(date.getFullYear(), date.getMonth() + 1, 0));
};

// Payment method labels
export const PAYMENT_METHODS = {
  cash: 'Készpénz',
  card: 'Bankkártya',
  szep_card: 'SZÉP kártya',
  mol_card: 'MOL kártya',
  transfer: 'Átutalás',
  clearing: 'Elszámoló',
};

// Event type labels
export const EVENT_TYPES = {
  protocol: 'Protokol bekészítés',
  event: 'Rendezvény',
  lunch_service: 'Ebédszolgáltatás',
  delivery: 'Kiszállítás',
  other: 'Egyéb',
};

// Unit type labels
export const UNIT_TYPES = {
  restaurant: 'Étterem',
  events: 'Rendezvény',
};

// Currency options
export const CURRENCIES = ['HUF', 'EUR'];

// VAT rates
export const VAT_RATES = ['0', '5', '18', '27'];

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Share of a withdrawn bankkártya (terminal) tip that is booked as a reserve
// (tartalék) cost at day end.
export const TERMINAL_TIP_WITHDRAW_RATE = 0.6;

// Ékezet- és kisbetű-független szöveges keresés a listákhoz ("metro" megtalálja
// a „METRO Kft.”-t, "matrai" a „Mátrai”-t). Több szó esetén mindegyiknek
// szerepelnie kell valamelyik mezőben.
export const normalizeForSearch = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const matchesSearch = (query, ...fields) => {
  const terms = normalizeForSearch(query).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = fields.map(normalizeForSearch).join(' ');
  return terms.every((t) => haystack.includes(t));
};
