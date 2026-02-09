# pepperSAP - Szakmai Checklist Állapotfelmérés

**Készült:** 2026. február 9.
**Verzió:** 1.0

---

## Összefoglaló

| Modul | Relevancia | Megvalósítás | Státusz |
|-------|-----------|--------------|---------|
| 1. Elektronikus iratkezelés | ⚠️ Részben releváns | 30% | 🟡 Alapok vannak |
| 2. Értékesítés és ügyfélkapcsolat | ✅ Releváns | 50% | 🟡 Részben kész |
| 3. Internetes értékesítés | ❌ NEM releváns | - | ⬜ Nem szükséges |
| 4. Kontrolling és döntéstámogatás | ✅ Releváns | 65% | 🟢 Jó állapot |
| 5. Pénzügyi és számviteli | ⚠️ Részben releváns | 40% | 🟡 Részben kész |
| 6. Táv- és csoportmunka | ⚠️ M365 fedi le | 80% | 🟢 M365 integráció |
| 7. CRM | ✅ Releváns | 50% | 🟡 Részben kész |

**Jelmagyarázat:**
- 🟢 Megvalósítva/Megfelelő
- 🟡 Részben megvalósítva/Fejlesztés szükséges
- 🔴 Hiányzik/Kritikus
- ⬜ Nem releváns

---

## A. ÁLTALÁNOS KÖVETELMÉNYEK (minden modulra)

| # | Követelmény | Állapot | Megjegyzés |
|---|-------------|---------|------------|
| A1 | Felhasználói kézikönyv | 🟡 | docs/ mappában van dokumentáció, de nem teljes felhasználói kézikönyv |
| A2 | 1 éves támogatási szerződés | ⬜ | Üzleti kérdés, nem szoftver funkció |
| A3 | Törvényi megfelelőség, GDPR | 🟡 | RLS implementálva, GDPR nyilatkozat szükséges |
| A4 | Integráltság | 🟢 | Supabase közös adatbázis, modulok integráltak |
| A5 | Naplózás | 🟡 | created_at/updated_at/created_by van, de nincs audit log |
| A6 | Képzés | ⬜ | Üzleti kérdés, e-learning anyag készíthető |
| A7 | Jogosultság-kezelés | 🟢 | admin/unit/events/accountant szerepkörök, RLS |
| A8 | 3 referencia | ⬜ | Üzleti kérdés |
| A9 | Magyar nyelvű felület | 🟢 | Teljes magyar UI |
| A10 | Távoli elérés | 🟢 | Web alapú, HTTPS, bármilyen eszközről |
| A11 | Online hibabejelentés | 🔴 | **HIÁNYZIK** - Fejlesztendő |
| A12 | Heti használat, valós adatok | ⬜ | Működési kérdés |
| A13 | Adatmentés, IT biztonság | 🟢 | Supabase automatikus backup, HTTPS |

### Általános teendők:
1. **A1**: Teljes felhasználói kézikönyv készítése
2. **A5**: Audit log funkció hozzáadása
3. **A11**: Hibabejelentő felület készítése (lehet egyszerű form)

---

## B. MODUL-SPECIFIKUS KÖVETELMÉNYEK

---

### 1. MODUL: Elektronikus iratkezelés (2 450 000 Ft)

**⚠️ RÉSZBEN RELEVÁNS** - A Pepper House-nak nincs szüksége teljes körű iratkezelésre (iktatás, szignálás). A meglévő Dokumentumok modul elegendő lehet a pályázathoz, ha kiegészítjük.

| # | Követelmény | Állapot | Megjegyzés |
|---|-------------|---------|------------|
| 1 | Érkeztetés, iktatás | 🔴 | Nincs iktatószám generálás |
| 2 | Digitális iratkezelés | 🟢 | SharePoint integráció, feltöltés |
| 3 | Életciklus követés | 🟡 | sync_status van, de nincs workflow |
| 4 | Iratok hozzárendelése partnerekhez | 🟡 | unit_id van, company_id hiányzik |
| 5 | Iratok keresése | 🟢 | Cím, fájlnév, tag alapú keresés |
| 6 | Szignálás, feladatkiosztás | 🔴 | **HIÁNYZIK** |
| 7 | Figyelmeztető üzenetek | 🔴 | **HIÁNYZIK** |
| 8 | Jogosultságkezelés | 🟢 | access_level: admin/all |
| 9 | SSO bejelentkezés | 🟢 | Microsoft O365 OAuth |
| 10 | Keresés | 🟢 | Szabadszavas keresés működik |

**Ha ez a modul kötelező, fejlesztendő:**
- Iktatószám generálás és érkeztetési dátum
- Dokumentum státuszok (új, folyamatban, lezárt, archivált)
- Határidő mező és e-mail értesítés
- Dokumentum hozzárendelés cégekhez (company_id)

---

### 2. MODUL: Értékesítés és ügyfélkapcsolat (4 200 000 Ft)

