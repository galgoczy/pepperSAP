// Validate card payment discrepancy
export const validateCardPayments = (cashRegisterCard, terminalCard) => {
  const difference = Math.abs((cashRegisterCard || 0) - (terminalCard || 0));
  const threshold = 100; // 100 Ft difference is acceptable

  return {
    isValid: difference <= threshold,
    difference: difference,
    needsExplanation: difference > threshold,
  };
};

// Validate SZEP card payment discrepancy
export const validateSzepPayments = (cashRegisterSzep, terminalSzep) => {
  const difference = Math.abs((cashRegisterSzep || 0) - (terminalSzep || 0));
  const threshold = 100;

  return {
    isValid: difference <= threshold,
    difference: difference,
    needsExplanation: difference > threshold,
  };
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
