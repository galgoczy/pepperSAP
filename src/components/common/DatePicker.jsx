import { forwardRef } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

const DatePicker = forwardRef(
  (
    {
      label,
      error,
      helper,
      className = '',
      required = false,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('space-y-1', className)}>
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="date"
            className={cn(
              'w-full px-4 py-2.5 border rounded-lg transition-colors',
              'focus:ring-2 focus:ring-pepper-red focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              error
                ? 'border-status-error bg-red-50'
                : 'border-gray-300 bg-white'
            )}
            {...props}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        {error && <p className="text-sm text-status-error">{error}</p>}
        {helper && !error && <p className="text-sm text-gray-500">{helper}</p>}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export default DatePicker;

export function DateRangePicker({
  startLabel = 'Kezdő dátum',
  endLabel = 'Záró dátum',
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  error,
  className = '',
}) {
  return (
    <div className={cn('flex gap-4 items-end', className)}>
      <DatePicker
        label={startLabel}
        value={startValue}
        onChange={(e) => onStartChange(e.target.value)}
        max={endValue}
      />
      <DatePicker
        label={endLabel}
        value={endValue}
        onChange={(e) => onEndChange(e.target.value)}
        min={startValue}
      />
      {error && <p className="text-sm text-status-error">{error}</p>}
    </div>
  );
}