**✅ RELEVÁNS** - A CRM/Sales modul fontos a vállalati ügyfelek (rendezvények, céges ebédek) kezeléséhez.

| # | Követelmény | Állapot | Megjegyzés |
|---|-------------|---------|------------|
| 1 | Kampánymenedzsment | 🔴 | **HIÁNYZIK** - célközönség szegmentálás |
| 2 | Értékesítési folyamat | 🟡 | Deal pipeline van, de nincs ajánlat→számla |
| 3 | Kedvezmény-kezelés | 🔴 | **HIÁNYZIK** |
| 4 | Ügyfélkezelés (ticketing) | 🟡 | Sales events van, ticketing nincs |
| 5 | Reklamációkezelés | 🔴 | **HIÁNYZIK** |
| 6 | Ügyfél törzsadatok | 🟢 | Companies + company_contacts |
| 7 | Front office (2 csatorna) | 🟡 | Email van, chat/telefon nincs |

**Meglévő funkciók:**
- ✅ Cégek és kapcsolattartók kezelése
- ✅ Deal pipeline (lead → tárgyalás → ajánlat → won/lost)
- ✅ Sales events (hívás, email, meeting) rögzítése
- ✅ Súlyozott forecast számítás
- ✅ Felelős kolléga hozzárendelése

**Fejlesztendő:**
- Kampány modul (célközönség export, hírlevél integráció)
- Kedvezmény típusok kezelése
- Reklamáció/panaszkezelés workflow
- Chat vagy telefon integráció (vagy dokumentálás)

---

### 3. MODUL: Internetes értékesítés / webáruház (1 260 000 Ft)

**❌ NEM RELEVÁNS** - A Pepper House étterem, nem webáruházat üzemeltet. Ez a modul kihagyható vagy helyettesíthető más modullal.

---

### 4. MODUL: Kontrolling és döntéstámogatás (900 000 Ft)

**✅ RELEVÁNS** - A kontrolling modul a pénzügyi rendszer egyik legfontosabb része.

| # | Követelmény | Állapot | Megjegyzés |
|---|-------------|---------|------------|
| 1 | Adatbázis kapcsolat | 🟢 | Supabase PostgreSQL direkt |
| 2 | Riport export (XLS/CSV) | 🟢 | ExportModal - XLS, CSV export |
| 3 | Mutatószámok, terv-tény | 🟢 | Bevétel/költség/fedezet eltérés |
| 4 | Ad-hoc lekérdezések | 🟡 | Fix riportok, nincs ad-hoc |
| 5 | Mértékegységek (HUF, %) | 🟢 | HUF és % kimutatások |
| 6 | Napi adatbetöltés | 🟢 | Valós idejű, Excel import is |
| 7 | Elemzési modellek | 🟡 | Terv-tény van, költségelemzés nincs |

**Meglévő funkciók:**
- ✅ Budget tervezés (havi szinten, egységenként)
- ✅ Terv-tény összehasonlítás (bevétel, költség, fedezet)
- ✅ Eltérés % megjelenítés színkódolással
- ✅ Havi tábla riport (költség-bevétel)
- ✅ Excel/CSV export
- ✅ Havi navigáció

**Fejlesztendő:**
- Ad-hoc lekérdező felület (szűrők kombinálása)
- Egyéni mutatószám definiálás
- Költségelemzési modell (költségnemek részletezése)

---

### 5. MODUL: Pénzügyi és számviteli (784 000 Ft)

**⚠️ RÉSZBEN RELEVÁNS** - A teljes könyvelés külső rendszerben történik, de a pénztár és számlák kezelése itt van.

| # | Követelmény | Állapot | Megjegyzés |
|---|-------------|---------|------------|
| 1 | Eszköz-nyilvántartás | 🔴 | **HIÁNYZIK** |
| 2 | Számlák kezelése | 🟡 | Expenses van, de nem teljes számlakezelés |
| 3 | Főkönyvi analitikák | 🔴 | Külső könyvelésben |
| 4 | ÁFA analitikák | 🟡 | ÁFA bontás van a bevételeknél |
| 5 | Bankszámlakezelés | 🔴 | **HIÁNYZIK** |
| 6 | Pénztárkezelés | 🟢 | Házipénztár modul, pénztárgépek |
| 7 | Mérleg, eredménykimutatás | 🔴 | Külső rendszerben |
| 8 | Törvényi megfelelőség | 🟡 | NAV pénztárgép adatok vannak |

**Meglévő funkciók:**
- ✅ Napi bevétel rögzítés (ÁFA bontással)
- ✅ Pénztárgép forgalom (AP szám, Novohost)
- ✅ Házipénztár kezelés (készpénz, váltópénz)
- ✅ Kifizetések/költségek rögzítése
- ✅ Terminál vs NAV eltérés kezelés
- ✅ Excel import pénztárgép adatokhoz

