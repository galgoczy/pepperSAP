import { supabase } from './supabase';

// Computes a unit's daily house-cash series (Pénztár zseb + Tartalék) live from
// raw data, from zero through full history. This is the single source of truth
// for both the daily-entry opening balance (so záró = next nyitó always holds)
// and the Házipénztár report.
//
// Per-day movement (agreed mechanism):
//   cash    = (register cash - HUF discrepancies + official other income)
//             - (cash-paid official expenses + official EFO/wage)
//             +/- approved cash transfers
//   reserve = (software revenue - register revenue + other extra income)
//             - (non-official expenses + non-official EFO/wage)
//             +/- approved reserve transfers
//
// Running balance: opening = previous day's closing; closing = opening + movement.
// An approved opening-balance revision sets a NEW anchor for its target date
// (that day's opening becomes the revised value; earlier days are untouched).

function sumRegister(crRows) {
  let cash = 0;
  let revenue = 0;
  let discrepancies = 0;
  (crRows || []).forEach((cr) => {
    cash += parseFloat(cr.cash_payment) || 0;
    revenue +=
      (parseFloat(cr.vat_0_percent) || 0) +
      (parseFloat(cr.vat_5_percent) || 0) +
      (parseFloat(cr.vat_18_percent) || 0) +
      (parseFloat(cr.vat_27_percent) || 0);
    if (Array.isArray(cr.discrepancies)) {
      cr.discrepancies.forEach((d) => {
        if (d.currency === 'HUF') discrepancies += parseFloat(d.amount) || 0;
      });
    } else if (cr.discrepancy_amount && cr.discrepancy_currency === 'HUF') {
      discrepancies += parseFloat(cr.discrepancy_amount) || 0;
    }
  });
  return { cash, revenue, discrepancies };
}

