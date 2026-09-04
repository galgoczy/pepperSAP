// Elütés (register mis-key) model. Two kinds live in the same discrepancies[]
// JSON of a closure, distinguished by `kind`:
//
//   'amount' – téves összeg ("homály"): the register holds more/less turnover
//              than really happened. The turnover changes. The HUF amount is
//              money that is on the Z-report but not in the drawer, so it is
//              deducted from the register cash in the house cash, and it
//              explains a gap between the ÁFA buckets and KP + kártya + SZÉP.
//   'method' – rossz fizetési mód: the right amount keyed on the wrong button
//              (e.g. bankkártya instead of készpénz). The turnover does NOT
//              change, only the split between payment methods. `keyed` is the
//              method it was (wrongly) keyed as, `actual` is what really
//              happened. The terminal is always the true card figure, so this
//              explains a register-card vs terminal difference, and moves the
//              real cash up or down in the house cash.
//
// Rows without `kind` (everything recorded before this existed) and every EUR
// entry are 'amount' — exactly the behaviour they had before.

export const DISCREPANCY_KINDS = {
  AMOUNT: 'amount',
  METHOD: 'method',
};

export const PAYMENT_METHOD_LABELS = {
  cash: 'Készpénz',
  card: 'Bankkártya',
  szep: 'SZÉP kártya',
};

const num = (v) => (v == null || v === '' ? 0 : Number(v) || 0);

export const discrepancyKind = (d) => {
  if (!d) return DISCREPANCY_KINDS.AMOUNT;
  if ((d.currency || 'HUF') === 'EUR') return DISCREPANCY_KINDS.AMOUNT;
  return d.kind === DISCREPANCY_KINDS.METHOD ? DISCREPANCY_KINDS.METHOD : DISCREPANCY_KINDS.AMOUNT;
};

export const isMethodDiscrepancy = (d) => discrepancyKind(d) === DISCREPANCY_KINDS.METHOD;

// The closure's elütés list, whichever shape the row has (discrepancies[] or
// the legacy single discrepancy_amount / _currency / _note columns).
export const listDiscrepancies = (cr) => {
  if (!cr) return [];
  if (Array.isArray(cr.discrepancies) && cr.discrepancies.length > 0) return cr.discrepancies;
  if (num(cr.discrepancy_amount) !== 0 || (cr.discrepancy_note || '').trim()) {
    return [{
      amount: cr.discrepancy_amount,
      currency: cr.discrepancy_currency || 'HUF',
      note: cr.discrepancy_note || '',
    }];
  }
  return [];
};

// Sum of the HUF 'amount'-kind elütés: what inflates the register turnover and
// is deducted from the register cash.
export const amountDiscrepancyHuf = (crOrList) => {
  const list = Array.isArray(crOrList) ? crOrList : listDiscrepancies(crOrList);
  return list.reduce((sum, d) => {
    if ((d?.currency || 'HUF') !== 'HUF') return sum;
    if (isMethodDiscrepancy(d)) return sum;
    return sum + num(d?.amount);
  }, 0);
};

// Sum of the EUR elütés (always 'amount' kind). Reported in its own column, and
// it explains an ÁFA-vs-fizetési-mód gap of exactly the same NUMBER of forints
// (see validatePaymentBreakdown).
export const eurDiscrepancyAmount = (crOrList) => {
  const list = Array.isArray(crOrList) ? crOrList : listDiscrepancies(crOrList);
  return list.reduce((sum, d) => ((d?.currency || 'HUF') === 'EUR' ? sum + num(d?.amount) : sum), 0);
};

// Real-vs-register corrections implied by the 'method' elütés, per payment
// method (HUF only): real = register + adjustment. "Kártya KP helyett 5000":
// keyed=card, actual=cash -> { card: -5000, cash: +5000 }.
export const methodAdjustments = (crOrList) => {
  const adj = { cash: 0, card: 0, szep: 0 };
  const list = Array.isArray(crOrList) ? crOrList : listDiscrepancies(crOrList);
  list.forEach((d) => {
    if (!isMethodDiscrepancy(d)) return;
    if ((d?.currency || 'HUF') !== 'HUF') return;
    const amount = Math.abs(num(d?.amount));
    if (!amount) return;
    const keyed = d.keyed in adj ? d.keyed : null;
    const actual = d.actual in adj ? d.actual : null;
    if (!keyed || !actual || keyed === actual) return;
    adj[keyed] -= amount;
    adj[actual] += amount;
  });
  return adj;
};

// Net effect of every elütés on the drawer: the 'amount' kind takes cash OUT
// of the register figure, a 'method' kind moves it in or out depending on the
// direction. Positive = less real cash than the register says.
export const netCashDiscrepancy = (crOrList) =>
  amountDiscrepancyHuf(crOrList) - methodAdjustments(crOrList).cash;

// Human label for one elütés, used on protocols and lists.
export const describeDiscrepancy = (d) => {
  if (isMethodDiscrepancy(d)) {
    const from = PAYMENT_METHOD_LABELS[d.keyed] || '?';
    const to = PAYMENT_METHOD_LABELS[d.actual] || '?';
    return `Rossz fizetési mód: ${from} helyett ${to}`;
  }
  return 'Téves összeg';
};
