import { Modal, LoadingSpinner } from '../common';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useUnitBalanceBreakdown } from '../../hooks/useUnitBalanceBreakdown';

const TYPE_STYLE = {
  income: 'text-green-700',
  expense: 'text-red-600',
  transfer: 'text-amber-700',
  revision: 'text-blue-700',
};

// Drill-down for a unit's cash or reserve balance: shows the daily closings,
// transfers and revisions that make it up.
export default function BalanceBreakdownModal({ isOpen, onClose, unitId, pocket, title }) {
  const { items, total, loading } = useUnitBalanceBreakdown(isOpen ? unitId : null, pocket);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nincs megjeleníthető tétel</p>
      ) : (
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-2 border-b border-gray-100 last:border-0 text-sm"
            >
              <div className="min-w-0 pr-3">
                <p className="text-gray-900 truncate">{item.label}</p>
                <p className="text-xs text-gray-400">{item.date ? formatDate(item.date) : ''}</p>
              </div>
              <span className={`font-semibold whitespace-nowrap ${TYPE_STYLE[item.type] || 'text-gray-700'}`}>
                {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-300">
            <span className="font-semibold text-gray-700">Egyenleg összesen:</span>
            <span className={`text-lg font-bold ${total >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
}