export async function fetchHouseCashSeries(unitId, endDate) {
  const empty = { byDate: new Map(), orderedDates: [] };
  if (!unitId) return empty;

  const dateFilter = (q, col) => (endDate ? q.lte(col, endDate) : q);

  const [revRes, expRes, hcRes, efoRes, wageRes, transfersRes, revisionsRes] = await Promise.all([
    dateFilter(
      supabase
        .from('daily_revenue')
        .select('date, total_revenue, cash_register_revenue(cash_payment, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, discrepancies, discrepancy_amount, discrepancy_currency)')
        .eq('unit_id', unitId),
      'date'
    ),
    dateFilter(
      supabase
        .from('expenses')
        .select('invoice_date, supplier_name, item_description, amount, is_official, payment_method')
        .eq('unit_id', unitId),
      'invoice_date'
    ),
    dateFilter(
      supabase
        .from('house_cash')
        .select('date, official_other_income, other_extra_income')
        .eq('unit_id', unitId),
      'date'
    ),
    dateFilter(
      supabase
        .from('efo_payments')
        .select('payment_date, employee_name, official_amount, extra_amount, payment_method')
        .eq('unit_id', unitId),
      'payment_date'
    ),
    dateFilter(
      supabase
        .from('wage_payments')
        .select('payment_date, worker_name, official_amount, extra_amount')
        .eq('unit_id', unitId),
      'payment_date'
    ),
    supabase
      .from('cash_transfers')
      .select('amount, transfer_type, transfer_date, source_unit_id, destination_unit_id, status')
      .eq('status', 'approved')
      .or(`source_unit_id.eq.${unitId},destination_unit_id.eq.${unitId}`),
    supabase
      .from('opening_balance_revisions')
      .select('target_date, proposed_opening_balance, pocket, status, created_at')
      .eq('unit_id', unitId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true }),
  ]);

  const byDate = new Map();
  const ensure = (d) => {
    if (!byDate.has(d)) {
      byDate.set(d, {
        date: d,
        cashRevenue: 0,
        cashDiscrepancies: 0,
        cashExpenses: 0,
        cashTransfers: 0,
        cashPaymentItems: [],
        reserveRevenue: 0,
        reserveExpenses: 0,
        reserveTransfers: 0,
        reservePaymentItems: [],
        cashAnchor: undefined,
        reserveAnchor: undefined,
      });
    }
    return byDate.get(d);
  };

  // Daily revenue -> register cash / revenue / discrepancies
  (revRes.data || []).forEach((rev) => {
    const row = ensure(rev.date);
    const { cash, revenue, discrepancies } = sumRegister(rev.cash_register_revenue);
    row.cashRevenue += cash;
    row.cashDiscrepancies += discrepancies;
    row.reserveRevenue += (parseFloat(rev.total_revenue) || 0) - revenue;
  });

  // House cash manual incomes
  (hcRes.data || []).forEach((hc) => {
    const row = ensure(hc.date);
    row.cashRevenue += parseFloat(hc.official_other_income) || 0;
    row.reserveRevenue += parseFloat(hc.other_extra_income) || 0;
  });

  // Expenses
  (expRes.data || []).forEach((e) => {
    const amount = parseFloat(e.amount) || 0;
    const row = ensure(e.invoice_date);
    const label = e.supplier_name + (e.item_description ? ` - ${e.item_description}` : '');
    if (e.is_official && e.payment_method === 'cash') {
      row.cashExpenses += amount;
      row.cashPaymentItems.push({ label, amount });
    } else if (!e.is_official) {
      row.reserveExpenses += amount;
      row.reservePaymentItems.push({ label, amount });
    }
    // official non-cash expenses (e.g. transfer) don't move physical cash
  });

  // EFO payments
  (efoRes.data || []).forEach((p) => {
    const official = parseFloat(p.official_amount) || 0;
    const extra = parseFloat(p.extra_amount) || 0;
    const row = ensure(p.payment_date);
    if (official > 0) {
      row.cashExpenses += official;
      row.cashPaymentItems.push({ label: `EFO - ${p.employee_name}`, amount: official });
    }
    if (extra > 0) {
      row.reserveExpenses += extra;
      row.reservePaymentItems.push({ label: `EFO (tartalék) - ${p.employee_name}`, amount: extra });
    }
  });

  // Wage payments
  (wageRes.data || []).forEach((p) => {
    const official = parseFloat(p.official_amount) || 0;
    const extra = parseFloat(p.extra_amount) || 0;
    const row = ensure(p.payment_date);
    if (official > 0) {
      row.cashExpenses += official;
      row.cashPaymentItems.push({ label: `Heti bér - ${p.worker_name}`, amount: official });
    }
    if (extra > 0) {
      row.reserveExpenses += extra;
      row.reservePaymentItems.push({ label: `Heti bér (tartalék) - ${p.worker_name}`, amount: extra });
    }
  });

  // Transfers (in: +, out: -)
  (transfersRes.data || []).forEach((t) => {
    const amount = parseFloat(t.amount) || 0;
    const sign = t.destination_unit_id === unitId ? 1 : -1;
    const row = ensure(t.transfer_date);
    if (t.transfer_type === 'reserve') row.reserveTransfers += sign * amount;
    else row.cashTransfers += sign * amount;
  });

  // Revision anchors (set this day's opening to the revised value)
  (revisionsRes.data || []).forEach((r) => {
    const row = ensure(r.target_date);
    const val = parseFloat(r.proposed_opening_balance) || 0;
    if (r.pocket === 'reserve') row.reserveAnchor = val;
    else row.cashAnchor = val;
  });

  // Compute running balances chronologically
  const orderedDates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
  let cashRunning = 0;
  let reserveRunning = 0;
  orderedDates.forEach((d) => {
    const row = byDate.get(d);

    const cashOpening = row.cashAnchor !== undefined ? row.cashAnchor : cashRunning;
    const cashMovement = row.cashRevenue - row.cashDiscrepancies - row.cashExpenses + row.cashTransfers;
    const cashClosing = cashOpening + cashMovement;
    row.cashOpening = cashOpening;
    row.cashMovement = cashMovement;
    row.cashClosing = cashClosing;
    cashRunning = cashClosing;

    const reserveOpening = row.reserveAnchor !== undefined ? row.reserveAnchor : reserveRunning;
    const reserveMovement = row.reserveRevenue - row.reserveExpenses + row.reserveTransfers;
    const reserveClosing = reserveOpening + reserveMovement;
    row.reserveOpening = reserveOpening;
    row.reserveMovement = reserveMovement;
    row.reserveClosing = reserveClosing;
    reserveRunning = reserveClosing;
  });

  return { byDate, orderedDates };
}

