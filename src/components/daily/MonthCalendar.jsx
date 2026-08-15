import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getToday } from '../../lib/utils';

const MONTH_NAMES = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December',
];
// Monday-first, as used in Hungary.
const WEEKDAYS = ['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'];

const ymOf = (iso) => (iso || getToday()).slice(0, 7);
const shiftYm = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${y}. ${MONTH_NAMES[m - 1]}`;
};

// Compact money for the small day cells: 1 360 000 -> "1,36 M", 860 423 -> "860e".
function shortAmount(v) {
  const n = Math.round(v || 0);
  if (n === 0) return '';
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2).replace('.', ',')} M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${Math.round(n / 1_000)}e`;
  }
  return String(n);
}

// Month grid for the daily entry page: shows which days already have revenue
// recorded (with the amount on desktop), highlights the day being edited, and
// jumps the form to any day that is clicked.
export default function MonthCalendar({ unitId, selectedDate, onSelectDate }) {
  const [ym, setYm] = useState(ymOf(selectedDate));
  const [totals, setTotals] = useState({});
  const today = getToday();

  // Follow the edited date into its own month (e.g. when the arrows cross a
  // month boundary), but let the user browse other months freely.
  useEffect(() => {
    setYm(ymOf(selectedDate));
  }, [selectedDate]);

  const load = useCallback(async () => {
    if (!unitId) {
      setTotals({});
      return;
    }
    const [y, m] = ym.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    try {
      const { data, error } = await supabase
        .from('daily_revenue')
        .select('date, total_revenue')
        .eq('unit_id', unitId)
        .gte('date', `${ym}-01`)
        .lte('date', `${ym}-${String(last).padStart(2, '0')}`);
      if (error) throw error;
      const map = {};
      (data || []).forEach((r) => { map[r.date] = parseFloat(r.total_revenue) || 0; });
      setTotals(map);
    } catch (e) {
      console.error('Error loading calendar totals:', e);
      setTotals({});
    }
  }, [unitId, ym]);

  // Refetch on month/unit change and whenever the edited day changes, so an
  // amount that was just saved shows up.
  useEffect(() => { load(); }, [load, selectedDate]);

  const [y, m] = ym.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  // getDay(): 0 = Sunday. Convert to a Monday-first offset.
  const leading = (new Date(y, m - 1, 1).getDay() + 6) % 7;

  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      `${ym}-${String(i + 1).padStart(2, '0')}`
    ),
  ];

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setYm(shiftYm(ym, -1))}
          title="Előző hónap"
          className="p-1 rounded text-gray-500 hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
          {monthLabel(ym)}
        </span>
        <button
          type="button"
          onClick={() => setYm(shiftYm(ym, 1))}
          disabled={ym >= ymOf(today)}
          title="Következő hónap"
          className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-400 pb-1">
            {d}
          </div>
        ))}

        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;

          const dayNum = Number(date.slice(-2));
          const isSelected = date === selectedDate;
          const isToday = date === today;
          const isFuture = date > today;
          const amount = totals[date];
          const hasData = amount !== undefined;

          return (
            <button
              key={date}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDate(date)}
              title={isFuture ? 'Jövőbeli nap' : undefined}
              className={[
                'rounded-lg border text-left px-1.5 py-1 transition-colors',
                'min-h-[38px] sm:min-h-[52px] flex flex-col justify-between',
                isFuture ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100' : 'hover:border-pepper-red',
                isSelected
                  ? 'border-pepper-red ring-2 ring-pepper-red bg-pepper-red/10'
                  : hasData
                    ? 'bg-white border-gray-200'
                    : 'bg-gray-50 border-gray-100',
              ].join(' ')}
            >
              <span
                className={[
                  'text-xs leading-none',
                  isSelected ? 'font-bold text-pepper-red' : 'text-gray-700',
                  isToday && !isSelected ? 'font-bold underline decoration-dotted' : '',
                ].join(' ')}
              >
                {dayNum}
              </span>
              {/* Amounts only on desktop — they do not fit tastefully on a phone. */}
              {hasData && amount > 0 && (
                <span className="hidden sm:block text-[10px] leading-none text-gray-600 truncate">
                  {shortAmount(amount)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
