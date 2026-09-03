// The checks a cash-register closure is marked against in every report, kept in
// one place so the admin (all units) and the unit's own report never disagree.
//
//  - terminal/card: |pénztárgép kártya − terminál| over tolerance. The terminal
//    is the true figure; handled by a "rossz fizetési mód" elütés covering it
//    (or, on old rows, a free-text terminal reason).
//  - fizetési módok: the ÁFA buckets must equal KP + kártya + SZÉP; handled by
//    a "téves összeg" elütés with a reason.
//  - göngyölt: the Z-report cumulative must be the previous one plus this
//    closure's turnover; handled by any recorded elütés.

import {
  REGISTER_TOLERANCE,
  validateCardPayments,
  validatePaymentBreakdown,
  hasDocumentedDiscrepancy,
  hufDiscrepancyOf,
  methodCardAdjustmentOf,
} from './validations';
import { listDiscrepancies } from './discrepancies';

export const CUMULATIVE_TOLERANCE = 1; // Ft

const n = (v) => parseFloat(v) || 0;

// Everything a report row needs from one raw cash_register_revenue row for the
// checks above. Amount fields keep the names the reports already use.
export function buildClosureChecks(cr) {
  const vat_0 = n(cr.vat_0_percent);
  const vat_5 = n(cr.vat_5_percent);
  const vat_18 = n(cr.vat_18_percent);
  const vat_27 = n(cr.vat_27_percent);
  const cash = n(cr.cash_payment);
  const card = n(cr.card_payment);
  const szep = n(cr.szep_card_payment);
  const terminal_card = n(cr.terminal_card);
  const turnover = vat_0 + vat_5 + vat_18 + vat_27;

  const breakdown = validatePaymentBreakdown({
    vatTotal: turnover,
    cash,
    card,
    szep,
    hufDiscrepancy: hufDiscrepancyOf(cr),
  });

  return {
    turnover,
    szep,
    paid: breakdown.paid,
    paymentDiff: breakdown.difference,
    paymentGap: breakdown.applicable && !breakdown.isValid,
    discrepancy: card - terminal_card,
    terminalExplained: validateCardPayments(card, terminal_card, methodCardAdjustmentOf(cr))
      .explainedByDiscrepancy,
    terminalNote: (cr.terminal_discrepancy_note || '').trim(),
    discrepancyDocumented: hasDocumentedDiscrepancy(cr),
    discrepancyCount: listDiscrepancies(cr).length,
    // Recorded elütés, for the reports' own "Elütés" column.
    hufDiscrepancy: hufDiscrepancyOf(cr),
    eurDiscrepancy: listDiscrepancies(cr).reduce(
      (sum, d) => sum + (d?.currency === 'EUR' ? n(d.amount) : 0),
      0
    ),
    cumulative: n(cr.cumulative_revenue),
    closureSeq: cr.closure_sequence ?? cr.closure_number ?? null,
  };
}

// Marks each closure (day row) of ONE register: whether a discrepancy exists and
// whether the matching jegyzőkönyv is there. Sets day.protocolMark to 'ok'
// (discrepancy, everything documented), 'missing' (something is not) or null (no
// discrepancy), plus day.protocolReasons explaining the mark on hover.
export function computeRegisterProtocolMarks(days) {
  // Evaluate the cumulative chain in the order the closures were recorded.
  const ordered = [...days].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.closureSeq ?? 0) - (b.closureSeq ?? 0);
  });
  let prevCumulative = null;
  ordered.forEach((day) => {
    const termDisc = Math.abs(day.discrepancy) > REGISTER_TOLERANCE;
    const termHandled = !!day.terminalExplained || (day.terminalNote || '').length > 0;

    const payDisc = !!day.paymentGap;
    const payHandled = !!day.discrepancyDocumented;

    // Göngyölt: this closure's cumulative must be the previous one's plus this
    // closure's turnover. The pieces are kept on the day so the cell can explain
    // itself on hover instead of only feeding the Jkv. mark.
    let cumDisc = false;
    day.cumulativeMismatch = false;
    if (prevCumulative != null && prevCumulative > 0 && day.cumulative > 0) {
      const expected = prevCumulative + day.turnover;
      cumDisc = Math.abs(day.cumulative - expected) > CUMULATIVE_TOLERANCE;
      if (cumDisc) {
        day.cumulativeMismatch = true;
        day.expectedCumulative = expected;
        day.expectedCumulativeBase = prevCumulative;
      }
    }
    const cumHandled = day.discrepancyCount > 0;
    if (day.cumulative > 0) prevCumulative = day.cumulative;

    const reasons = [];
    if (termDisc) {
      reasons.push(
        termHandled
          ? 'Kártya-terminál eltérés – rendezve'
          : 'Kártya-terminál eltérés – hiányzik a „rossz fizetési mód” elütés'
      );
    }
    if (payDisc) {
      reasons.push(
        payHandled
          ? 'Fizetési mód eltérés – rendezve'
          : 'Fizetési mód eltérés – hiányzik a „téves összeg” elütés indoklással'
      );
    }
    if (cumDisc) {
      reasons.push(
        cumHandled ? 'Göngyölt eltérés – rendezve' : 'Göngyölt eltérés – nincs rögzített elütés'
      );
    }
    day.protocolReasons = reasons;

    if (!termDisc && !cumDisc && !payDisc) {
      day.protocolMark = null;
    } else {
      const allHandled =
        (!termDisc || termHandled) && (!cumDisc || cumHandled) && (!payDisc || payHandled);
      day.protocolMark = allHandled ? 'ok' : 'missing';
    }
  });
}