// Computes the Központ (central) daily house-cash series, mirroring the unit
// series shape (cashOpening/cashRevenue/cashExpenses/cashTransfers/cashClosing
// and reserve equivalents) so it can be rendered with the same table.
//
// Central cash movement matches useCentralBalance:
//   cash    = transfers IN (to central) - transfers OUT (from central)
//             - central payments - active pockets + revisions
// Mapped into the unit row shape:
//   revenue   = transfers IN
//   expenses  = central payments + active pockets
//   transfers = -(transfers OUT) + revisions   (signed)
export async function fetchCentralHouseCashSeries(endDate) {
  const dateFilter = (q, col) => (endDate ? q.lte(col, endDate) : q);

  const [inRes, outRes, payRes, revRes, pocketRes] = await Promise.all([
    dateFilter(
      supabase
        .from('cash_transfers')
        .select('amount, transfer_type, transfer_date, source_type, source_unit_id')
        .eq('destination_type', 'central')
        .eq('status', 'approved'),
      'transfer_date'
    ),
    dateFilter(
      supabase
        .from('cash_transfers')
        .select('amount, transfer_type, transfer_date, destination_unit_id')
        .eq('source_type', 'central')
        .eq('status', 'approved'),
      'transfer_date'
    ),
    dateFilter(
      supabase
        .from('central_payments')
        .select('amount, payment_type, payment_date, supplier_name, item_description'),
      'payment_date'
    ),
    dateFilter(
      supabase
        .from('cash_revisions')
        .select('discrepancy_amount, revision_type, revision_date, notes'),
      'revision_date'
    ),
    supabase
      .from('cash_pockets')
      .select('current_amount, status, created_at, name')
      .eq('status', 'active'),
  ]);

  const byDate = new Map();
  const ensure = (d) => {
    if (!byDate.has(d)) {
      byDate.set(d, {
        date: d,
        cashRevenue: 0, cashDiscrepancies: 0, cashExpenses: 0, cashTransfers: 0, cashPaymentItems: [],
        reserveRevenue: 0, reserveExpenses: 0, reserveTransfers: 0, reservePaymentItems: [],
      });
    }
    return byDate.get(d);
  };

  // Transfers IN -> revenue
  (inRes.data || []).forEach((t) => {
    const amount = parseFloat(t.amount) || 0;
    const row = ensure(t.transfer_date);
    if (t.transfer_type === 'reserve') row.reserveRevenue += amount;
    else row.cashRevenue += amount;
  });

  // Transfers OUT -> negative transfers
  (outRes.data || []).forEach((t) => {
    const amount = parseFloat(t.amount) || 0;
    const row = ensure(t.transfer_date);
    if (t.transfer_type === 'reserve') row.reserveTransfers -= amount;
    else row.cashTransfers -= amount;
  });

  // Central payments -> expenses
  (payRes.data || []).forEach((p) => {
    const amount = parseFloat(p.amount) || 0;
    const row = ensure(p.payment_date);
    const label = (p.supplier_name || p.item_description || 'Kifizetés');
    if (p.payment_type === 'reserve') {
      row.reserveExpenses += amount;
      row.reservePaymentItems.push({ label, amount });
    } else {
      row.cashExpenses += amount;
      row.cashPaymentItems.push({ label, amount });
    }
  });

  // Revisions -> signed adjustment into transfers bucket
  (revRes.data || []).forEach((r) => {
    const amount = parseFloat(r.discrepancy_amount) || 0;
    const row = ensure(r.revision_date);
    if (r.revision_type === 'reserve') row.reserveTransfers += amount;
    else row.cashTransfers += amount;
  });

  // Active pockets -> cash expenses on creation date (current_amount still held)
  (pocketRes.data || []).forEach((p) => {
    const amount = parseFloat(p.current_amount) || 0;
    if (amount === 0) return;
    const d = (p.created_at || '').slice(0, 10);
    if (!d) return;
    const row = ensure(d);
    row.cashExpenses += amount;
    row.cashPaymentItems.push({ label: `Zseb${p.name ? ` - ${p.name}` : ''}`, amount });
  });

  // Running balances (central starts from zero, no anchors).
  const orderedDates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
  let cashRunning = 0;
  let reserveRunning = 0;
  orderedDates.forEach((d) => {
    const row = byDate.get(d);
    const cashMovement = row.cashRevenue - row.cashDiscrepancies - row.cashExpenses + row.cashTransfers;
    row.cashOpening = cashRunning;
    row.cashMovement = cashMovement;
    row.cashClosing = cashRunning + cashMovement;
    cashRunning = row.cashClosing;

    const reserveMovement = row.reserveRevenue - row.reserveExpenses + row.reserveTransfers;
    row.reserveOpening = reserveRunning;
    row.reserveMovement = reserveMovement;
    row.reserveClosing = reserveRunning + reserveMovement;
    reserveRunning = row.reserveClosing;
  });

  return { byDate, orderedDates };
}

// Opening balances for a given date.
// If the date itself has a series row, its computed opening is returned — this
// already accounts for any approved opening-balance revision anchored on that
// day (so the revised opening shows on the target day, not just the next one).
// Otherwise it is the closing of the most recent series day strictly before it.
export function openingForDate(series, date) {
  const own = series.byDate.get(date);
  if (own) return { cash: own.cashOpening, reserve: own.reserveOpening };

  let cash = 0;
  let reserve = 0;
  for (const d of series.orderedDates) {
    if (d >= date) break;
    const row = series.byDate.get(d);
    cash = row.cashClosing;
    reserve = row.reserveClosing;
  }
  return { cash, reserve };
}
