// Házipénztár riport – időszaki összesítés a két zsebre (Pénztár zseb +
// Tartalék) együtt: mi növelte, mi csökkentette, és mi lett az eredmény.
//
// A napi sorokat a houseCashSeries adja. Minden napi tételt az ELŐJELE szerint
// sorolunk be: a pozitív a "+", a negatív a "−" oldalra kerül. Így pl. egy
// negatív szoftver−pénztárgép különbség (amikor a pénztárgép mutat többet) a
// csökkentők között jelenik meg, és a beérkező / kimenő átküldés is külön
// látszik. Eredmény = (+) − (−) = az időszak nettó változása.
//
// Nyitó + eredmény = záró, kivéve ha az időszakban jóváhagyott nyitó-revízió
// volt: az felülírja a nap nyitóját. Ilyenkor a különbség külön "Revízió" sor,
// hogy az egyenleg-levezetés mindig kijöjjön.

const add = (bucket, key, label, amount) => {
  if (!amount) return;
  if (!bucket[key]) bucket[key] = { label, amount: 0 };
  bucket[key].amount += amount;
};

export function houseCashPeriodSummary(rows, { includeReserve = true } = {}) {
  const plus = {};
  const minus = {};

  (rows || []).forEach((r) => {
    // Pénztár zseb
    const cashRev = (r.cashRevenue || 0) - (r.cashDiscrepancies || 0);
    if (cashRev >= 0) add(plus, 'cashRev', 'Bevétel – pénztár zseb', cashRev);
    else add(minus, 'cashRevNeg', 'Negatív napi bevétel – pénztár zseb (elütés)', -cashRev);
    add(minus, 'cashExp', 'Kifizetések – pénztár zseb', r.cashExpenses || 0);
    const ct = r.cashTransfers || 0;
    if (ct > 0) add(plus, 'cashTrIn', 'Beérkező átküldés – pénztár zseb', ct);
    else if (ct < 0) add(minus, 'cashTrOut', 'Kimenő átküldés – pénztár zseb', -ct);

    if (!includeReserve) return;

    // Tartalék
    const resRev = r.reserveRevenue || 0;
    if (resRev >= 0) add(plus, 'resRev', 'Bevétel – tartalék (szoftver−pénztárgép különbség + extra)', resRev);
    else add(minus, 'resRevNeg', 'Negatív napi különbség – tartalék (pénztárgép > szoftver)', -resRev);
    add(minus, 'resExp', 'Kifizetések – tartalék', r.reserveExpenses || 0);
    const rt = r.reserveTransfers || 0;
    if (rt > 0) add(plus, 'resTrIn', 'Beérkező átküldés – tartalék', rt);
    else if (rt < 0) add(minus, 'resTrOut', 'Kimenő átküldés – tartalék', -rt);
  });

  // Rögzített sorrend: előbb a pénztár zseb, aztán a tartalék; a bevétel
  // előbb, az átküldés utána – ne az adatok sorrendjétől függjön.
  const ORDER = ['cashRev', 'cashTrIn', 'resRev', 'resTrIn', 'cashExp', 'cashRevNeg', 'cashTrOut', 'resExp', 'resRevNeg', 'resTrOut'];
  const ordered = (bucket) => ORDER.filter((k) => bucket[k]).map((k) => bucket[k]);
  const plusList = ordered(plus);
  const minusList = ordered(minus);
  const plusTotal = plusList.reduce((s, i) => s + i.amount, 0);
  const minusTotal = minusList.reduce((s, i) => s + i.amount, 0);
  const result = plusTotal - minusTotal;

  const first = rows?.[0];
  const last = rows?.[rows.length - 1];
  const opening = first
    ? (first.cashOpening || 0) + (includeReserve ? first.reserveOpening || 0 : 0)
    : 0;
  const closing = last
    ? (last.cashClosing || 0) + (includeReserve ? last.reserveClosing || 0 : 0)
    : 0;
  // Ami a nyitó + eredmény és a záró között marad: jóváhagyott nyitó-revízió.
  const revision = Math.round((closing - opening - result) * 100) / 100;

  return { plus: plusList, minus: minusList, plusTotal, minusTotal, result, opening, closing, revision };
}
