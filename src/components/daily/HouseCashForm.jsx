import { useState, useEffect } from 'react';
import { Save, Wallet, Banknote, ArrowRight, TrendingUp } from 'lucide-react';
import { useHouseCash, useDailyRevenue } from '../../hooks/useDailyRevenue';
import { Card, Button, Input, LoadingSpinner } from '../common';
import { formatCurrency } from '../../lib/utils';

const DEFAULT_CHANGE_AMOUNT = 30000;

export default function HouseCashForm({ date, unitId }) {
  const { houseCash, previousDayClosing, loading, saveHouseCash } = useHouseCash(unitId, date);
  const { revenue } = useDailyRevenue(unitId, date);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    change_amount: DEFAULT_CHANGE_AMOUNT,
    official_daily_cash: '',
    official_other_income: '',
    official_cash_expenses: '',
    official_employment_expenses: '',
    other_difference: '',
    other_extra_income: '',
    other_expenses: '',
  });

  // Opening balance from previous day's closing
  const openingBalance = previousDayClosing || 0;

  useEffect(() => {
    if (houseCash) {
      setFormData({
        change_amount: houseCash.change_amount ?? DEFAULT_CHANGE_AMOUNT,
        official_daily_cash: houseCash.official_daily_cash || '',
        official_other_income: houseCash.official_other_income || '',
        official_cash_expenses: houseCash.official_cash_expenses || '',
        official_employment_expenses: houseCash.official_employment_expenses || '',
        other_difference: houseCash.other_difference || '',
        other_extra_income: houseCash.other_extra_income || '',
        other_expenses: houseCash.other_expenses || '',
      });
    } else {
      // Auto-fill from daily revenue if available
      setFormData({
        change_amount: DEFAULT_CHANGE_AMOUNT,
        official_daily_cash: revenue?.cash_payment || '',
        official_other_income: '',
        official_cash_expenses: '',
        official_employment_expenses: '',
        other_difference: '',
        other_extra_income: '',
        other_expenses: '',
      });
    }
  }, [houseCash, date, revenue]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate daily movement (income - expenses) for Pénztár zseb
  const dailyIncome =
    (parseFloat(formData.official_daily_cash) || 0) +
    (parseFloat(formData.official_other_income) || 0);

  const dailyExpenses =
    (parseFloat(formData.official_cash_expenses) || 0) +
    (parseFloat(formData.official_employment_expenses) || 0);

  const dailyMovement = dailyIncome - dailyExpenses;

  // Closing balance = Opening + Daily movement (váltópénz is NOT included in running balance)
  const closingBalance = openingBalance + dailyMovement;

  // Tartalék (separate tracking)
  const otherTotal =
    (parseFloat(formData.other_difference) || 0) +
    (parseFloat(formData.other_extra_income) || 0) -
    (parseFloat(formData.other_expenses) || 0);

  // For saving: official_total is the closing balance
  const officialTotal = closingBalance;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unitId) return;

    setSaving(true);
    try {
      await saveHouseCash({
        ...formData,
        official_total: officialTotal,
        other_total: otherTotal,
      });
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Opening Balance */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-600 font-medium">Nyitó egyenleg</p>
              <p className="text-xs text-amber-500">Előző nap záró értéke</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-amber-700">
            {formatCurrency(openingBalance)}
          </span>
        </div>
      </Card>

      {/* Change amount - separate info */}
      <Card title="Váltópénz (a kasszában marad)">
        <Input
          label="Váltópénz összege"
          type="number"
          step="1"
          value={formData.change_amount}
          onChange={(e) => handleChange('change_amount', e.target.value)}
          suffix="Ft"
          helper="Állandó váltópénz a kasszában - nem része a napi forgalomnak"
        />
        <p className="text-xs text-gray-500 mt-2">
          Alapértelmezett: {formatCurrency(DEFAULT_CHANGE_AMOUNT)}
        </p>
      </Card>

      {/* Official pocket */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-600" />
            Pénztár zseb (napi forgalom)
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Napi készpénz forgalom (+)"
            type="number"
            step="0.01"
            value={formData.official_daily_cash}
            onChange={(e) => handleChange('official_daily_cash', e.target.value)}
            suffix="Ft"
            helper="Pénztárgép szerinti készpénz forgalom"
          />
          <Input
            label="Egyéb hivatalos bevétel (+)"
            type="number"
            step="0.01"
            value={formData.official_other_income}
            onChange={(e) => handleChange('official_other_income', e.target.value)}
            suffix="Ft"
          />
          <Input
            label="Készpénzes számlák (-)"
            type="number"
            step="0.01"
            value={formData.official_cash_expenses}
            onChange={(e) => handleChange('official_cash_expenses', e.target.value)}
            suffix="Ft"
            helper="Készpénzzel kifizetett számlák összege"
          />
          <Input
            label="EFO kifizetések (-)"
            type="number"
            step="0.01"
            value={formData.official_employment_expenses}
            onChange={(e) => handleChange('official_employment_expenses', e.target.value)}
            suffix="Ft"
            helper="Egyszerűsített foglalkoztatás kifizetései"
          />
        </div>

        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-green-600">Napi bevétel:</span>
            <span className="font-medium text-green-700">+{formatCurrency(dailyIncome)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-red-600">Napi kiadás:</span>
            <span className="font-medium text-red-700">-{formatCurrency(dailyExpenses)}</span>
          </div>
          <div className="border-t border-green-200 pt-2 flex justify-between items-center">
            <span className="font-medium text-green-700">Napi egyenleg:</span>
            <span className={`text-lg font-bold ${dailyMovement >= 0 ? 'text-green-800' : 'text-red-800'}`}>
              {dailyMovement >= 0 ? '+' : ''}{formatCurrency(dailyMovement)}
            </span>
          </div>
        </div>
      </Card>

      {/* Other pocket */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-blue-600" />
            Tartalék
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Szoftver vs pénztárgép különbség"
            type="number"
            step="0.01"
            value={formData.other_difference}
            onChange={(e) => handleChange('other_difference', e.target.value)}
            suffix="Ft"
            helper="Éttermi szoftver és pénztárgép közötti különbség"
          />
          <Input
            label="Egyéb extra bevétel"
            type="number"
            step="0.01"
            value={formData.other_extra_income}
            onChange={(e) => handleChange('other_extra_income', e.target.value)}
            suffix="Ft"
          />
          <Input
            label="Nem számlás kifizetések (-)"
            type="number"
            step="0.01"
            value={formData.other_expenses}
            onChange={(e) => handleChange('other_expenses', e.target.value)}
            suffix="Ft"
            helper="Számla nélküli kiadások"
          />
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-700">
              Tartalék összesen:
            </span>
            <span className="text-xl font-bold text-blue-800">
              {formatCurrency(otherTotal)}
            </span>
          </div>
        </div>
      </Card>

      {/* Closing Balance - Running total */}
      <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
        <div className="space-y-4">
          {/* Running balance calculation */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <span>{formatCurrency(openingBalance)}</span>
            <ArrowRight className="h-4 w-4" />
            <span className={dailyMovement >= 0 ? 'text-green-600' : 'text-red-600'}>
              {dailyMovement >= 0 ? '+' : ''}{formatCurrency(dailyMovement)}
            </span>
            <ArrowRight className="h-4 w-4" />
            <span className="font-bold">{formatCurrency(closingBalance)}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
            <div>
              <p className="text-lg font-semibold text-emerald-700">Záró egyenleg</p>
              <p className="text-xs text-emerald-600">Ez lesz a következő nap nyitója</p>
            </div>
            <span className="text-3xl font-bold text-emerald-800">
              {formatCurrency(closingBalance)}
            </span>
          </div>
        </div>
      </Card>

      {/* Grand total with váltópénz */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Záró egyenleg:</span>
            <span>{formatCurrency(closingBalance)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Tartalék:</span>
            <span>{formatCurrency(otherTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Váltópénz (a kasszában):</span>
            <span>{formatCurrency(parseFloat(formData.change_amount) || 0)}</span>
          </div>
          <div className="border-t border-gray-300 pt-2 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-700">
              Kassza teljes készpénz:
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(closingBalance + otherTotal + (parseFloat(formData.change_amount) || 0))}
            </span>
          </div>
        </div>
      </Card>

      {/* Submit button */}
      <div className="flex justify-end">
        <Button type="submit" loading={saving} size="lg">
          <Save className="h-4 w-4" />
          {houseCash ? 'Frissítés' : 'Mentés'}
        </Button>
      </div>
    </form>
  );
}
