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
