import { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

// Date field that DISPLAYS the value as ÉÉÉÉ/HH/NN while storing the canonical
// YYYY-MM-DD string. Native <input type="date"> always renders in the browser
// locale (e.g. MM/DD/YYYY) and can't be reformatted, so we use a text input for
// display + a hidden native date input (anchored under the calendar icon) for
// easy picking.
//
// onChange is called with a synthetic event { target: { value } } where value
// is the ISO YYYY-MM-DD string, so it drops into existing
// `onChange={(e) => setX(e.target.value)}` handlers unchanged.
function isoToDisplay(iso) {
  return iso ? iso.replace(/-/g, '/') : '';
}

function formatTyping(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 6) return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
  if (digits.length > 4) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  return digits;
}

function displayToIso(display) {
  const m = display.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  // Basic validity check.
  const dt = new Date(`${y}-${mo}-${d}T00:00:00`);
  if (Number.isNaN(dt.getTime()) || dt.getMonth() + 1 !== parseInt(mo, 10)) return null;
  return `${y}-${mo}-${d}`;
}

export default function DateInput({
  value,
  onChange,
  min,
  max,
  required = false,
  className = '',
  disabled = false,
}) {
  const [text, setText] = useState(isoToDisplay(value));
  const nativeRef = useRef(null);

  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  const emit = (iso) => onChange?.({ target: { value: iso } });

  const handleTextChange = (e) => {
    const formatted = formatTyping(e.target.value);
    setText(formatted);
    const iso = displayToIso(formatted);
    if (iso) emit(iso);
  };

  const handleBlur = () => {
    const iso = displayToIso(text);
    if (iso) {
      emit(iso);
    } else {
      // Revert to the last valid value's display.
      setText(isoToDisplay(value));
    }
  };

  const openPicker = () => {
    const el = nativeRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      el.showPicker();
    } else {
      el.focus();
      el.click();
    }
  };

  return (
    <div className={cn('relative', className)}>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder="ÉÉÉÉ/HH/NN"
        required={required}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg bg-white transition-colors',
          'focus:ring-2 focus:ring-pepper-red focus:border-transparent',
          'disabled:bg-gray-100 disabled:cursor-not-allowed'
        )}
      />
      {/* Calendar button opens the native date picker for selection. */}
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        tabIndex={-1}
        aria-label="Naptár"
      >
        <Calendar className="h-5 w-5" />
      </button>
      {/* Hidden native picker (anchors the popup near the icon). */}
      <input
        ref={nativeRef}
        type="date"
        value={value || ''}
        min={min}
        max={max}
        onChange={(e) => emit(e.target.value)}
        className="absolute right-0 bottom-0 w-8 h-0 opacity-0 pointer-events-none"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
