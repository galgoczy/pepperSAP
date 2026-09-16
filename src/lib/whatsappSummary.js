// The daily summary the unit managers post into their own WhatsApp group. The
// first three lines are the format they already used by hand:
//
//   26.08.13
//   Novo 40817
//   Bk 26534
//
// Novo = software (éttermi) forgalom, Bk = the day's total bankkártya payment
// across every closure. Everything after that is only printed when the unit
// actually has that kind of revenue on the day, so the message stays as short
// as the day was simple.

const shortYmd = (iso) => {
  const [y, m, d] = String(iso || '').split('-');
  if (!y || !m || !d) return String(iso || '');
  return `${y.slice(-2)}.${m}.${d}`;
};

// Plain integers, no thousand separators — matching the existing messages.
const amount = (v) => String(Math.round(v || 0));

// The Kp line (Novo − Bk, i.e. the cash the day brought in) is only part of
// RSR's message; the other units do not send it.
export const unitSendsCashLine = (unitName) =>
  /rsr/i.test(String(unitName || ''));

export function buildWhatsappDailySummary({
  date,
  softwareRevenue,
  cardRevenue,
  showCash = false,
  mckinsey = 0,
  protocol = 0,
  restaurant = 0,
  vipRevenue = 0,
  vipLoading = 0,
  guestCount = 0,
}) {
  const novo = Math.round(softwareRevenue || 0);
  const bk = Math.round(cardRevenue || 0);

  const lines = [shortYmd(date), `Novo ${amount(novo)}`, `Bk ${amount(bk)}`];
  if (showCash) lines.push(`Kp ${amount(novo - bk)}`);

  // Only the ones that actually happened. VIP comes first, right after the
  // Novo / Bk / Kp block.
  [
    ['VIP forgalom', vipRevenue],
    ['VIP töltés', vipLoading],
    ['McKinsey', mckinsey],
    ['Protokol', protocol],
    ['Éttermi', restaurant],
  ].forEach(([label, value]) => {
    if (Math.round(value || 0) !== 0) lines.push(`${label} ${amount(value)}`);
  });

  lines.push(`Létszám ${Math.round(guestCount || 0)}`);

  return lines.join('\n');
}

// wa.me opens WhatsApp's own chat picker with the text prefilled — groups
// included — both in the phone app and in WhatsApp Web / Desktop. There is no
// official way to post into a group without a human picking it, so this is the
// one route that works with the groups they already use.
export function whatsappShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
