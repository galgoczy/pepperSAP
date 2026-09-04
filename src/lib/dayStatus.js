// Egy egység napjainak "rendben van-e" kiértékelése – a szigorú elszámolás
// kapuja és a naptár jelölése is ebből dolgozik, ugyanazzal a szabállyal,
// amit a jelentések Jkv. oszlopa mér (registerChecks).
//
// Egy nap akkor rendezetlen, ha bármelyik gépén
//   - van eltérés (kártya–terminál, fizetési mód, göngyölt), amit nem fed a
//     megfelelő fajtájú elütés, VAGY
//   - volt forgalom, de hiányzik a zárás sorszáma vagy a göngyölt forgalom.
// Az üres zárás-sorokat (csupa nulla, sorszám nélkül) nem vesszük figyelembe;
// egy csak ilyenekből álló nap "üres napnak" számít.

import { isBlankClosure } from './validations';
import { buildClosureChecks, computeRegisterProtocolMarks } from './registerChecks';

const n = (v) => parseFloat(v) || 0;

// revenueRows: daily_revenue sorok időrendben, mindegyik
//   { date, cash_register_revenue: [ { ...zárás mezők, cash_registers: {ap_number, name} } ] }
// Visszaad: { byDate: { [date]: { hasData, unresolved, issues } }, dataDates: [...] }
export function evaluateUnitDays(revenueRows) {
  const rows = [...(revenueRows || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Zárások gépenként, időrendben – a göngyölt lánc a gép saját láncolata.
  const byRegister = {};
  const byDate = {};

  rows.forEach((row) => {
    const closures = (row.cash_register_revenue || []).filter((cr) => !isBlankClosure(cr));
    byDate[row.date] = { hasData: closures.length > 0, unresolved: false, issues: [] };
    closures.forEach((cr) => {
      const key = cr.cash_register_id || cr.cash_registers?.ap_number || 'ismeretlen';
      if (!byRegister[key]) {
        byRegister[key] = {
          ap: cr.cash_registers?.ap_number || '(nincs AP-szám)',
          name: cr.cash_registers?.name || '',
          days: [],
        };
      }
      byRegister[key].days.push({
        date: row.date,
        ...buildClosureChecks(cr),
        // A hiányzó sorszám / göngyölt külön szabály, nem a marks része.
        hasSequence: cr.closure_sequence != null && cr.closure_sequence !== '',
        hasCumulative: n(cr.cumulative_revenue) > 0,
      });
    });
  });

  Object.values(byRegister).forEach((reg) => {
    computeRegisterProtocolMarks(reg.days);
    reg.days.forEach((day) => {
      const reasons = [];
      if (day.protocolMark === 'missing') {
        (day.protocolReasons || [])
          .filter((r) => !/rendezve$/.test(r))
          .forEach((r) => reasons.push(r));
      }
      if (day.turnover > 0 && !day.hasSequence) reasons.push('hiányzik a zárás sorszáma');
      if (day.turnover > 0 && !day.hasCumulative) reasons.push('hiányzik a göngyölt forgalom');
      if (reasons.length > 0) {
        const entry = byDate[day.date];
        entry.unresolved = true;
        entry.issues.push({ ap: reg.ap, name: reg.name, reasons });
      }
    });
  });

  const dataDates = Object.keys(byDate).filter((d) => byDate[d].hasData).sort();
  return { byDate, dataDates };
}

// Egy adott nap állapota úgy, ahogy MENTÉS UTÁN kinézne: az előző napok sorai
// mellé a nap még nem mentett zárásait tesszük, és a láncot így értékeljük ki.
// A hívó a `closures` listában a cash_registers {ap_number, name} adatot is
// átadja, hogy a hibalista géppel együtt olvasható legyen.
export function evaluateDayCandidate(previousRows, date, closures) {
  const rows = [...(previousRows || []).filter((r) => r.date !== date), { date, cash_register_revenue: closures || [] }];
  const { byDate } = evaluateUnitDays(rows);
  return byDate[date] || { hasData: false, unresolved: false, issues: [] };
}

// A kapu: a `date` előtti utolsó, adatot tartalmazó nap állapota. Az üres napokat
// átugorja. Ha nincs ilyen nap (vagy a bevezetési dátum előtt van), nem tilt.
export function previousDayGate(revenueRows, date, since) {
  const { byDate, dataDates } = evaluateUnitDays(revenueRows);
  const candidates = dataDates.filter((d) => d < date && (!since || d >= since));
  if (candidates.length === 0) {
    return { blocked: false, prevDate: null, issues: [] };
  }
  const prevDate = candidates[candidates.length - 1];
  const status = byDate[prevDate];
  return { blocked: !!status.unresolved, prevDate, issues: status.issues };
}
