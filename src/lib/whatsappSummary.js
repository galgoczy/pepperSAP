// The daily one-liner the unit managers already post into their own WhatsApp
// group, reproduced verbatim:
//
//   26.08.13
//   Novo 40817
//   Bk 26534
//   Kp 14283
//
// Novo = software (éttermi) forgalom, Bk = the day's total bankkártya payment
// across every closure, Kp = the difference of the two. Kp is deliberately the
// difference and NOT the registers' cash field — that is the convention the
// groups already use, so the message stays identical to what they send today.

const shortYmd = (iso) => {
  const [y, m, d] = String(iso || '').split('-');
  if (!y || !m || !d) return String(iso || '');
  return `${y.slice(-2)}.${m}.${d}`;
};

// Plain integers, no thousand separators — matching the existing messages.
const amount = (v) => String(Math.round(v || 0));

export function buildWhatsappDailySummary({ date, softwareRevenue, cardRevenue }) {
  const novo = Math.round(softwareRevenue || 0);
  const bk = Math.round(cardRevenue || 0);
  return [
    shortYmd(date),
    `Novo ${amount(novo)}`,
    `Bk ${amount(bk)}`,
    `Kp ${amount(novo - bk)}`,
  ].join('\n');
}

// wa.me opens WhatsApp's own chat picker with the text prefilled — groups
// included — both in the phone app and in WhatsApp Web / Desktop. There is no
// official way to post into a group without a human picking it, so this is the
// one route that works with the groups they already use.
export function whatsappShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
