import { cn } from '../../lib/utils';

export default function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  padding = true,
  ...props
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-md border border-gray-200',
        className
      )}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(padding && 'p-6')}>{children}</div>
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-200', className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg',
        className
      )}
    >
      {children}
    </div>
  );
}
