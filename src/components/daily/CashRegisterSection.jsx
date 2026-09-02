import { useState, useEffect, useRef } from 'react';
import { Calculator, CreditCard, AlertTriangle, ChevronDown, ChevronUp, Printer, Plus, Trash2, Save } from 'lucide-react';
import { Card, Input, Select, Button } from '../common';
import { Textarea } from '../common/Input';
import { formatCurrency, formatDate, TERMINAL_TIP_WITHDRAW_RATE } from '../../lib/utils';
import { validateCardPayments, validatePaymentBreakdown, hasDocumentedDiscrepancy } from '../../lib/validations';
import {
  DISCREPANCY_KINDS,
  PAYMENT_METHOD_LABELS,
  discrepancyKind,
  isMethodDiscrepancy,
  amountDiscrepancyHuf,
  methodAdjustments,
  describeDiscrepancy,
} from '../../lib/discrepancies';
import { jsPDF } from 'jspdf';

// Feature flag: set to true to show SZÉP card fields
const SHOW_SZEP_FIELDS = false;

// kind: 'amount' (téves összeg / homály – a forgalom változik) or 'method'
// (rossz fizetési mód – a forgalom nem változik, csak a jogcím). For 'method',
// `keyed` is what it was wrongly keyed as and `actual` what really happened.
const DEFAULT_DISCREPANCY = {
  amount: '',
  currency: 'HUF',
  note: '',
  // New entries default to "rossz fizetési mód" (the more common case).
  // Entries saved without a kind stay "téves összeg" (see discrepancies.js).
  kind: DISCREPANCY_KINDS.METHOD,
  keyed: 'card',
  actual: 'cash',
};

// Payment methods offered in the "rossz fizetési mód" selector.
const METHOD_OPTIONS = [
  { value: 'cash', label: PAYMENT_METHOD_LABELS.cash },
  { value: 'card', label: PAYMENT_METHOD_LABELS.card },
  { value: 'szep', label: PAYMENT_METHOD_LABELS.szep },
];

const DEFAULT_FORM_DATA = {
  software_revenue: '',
  guest_count: '',
  closure_sequence: '',
  vat_0_percent: '',
  vat_5_percent: '',
  vat_18_percent: '',
  vat_27_percent: '',
  tips: '',
  cumulative_revenue: '',
  discrepancies: [], // Array of {amount, currency, note}
  cash_payment: '',
  card_payment: '',
  szep_card_payment: '',
  terminal_card: '',
  terminal_card_total: '',
  terminal_card_tip: '',
  terminal_tip_withdrawn: false,
  terminal_szep: '',
  terminal_discrepancy_note: '',
};

