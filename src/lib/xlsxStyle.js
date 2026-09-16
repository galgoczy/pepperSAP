// A táblázatkezelő könyvtár nagy (tömörítve is ~320 kB), és csak akkor kell,
// amikor tényleg letöltenek valamit. Ezért nem a Jelentések oldal betöltésekor
// kérjük le, hanem az első exportnál – a hívó előbb megvárja a loadXLSX()-et,
// utána használhatja az itteni formázókat is.
let XLSX = null;

export async function loadXLSX() {
  if (!XLSX) XLSX = (await import('xlsx-js-style')).default;
  return XLSX;
}

const requireXLSX = () => {
  if (!XLSX) throw new Error('Előbb await loadXLSX() kell, csak utána a formázás.');
  return XLSX;
};

// ---------------------------------------------------------------------------
// Közös Excel-formázás
//
// A táblázat ugyanazokat a színeket kapja, mint a képernyős jelentés: piros
// fejléc, halványan sávozott adatsorok, vékony keret, és a figyelmet kérő
// számok (eltérés, elütés, hiányzó jegyzőkönyv) ugyanúgy pirosak/narancsak.
// FONTOS: ez csak azért látszik a letöltött fájlban, mert a projekt a
// xlsx-js-style csomagot használja — a sima `xlsx` a cellastílusokat némán
// eldobja íráskor.
// ---------------------------------------------------------------------------
const THIN_BORDER = { style: 'thin', color: { rgb: 'E5E7EB' } };
const CELL_BORDERS = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };

const HEADER_STYLE = {
  fill: { fgColor: { rgb: 'D32F2F' } },
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', wrapText: true },
};

// A képernyős jelentéssel egyező jelzőszínek, oszlopnév alapján. Csak a sima
// adatsorokra megy rá, a saját háttérrel bíró összesítő/fejléc sorokra nem.
const RED_TEXT = 'B91C1C';
const ORANGE_TEXT = 'C2410C';
const GREEN_TEXT = '15803D';

function semanticCellStyle(header, value) {
  const num = typeof value === 'number' ? value : null;
  // A fizetési módok időszaki eltérése: a jelentésben is piros háttérrel szól.
  if (header === 'Időszaki eltérés' && num !== null && num !== 0) {
    return { font: { color: { rgb: RED_TEXT }, bold: true }, fill: { fgColor: { rgb: 'FEE2E2' } } };
  }
  // Kártya–terminál eltérés és a rögzített elütések: narancs, mint a képernyőn.
  if ((header === 'Eltérés' || header === 'BK eltérés' || header === 'Elütés'
      || header === 'Ft elütés' || header === 'EUR elütés')
      && num !== null && num !== 0) {
    return { font: { color: { rgb: ORANGE_TEXT }, bold: true } };
  }
  if (header === 'Jkv.' || header === 'Jkv. rendben' || header === 'Göngyölt ellenőrizve') {
    const text = String(value ?? '');
    if (text === 'OK' || text === 'igen') return { font: { color: { rgb: GREEN_TEXT } } };
    // Hiányzó jegyzőkönyv: piros. Ellenőrizetlen (megvan, de nincs bepipálva):
    // narancs. A "nem volt eltérés" nem hiba, azt nem színezzük.
    if (/^hiányzik/i.test(text)) return { font: { color: { rgb: RED_TEXT }, bold: true } };
    if (/^ellenőrizetlen/i.test(text)) return { font: { color: { rgb: ORANGE_TEXT } } };
  }
  return null;
}

