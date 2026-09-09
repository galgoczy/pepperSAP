// Szín jelölések – ugyanaz a készlet, amit a napi jelentés használ, hogy a
// piros/sárga/zöld mindenhol ugyanazt jelentse.

export const MARK_COLOR_OPTIONS = [
  { value: null, label: 'Nincs', swatch: 'bg-gray-100 border-gray-300' },
  { value: 'red', label: 'Piros', swatch: 'bg-red-500 border-red-600' },
  { value: 'yellow', label: 'Sárga', swatch: 'bg-yellow-400 border-yellow-500' },
  { value: 'green', label: 'Zöld', swatch: 'bg-green-500 border-green-600' },
  { value: 'blue', label: 'Kék', swatch: 'bg-blue-500 border-blue-600' },
  { value: 'purple', label: 'Lila', swatch: 'bg-purple-500 border-purple-600' },
];

export const MARK_COLOR_LABELS = {
  red: 'Piros',
  yellow: 'Sárga',
  green: 'Zöld',
  blue: 'Kék',
  purple: 'Lila',
};

// Sor-kiemelés a listákban (a napi jelentés táblájával azonos megjelenés).
export const MARK_ROW_CLASS = {
  red: 'bg-red-50 border-l-4 border-l-red-500',
  yellow: 'bg-yellow-50 border-l-4 border-l-yellow-500',
  green: 'bg-green-50 border-l-4 border-l-green-500',
  blue: 'bg-blue-50 border-l-4 border-l-blue-500',
  purple: 'bg-purple-50 border-l-4 border-l-purple-500',
};

// Halvány árnyalatok az Excel exporthoz (a fekete szöveg olvasható marad rajtuk).
export const MARK_COLOR_RGB = {
  red: 'FECACA',
  yellow: 'FEF08A',
  green: 'BBF7D0',
  blue: 'BFDBFE',
  purple: 'E9D5FF',
};
