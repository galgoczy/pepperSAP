import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const Select = forwardRef(
  (
    {
      label,
      error,
      helper,
      options = [],
      placeholder = 'Válassz...',
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
          <select
            ref={ref}
            className={cn(
              'w-full px-4 py-2.5 border rounded-lg transition-colors appearance-none',
              'focus:ring-2 focus:ring-pepper-red focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              error
                ? 'border-status-error bg-red-50'
                : 'border-gray-300 bg-white'
            )}
            {...props}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        {error && <p className="text-sm text-status-error">{error}</p>}
        {helper && !error && <p className="text-sm text-gray-500">{helper}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
