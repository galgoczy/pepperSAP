// Everything the registers are checked against tolerates rounding only: a cash
// elütés can leave a few forints behind, anything above that is a real gap.
export const REGISTER_TOLERANCE = 5; // Ft

// A closure row that carries no information at all. The daily form saves
// closure #1 for EVERY register of the unit on every save, so a day that was
// opened and saved (e.g. the wrong date, then cleared, or a day with only the
// non-register fields filled) leaves behind an all-empty cash_register_revenue
// row. Those rows are pure noise in the reports. A genuine zero Z-closure is
// NOT blank: it has its closure_sequence (and usually cumulative) recorded.
const num = (v) => (v == null || v === '' ? 0 : Number(v) || 0);
const has = (v) => v != null && String(v).trim() !== '';
export const isBlankClosure = (cr) => {
  if (!cr) return true;
  if (has(cr.closure_sequence) || has(cr.cumulative_revenue)) return false;
  const amounts = [
    cr.vat_0_percent, cr.vat_5_percent, cr.vat_18_percent, cr.vat_27_percent,
    cr.tips, cr.cash_payment, cr.card_payment, cr.szep_card_payment,
    cr.terminal_card, cr.terminal_card_total, cr.terminal_szep,
    cr.software_revenue, cr.guest_count, cr.discrepancy_amount,
  ];
  if (amounts.some((v) => num(v) !== 0)) return false;
  if (has(cr.terminal_discrepancy_note) || has(cr.discrepancy_note)) return false;
  if (Array.isArray(cr.discrepancies) && cr.discrepancies.some((d) => num(d?.amount) !== 0 || has(d?.note))) {
    return false;
  }
  return true;
};

// Validate card payment discrepancy
export const validateCardPayments = (cashRegisterCard, terminalCard) => {
  const difference = Math.abs((cashRegisterCard || 0) - (terminalCard || 0));

  return {
    isValid: difference <= REGISTER_TOLERANCE,
    difference: difference,
    needsExplanation: difference > REGISTER_TOLERANCE,
  };
};

// Validate SZEP card payment discrepancy
export const validateSzepPayments = (cashRegisterSzep, terminalSzep) => {
  const difference = Math.abs((cashRegisterSzep || 0) - (terminalSzep || 0));

  return {
    isValid: difference <= REGISTER_TOLERANCE,
    difference: difference,
    needsExplanation: difference > REGISTER_TOLERANCE,
  };
};

// The closure's turnover (the VAT buckets; borravaló is NOT part of it) has to
// equal what the payment methods add up to (készpénz + bankkártya + SZÉP).
// A gap means something was mis-keyed, so it must be documented with an elütés
// before the day can be saved.
//
// A recorded forint elütés (jegyzőkönyv) explains the gap: the mis-keyed amount
// sits in the register's turnover but not in the money that actually came in,
// so a gap that equals the elütés total is in order.
export const validatePaymentBreakdown = ({ vatTotal, cash, card, szep, hufDiscrepancy = 0 }) => {
  const paid = (cash || 0) + (card || 0) + (szep || 0);
  const difference = (vatTotal || 0) - paid;
  const elutes = Math.abs(hufDiscrepancy || 0);
  const rawOk = Math.abs(difference) <= REGISTER_TOLERANCE;
  // Sign-agnostic: the elütés amount is recorded as a positive figure whichever
  // side it inflated.
  const explainedByDiscrepancy =
    !rawOk && elutes > 0 && Math.abs(Math.abs(difference) - elutes) <= REGISTER_TOLERANCE;

  return {
    paid,
    difference,
    hufDiscrepancy: elutes,
    explainedByDiscrepancy,
    // Only checked once BOTH sides carry a value. A closure that is still being
    // filled in (turnover typed, payment methods not yet) must stay saveable —
    // losing a half-entered day would be worse than a late warning.
    applicable: (vatTotal || 0) > 0 && paid > 0,
    isValid: rawOk || explainedByDiscrepancy,
  };
};

// Total forint elütés recorded on a closure (discrepancies[] or the legacy
// single discrepancy_amount). EUR entries are not part of it.
export const hufDiscrepancyOf = (cr) => {
  if (!cr) return 0;
  if (Array.isArray(cr.discrepancies) && cr.discrepancies.length > 0) {
    return cr.discrepancies.reduce(
      (sum, d) => sum + ((d?.currency || 'HUF') === 'HUF' ? (parseFloat(d?.amount) || 0) : 0),
      0
    );
  }
  if ((cr.discrepancy_currency || 'HUF') === 'HUF') return parseFloat(cr.discrepancy_amount) || 0;
  return 0;
};

// A payment-breakdown gap counts as documented once an elütés was recorded with
// a reason on that closure — that is what the jegyzőkönyv is printed from.
// Accepts either the discrepancies array or the whole closure, so that legacy
// rows (single elütés kept in discrepancy_note) still count as documented.
export const hasDocumentedDiscrepancy = (closureOrList) => {
  const list = Array.isArray(closureOrList) ? closureOrList : closureOrList?.discrepancies;
  if (Array.isArray(list) && list.some((d) => (d?.note || '').trim().length > 0)) return true;
  if (Array.isArray(closureOrList)) return false;
  return (closureOrList?.discrepancy_note || '').trim().length > 0;
};

// Validate amount (must be non-negative number)
export const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0;
};

// Validate positive amount
export const validatePositiveAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

// Validate date (not in the future)
export const validateDate = (date) => {
  if (!date) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const inputDate = new Date(date);
  return inputDate <= today;
};

// Validate date range
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return new Date(startDate) <= new Date(endDate);
};

// Validate invoice number format (optional, basic format)
export const validateInvoiceNumber = (invoiceNumber) => {
  if (!invoiceNumber) return true; // Optional field
  return invoiceNumber.trim().length > 0;
};

// Validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate required field
export const validateRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

// Calculate cash register total from VAT breakdown
export const calculateCashRegisterTotal = (vat0, vat5, vat18, vat27, tips) => {
  return (
    (parseFloat(vat0) || 0) +
    (parseFloat(vat5) || 0) +
    (parseFloat(vat18) || 0) +
    (parseFloat(vat27) || 0) +
    (parseFloat(tips) || 0)
  );
};

// Validate that cash register total matches total revenue (with tolerance)
export const validateRevenueTotals = (totalRevenue, cashRegisterTotal) => {
  const difference = Math.abs((totalRevenue || 0) - (cashRegisterTotal || 0));
  const threshold = 1; // 1 Ft tolerance for rounding

  return {
    isValid: difference <= threshold,
    difference: difference,
    needsExplanation: difference > threshold,
  };
};

// Validate house cash calculations
export const validateHouseCash = (officialIncome, officialExpenses, officialTotal) => {
  const calculatedTotal = (officialIncome || 0) - (officialExpenses || 0);
  return Math.abs(calculatedTotal - (officialTotal || 0)) <= 1;
};
