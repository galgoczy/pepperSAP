import { useState, useEffect } from 'react';
import { Calculator, CreditCard, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Input, Select } from '../common';
import { Textarea } from '../common/Input';
import { formatCurrency } from '../../lib/utils';
import { validateCardPayments, validateSzepPayments } from '../../lib/validations';

const DEFAULT_FORM_DATA = {
  vat_0_percent: '',
  vat_5_percent: '',
  vat_18_percent: '',
  vat_27_percent: '',
  tips: '',
  discrepancy_amount: '',
  discrepancy_currency: 'HUF',
  discrepancy_note: '',
  cash_payment: '',
  card_payment: '',
  szep_card_payment: '',
  terminal_card: '',
  terminal_szep: '',
  terminal_discrepancy_note: '',
};

export default function CashRegisterSection({
  register,
  existingData,
  onChange,
  expanded,
  onToggleExpand,
}) {
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  useEffect(() => {
    if (existingData) {
      setFormData({
        vat_0_percent: existingData.vat_0_percent || '',
        vat_5_percent: existingData.vat_5_percent || '',
        vat_18_percent: existingData.vat_18_percent || '',
        vat_27_percent: existingData.vat_27_percent || '',
        tips: existingData.tips || '',
        discrepancy_amount: existingData.discrepancy_amount || '',
        discrepancy_currency: existingData.discrepancy_currency || 'HUF',
        discrepancy_note: existingData.discrepancy_note || '',
        cash_payment: existingData.cash_payment || '',
        card_payment: existingData.card_payment || '',
        szep_card_payment: existingData.szep_card_payment || '',
        terminal_card: existingData.terminal_card || '',
        terminal_szep: existingData.terminal_szep || '',
        terminal_discrepancy_note: existingData.terminal_discrepancy_note || '',
      });
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
  }, [existingData]);

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange(register.id, newData);
  };

  // Calculate totals
  const cashRegisterTotal =
    (parseFloat(formData.vat_0_percent) || 0) +
    (parseFloat(formData.vat_5_percent) || 0) +
    (parseFloat(formData.vat_18_percent) || 0) +
    (parseFloat(formData.vat_27_percent) || 0) +
    (parseFloat(formData.tips) || 0);

  // Validate card payments
  const cardValidation = validateCardPayments(
    parseFloat(formData.card_payment) || 0,
    parseFloat(formData.terminal_card) || 0
  );

  const szepValidation = validateSzepPayments(
    parseFloat(formData.szep_card_payment) || 0,
    parseFloat(formData.terminal_szep) || 0
  );

  const hasDiscrepancy = !cardValidation.isValid || !szepValidation.isValid;

  return (
    <Card className="border-2 border-pepper-red border-opacity-30">
      {/* Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-4 -m-4 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pepper-red bg-opacity-10 rounded-lg">
            <Calculator className="h-5 w-5 text-pepper-red" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-gray-900">{register.ap_number}</span>
              {register.name && (
                <span className="text-gray-500">({register.name})</span>
              )}
            </div>
            {register.terminal_number && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <CreditCard className="h-3 w-3" />
                Terminál: {register.terminal_number}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasDiscrepancy && (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          <div className="text-right mr-2">
            <div className="text-sm text-gray-500">Forgalom</div>
            <div className="font-bold text-gray-900">
              {formatCurrency(cashRegisterTotal)}
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-6 space-y-6 border-t border-gray-200 pt-6">
          {/* VAT breakdown */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Pénztárgép forgalom ÁFA szerint
            </h4>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Input
                label="0% ÁFA"
                type="number"
                step="0.01"
                value={formData.vat_0_percent}
                onChange={(e) => handleChange('vat_0_percent', e.target.value)}
                suffix="Ft"
                size="sm"
              />
              <Input
                label="5% ÁFA"
                type="number"
                step="0.01"
                value={formData.vat_5_percent}
                onChange={(e) => handleChange('vat_5_percent', e.target.value)}
                suffix="Ft"
                size="sm"
              />
              <Input
                label="18% ÁFA"
                type="number"
                step="0.01"
                value={formData.vat_18_percent}
                onChange={(e) => handleChange('vat_18_percent', e.target.value)}
                suffix="Ft"
                size="sm"
              />
              <Input
                label="27% ÁFA"
                type="number"
                step="0.01"
                value={formData.vat_27_percent}
                onChange={(e) => handleChange('vat_27_percent', e.target.value)}
                suffix="Ft"
                size="sm"
              />
              <Input
                label="Borravaló"
                type="number"
                step="0.01"
                value={formData.tips}
                onChange={(e) => handleChange('tips', e.target.value)}
                suffix="Ft"
                size="sm"
              />
            </div>
            <div className="mt-3 p-2 bg-gray-50 rounded-lg flex justify-between items-center text-sm">
              <span className="text-gray-600">Összesen:</span>
              <span className="font-bold">{formatCurrency(cashRegisterTotal)}</span>
            </div>
          </div>

          {/* Discrepancy */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Elütés</h4>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label="Összeg"
                type="number"
                step="0.01"
                value={formData.discrepancy_amount}
                onChange={(e) => handleChange('discrepancy_amount', e.target.value)}
                size="sm"
              />
              <Select
                label="Deviza"
                value={formData.discrepancy_currency}
                onChange={(e) => handleChange('discrepancy_currency', e.target.value)}
                options={[
                  { value: 'HUF', label: 'HUF' },
                  { value: 'EUR', label: 'EUR' },
                ]}
                size="sm"
              />
              <div className="md:col-span-3">
                <Textarea
                  label="Indoklás"
                  value={formData.discrepancy_note}
                  onChange={(e) => handleChange('discrepancy_note', e.target.value)}
                  rows={2}
                  placeholder="Elütés indoklása..."
                />
              </div>
            </div>
          </div>

          {/* Payment methods */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Fizetési módok (Pénztárgép)
            </h4>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label="Készpénz"
                type="number"
                step="0.01"
                value={formData.cash_payment}
                onChange={(e) => handleChange('cash_payment', e.target.value)}
                suffix="Ft"
                size="sm"
              />
              <Input
                label="Bankkártya"
                type="number"
                step="0.01"
                value={formData.card_payment}
                onChange={(e) => handleChange('card_payment', e.target.value)}
                suffix="Ft"
                size="sm"
                error={
                  !cardValidation.isValid
                    ? `Eltérés: ${formatCurrency(cardValidation.difference)}`
                    : null
                }
              />
              <Input
                label="SZÉP kártya"
                type="number"
                step="0.01"
                value={formData.szep_card_payment}
                onChange={(e) => handleChange('szep_card_payment', e.target.value)}
                suffix="Ft"
                size="sm"
                error={
                  !szepValidation.isValid
                    ? `Eltérés: ${formatCurrency(szepValidation.difference)}`
                    : null
                }
              />
            </div>
          </div>

          {/* Terminal data */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Bankkártya terminál forgalom
              {register.terminal_number && (
                <span className="text-gray-400 font-normal ml-2">
                  ({register.terminal_number})
                </span>
              )}
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Bankkártya (terminál)"
                type="number"
                step="0.01"
                value={formData.terminal_card}
                onChange={(e) => handleChange('terminal_card', e.target.value)}
                suffix="Ft"
                size="sm"
                className={!cardValidation.isValid ? 'ring-2 ring-red-300' : ''}
              />
              <Input
                label="SZÉP kártya (terminál)"
                type="number"
                step="0.01"
                value={formData.terminal_szep}
                onChange={(e) => handleChange('terminal_szep', e.target.value)}
                suffix="Ft"
                size="sm"
                className={!szepValidation.isValid ? 'ring-2 ring-red-300' : ''}
              />
            </div>

            {/* Discrepancy warning */}
            {hasDiscrepancy && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-medium text-red-800">Eltérés!</h4>
                    <ul className="text-red-700 mt-1 space-y-0.5">
                      {!cardValidation.isValid && (
                        <li>Bankkártya: {formatCurrency(cardValidation.difference)}</li>
                      )}
                      {!szepValidation.isValid && (
                        <li>SZÉP kártya: {formatCurrency(szepValidation.difference)}</li>
                      )}
                    </ul>
                  </div>
                </div>

                <Textarea
                  label="Eltérés indoklása"
                  value={formData.terminal_discrepancy_note}
                  onChange={(e) => handleChange('terminal_discrepancy_note', e.target.value)}
                  rows={2}
                  placeholder="Kérjük, indokolja az eltérést..."
                  className="mt-2"
                  required={hasDiscrepancy}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
