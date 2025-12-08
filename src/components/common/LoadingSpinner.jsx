import { cn } from '../../lib/utils';

export default function LoadingSpinner({
  size = 'md',
  className = '',
  fullScreen = false,
}) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-b-2 border-pepper-red',
        sizes[size],
        className
      )}
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export function LoadingOverlay({ loading, children }) {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10 rounded-lg">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-500">Betöltés...</p>
      </div>
    </div>
  );
}

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 rounded',
        className
      )}
      {...props}
    />
  );
}