**Fejlesztendő (ha szükséges):**
- Bejövő számlák részletesebb kezelése
- Bankszámla egyenleg nyilvántartás
- Eszköznyilvántartás (leltár)

**Megjegyzés:** Ha a teljes könyvelés külső rendszerben van (pl. Kulcs-Soft, NAV Online Számla), ez a modul részben lefedett. Dokumentálni kell az integrációt.

---

### 6. MODUL: Táv- és csoportmunka (1 680 000 Ft)

**⚠️ M365 LEFEDI** - A Microsoft 365 előfizetés nagy részét biztosítja.

| # | Követelmény | Állapot | Megjegyzés |
|---|-------------|---------|------------|
| 1 | Biztonságos távoli kapcsolat | 🟢 | HTTPS, O365 OAuth |
| 2 | Biztonságos levelezés | 🟢 | M365 Outlook |
| 3 | Osztott tudásbázis | 🟢 | SharePoint + Documents modul |
| 4 | Papír dokumentumok kezelése | 🟢 | SharePoint szinkron |
| 5 | Valós idejű üzenetküldés | 🟢 | M365 Teams |
| 6 | Feladatkövetés | 🟡 | Nincs task management |
| 7 | IT biztonság, üzletfolytonosság | 🟢 | Supabase + M365 SLA |

**Fejlesztendő:**
- Egyszerű task/feladat kezelő (vagy M365 Planner használata)
- IT biztonsági szabályzat dokumentálása

---

### 7. MODUL: CRM (2 170 000 Ft)

**✅ RELEVÁNS** - Ugyanaz a B/1. követelménysor, mint a 2. modulnál.

| # | Követelmény | Állapot | Megjegyzés |
|---|-------------|---------|------------|
| 1 | Kampánymenedzsment | 🔴 | **HIÁNYZIK** |
| 2 | Értékesítési folyamat | 🟡 | Deal pipeline van |
| 3 | Kedvezmény-kezelés | 🔴 | **HIÁNYZIK** |
| 4 | Ügyfélkezelés | 🟢 | Sales events, history |
| 5 | Reklamációkezelés | 🔴 | **HIÁNYZIK** |
| 6 | Ügyfél törzsadatok | 🟢 | Companies + contacts |
| 7 | Front office (2 csatorna) | 🟡 | Email van |

**Lásd: 2. modul**

---

## Prioritásos fejlesztési lista

### 🔴 KRITIKUS (kötelező a pályázathoz)

1. **Hibabejelentő felület (A11)** - Egyszerű form, email küldéssel
2. **Audit log (A5)** - Adatváltozások naplózása
3. **Felhasználói kézikönyv (A1)** - Modul-szintű dokumentáció

### 🟡 FONTOS (modul-specifikus hiányok)

4. **Kampánymenedzsment** - Célközönség export, kampány eredmény
5. **Reklamációkezelés** - Panasz rögzítés, státusz követés
6. **Kedvezmény-kezelés** - Legalább 2 típus (mennyiségi, időszaki)
7. **Dokumentum iktatás** - Iktatószám, érkeztetési dátum (ha 1. modul kell)

### 🟢 AJÁNLOTT (javítja az értékelést)

8. **E-mail értesítések** - Határidők, eltérések
9. **Ad-hoc lekérdezés** - Szűrők kombinálása
10. **Task management** - Egyszerű feladatkezelő

---

## Modulok értékelése - Javaslat

| Modul | Költség | Javaslat |
|-------|---------|----------|
| 1. Elektronikus iratkezelés | 2 450 000 Ft | ⚠️ Csak ha kötelező - iktatás fejlesztés drága |
| 2. Értékesítés és ügyfélkapcsolat | 4 200 000 Ft | ✅ Fejlesztéssel teljesíthető |
| 3. Internetes értékesítés | 1 260 000 Ft | ❌ **NEM releváns** - kihagyható |
| 4. Kontrolling | 900 000 Ft | ✅ Szinte kész |
| 5. Pénzügyi és számviteli | 784 000 Ft | ⚠️ Részben - külső könyvelés dokumentálása |
| 6. Táv- és csoportmunka | 1 680 000 Ft | ✅ M365 lefedi |
| 7. CRM | 2 170 000 Ft | ✅ Fejlesztéssel teljesíthető |

**Összesen elérhető (releváns modulok):** 12 184 000 Ft

---

## Következő lépések

1. **Döntés**: Mely modulokat igényeljük? (3. modul kihagyása javasolt)
2. **Fejlesztés**: Kritikus hiányok pótlása (hibabejelentés, audit log)
3. **Dokumentáció**: Felhasználói kézikönyv és GDPR nyilatkozat
4. **Tesztelés**: Valós adatokkal feltöltés, heti használat bizonyítása
5. **Képzés**: E-learning anyag vagy oktatási jegyzőkönyv

---

*Készítette: Claude AI - pepperSAP rendszerelemzés*
