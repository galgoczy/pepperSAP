# pepperSAP - Fejlesztések áttekintése

**Utolsó frissítés:** 2026. február 9.

Ez a dokumentum összefoglalja az új fejlesztéseket áttekintéshez és teszteléshez.

---

## Tartalomjegyzék

1. [Hibabejelentő felület (A11)](#1-hibabejelentő-felület-a11)
2. [Audit Log (A5)](#2-audit-log-a5)
3. [Kampánymenedzsment](#3-kampánymenedzsment)
4. [Reklamációkezelés](#4-reklamációkezelés)
5. [Kedvezmény-kezelés](#5-kedvezmény-kezelés)
6. [Webáruház integráció](#6-webáruház-integráció)
7. [UI átrendezés](#7-ui-átrendezés)
8. [Mobil reszponzív nézet](#8-mobil-reszponzív-nézet)

---

## 1. Hibabejelentő felület (A11)

**Státusz:** ✅ Kész
**Menüpont:** Adminisztráció → Támogatás
**URL:** `/support`
**Hozzáférés:** Mindenki

### Funkciók
- [x] Új hibabejelentés létrehozása
- [x] Kategória választás (hiba, fejlesztési javaslat, kérdés, egyéb)
- [x] Súlyosság megadása (alacsony, normál, magas, kritikus)
- [x] Automatikus böngésző info és URL rögzítés
- [x] Saját bejelentések listázása
- [x] Admin: összes bejelentés megtekintése
- [x] Admin: státusz kezelés (új → folyamatban → megoldva → lezárva)
- [x] Részletek megjelenítése kinyitáskor

### Adatbázis
- `support_tickets` tábla
- RLS: saját ticket-ek láthatósága, admin mindent lát

### Tesztelési checklist
- [ ] Bejelentés létrehozása user-ként
- [ ] Bejelentés megjelenik a listában
- [ ] Admin látja az összes bejelentést
- [ ] Státusz váltás működik
- [ ] Szűrők működnek

---

## 2. Audit Log (A5)

**Státusz:** ✅ Kész
**Menüpont:** Adminisztráció → Audit Log
**URL:** `/audit-log`
**Hozzáférés:** Csak admin

### Funkciók
- [x] Adatváltozások automatikus naplózása
- [x] INSERT/UPDATE/DELETE műveletek követése
- [x] Régi és új adatok tárolása (JSONB)
- [x] Módosított mezők listázása
- [x] Felhasználó azonosítása
- [x] Szűrés: tábla, művelet, felhasználó, dátum
- [x] Részletek megjelenítése (diff view)
- [x] Lapozás (load more)

### Naplózott táblák
- daily_revenue, cash_register_revenue
- expenses, deals, companies
- budget_entries, events, documents
- user_profiles, units, campaigns, complaints

### Adatbázis
- `audit_log` tábla
- `audit_trigger_func()` trigger funkció
- Triggerek minden fő táblán

### Tesztelési checklist
- [ ] Új adat létrehozása → megjelenik az audit logban
- [ ] Adat módosítása → módosított mezők látszanak
- [ ] Adat törlése → törölt adat megőrződik
- [ ] Szűrők működnek
- [ ] Lapozás működik

---

## 3. Kampánymenedzsment

**Státusz:** ✅ Kész
**Menüpont:** Ügyvitel → Kampányok
**URL:** `/campaigns`
**Hozzáférés:** Csak admin

### Funkciók
- [x] Kampány létrehozása (név, leírás, típus, dátumok)
- [x] Kampány típusok: email, telefonos, rendezvény, egyéb
- [x] Státusz workflow: tervezet → aktív → szünetel → befejezett
- [x] Célközönség kiválasztása szűrőkkel
- [x] Cég típus és beszállító kategória szerinti szűrés
- [x] Tömeges cég kiválasztás
- [x] Kampány statisztikák (célzott, kiküldött, válaszolt)
- [x] Célközönség export Excel-be
- [x] Kampány szerkesztés, törlés

### Adatbázis
- `campaigns` - kampány alap adatok
- `campaign_targets` - célzott cégek
- `campaign_results` - eredmények (opcionális)
- Automatikus statisztika frissítés trigger

### Tesztelési checklist
- [ ] Új kampány létrehozása
- [ ] Célközönség hozzáadása szűrőkkel
- [ ] Státusz váltás működik
- [ ] Export működik
- [ ] Statisztikák frissülnek

---

## 4. Reklamációkezelés

**Státusz:** ✅ Kész
**Menüpont:** Ügyvitel → Reklamációk
**URL:** `/complaints`
**Hozzáférés:** Csak admin

### Funkciók
- [x] Reklamáció rögzítése (cég, tárgy, leírás)
- [x] Típusok: szolgáltatás, termék, szállítás, számlázás, egyéb
- [x] Prioritás: alacsony, normál, magas, sürgős
- [x] Automatikus referenciaszám (RK-YYYYMMDD-XXXX)
- [x] Státusz workflow: új → folyamatban → eszkalálva → megoldva → lezárva
- [x] Felelős hozzárendelése
- [x] Eszkaláció (ok megadásával)
- [x] Megoldás rögzítése (típus, összeg, ügyfél elégedettség)
- [x] Előzmények timeline (automatikus)
- [x] Statisztikák (átlagos megoldási idő)

### Adatbázis
- `complaints` - reklamáció adatok
- `complaint_history` - előzmények (auto-populated)
- Trigger: referenciaszám generálás
- Trigger: history log

### Tesztelési checklist
- [ ] Új reklamáció létrehozása
- [ ] Referenciaszám generálódik
- [ ] Felelős hozzárendelése
- [ ] Eszkaláció működik
- [ ] Megoldás rögzítése
- [ ] Előzmények megjelennek
- [ ] Ügyfél elégedettség rögzítése

---

## 5. Kedvezmény-kezelés

**Státusz:** ✅ Kész
**Menüpont:** Ügyvitel → Kedvezmények
**URL:** `/discounts`
**Hozzáférés:** Csak admin

### Funkciók
- [x] Kedvezmény típusok kezelése (CRUD)
- [x] 5 féle feltétel típus:
  - Nincs feltétel (mindig érvényes)
  - Mennyiségi (X db felett)
  - Időszaki (dátum intervallumban)
  - Értékhatár (X Ft felett)
  - Törzsvásárló (kiválasztott cégeknek)
- [x] Százalékos vagy fix összegű kedvezmény
- [x] Aktív/inaktív státusz toggle
- [x] Kedvezmény hozzárendelés deal-ekhez
- [x] Statisztika kártya (aktív kedvezmények)
- [x] Előre definiált minta kedvezmények

### Adatbázis
- `discount_types` - kedvezmény típus definíciók
- `deal_discounts` - deal-kedvezmény kapcsolat
- Feltétel adatok JSONB mezőben tárolva

### Tesztelési checklist
- [ ] Új kedvezmény típus létrehozása
- [ ] Minden feltétel típus tesztelése
- [ ] Aktív/inaktív váltás
- [ ] Kedvezmény szerkesztése
- [ ] Kedvezmény törlése
- [ ] Deal-hez kedvezmény hozzárendelése

---

## 6. Webáruház integráció

**Státusz:** ✅ Kész
**Menüpont:** Főmenü → Webáruház
**URL:** `/webshop`
**Hozzáférés:** Admin és Unit felhasználók

### Funkciók
- [x] Napi webáruház forgalom rögzítése
- [x] Egységenkénti bontás
- [x] Top termékek megjelenítése (expandable row)
- [x] Statisztika kártyák (össz bevétel, rendelések, átlag kosár, napok)
- [x] Excel/CSV import funkció
- [x] Excel export
- [x] Dátum és egység szűrés
- [x] Upsert logika (dátum+egység unique)

### Adatbázis
- `webshop_daily_revenue` - napi forgalom egységenként
- `webshop_top_products` - top termékek naponta
- `webshop_product_categories` - termék kategóriák
- Automatikus átlag kosárérték számítás (GENERATED ALWAYS)

### Tesztelési checklist
- [ ] Manuális adat rögzítés
- [ ] Excel import működik
- [ ] Szűrők működnek
- [ ] Top termékek megjelennek
- [ ] Export működik
- [ ] Unit user csak saját egységét látja

---

## 7. UI átrendezés

**Státusz:** ✅ Kész

### Új menüstruktúra
```
📊 DASHBOARD
└── Főoldal

💰 PÉNZÜGY
├── Napi bevétel
├── Pénztárgép import
├── Kifizetések
├── Webáruház
└── Rendezvények

📈 KONTROLLING
├── Terv-tény
├── Budget
└── Riportok

📁 DOKUMENTUMOK
└── Dokumentumtár

👥 CRM / SALES
├── Ügyfelek
├── Dealek
├── Kampányok
├── Reklamációk
├── Kedvezmények
├── Sales események
└── Készletek

⚙️ ADMINISZTRÁCIÓ
├── Egységek
├── Felhasználók
├── Audit Log
├── Támogatás
└── Beállítások
```

### Változások
- [x] Menüpontok logikai csoportosítása
- [x] Pénzügy szekció létrehozása
- [x] Kontrolling szekció bővítése Riportokkal
- [x] CRM/Sales szekció összevonása
- [x] Dokumentumok külön szekcióba

---

## 8. Mobil reszponzív nézet

**Státusz:** ✅ Kész
**Érintett komponens:** AdminDashboard.jsx

### Funkciók
- [x] Kompakt KPI kártyák mobilon (nagy hero card)
- [x] Legutóbbi munkanap forgalma kiemelve
- [x] Napi/Heti/Havi nézet toggle
- [x] Terv vs tény gyors áttekintés (havi nézetben)
- [x] Másodlagos statisztikák kompakt grid
- [x] Budget progress bar vizualizáció
- [x] Reszponzív layout (md:hidden / hidden md:block)

### Tesztelési checklist
- [ ] Mobil nézet megfelelő (Chrome DevTools)
- [ ] Nézet toggle működik
- [ ] Budget összehasonlítás megjelenik
- [ ] Animált számok működnek
- [ ] KPI kártyák olvashatóak

---

## Adatbázis migrációk futtatása

A Supabase dashboard SQL editor-ban futtasd sorrendben:

```sql
-- 1. Support tickets
\i supabase/migrations/20260209_support_tickets.sql

-- 2. Audit log
\i supabase/migrations/20260209_audit_log.sql

-- 3. Campaigns
\i supabase/migrations/20260209_campaigns.sql

-- 4. Complaints
\i supabase/migrations/20260209_complaints.sql

-- 5. Discounts
\i supabase/migrations/20260209_discounts.sql

-- 6. Webshop
\i supabase/migrations/20260209_webshop.sql
```

Vagy másold be egyenként a fájlok tartalmát.

---

## Megjegyzések

- Minden új funkció admin jogosultságot igényel (kivéve: Támogatás)
- RLS policy-k beállítva minden táblán
- Audit log automatikusan naplóz minden változást
- A menüpontok a Sidebar.jsx-ben vannak definiálva

---

*Dokumentum generálva: 2026-02-09*
