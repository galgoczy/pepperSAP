// Mikor mozgat pénzt egy átküldés?
//
// Akkor, ha jóváhagyták: ilyenkor a küldő egység házipénztárából kimegy, a
// fogadónál (egység vagy Központ) bejön. A függőben lévő és a törölt átküldés
// egyik oldalon sem számít.
//
// A 'modified' ennek egy régi, hibás változata. A jóváhagyás közbeni
// összegmódosítás korábban ezt az állapotot írta a sorra (miközben a felület
// azt írta ki, hogy "módosítva és jóváhagyva"), az egyenlegszámítások viszont
// csak az 'approved'-ot nézték – az így jóváhagyott átküldés tehát SEHOL nem
// mozgatott pénzt. A meglévő sorokat a 20260922_transfer_modified_status_fix
// migráció átállítja 'approved'-ra, a kód pedig már eleve azt ír.
//
// A 'modified' mégis benne marad ebben a listában: így egy régi, még nyitott
// böngészőlapról érkező módosítás sem tud újra láthatatlan átküldést csinálni.
// A "Módosítva" jelzést nem ez adja, hanem az eltérő original_amount.
export const LIVE_TRANSFER_STATUSES = ['approved', 'modified'];