// Helper to compute initial form data from existingData
function computeFormData(existingData) {
  if (!existingData) return DEFAULT_FORM_DATA;

  let discrepancies = existingData.discrepancies || [];
  if ((!discrepancies || discrepancies.length === 0) && existingData.discrepancy_amount) {
    discrepancies = [{
      amount: existingData.discrepancy_amount || '',
      currency: existingData.discrepancy_currency || 'HUF',
      note: existingData.discrepancy_note || '',
    }];
  }

  return {
    software_revenue: existingData.software_revenue || '',
    guest_count: existingData.guest_count ?? '',
    closure_sequence: existingData.closure_sequence ?? '',
    cumulative_revenue: existingData.cumulative_revenue ?? '',
    vat_0_percent: existingData.vat_0_percent || '',
    vat_5_percent: existingData.vat_5_percent || '',
    vat_18_percent: existingData.vat_18_percent || '',
    vat_27_percent: existingData.vat_27_percent || '',
    tips: existingData.tips || '',
    discrepancies: discrepancies,
    cash_payment: existingData.cash_payment || '',
    card_payment: existingData.card_payment || '',
    szep_card_payment: existingData.szep_card_payment || '',
    terminal_card: existingData.terminal_card || '',
    // Backward compatible: older rows only have terminal_card (already the
    // "borravaló nélkül" value) — treat it as the total with no tip.
    terminal_card_total:
      existingData.terminal_card_total ?? existingData.terminal_card ?? '',
    terminal_card_tip: existingData.terminal_card_tip ?? '',
    terminal_tip_withdrawn: existingData.terminal_tip_withdrawn ?? false,
    terminal_szep: existingData.terminal_szep || '',
    terminal_discrepancy_note: existingData.terminal_discrepancy_note || '',
  };
}

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
  closureLabel = null,
  onRemove = null,
  validation = null,
  onSave = null,
  saving = false,
}) {
  const [formData, setFormData] = useState(() => computeFormData(existingData));
  const prevExistingDataRef = useRef(existingData);

  // Sync formData when existingData changes - this is a controlled form syncing from props
  useEffect(() => {
    // Only update if existingData identity changed
    if (prevExistingDataRef.current !== existingData) {
      prevExistingDataRef.current = existingData;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(computeFormData(existingData));
    }
  }, [existingData]);

  // "Téves összeg" elütés total (HUF only) — what inflates the turnover. The
  // "rossz fizetési mód" entries are summarised separately as per-method
  // corrections (real = register + adjustment).
  const totalHufDiscrepancy = amountDiscrepancyHuf(formData.discrepancies || []);
  const methodAdj = methodAdjustments(formData.discrepancies || []);

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

    // Discrepancy details - now multiple
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPdf('Elütések'), 20, 75);

    let yPos = 85;
    doc.setFontSize(11);

    (formData.discrepancies || []).forEach((disc, index) => {
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf(`${index + 1}. elütés:`), 20, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      const amount = parseFloat(disc.amount) || 0;
      doc.text(sanitizeForPdf(`Típus: ${describeDiscrepancy(disc)}`), 25, yPos);
      yPos += 6;
      doc.text(sanitizeForPdf(`Összeg: ${formatCurrency(amount)} ${disc.currency}`), 25, yPos);
      yPos += 6;
      if (disc.note) {
        const noteLines = doc.splitTextToSize(sanitizeForPdf(`Indoklás: ${disc.note}`), pageWidth - 50);
        doc.text(noteLines, 25, yPos);
        yPos += noteLines.length * 5 + 5;
      }
      yPos += 3;
    });

    // Total
    if (formData.discrepancies?.length > 1) {
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPdf(`Téves összeg összesen (HUF): ${formatCurrency(totalHufDiscrepancy)}`), 20, yPos);
    }

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

  // Save the daily data AND download the discrepancy protocol PDF. Both the
  // "Mentés" button and the printer button do the same thing (intentionally
  // duplicated — different people reach for different buttons).
  const saveWithProtocol = async () => {
    generateDiscrepancyProtocol();
    if (onSave) await onSave();
  };

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange(newData);
  };

  // Terminal card: the user enters the full terminal amount and the card tip; we
  // store the "borravaló nélkül" value (total - tip) in terminal_card, which
  // every existing calculation and report keeps using unchanged.
  const handleTerminalChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    const totalStr = field === 'terminal_card_total' ? value : newData.terminal_card_total;
    const tipStr = field === 'terminal_card_tip' ? value : newData.terminal_card_tip;
    const bothEmpty = (totalStr === '' || totalStr == null) && (tipStr === '' || tipStr == null);
    newData.terminal_card = bothEmpty ? '' : (parseFloat(totalStr) || 0) - (parseFloat(tipStr) || 0);
    setFormData(newData);
    onChange(newData);
  };

  // Discrepancy management functions
  const addDiscrepancy = (preset = {}) => {
    const newDiscrepancies = [...(formData.discrepancies || []), { ...DEFAULT_DISCREPANCY, ...preset }];
    handleChange('discrepancies', newDiscrepancies);
  };

  const removeDiscrepancy = (index) => {
    const newDiscrepancies = formData.discrepancies.filter((_, i) => i !== index);
    handleChange('discrepancies', newDiscrepancies);
  };

  const updateDiscrepancy = (index, field, value) => {
    const newDiscrepancies = formData.discrepancies.map((d, i) =>
      i === index ? { ...d, [field]: value } : d
    );
    handleChange('discrepancies', newDiscrepancies);
  };

  // Calculate totals. NOTE: tips (borravaló) are intentionally NOT part of the
  // register turnover — they are recorded separately and summed into the
  // "Egyéb készpénz bevétel" tip field on the revenue form.
  const cashRegisterTotal =
    (parseFloat(formData.vat_0_percent) || 0) +
    (parseFloat(formData.vat_5_percent) || 0) +
    (parseFloat(formData.vat_18_percent) || 0) +
    (parseFloat(formData.vat_27_percent) || 0);

  // Validate card payments
  // The terminal is the true card figure. A recorded "rossz fizetési mód"
  // elütés that moves exactly the difference on/off the card explains it.
  const cardValidation = validateCardPayments(
    parseFloat(formData.card_payment) || 0,
    parseFloat(formData.terminal_card) || 0,
    methodAdj.card
  );

  const hasDiscrepancy = !cardValidation.isValid;

  // Prefill for the one-click "rossz fizetési mód" elütés from the terminal
  // difference: register card above the terminal means card was keyed instead
  // of cash, below means the other way round.
  const terminalDiffPreset = () => ({
    kind: DISCREPANCY_KINDS.METHOD,
    currency: 'HUF',
    amount: String(Math.round(cardValidation.difference)),
    keyed: cardValidation.signedDifference > 0 ? 'card' : 'cash',
    actual: cardValidation.signedDifference > 0 ? 'cash' : 'card',
  });

  // Turnover vs payment methods: the VAT buckets have to add up to
  // készpénz + bankkártya + SZÉP. A gap should be explained with an elütés, but
  // it never stands in the way of saving the day.
  const paymentBreakdown = validatePaymentBreakdown({
    vatTotal: cashRegisterTotal,
    cash: parseFloat(formData.cash_payment) || 0,
    card: parseFloat(formData.card_payment) || 0,
    szep: parseFloat(formData.szep_card_payment) || 0,
    // A recorded forint elütés explains a gap of the same size.
    hufDiscrepancy: totalHufDiscrepancy,
  });
  const paymentGap = paymentBreakdown.applicable && !paymentBreakdown.isValid;
  const paymentGapDocumented = hasDocumentedDiscrepancy(formData.discrepancies);
  const paymentGapUndocumented = paymentGap && !paymentGapDocumented;

  // Whether this closure has any kind of discrepancy (terminal/card mismatch, a
  // payment breakdown gap or a recorded elütés) — used to flag a collapsed
  // register box in the background.
  const hasAnyDiscrepancy = hasDiscrepancy || paymentGap || (formData.discrepancies || []).length > 0;

  // Terminal card breakdown (display + reserve tip cost)
  const terminalCardTip = parseFloat(formData.terminal_card_tip) || 0;
  const terminalCardNet = parseFloat(formData.terminal_card) || 0;
  const tipWithdrawnAmount = formData.terminal_tip_withdrawn
    ? terminalCardTip * TERMINAL_TIP_WITHDRAW_RATE
    : 0;

  return (
    <Card className="border-2 border-pepper-red border-opacity-30">
      {/* Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className={`w-full flex items-center justify-between p-4 -m-4 rounded-lg transition-colors ${
          !expanded && hasAnyDiscrepancy ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
        }`}
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
              {closureLabel && (
                <span className="px-2 py-0.5 text-xs font-medium bg-pepper-red bg-opacity-10 text-pepper-red rounded-full">
                  {closureLabel}
                </span>
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
          {/* Software revenue for this register */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Szoftver forgalom (opcionális)
            </h4>
            <Input
              label="Éttermi szoftver forgalom ezen a pénztárgépen"
              type="number"
              step="0.01"
              value={formData.software_revenue}
              onChange={(e) => handleChange('software_revenue', e.target.value)}
              suffix="Ft"
              placeholder="Ha kitöltöd, a teljes forgalom automatikusan összegződik"
            />
            <div className="mt-3">
              <Input
                label="Napi fogyasztói létszám"
                type="number"
                step="1"
                min="0"
                value={formData.guest_count}
                onChange={(e) => handleChange('guest_count', e.target.value)}
                suffix="fő"
              />
            </div>
            <div className="mt-3">
              <Input
                label="Zárás sorszáma"
                type="number"
                step="1"
                min="0"
                value={formData.closure_sequence}
                onChange={(e) => handleChange('closure_sequence', e.target.value)}
                error={
                  validation?.sequenceWarning != null
                    ? `Az előző záráshoz képest ${validation.expectedSequence} lenne a sorszám (n+1). Ellenőrizd!`
                    : null
                }
              />
            </div>
          </div>

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
            <div className="mt-3">
              <Input
                label="Göngyölt forgalom (pénztárgép zárás alján)"
                type="number"
                step="0.01"
                value={formData.cumulative_revenue}
                onChange={(e) => handleChange('cumulative_revenue', e.target.value)}
                suffix="Ft"
                helper="A Z-jelentés göngyölt forgalma (előző göngyölt + ezen zárás forgalma)"
                error={
                  validation?.cumulativeWarning != null
                    ? `Az előző göngyölt + forgalom alapján ${formatCurrency(validation.expectedCumulative)} lenne. Valószínűleg elütés!`
                    : null
                }
              />
            </div>
          </div>

          {/* Discrepancies - Multiple entries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">
                Elütések
                {totalHufDiscrepancy > 0 && (
                  <span className="ml-2 text-red-600 font-normal">
                    (Téves összeg össz.: {formatCurrency(totalHufDiscrepancy)})
                  </span>
                )}
              </h4>
              <div className="flex gap-2">
                {(formData.discrepancies || []).length > 0 && onSave && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveWithProtocol}
                    loading={saving}
                    title="Mentés és jegyzőkönyv letöltése"
                  >
                    <Save className="h-4 w-4" />
                    Mentés + jegyzőkönyv
                  </Button>
                )}
                {(formData.discrepancies || []).length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={saveWithProtocol}
                    title="Mentés és jegyzőkönyv nyomtatása"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addDiscrepancy()}
                >
                  <Plus className="h-4 w-4" />
                  Új elütés
                </Button>
              </div>
            </div>

            {(formData.discrepancies || []).length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nincs rögzített elütés</p>
            ) : (
              <div className="space-y-4">
                {formData.discrepancies.map((disc, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-red-700">{index + 1}. elütés</span>
                      <button
                        type="button"
                        onClick={() => removeDiscrepancy(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Törlés"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Kind: the two cases are handled differently downstream,
                        so the choice is spelled out, not hidden in a dropdown. */}
                    {disc.currency === 'EUR' ? (
                      <p className="mb-3 text-xs text-red-700">
                        EUR elütés mindig <span className="font-semibold">téves összeg</span> (a forgalom változik).
                      </p>
                    ) : (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-red-700 mb-1">Az elütés fajtája</div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {[
                            {
                              value: DISCREPANCY_KINDS.AMOUNT,
                              title: 'Téves összeg (túlütés)',
                              text: 'Rossz összeg került a gépbe. A forgalom változik, a kasszából ennyi hiányzik.',
                            },
                            {
                              value: DISCREPANCY_KINDS.METHOD,
                              title: 'Rossz fizetési mód',
                              text: 'Jó összeg, rossz gombbal ütve (pl. kártya KP helyett). A forgalom nem változik, a terminál a mérvadó.',
                            },
                          ].map((opt) => {
                            const active = discrepancyKind(disc) === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateDiscrepancy(index, 'kind', opt.value)}
                                className={`text-left rounded-lg border p-2 transition-colors ${
                                  active
                                    ? 'border-pepper-red bg-white ring-2 ring-pepper-red ring-opacity-40'
                                    : 'border-red-200 bg-red-50 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                  <span
                                    className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${
                                      active ? 'border-pepper-red bg-pepper-red' : 'border-gray-400 bg-white'
                                    }`}
                                  />
                                  {opt.title}
                                </div>
                                <p className="mt-1 text-xs text-gray-600">{opt.text}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input
                        label="Összeg"
                        type="number"
                        step="0.01"
                        value={disc.amount}
                        onChange={(e) => updateDiscrepancy(index, 'amount', e.target.value)}
                        size="sm"
                      />
                      <Select
                        label="Deviza"
                        value={disc.currency}
                        onChange={(e) => updateDiscrepancy(index, 'currency', e.target.value)}
                        options={[
                          { value: 'HUF', label: 'HUF' },
                          { value: 'EUR', label: 'EUR' },
                        ]}
                        size="sm"
                      />
                      {isMethodDiscrepancy(disc) && (
                        <>
                          <Select
                            label="Tévesen erre ütve"
                            value={disc.keyed || 'card'}
                            onChange={(e) => updateDiscrepancy(index, 'keyed', e.target.value)}
                            options={METHOD_OPTIONS.filter((o) => SHOW_SZEP_FIELDS || o.value !== 'szep')}
                            size="sm"
                          />
                          <Select
                            label="Valójában erre kellett volna"
                            value={disc.actual || 'cash'}
                            onChange={(e) => updateDiscrepancy(index, 'actual', e.target.value)}
                            options={METHOD_OPTIONS.filter((o) => SHOW_SZEP_FIELDS || o.value !== 'szep')}
                            size="sm"
                          />
                          <p className="md:col-span-3 text-xs text-red-700">
                            {(disc.keyed || 'card') === (disc.actual || 'cash')
                              ? 'A két fizetési mód nem lehet ugyanaz.'
                              : `${PAYMENT_METHOD_LABELS[disc.keyed || 'card']} helyett ${PAYMENT_METHOD_LABELS[disc.actual || 'cash']} – ` +
                                'a forgalom marad, a kassza ' +
                                ((disc.actual || 'cash') === 'cash'
                                  ? `+${formatCurrency(Math.abs(parseFloat(disc.amount) || 0))}`
                                  : (disc.keyed || 'card') === 'cash'
                                    ? `−${formatCurrency(Math.abs(parseFloat(disc.amount) || 0))}`
                                    : 'nem változik') +
                                '.'}
                          </p>
                        </>
                      )}
                      <div className="md:col-span-3">
                        <Textarea
                          label="Indoklás"
                          value={disc.note}
                          onChange={(e) => updateDiscrepancy(index, 'note', e.target.value)}
                          rows={2}
                          placeholder="Elütés indoklása..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    ? `Eltérés a terminálhoz képest: ${formatCurrency(cardValidation.difference)}`
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

            {/* Turnover vs payment methods */}
            {paymentGap && (
              <div
                className={`mt-3 rounded-lg border p-3 text-sm ${
                  paymentGapUndocumented
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : 'border-green-300 bg-green-50 text-green-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">
                      A fizetési módok nem adják ki a forgalmat: eltérés{' '}
                      {formatCurrency(paymentBreakdown.difference)}
                    </p>
                    <p className="mt-1 text-xs">
                      Forgalom (ÁFA-kulcsok, borravaló nélkül){' '}
                      {formatCurrency(cashRegisterTotal)} · Fizetve (KP + kártya
                      {SHOW_SZEP_FIELDS ? ' + SZÉP' : ''}) {formatCurrency(paymentBreakdown.paid)}
                    </p>
                    <p className="mt-1 text-xs font-medium">
                      {paymentGapUndocumented
                        ? 'Rögzíts róla egy elütést indoklással. (A mentést ez nem akadályozza.)'
                        : 'Elütés rögzítve.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
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
                label="Bankkártya terminál (teljes összeg)"
                type="number"
                step="0.01"
                value={formData.terminal_card_total}
                onChange={(e) => handleTerminalChange('terminal_card_total', e.target.value)}
                suffix="Ft"
                size="sm"
                className={!cardValidation.isValid ? 'ring-2 ring-red-300' : ''}
              />
              <Input
                label="Borravaló (bankkártya)"
                type="number"
                step="0.01"
                value={formData.terminal_card_tip}
                onChange={(e) => handleTerminalChange('terminal_card_tip', e.target.value)}
                suffix="Ft"
                size="sm"
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

            {/* Card tip: optionally taken out of the register (60% booked as a
                reserve cost at day end). */}
            <label className="mt-3 flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.terminal_tip_withdrawn}
                onChange={(e) => handleChange('terminal_tip_withdrawn', e.target.checked)}
                className="h-4 w-4 mt-0.5 text-pepper-red rounded border-gray-300 focus:ring-pepper-red"
              />
              <span className="text-sm text-gray-700">
                Kivettük a kasszából
                <span className="text-gray-500"> (a bankkártyás borravaló 60%-a tartalék költség)</span>
              </span>
            </label>
            {formData.terminal_tip_withdrawn && terminalCardTip > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Kivett összeg (60%): <span className="font-medium">{formatCurrency(tipWithdrawnAmount)}</span> — a nap
                végén tartalék költségként számoljuk.
              </p>
            )}

            {/* Computed: terminal amount without the tip — used in every
                calculation, exactly as the single field was before. */}
            <div className="mt-3 p-2 bg-gray-50 rounded-lg flex justify-between items-center text-sm">
              <span className="text-gray-600">Bankkártya terminál (borravaló nélkül):</span>
              <span className="font-bold">{formatCurrency(terminalCardNet)}</span>
            </div>

            {/* Card vs terminal difference. The terminal is the true figure; no
                free-text reason is asked any more — a "rossz fizetési mód"
                elütés is offered instead (never required, never blocks saving). */}
            {hasDiscrepancy && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <div className="text-sm flex-1">
                    <h4 className="font-medium text-red-800">
                      Eltérés a terminálhoz képest: {formatCurrency(cardValidation.difference)}
                    </h4>
                    <p className="text-red-700 mt-1 text-xs">
                      Pénztárgép bankkártya {formatCurrency(parseFloat(formData.card_payment) || 0)} ·
                      terminál (borravaló nélkül) {formatCurrency(terminalCardNet)}. A terminál a mérvadó.
                      {cardValidation.signedDifference > 0
                        ? ' Valószínűleg készpénzt ütöttek bankkártyára.'
                        : ' Valószínűleg bankkártyát ütöttek készpénzre.'}
                    </p>
                    <p className="text-red-700 mt-1 text-xs">
                      Ha rossz fizetési módra ütöttek, vegyél fel róla elütést – nem kötelező, a mentést nem
                      akadályozza.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => addDiscrepancy(terminalDiffPreset())}
                    >
                      <Plus className="h-4 w-4" />
                      Elütés felvétele: rossz fizetési mód ({formatCurrency(cardValidation.difference)})
                    </Button>
                  </div>
                </div>
                {formData.terminal_discrepancy_note && (
                  <p className="mt-2 text-xs text-gray-600">
                    Korábbi indoklás: {formData.terminal_discrepancy_note}
                  </p>
                )}
              </div>
            )}
            {!hasDiscrepancy && cardValidation.explainedByDiscrepancy && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                Eltérés a terminálhoz képest {formatCurrency(cardValidation.difference)} – a rögzített
                „rossz fizetési mód” elütés kiadja.
              </div>
            )}
          </div>

          {/* Remove this (additional) closure */}
          {onRemove && (
            <div className="pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemove}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Zárás törlése
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
