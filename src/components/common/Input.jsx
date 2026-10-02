import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef(
  (
    {
      label,
      error,
      helper,
      type = 'text',
      className = '',
      inputClassName = '',
      required = false,
      prefix,
      suffix,
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
          {prefix && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">{prefix}</span>
            </div>
          )}
          <input
            ref={ref}
            type={type}
            // For number inputs, blur on wheel so scrolling over a focused field
            // can't accidentally change the value (a common source of off-by-one
            // errors). Combined with the hidden spin buttons, values are typed.
            onWheel={
              type === 'number'
                ? (e) => {
                    e.currentTarget.blur();
                    props.onWheel?.(e);
                  }
                : props.onWheel
            }
            className={cn(
              'w-full px-4 py-2.5 border rounded-lg transition-colors',
              'focus:ring-2 focus:ring-pepper-red focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              error
                ? 'border-status-error bg-red-50'
                : 'border-gray-300 bg-white',
              prefix && 'pl-10',
              suffix && 'pr-10',
              inputClassName
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">{suffix}</span>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-status-error">{error}</p>}
        {helper && !error && <p className="text-sm text-gray-500">{helper}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

export function Textarea({
  label,
  error,
  helper,
  className = '',
  required = false,
  rows = 3,
  ...props
}) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        className={cn(
          'w-full px-4 py-2.5 border rounded-lg transition-colors resize-none',
          'focus:ring-2 focus:ring-pepper-red focus:border-transparent',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          error ? 'border-status-error bg-red-50' : 'border-gray-300 bg-white'
        )}
        {...props}
      />
      {error && <p className="text-sm text-status-error">{error}</p>}
      {helper && !error && <p className="text-sm text-gray-500">{helper}</p>}
    </div>
  );
}
