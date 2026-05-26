import { FileText } from 'lucide-react';
import { useDailyRevenue, useHouseCash } from '../../hooks/useDailyRevenue';
import { useExpenses } from '../../hooks/useExpenses';
import { Card, LoadingSpinner, Badge } from '../common';
import { formatCurrency, formatDate, PAYMENT_METHODS } from '../../lib/utils';

export default function DailyReport({ date, unitId }) {
  const { revenue, cashRegisterTotals, cashRegisterDetails, loading: revenueLoading } = useDailyRevenue(unitId, date);
  const { houseCash, calculatedData, discrepancyDetails, loading: cashLoading } = useHouseCash(unitId, date);
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

  // Extract calculated data with defaults to prevent NaN
  const {
    officialExpenses = 0,
    nonOfficialExpenses = 0,
    totalCashRegisterCash = 0,
    totalCashRegisterCard = 0,
    totalCashRegisterRevenue = 0,
    softwareRevenue = 0,
    totalDiscrepancies = 0,
    adjustedCash = 0,
  } = calculatedData || {};

  // Use aggregated cash register totals from the hook
  const cashRegisterTotal =
    (cashRegisterTotals.vat_0_percent || 0) +
    (cashRegisterTotals.vat_5_percent || 0) +
    (cashRegisterTotals.vat_18_percent || 0) +
    (cashRegisterTotals.vat_27_percent || 0) +
    (cashRegisterTotals.tips || 0);

  // Payment methods total (cash + card only, no SZÉP)
  const paymentMethodsTotal = totalCashRegisterCash + totalCashRegisterCard;

  // Calculate house cash values
  const efoPayments = parseFloat(houseCash?.official_employment_expenses) || 0;
  const changeAmount = parseFloat(houseCash?.change_amount) || 0;
  const extraIncome = parseFloat(houseCash?.other_extra_income) || 0;

  // Pénztár zseb összesen: korrigált készpénz (készpénz - elütések) - hivatalos kifizetések - EFO
  const officialTotal = adjustedCash - officialExpenses - efoPayments;

  // Tartalék: szoftver-pénztárgép különbség + extra bevétel - nem számlás kifizetések
  const revenueDifference = softwareRevenue - totalCashRegisterRevenue;
  const reserveTotal = revenueDifference + extraIncome - nonOfficialExpenses;

  // Sort expenses: official first, then non-official
  const sortedExpenses = [...expenses].sort((a, b) => {
    if (a.is_official === b.is_official) return 0;
    return a.is_official ? -1 : 1;
  });

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0
  );

  // Helper to calculate register total
  const getRegisterTotal = (cr) =>
    (parseFloat(cr.vat_0_percent) || 0) +
    (parseFloat(cr.vat_5_percent) || 0) +
    (parseFloat(cr.vat_18_percent) || 0) +
    (parseFloat(cr.vat_27_percent) || 0) +
    (parseFloat(cr.tips) || 0);

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

            {/* Per-register cash register data */}
            {cashRegisterDetails.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-3">
                  Pénztárgép forgalom (pénztárgépenként)
                </h4>
                <div className="space-y-4">
                  {cashRegisterDetails.map((cr) => {
                    const registerTotal = getRegisterTotal(cr);
                    const registerName = cr.cash_registers?.name || cr.cash_registers?.ap_number || 'Pénztárgép';
                    return (
                      <div key={cr.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-800">{registerName}</span>
                          <span className="text-sm text-gray-500">AP: {cr.cash_registers?.ap_number}</span>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-gray-500">0%</div>
                            <div className="font-medium">{formatCurrency(cr.vat_0_percent)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500">5%</div>
                            <div className="font-medium">{formatCurrency(cr.vat_5_percent)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500">18%</div>
                            <div className="font-medium">{formatCurrency(cr.vat_18_percent)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500">27%</div>
                            <div className="font-medium">{formatCurrency(cr.vat_27_percent)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500">Borr.</div>
                            <div className="font-medium">{formatCurrency(cr.tips)}</div>
                          </div>
                          <div className="text-center bg-green-100 rounded p-1">
                            <div className="text-green-700">Össz.</div>
                            <div className="font-bold text-green-800">{formatCurrency(registerTotal)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aggregated VAT breakdown */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                Pénztárgép forgalom összesítve (ÁFA bontás)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">0% ÁFA:</span>
                  <span>{formatCurrency(cashRegisterTotals.vat_0_percent)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">5% ÁFA:</span>
                  <span>{formatCurrency(cashRegisterTotals.vat_5_percent)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">18% ÁFA:</span>
                  <span>{formatCurrency(cashRegisterTotals.vat_18_percent)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">27% ÁFA:</span>
                  <span>{formatCurrency(cashRegisterTotals.vat_27_percent)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Borravaló:</span>
                  <span>{formatCurrency(cashRegisterTotals.tips)}</span>
                </div>
                <div className="flex justify-between p-2 bg-green-50 rounded font-medium">
                  <span className="text-green-700">Összesen:</span>
                  <span className="text-green-800">
                    {formatCurrency(cashRegisterTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Discrepancies from cash registers */}
            {discrepancyDetails && discrepancyDetails.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-700 mb-2">
                  Elütések
                  {totalDiscrepancies > 0 && (
                    <span className="ml-2 text-sm font-normal">
                      (HUF összesen: {formatCurrency(totalDiscrepancies)})
                    </span>
                  )}
                </h4>
                <div className="space-y-2">
                  {discrepancyDetails.map((disc, index) => (
                    <div key={index} className="flex justify-between items-start text-sm">
                      <div>
                        <span className="text-red-600">{disc.registerName}</span>
                        {disc.note && (
                          <p className="text-red-500 text-xs">{disc.note}</p>
                        )}
                      </div>
                      <Badge variant="danger">
                        {formatCurrency(disc.amount)} {disc.currency}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment methods - without SZÉP card */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Fizetési módok</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Készpénz:</span>
                  <span>{formatCurrency(totalCashRegisterCash)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">Bankkártya:</span>
                  <span>{formatCurrency(totalCashRegisterCard)}</span>
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
                  <span>{formatCurrency(totalCashRegisterCard)}</span>
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
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-green-700 mb-2">Pénztár zseb</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Váltópénz (info):</span>
                <span>{formatCurrency(changeAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Napi készpénz (pénztárgép):</span>
                <span className="font-medium">{formatCurrency(totalCashRegisterCash)}</span>
              </div>
              {totalDiscrepancies > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Elütések levonva:</span>
                  <span>-{formatCurrency(totalDiscrepancies)}</span>
                </div>
              )}
              {totalDiscrepancies > 0 && (
                <div className="flex justify-between text-gray-700 bg-yellow-50 p-1 rounded">
                  <span>Korrigált készpénz:</span>
                  <span className="font-medium">{formatCurrency(adjustedCash)}</span>
                </div>
              )}
              <div className="flex justify-between text-red-600">
                <span>Hivatalos kifizetések:</span>
                <span>-{formatCurrency(officialExpenses)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>EFO kifizetések:</span>
                <span>-{formatCurrency(efoPayments)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t">
                <span className="text-green-700">Összesen:</span>
                <span className={officialTotal >= 0 ? 'text-green-800' : 'text-red-600'}>
                  {formatCurrency(officialTotal)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-blue-700 mb-2">Tartalék</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Szoftver-pénztárgép különbség:</span>
                <span className={revenueDifference >= 0 ? 'font-medium' : 'text-red-600 font-medium'}>
                  {formatCurrency(revenueDifference)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Extra bevétel:</span>
                <span>{formatCurrency(extraIncome)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Nem számlás kifizetések:</span>
                <span>-{formatCurrency(nonOfficialExpenses)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t">
                <span className="text-blue-700">Összesen:</span>
                <span className={reserveTotal >= 0 ? 'text-blue-800' : 'text-red-600'}>
                  {formatCurrency(reserveTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Expenses section */}
      <Card title="Napi kifizetések" className="print:shadow-none print:border">
        {expenses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Nincs rögzített kifizetés erre a napra
          </p>
        ) : (
          <div className="space-y-2">
            {sortedExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-start gap-2">
                  {expense.is_official && (
                    <FileText className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {expense.supplier_name}
                      {expense.is_official && (
                        <span className="text-xs text-blue-600 ml-2">(számlás)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {expense.item_description || 'Nincs leírás'} •{' '}
                      {PAYMENT_METHODS[expense.payment_method]}
                    </p>
                  </div>
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