// A szakasz- és összesítő sorok háttere. Ugyanazok a színek, amiket a
// képernyős jelentés és a PDF is használ, hogy a három ne térjen el.
const ROW_TYPE_STYLES = {
  unitHeader: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'D32F2F' } } },
  registerHeader: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '3B82F6' } } },
  sectionHeader: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'D32F2F' } } },
  grandTotalHeader: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'D32F2F' } } },
  eventsHeader: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4B5563' } } },
  eventsListColumns: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4B5563' } } },
  eventsListHeader: { font: { bold: true }, fill: { fgColor: { rgb: 'D1D5DB' } } },
  subtotal: { font: { bold: true }, fill: { fgColor: { rgb: 'E5E7EB' } } },
  eventsSubtotal: { font: { bold: true }, fill: { fgColor: { rgb: 'E5E7EB' } } },
  unitTotal: { font: { bold: true }, fill: { fgColor: { rgb: 'FECACA' } } },
  grandTotalRow: { fill: { fgColor: { rgb: 'F3F4F6' } } },
  grandTotal: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'B91C1C' } } },
  // A lap végére fűzött "Összesen" / "Mindösszesen" sor.
  totalsRow: { font: { bold: true }, fill: { fgColor: { rgb: 'FECACA' } } },
};

// A képernyős jelentésben a Mindösszesen sor terminál szerinti bankkártya
// összege sárga kiemelést kap – ezért a számért olvassák a kimutatást. A
// letöltött fájlban ugyanígy nézzen ki.
const TOTAL_ROW_TYPES = new Set(['totalsRow', 'grandTotal']);
const HIGHLIGHT_HEADERS = new Set(['Terminál']);
const HIGHLIGHT_STYLE = {
  fill: { fgColor: { rgb: 'FEF08A' } },
  font: { bold: true, color: { rgb: '111827' } },
};

// Keret, jobbra igazított számok, sávozás és jelzőszínek az egész lapon.
// `rowTypes[i]` az i. adatsor _rowType-ja (a fejléc nélkül számolva); ami nincs
// benne (pl. a legvégére fűzött összesítő sor), az sima adatsornak számít.
export function applySheetFormatting(ws, headers, rowTypes = []) {
  if (!ws['!ref']) return;
  const xl = requireXLSX();
  const range = xl.utils.decode_range(ws['!ref']);
  for (let row = range.s.r; row <= range.e.r; row++) {
    const rowType = row === 0 ? 'header' : rowTypes[row - 1] || 'data';
    const base = row === 0 ? HEADER_STYLE : ROW_TYPE_STYLES[rowType] || null;
    for (let col = range.s.c; col <= range.e.c; col++) {
      const ref = xl.utils.encode_cell({ r: row, c: col });
      const cell = ws[ref];
      if (!cell) continue;
      const style = { ...(cell.s || {}), ...(base || {}) };
      style.border = CELL_BORDERS;
      if (row > 0) {
        if (typeof cell.v === 'number') style.alignment = { horizontal: 'right' };
        // A saját háttérrel rendelkező sorokat (fejléc, összesítő) nem írjuk felül.
        if (!style.fill) {
          if (rowType === 'data' && row % 2 === 0) style.fill = { fgColor: { rgb: 'F9FAFB' } };
          const semantic = semanticCellStyle(headers[col], cell.v);
          if (semantic) {
            if (semantic.fill) style.fill = semantic.fill;
            style.font = { ...(style.font || {}), ...semantic.font };
          }
        }
        // A sárga kiemelés a sor saját hátterét is felülírja (a képernyőn is).
        if (TOTAL_ROW_TYPES.has(rowType) && HIGHLIGHT_HEADERS.has(headers[col])) {
          style.fill = HIGHLIGHT_STYLE.fill;
          style.font = { ...(style.font || {}), ...HIGHLIGHT_STYLE.font };
        }
      }
      cell.s = style;
    }
  }
}

// "Készült: 2026.09.16. 14:20" – a táblázat alá, egy üres sorral lejjebb.
export function generatedAtText() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `Készült: ${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function appendGeneratedStamp(ws) {
  if (!ws['!ref']) return;
  const xl = requireXLSX();
  const range = xl.utils.decode_range(ws['!ref']);
  const stampRow = range.e.r + 2;
  xl.utils.sheet_add_aoa(ws, [[generatedAtText()]], { origin: { r: stampRow, c: 0 } });
  const ref = xl.utils.encode_cell({ r: stampRow, c: 0 });
  if (ws[ref]) {
    ws[ref].s = { font: { italic: true, sz: 9, color: { rgb: '6B7280' } } };
  }
}
