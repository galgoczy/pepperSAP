import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  primary: 'bg-red-100 text-pepper-red',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-2 h-2 rounded-full mr-1.5',
            variant === 'success' && 'bg-green-500',
            variant === 'warning' && 'bg-yellow-500',
            variant === 'danger' && 'bg-red-500',
            variant === 'info' && 'bg-blue-500',
            variant === 'primary' && 'bg-pepper-red',
            variant === 'default' && 'bg-gray-500'
          )}
        />
      )}
      {children}
    </span>
  );
}

// Status badge with predefined states
export function StatusBadge({ status }) {
  const statusConfig = {
    active: { label: 'Aktív', variant: 'success' },
    inactive: { label: 'Inaktív', variant: 'default' },
    pending: { label: 'Függőben', variant: 'warning' },
    completed: { label: 'Teljesített', variant: 'success' },
    cancelled: { label: 'Megszakítva', variant: 'danger' },
    overdue: { label: 'Lejárt', variant: 'danger' },
    paid: { label: 'Fizetve', variant: 'success' },
    unpaid: { label: 'Fizetetlen', variant: 'warning' },
  };

  const config = statusConfig[status] || { label: status, variant: 'default' };

  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}
