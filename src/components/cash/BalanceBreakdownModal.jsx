import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Modal, LoadingSpinner } from '../common';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useUnitBalanceBreakdown } from '../../hooks/useUnitBalanceBreakdown';
import { paymentMethodLabel } from '../../lib/cashPockets';

const TYPE_STYLE = {
  income: 'text-green-700',
  expense: 'text-red-600',
  transfer: 'text-amber-700',
  revision: 'text-blue-700',
};

const KIND_LABEL = { expense: 'Számla', efo: 'EFO', wage: 'Heti bér' };

// Miért ebből a zsebből ment ki a tétel – ugyanaz a szabály, mint a
// mérlegben (lib/cashPockets.js), szövegesen.
function pocketReason(item) {
  const r = item.source?.record || {};
  const toCash = item.pocket === 'cash';
  if (item.source?.kind === 'expense') {
    if (r.is_employee_invoice) return 'Dolgozói számla: a teljes összeg a Központé, a Tartalékot csak az ÁFA fele terheli.';
    return toCash
      ? 'Hivatalos számla, készpénzzel fizetve → a Készpénz zsebet terheli.'
      : 'Nem hivatalos számla, készpénzzel fizetve → a Tartalékot terheli.';
  }
  const who = item.source?.kind === 'efo' ? 'EFO' : 'Heti bér';
  return toCash
    ? `${who} hivatalos része → a Készpénz zsebet terheli.`
    : `${who} extra (nem hivatalos) része → a Tartalékot terheli.`;
}

// Egy kifizetés részletei: minden, ami alapján ellenőrizhető, hogy jó helyen
// van-e – és egy gomb a napra, ahol rögzítették (ott szerkeszthető is).
function SourceDetails({ item, onOpenDay }) {
  const r = item.source.record || {};
  const kind = item.source.kind;
  const rows = [];
  if (kind === 'expense') {
    rows.push(['Szállító', r.supplier_name]);
    if (r.invoice_number) rows.push(['Számla sorszám', r.invoice_number]);
    if (r.item_description) rows.push(['Tétel', r.item_description]);
    rows.push(['Összeg', formatCurrency(parseFloat(r.amount) || 0)]);
    rows.push(['Hivatalos', r.is_official ? 'igen' : 'nem']);
    rows.push(['Fizetés módja', paymentMethodLabel(r.payment_method)]);
    rows.push(['Számla dátuma', formatDate(r.invoice_date)]);
  } else if (kind === 'efo') {
    rows.push(['Dolgozó', r.employee_name]);
    rows.push(['Hivatalos rész', formatCurrency(parseFloat(r.official_amount) || 0)]);
    rows.push(['Extra rész', formatCurrency(parseFloat(r.extra_amount) || 0)]);
    rows.push(['Fizetés módja', paymentMethodLabel(r.payment_method)]);
    rows.push(['Dátum', formatDate(r.payment_date)]);
  } else if (kind === 'wage') {
    rows.push(['Dolgozó', r.worker_name]);
    rows.push(['Hivatalos rész', formatCurrency(parseFloat(r.official_amount) || 0)]);
    rows.push(['Extra rész', formatCurrency(parseFloat(r.extra_amount) || 0)]);
    rows.push(['Dátum', formatDate(r.payment_date)]);
  }
  if (r.notes) rows.push(['Megjegyzés', r.notes]);

  return (
    <div className="mx-2 mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
      <p className="mb-2 font-semibold text-gray-700">{KIND_LABEL[kind] || 'Kifizetés'}</p>
      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-gray-500">{k}</dt>
            <dd className="text-gray-900 break-words">{v || '–'}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-gray-600">{pocketReason(item)}</p>
      <button
        type="button"
        onClick={() => onOpenDay(item.source.date)}
        className="mt-2 inline-flex items-center gap-1 font-medium text-pepper-red hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Megnyitás a napi rögzítésben ({formatDate(item.source.date)})
      </button>
    </div>
  );
}

// Drill-down for a unit's cash or reserve balance: shows the daily closings,
// transfers and revisions that make it up. A kifizetés tételek kattinthatók:
// kinyílnak a részletek, és onnan a rögzítés napjára lehet ugrani.
export default function BalanceBreakdownModal({ isOpen, onClose, unitId, pocket, title }) {
  const { items, total, loading } = useUnitBalanceBreakdown(isOpen ? unitId : null, pocket);
  const [openIdx, setOpenIdx] = useState(null);
  const navigate = useNavigate();

  const openDay = (date) => {
    onClose();
    navigate(`/daily?date=${date}&unit=${unitId}`);
  };

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
          {items.map((item, idx) => {
            const clickable = !!item.source;
            const isOpenRow = clickable && openIdx === idx;
            return (
              <div key={idx} className="border-b border-gray-100 last:border-0">
                <div
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => setOpenIdx(isOpenRow ? null : idx) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setOpenIdx(isOpenRow ? null : idx);
                          }
                        }
                      : undefined
                  }
                  title={clickable ? 'Kattints a részletekért' : undefined}
                  className={`flex items-center justify-between py-2 px-2 text-sm ${
                    clickable ? 'cursor-pointer rounded hover:bg-gray-50' : ''
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-1 pr-3">
                    {clickable ? (
                      isOpenRow ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      )
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-gray-900 truncate">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.date ? formatDate(item.date) : ''}</p>
                    </div>
                  </div>
                  <span className={`font-semibold whitespace-nowrap ${TYPE_STYLE[item.type] || 'text-gray-700'}`}>
                    {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                  </span>
                </div>
                {isOpenRow && <SourceDetails item={item} onOpenDay={openDay} />}
              </div>
            );
          })}
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
