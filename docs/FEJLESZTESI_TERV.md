# pepperSAP - Fejlesztési Terv

**Készült:** 2026. február 9.
**Verzió:** 1.0

---

## Összefoglaló

A pályázati checklist alapján készített állapotfelmérés után az alábbi fejlesztési tervet javasoljuk. A fejlesztéseket 5 fázisra bontjuk, prioritás szerint.

---

## FÁZIS 1: Kritikus hiányok pótlása (Pályázati kötelező)

**Cél:** Az "A" általános követelmények teljesítése - ezek MINDEN modulnál ellenőrzik!

### 1.1 Hibabejelentő felület (A11)
**Prioritás:** 🔴 KRITIKUS

Egyszerű hibabejelentő form a felületen:
- [ ] `/support` vagy `/feedback` oldal
- [ ] Form mezők: tárgy, leírás, súlyosság, screenshot csatolás
- [ ] Email küldés a support@pepperhouse.hu címre
- [ ] Bejelentések mentése `support_tickets` táblába
- [ ] Bejelentések listázása admin számára

**Becsült idő:** 2-3 óra

### 1.2 Audit log funkció (A5)
**Prioritás:** 🔴 KRITIKUS

Adatváltozások naplózása:
- [ ] `audit_log` tábla létrehozása (timestamp, user_id, table_name, record_id, action, old_data, new_data)
- [ ] Supabase trigger funkciók a fő táblákon
- [ ] Audit log megtekintő felület admin számára
- [ ] Szűrés dátum, felhasználó, tábla szerint

**Becsült idő:** 3-4 óra

### 1.3 Felhasználói kézikönyv (A1)
**Prioritás:** 🟡 FONTOS

- [ ] Modul-szintű dokumentáció (markdown vagy PDF)
- [ ] Képernyőképek minden fő funkcióról
- [ ] E-learning formátum (videó vagy interaktív)
- [ ] In-app help tooltipek (opcionális)

**Becsült idő:** 4-6 óra (tartalom írás)

---

## FÁZIS 2: CRM/Sales modul kiegészítése

**Cél:** A B/1. (értékesítés) és B/7. (CRM) követelmények teljesítése

### 2.1 Kampánymenedzsment
**Prioritás:** 🔴 KRITIKUS (hiányzik)

- [ ] `campaigns` tábla (név, típus, célközönség_szűrő, kezdés, vége, státusz)
- [ ] `campaign_results` tábla (kampány_id, contact_id, válasz_típus)
- [ ] Kampány létrehozó felület
- [ ] Célközönség szűrő (cég típus, kategória, régió)
- [ ] Export funkcionalitás (CSV/Excel)
- [ ] Kampány eredmények riport

**Becsült idő:** 4-5 óra

### 2.2 Reklamációkezelés
**Prioritás:** 🔴 KRITIKUS (hiányzik)

- [ ] `complaints` tábla (company_id, contact_id, típus, leírás, státusz, prioritás, felelős, megoldás)
- [ ] Reklamáció rögzítő form
- [ ] Státusz workflow: Új → Folyamatban → Megoldva → Lezárva
- [ ] Eszkaláció (prioritás emelés, felelős váltás)
- [ ] Reklamáció történet (timeline)
- [ ] Riport: reklamációk száma, átlagos megoldási idő

**Becsült idő:** 4-5 óra

### 2.3 Kedvezmény-kezelés
**Prioritás:** 🟡 FONTOS (min. 2 típus kell)

- [ ] `discount_types` tábla (név, típus, érték, feltételek)
- [ ] Kedvezmény típusok:
  - Mennyiségi kedvezmény (X db felett Y%)
  - Időszaki kedvezmény (adott időszakban X%)
  - Egyedi ügyfél kedvezmény
  - Értékhatáros kedvezmény
- [ ] Kedvezmények hozzárendelése deal-ekhez
- [ ] Kedvezmény kalkulátor

**Becsült idő:** 3-4 óra

### 2.4 Front office - Email integráció
**Prioritás:** 🟡 FONTOS (2 csatorna kell)

Jelenlegi: Sales events rögzítése manuálisan
Szükséges: Legalább 2 kommunikációs csatorna

- [ ] Email küldés közvetlenül a rendszerből (SMTP vagy SendGrid)
- [ ] Email sablon kezelés
- [ ] Email történet rögzítése sales_events-be
- [ ] (Opcionális) Telefon hívás naplózása

**Becsült idő:** 3-4 óra

---

## FÁZIS 3: Webáruház integráció

**Cél:** Napi webáruház forgalom megjelenítése egységenként

### 3.1 Adatmodell
- [ ] `webshop_daily_revenue` tábla:
  - date, unit_id
  - order_count, total_revenue
  - product_category_breakdown (JSON)
  - top_products (JSON)
  - source (woocommerce, shopify, egyéb)

