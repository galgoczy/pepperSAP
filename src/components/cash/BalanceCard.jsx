import { Wallet, Banknote } from 'lucide-react';
import { Card } from '../common';
import { formatCurrency } from '../../lib/utils';

export default function BalanceCard({ title, cash, reserve, pocketsTotal, loading, showReserve = true, onSelectPocket }) {
  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded w-2/3"></div>
        </div>
      </Card>
    );
  }

  const total = showReserve ? cash + reserve : cash;

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      <div className={`grid gap-4 ${showReserve ? 'md:grid-cols-2' : ''}`}>
        {/* Cash balance */}
        <button
          type="button"
          onClick={onSelectPocket ? () => onSelectPocket('cash') : undefined}
          disabled={!onSelectPocket}
          className={`p-4 bg-green-50 rounded-lg border border-green-200 text-left transition-colors ${onSelectPocket ? 'hover:bg-green-100 cursor-pointer' : ''}`}
        >
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <Banknote className="h-5 w-5" />
            <span className="text-sm font-medium">Készpénz</span>
          </div>
          <p className={`text-2xl font-bold ${cash >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatCurrency(cash)}
          </p>
          {onSelectPocket && <p className="text-xs text-green-600 mt-1">Részletek megtekintése</p>}
        </button>

        {/* Reserve balance */}
        {showReserve && (
          <button
            type="button"
            onClick={onSelectPocket ? () => onSelectPocket('reserve') : undefined}
            disabled={!onSelectPocket}
            className={`p-4 bg-blue-50 rounded-lg border border-blue-200 text-left transition-colors ${onSelectPocket ? 'hover:bg-blue-100 cursor-pointer' : ''}`}
          >
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Wallet className="h-5 w-5" />
              <span className="text-sm font-medium">Tartalék</span>
            </div>
            <p className={`text-2xl font-bold ${reserve >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
              {formatCurrency(reserve)}
            </p>
            {onSelectPocket && <p className="text-xs text-blue-600 mt-1">Részletek megtekintése</p>}
          </button>
        )}
      </div>

      {/* Pockets info for central */}
      {pocketsTotal !== undefined && pocketsTotal > 0 && (
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-700">Zsebekben elkülönítve:</span>
            <span className="font-semibold text-amber-700">{formatCurrency(pocketsTotal)}</span>
          </div>
        </div>
      )}

      {/* Total - only show if reserve is visible (otherwise it's redundant) */}
      {showReserve && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Összesen:</span>
            <span className={`text-xl font-bold ${total >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
