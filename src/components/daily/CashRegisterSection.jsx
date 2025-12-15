import { useState, useEffect } from 'react';
import { Calculator, CreditCard, AlertTriangle, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { Card, Input, Select, Button } from '../common';
import { Textarea } from '../common/Input';
import { formatCurrency, formatDate } from '../../lib/utils';
import { validateCardPayments } from '../../lib/validations';
import { jsPDF } from 'jspdf';

// Feature flag: set to true to show SZÉP card fields
const SHOW_SZEP_FIELDS = false;

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

// Helper to sanitize Hungarian characters for PDF
function sanitizeForPdf(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/ő/g, 'ö')
    .replace(/Ő/g, 'Ö')
    .replace(/ű/g, 'ü')
    .replace(/Ű/g, 'Ü');
}

export default function CashRegisterSection({
  register,
  existingData,
  onChange,
  expanded,
  onToggleExpand,
  unitName,
  date,
}) {
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  // Generate discrepancy protocol PDF
  const generateDiscrepancyProtocol = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFillColor(211, 47, 47);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('Elütés Jegyzőkönyv'), pageWidth / 2, 16, { align: 'center' });

    // Unit name and date
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf(unitName || 'Egység'), 20, 40);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeForPdf(`Dátum: ${formatDate(date)}`), 20, 50);
    doc.text(sanitizeForPdf(`Pénztárgép: ${register.ap_number}${register.name ? ` (${register.name})` : ''}`), 20, 58);

    // Discrepancy details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('Elütés adatai'), 20, 75);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const amount = parseFloat(formData.discrepancy_amount) || 0;
    const currency = formData.discrepancy_currency || 'HUF';
    doc.text(sanitizeForPdf(`Összeg: ${formatCurrency(amount)} ${currency}`), 20, 85);

    // Reason section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('Indoklás:'), 20, 100);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const reasonText = formData.discrepancy_note || 'Nincs megadva';
    const reasonLines = doc.splitTextToSize(sanitizeForPdf(reasonText), pageWidth - 40);
    doc.text(reasonLines, 20, 110);

    // Signature section at bottom
    const signatureY = 220;
    doc.setDrawColor(0, 0, 0);

    // Leader signature
    doc.text(sanitizeForPdf('Vezető neve:'), 20, signatureY);
    doc.line(20, signatureY + 15, 90, signatureY + 15);

    doc.text(sanitizeForPdf('Aláírás:'), 20, signatureY + 30);
    doc.line(20, signatureY + 45, 90, signatureY + 45);

    // Date field
    doc.text(sanitizeForPdf('Kelt:'), 120, signatureY);
    doc.line(120, signatureY + 15, 190, signatureY + 15);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      sanitizeForPdf(`Generálva: ${new Date().toLocaleString('hu-HU')}`),
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );

    // Save
    const filename = `elutes_jegyzokonyv_${register.ap_number}_${date}.pdf`;
    doc.save(filename);
  };

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

  const hasDiscrepancy = !cardValidation.isValid;

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
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Elütés</h4>
              {(parseFloat(formData.discrepancy_amount) || 0) !== 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateDiscrepancyProtocol}
                  title="Jegyzőkönyv nyomtatása"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              )}
            </div>
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
                  rows={3}
                  placeholder="Elütés indoklása tételenként leírva..."
                />
              </div>
            </div>
          </div>

          {/* Payment methods */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Fizetési módok (Pénztárgép)
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
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
              {/* SZÉP card - hidden for now */}
              {SHOW_SZEP_FIELDS && (
                <Input
                  label="SZÉP kártya"
                  type="number"
                  step="0.01"
                  value={formData.szep_card_payment}
                  onChange={(e) => handleChange('szep_card_payment', e.target.value)}
                  suffix="Ft"
                  size="sm"
                />
              )}
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
            <div className={`grid gap-3 ${SHOW_SZEP_FIELDS ? 'md:grid-cols-2' : ''}`}>
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
              {/* SZÉP terminal - hidden for now */}
              {SHOW_SZEP_FIELDS && (
                <Input
                  label="SZÉP kártya (terminál)"
                  type="number"
                  step="0.01"
                  value={formData.terminal_szep}
                  onChange={(e) => handleChange('terminal_szep', e.target.value)}
                  suffix="Ft"
                  size="sm"
                />
              )}
            </div>

            {/* Discrepancy warning */}
            {hasDiscrepancy && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-medium text-red-800">Eltérés!</h4>
                    <p className="text-red-700 mt-1">
                      Bankkártya: {formatCurrency(cardValidation.difference)}
                    </p>
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
