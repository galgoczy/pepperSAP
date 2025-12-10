import { useState, useEffect } from 'react';
import { Save, Wallet, Banknote } from 'lucide-react';
import { useHouseCash, useDailyRevenue } from '../../hooks/useDailyRevenue';
import { Card, Button, Input, LoadingSpinner } from '../common';
import { formatCurrency } from '../../lib/utils';

export default function HouseCashForm({ date, unitId }) {
  const { houseCash, loading, saveHouseCash } = useHouseCash(unitId, date);
  const { revenue } = useDailyRevenue(unitId, date);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    change_amount: '',
    official_daily_cash: '',
    official_other_income: '',
    official_cash_expenses: '',
    official_employment_expenses: '',
    other_difference: '',
    other_extra_income: '',
    other_expenses: '',
  });

  useEffect(() => {
    if (houseCash) {
      setFormData({
        change_amount: houseCash.change_amount || '',
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
        change_amount: '',
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

  // Calculate totals
  const officialTotal =
    (parseFloat(formData.change_amount) || 0) +
    (parseFloat(formData.official_daily_cash) || 0) +
    (parseFloat(formData.official_other_income) || 0) -
    (parseFloat(formData.official_cash_expenses) || 0) -
    (parseFloat(formData.official_employment_expenses) || 0);

  const otherTotal =
    (parseFloat(formData.other_difference) || 0) +
    (parseFloat(formData.other_extra_income) || 0) -
    (parseFloat(formData.other_expenses) || 0);

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
      {/* Change amount */}
      <Card title="Váltópénz">
        <Input
          label="Váltópénz összege"
          type="number"
          step="0.01"
          value={formData.change_amount}
          onChange={(e) => handleChange('change_amount', e.target.value)}
          suffix="Ft"
          helper="A kassza induló váltópénz állománya"
        />
      </Card>

      {/* Official pocket */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-600" />
            Pénztár zseb
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Napi készpénz forgalom"
            type="number"
            step="0.01"
            value={formData.official_daily_cash}
            onChange={(e) => handleChange('official_daily_cash', e.target.value)}
            suffix="Ft"
            helper="Pénztárgép szerinti készpénz forgalom"
          />
          <Input
            label="Egyéb hivatalos bevétel"
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

        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-green-700">
              Pénztár zseb összesen:
            </span>
            <span className="text-xl font-bold text-green-800">
              {formatCurrency(officialTotal)}
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

      {/* Grand total */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-700">
            Házipénztár teljes állomány:
          </span>
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(officialTotal + otherTotal)}
          </span>
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