### 3.2 Import lehetőségek
- [ ] Excel/CSV import (mint a pénztárgépeknél)
- [ ] API integráció (WooCommerce REST API)
- [ ] Manuális bevitel form

### 3.3 Megjelenítés
- [ ] Dashboard widget: webáruház napi forgalom
- [ ] Top termékek lista
- [ ] Egységenkénti bontás (ha van)
- [ ] Összehasonlítás előző időszakkal

**Becsült idő:** 5-6 óra

---

## FÁZIS 4: UI átrendezés

**Cél:** Logikusabb menüstruktúra, jobb navigáció

### 4.1 Új menüstruktúra

```
📊 DASHBOARD (főoldal)
├── Napi áttekintés (forgalmak, KPI-k)
├── Webáruház összesítő
└── Gyors műveletek

💰 PÉNZÜGY
├── Napi bevétel rögzítés
├── Pénztárgép import
├── Házipénztár
├── Kifizetések
└── Webáruház bevételek

📈 KONTROLLING
├── Budget tervezés
├── Terv-tény összehasonlítás
├── Havi riportok
├── Export
└── Ad-hoc lekérdezések

📁 DOKUMENTUMOK
├── Dokumentumtár
├── Iktatás (új)
├── Keresés
└── SharePoint szinkron

👥 CRM / SALES
├── Ügyfelek
├── Kapcsolattartók
├── Üzleti lehetőségek (Deals)
├── Kampányok (új)
├── Reklamációk (új)
└── Sales riportok

⚙️ ADMIN (csak admin)
├── Egységek kezelése
├── Felhasználók
├── Audit log (új)
├── Hibabejelentések (új)
└── Rendszerbeállítások
```

### 4.2 Implementáció
- [ ] Sidebar.jsx átstrukturálás
- [ ] Új route-ok az App.jsx-ben
- [ ] Menü csoportok (collapse/expand)
- [ ] Aktív menüpont kiemelés
- [ ] Breadcrumb navigáció

**Becsült idő:** 3-4 óra

---

## FÁZIS 5: Mobil reszponzív nézet

**Cél:** Fontos KPI-k mobilon egy pillantásra

### 5.1 Mobil Dashboard
- [ ] Kompakt KPI kártyák
- [ ] Swipe navigáció napok között
- [ ] Legutóbbi munkanap forgalma kiemelve
- [ ] Heti/havi összesítő toggle
- [ ] Terv vs tény gyors áttekintés

### 5.2 Reszponzív táblák
- [ ] Horizontális scroll táblákhoz
- [ ] Kártya nézet opció (táblák helyett)
- [ ] Fontos oszlopok prioritása

### 5.3 Mobil-barát formok
- [ ] Input mezők méretezése
- [ ] Date picker mobil optimalizálás
- [ ] Modális ablakok fullscreen mobilon

### 5.4 PWA funkciók (opcionális)
- [ ] Service worker cache
- [ ] Offline működés (readonly)
- [ ] App ikon home screen-re

**Becsült idő:** 4-6 óra

---

## Fejlesztési sorrend

| # | Feladat | Prioritás | Idő | Státusz |
|---|---------|-----------|-----|---------|
| 1 | Hibabejelentő (A11) | 🔴 | 2-3h | ⬜ |
| 2 | Audit log (A5) | 🔴 | 3-4h | ⬜ |
| 3 | Kampánymenedzsment | 🔴 | 4-5h | ⬜ |
| 4 | Reklamációkezelés | 🔴 | 4-5h | ⬜ |
| 5 | Kedvezmény-kezelés | 🟡 | 3-4h | ⬜ |
| 6 | Email integráció | 🟡 | 3-4h | ⬜ |
| 7 | Webáruház integráció | 🟡 | 5-6h | ⬜ |
| 8 | UI átrendezés | 🟡 | 3-4h | ⬜ |
| 9 | Mobil reszponzív | 🟢 | 4-6h | ⬜ |
| 10 | Felhasználói kézikönyv | 🟡 | 4-6h | ⬜ |

**Összes becsült idő:** ~35-45 óra

---

## Adatbázis változások összefoglalója

```sql
-- Új táblák
CREATE TABLE support_tickets (...);
CREATE TABLE audit_log (...);
CREATE TABLE campaigns (...);
CREATE TABLE campaign_results (...);
CREATE TABLE complaints (...);
CREATE TABLE discount_types (...);
CREATE TABLE webshop_daily_revenue (...);

-- Módosítások
ALTER TABLE deals ADD COLUMN discount_type_id UUID;
ALTER TABLE documents ADD COLUMN registration_number TEXT;
ALTER TABLE documents ADD COLUMN registration_date DATE;
```

---

## Következő lépés

**Kezdjük a FÁZIS 1.1-gyel: Hibabejelentő felület**

Ez a legegyszerűbb kritikus hiány, gyorsan implementálható és azonnal látható eredményt ad.

---

*Készítette: Claude AI - pepperSAP fejlesztési terv*
