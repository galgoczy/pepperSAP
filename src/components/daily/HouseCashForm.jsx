import { useState, useEffect } from 'react';
import { Save, Wallet, Banknote, ArrowRight, TrendingUp, Calculator } from 'lucide-react';
import { useHouseCash } from '../../hooks/useDailyRevenue';
import { useActiveCashRegisters } from '../../hooks/useCashRegisterRevenue';
import { useAppSettings } from '../../hooks/useAppSettings';
import { Card, Button, Input, LoadingSpinner } from '../common';
import OpeningBalanceRevision from './OpeningBalanceRevision';
import { formatCurrency } from '../../lib/utils';

const DEFAULT_CHANGE_AMOUNT = 30000;

export default function HouseCashForm({ date, unitId, onSaveSuccess }) {
  const { houseCash, previousDayClosing, previousDayReserveClosing, calculatedData, loading, saveHouseCash } = useHouseCash(unitId, date);
  const { cashRegisters } = useActiveCashRegisters(unitId);
  const { settings } = useAppSettings();
  const showReserve = settings.showReserve;
  const [saving, setSaving] = useState(false);

  // Default change amount = sum of the unit's registers' configured defaults,
  // falling back to the constant when none are set.
  const registersChangeDefault = cashRegisters.reduce(
    (sum, r) => sum + (parseFloat(r.default_change_amount) || 0),
    0
  );
  const defaultChangeAmount = registersChangeDefault > 0 ? registersChangeDefault : DEFAULT_CHANGE_AMOUNT;
  const [formData, setFormData] = useState({
    change_amount: DEFAULT_CHANGE_AMOUNT,
    official_other_income: '',
    other_extra_income: '',
  });

  // Opening balance from previous day's closing
  const openingBalance = previousDayClosing || 0;
  // Reserve opening from previous day's reserve closing
  const reserveOpening = previousDayReserveClosing || 0;

  // Auto-calculated values from hook (with defaults to prevent NaN)
  const {
    officialExpenses: cashInvoiceExpenses = 0,   // Készpénzes (számlás) kifizetések
    nonOfficialExpenses: nonInvoiceExpenses = 0,  // Nem számlás kifizetések
    totalCashRegisterCash = 0,    // Napi forgalom (auto from cash registers)
    totalCashRegisterRevenue = 0, // Pénztárgép összes bevétel
    softwareRevenue = 0,          // Szoftver bevétel
    wageTypePayments = 0,         // Bér jellegű kifizetések hivatalos része (EFO + wage)
    wageTypeExtra = 0,            // Bér jellegű kifizetések nem hivatalos része
  } = calculatedData || {};

  // Software vs cash register difference (calculated)
  const softwareCashRegisterDiff = (softwareRevenue || 0) - (totalCashRegisterRevenue || 0);

  useEffect(() => {
    if (houseCash) {
      setFormData({
        change_amount: houseCash.change_amount ?? defaultChangeAmount,
        official_other_income: houseCash.official_other_income || '',
        other_extra_income: houseCash.other_extra_income || '',
      });
    } else {
      setFormData({
        change_amount: defaultChangeAmount,
        official_other_income: '',
        other_extra_income: '',
      });
    }
  }, [houseCash, date, defaultChangeAmount]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate daily movement (income - expenses) for Pénztár zseb
  // Income: napi forgalom (auto) + egyéb hivatalos bevétel
  const dailyIncome =
    totalCashRegisterCash +
    (parseFloat(formData.official_other_income) || 0);

  // Expenses: készpénzes számlák (auto) + bér jellegű kifizetések (auto)
  const dailyExpenses =
    cashInvoiceExpenses +
    wageTypePayments;

  const dailyMovement = dailyIncome - dailyExpenses;

  // Closing balance = Opening + Daily movement (váltópénz is NOT included in running balance)
  const closingBalance = openingBalance + dailyMovement;

  // Napi záró pénztár = nyitó + napi egyenleg
  const dailyClosingCash = openingBalance + dailyMovement;

  // Tartalék napi forgalom (daily reserve movement)
  // other_difference is now auto-calculated (softwareCashRegisterDiff)
  // other_expenses is now auto-calculated (nonInvoiceExpenses)
  // Also subtract the non-official (extra) part of EFO + wage payments.
  const reserveMovement =
    softwareCashRegisterDiff +
    (parseFloat(formData.other_extra_income) || 0) -
    nonInvoiceExpenses -
    wageTypeExtra;

  // Tartalék záró = tartalék nyitó + napi tartalék forgalom
  const reserveClosing = reserveOpening + reserveMovement;

  // For saving: official_total is the closing balance; other_total is the
  // reserve closing balance (so it becomes the next day's reserve opening).
  const officialTotal = closingBalance;
  const otherTotal = reserveClosing;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unitId) return;

    setSaving(true);
    try {
      await saveHouseCash({
        ...formData,
        // Store auto-calculated values too
        official_daily_cash: totalCashRegisterCash,
        official_cash_expenses: cashInvoiceExpenses,
        official_employment_expenses: wageTypePayments,
        other_difference: softwareCashRegisterDiff,
        other_expenses: nonInvoiceExpenses,
        official_total: officialTotal,
        other_total: otherTotal,
      });

      // Call onSaveSuccess callback if provided (for tab navigation)
      if (onSaveSuccess) {
        onSaveSuccess();
      }
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
        <OpeningBalanceRevision
          unitId={unitId}
          date={date}
          currentBalance={openingBalance}
          onRevisionApproved={() => window.location.reload()}
        />
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
          Alapértelmezett: {formatCurrency(defaultChangeAmount)}
          {registersChangeDefault > 0 && ' (pénztárgépek beállításaiból)'}
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
          {/* Auto-calculated: Napi forgalom */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Napi forgalom (+)</span>
            </div>
            <p className="text-xl font-bold text-green-800">{formatCurrency(totalCashRegisterCash)}</p>
            <p className="text-xs text-green-600 mt-1">Pénztárgépek készpénz forgalma (automatikus)</p>
          </div>

          <Input
            label="Egyéb hivatalos kp bevétel (+)"
            type="number"
            step="0.01"
            value={formData.official_other_income}
            onChange={(e) => handleChange('official_other_income', e.target.value)}
            suffix="Ft"
          />

          {/* Auto-calculated: Készpénzes számlák */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Készpénzes számlák (-)</span>
            </div>
            <p className="text-xl font-bold text-red-800">{formatCurrency(cashInvoiceExpenses)}</p>
            <p className="text-xs text-red-600 mt-1">Számlás kifizetésekből (automatikus)</p>
          </div>

          {/* Auto-calculated: Bér jellegű kifizetések */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Bér jellegű kifizetések (-)</span>
            </div>
            <p className="text-xl font-bold text-red-800">{formatCurrency(wageTypePayments)}</p>
            <p className="text-xs text-red-600 mt-1">EFO + heti bér kifizetésekből (automatikus)</p>
          </div>
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

        {/* Napi záró pénztár */}
        <div className="mt-4 p-4 bg-emerald-100 border border-emerald-300 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-semibold text-emerald-700">Napi záró pénztár</span>
              <p className="text-xs text-emerald-600">Nyitó + napi egyenleg</p>
            </div>
            <span className="text-xl font-bold text-emerald-800">
              {formatCurrency(dailyClosingCash)}
            </span>
          </div>
        </div>
      </Card>

      {/* Closing Balance - Running total (placed under Pénztár zseb, above Tartalék) */}
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

      {/* Other pocket (hidden when reserve display is disabled) */}
      {showReserve && (
      <Card
        title={
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-blue-600" />
            Tartalék
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {/* Auto-calculated: Szoftver vs pénztárgép különbség */}
          <div className={`p-3 border rounded-lg ${softwareCashRegisterDiff >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className={`text-sm font-medium ${softwareCashRegisterDiff >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                Szoftver vs pénztárgép különbség
              </span>
            </div>
            <p className={`text-xl font-bold ${softwareCashRegisterDiff >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
              {formatCurrency(softwareCashRegisterDiff)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Szoftver: {formatCurrency(softwareRevenue)} - Pénztárgép: {formatCurrency(totalCashRegisterRevenue)}
            </p>
          </div>

          <Input
            label="Egyéb extra bevétel"
            type="number"
            step="0.01"
            value={formData.other_extra_income}
            onChange={(e) => handleChange('other_extra_income', e.target.value)}
            suffix="Ft"
          />

          {/* Auto-calculated: Nem számlás kifizetések */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Nem számlás kifizetések (-)</span>
            </div>
            <p className="text-xl font-bold text-red-800">{formatCurrency(nonInvoiceExpenses)}</p>
            <p className="text-xs text-red-600 mt-1">Kifizetésekből (automatikus)</p>
          </div>

          {/* Auto-calculated: Bér jellegű kifizetések (nem hivatalos rész) */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Bér jellegű kifizetések, nem hivatalos (-)</span>
            </div>
            <p className="text-xl font-bold text-red-800">{formatCurrency(wageTypeExtra)}</p>
            <p className="text-xs text-red-600 mt-1">EFO + heti bér tartalék része (automatikus)</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-700">
              Tartalék összesen (napi forgalom):
            </span>
            <span className="text-xl font-bold text-blue-800">
              {formatCurrency(reserveMovement)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm border-t border-blue-200 pt-2">
            <span className="text-blue-600">Tartalék nyitó:</span>
            <span className="font-medium text-blue-700">{formatCurrency(reserveOpening)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-blue-600">Tartalék forgalom:</span>
            <span className="font-medium text-blue-700">
              {reserveMovement >= 0 ? '+' : ''}{formatCurrency(reserveMovement)}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-blue-200 pt-2">
            <span className="font-semibold text-blue-700">Tartalék záró:</span>
            <span className="text-lg font-bold text-blue-900">{formatCurrency(reserveClosing)}</span>
          </div>
          <OpeningBalanceRevision
            unitId={unitId}
            date={date}
            currentBalance={reserveOpening}
            pocket="reserve"
            onRevisionApproved={() => window.location.reload()}
          />
        </div>
      </Card>
      )}

      {/* Grand total with váltópénz */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Záró egyenleg:</span>
            <span>{formatCurrency(closingBalance)}</span>
          </div>
          {showReserve && (
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Tartalék:</span>
              <span>{formatCurrency(otherTotal)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Váltópénz (a kasszában):</span>
            <span>{formatCurrency(parseFloat(formData.change_amount) || 0)}</span>
          </div>
          <div className="border-t border-gray-300 pt-2 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-700">
              Kassza teljes készpénz:
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(closingBalance + (showReserve ? otherTotal : 0) + (parseFloat(formData.change_amount) || 0))}
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
