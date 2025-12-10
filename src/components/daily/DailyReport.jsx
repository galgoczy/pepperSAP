import { useDailyRevenue, useHouseCash } from '../../hooks/useDailyRevenue';
import { useExpenses } from '../../hooks/useExpenses';
import { Card, LoadingSpinner, Badge } from '../common';
import { formatCurrency, formatDate, PAYMENT_METHODS } from '../../lib/utils';

export default function DailyReport({ date, unitId }) {
  const { revenue, loading: revenueLoading } = useDailyRevenue(unitId, date);
  const { houseCash, loading: cashLoading } = useHouseCash(unitId, date);
  const { expenses, loading: expensesLoading } = useExpenses(unitId, date, date);

  const loading = revenueLoading || cashLoading || expensesLoading;

  if (!unitId) {
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">
          Válassz ki egy egységet a folytatáshoz
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const cashRegisterTotal =
    (parseFloat(revenue?.vat_0_percent) || 0) +
    (parseFloat(revenue?.vat_5_percent) || 0) +
    (parseFloat(revenue?.vat_18_percent) || 0) +
    (parseFloat(revenue?.vat_27_percent) || 0) +
    (parseFloat(revenue?.tips) || 0);

  const paymentMethodsTotal =
    (parseFloat(revenue?.cash_payment) || 0) +
    (parseFloat(revenue?.card_payment) || 0) +
    (parseFloat(revenue?.szep_card_payment) || 0);

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0
  );

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="text-center border-b pb-4 print:pb-2">
        <img
          src="https://pepperhouse.hu/wp-content/uploads/2022/03/cropped-pepper_logo2.png"
          alt="Pepper House"
          className="h-12 mx-auto mb-2"
        />
        <h1 className="text-xl font-bold text-gray-900">Napi elszámolás</h1>
        <p className="text-gray-600">{formatDate(date)}</p>
      </div>

      {/* Revenue section */}
      <Card title="Forgalmi adatok" className="print:shadow-none print:border">
        {!revenue ? (
          <p className="text-gray-500 text-center py-4">
            Nincs rögzített forgalmi adat erre a napra
          </p>
        ) : (
          <div className="space-y-6">
            {/* Software revenue */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                Éttermi szoftver forgalom
              </h4>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(revenue.total_revenue)}
              </div>
            </div>

            {/* VAT breakdown */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                Pénztárgép forgalom (ÁFA bontás)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">0% ÁFA:</span>
                  <span>{formatCurrency(revenue.vat_0_percent)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">5% ÁFA:</span>
                  <span>{formatCurrency(revenue.vat_5_percent)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">18% ÁFA:</span>
                  <span>{formatCurrency(revenue.vat_18_percent)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">27% ÁFA:</span>
                  <span>{formatCurrency(revenue.vat_27_percent)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Borravaló:</span>
                  <span>{formatCurrency(revenue.tips)}</span>
                </div>
                <div className="flex justify-between p-2 bg-green-50 rounded font-medium">
                  <span className="text-green-700">Összesen:</span>
                  <span className="text-green-800">
                    {formatCurrency(cashRegisterTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Discrepancy */}
            {parseFloat(revenue.discrepancy_amount) > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-red-700">Elütés:</span>
                  <Badge variant="danger">
                    {formatCurrency(
                      revenue.discrepancy_amount,
                      revenue.discrepancy_currency
                    )}
                  </Badge>
                </div>
                {revenue.discrepancy_note && (
                  <p className="text-sm text-red-600 mt-1">
                    {revenue.discrepancy_note}
                  </p>
                )}
              </div>
            )}

            {/* Payment methods */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Fizetési módok</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Készpénz:</span>
                  <span>{formatCurrency(revenue.cash_payment)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Bankkártya:</span>
                  <span>{formatCurrency(revenue.card_payment)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">SZÉP kártya:</span>
                  <span>{formatCurrency(revenue.szep_card_payment)}</span>
                </div>
                <div className="flex justify-between p-2 bg-green-50 rounded font-medium">
                  <span className="text-green-700">Összesen:</span>
                  <span className="text-green-800">
                    {formatCurrency(paymentMethodsTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Terminal comparison */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Terminál forgalom</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Bankkártya (terminál):</span>
                  <span>{formatCurrency(revenue.terminal_card)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">SZÉP (terminál):</span>
                  <span>{formatCurrency(revenue.terminal_szep)}</span>
                </div>
              </div>
              {revenue.terminal_discrepancy_note && (
                <p className="text-sm text-gray-600 mt-2 italic">
                  Megjegyzés: {revenue.terminal_discrepancy_note}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* House cash section */}
      <Card title="Házipénztár" className="print:shadow-none print:border">
        {!houseCash ? (
          <p className="text-gray-500 text-center py-4">
            Nincs rögzített házipénztár adat erre a napra
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-700 mb-2">Pénztár zseb</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Váltópénz:</span>
                  <span>{formatCurrency(houseCash.change_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Napi készpénz:</span>
                  <span>{formatCurrency(houseCash.official_daily_cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Egyéb bevétel:</span>
                  <span>{formatCurrency(houseCash.official_other_income)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Készpénzes számlák:</span>
                  <span>-{formatCurrency(houseCash.official_cash_expenses)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>EFO kifizetések:</span>
                  <span>-{formatCurrency(houseCash.official_employment_expenses)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span className="text-green-700">Összesen:</span>
                  <span className="text-green-800">
                    {formatCurrency(houseCash.official_total)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-blue-700 mb-2">Tartalék</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Különbözet:</span>
                  <span>{formatCurrency(houseCash.other_difference)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Extra bevétel:</span>
                  <span>{formatCurrency(houseCash.other_extra_income)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Kiadások:</span>
                  <span>-{formatCurrency(houseCash.other_expenses)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span className="text-blue-700">Összesen:</span>
                  <span className="text-blue-800">
                    {formatCurrency(houseCash.other_total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Expenses section */}
      <Card title="Napi kifizetések" className="print:shadow-none print:border">
        {expenses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Nincs rögzített kifizetés erre a napra
          </p>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {expense.supplier_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {expense.item_description || 'Nincs leírás'} •{' '}
                    {PAYMENT_METHODS[expense.payment_method]}
                  </p>
                </div>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(expense.amount, expense.currency)}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="font-bold text-gray-700">Kifizetések összesen:</span>
              <span className="font-bold text-red-600">
                -{formatCurrency(totalExpenses)}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Print footer */}
      <div className="text-center text-sm text-gray-500 pt-4 border-t print:pt-2">
        <p>Pepper House Pénzügyi Nyilvántartó Rendszer</p>
        <p>Nyomtatva: {new Date().toLocaleString('hu-HU')}</p>
      </div>
    </div>
  );
}
