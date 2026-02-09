# pepperSAP - Szakmai Checklist Állapotfelmérés

**Készült:** 2026. február 9.
**Verzió:** 2.0 (frissítve a legújabb fejlesztésekkel)

---

## Összefoglaló

| Modul | Relevancia | Megvalósítás | Státusz |
|-------|-----------|--------------|---------|
| 1. Elektronikus iratkezelés | ⚠️ Részben releváns | 40% | 🟡 Alapok vannak |
| 2. Értékesítés és ügyfélkapcsolat | ✅ Releváns | **85%** | 🟢 Szinte kész |
| 3. Internetes értékesítés | ❌ NEM releváns | - | ⬜ Nem szükséges |
| 4. Kontrolling és döntéstámogatás | ✅ Releváns | **80%** | 🟢 Jó állapot |
| 5. Pénzügyi és számviteli | ⚠️ Részben releváns | 50% | 🟡 Részben kész |
| 6. Táv- és csoportmunka | ⚠️ M365 fedi le | **90%** | 🟢 M365 integráció |
| 7. CRM | ✅ Releváns | **85%** | 🟢 Szinte kész |

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
| A5 | Naplózás | 🟢 | **✅ MEGVALÓSÍTVA** - Audit log modul (`/audit-log`) |
| A6 | Képzés | ⬜ | Üzleti kérdés, e-learning anyag készíthető |
| A7 | Jogosultság-kezelés | 🟢 | admin/unit/events/accountant szerepkörök, RLS |
| A8 | 3 referencia | ⬜ | Üzleti kérdés |
| A9 | Magyar nyelvű felület | 🟢 | Teljes magyar UI |
| A10 | Távoli elérés | 🟢 | Web alapú, HTTPS, bármilyen eszközről |
| A11 | Online hibabejelentés | 🟢 | **✅ MEGVALÓSÍTVA** - Support modul (`/support`) |
| A12 | Heti használat, valós adatok | ⬜ | Működési kérdés |
| A13 | Adatmentés, IT biztonság | 🟢 | Supabase automatikus backup, HTTPS |

### Általános teendők:
1. **A1**: Teljes felhasználói kézikönyv készítése *(dokumentáció feladat)*
2. ~~**A5**: Audit log funkció hozzáadása~~ ✅ KÉSZ
3. ~~**A11**: Hibabejelentő felület készítése~~ ✅ KÉSZ

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
| 1 | Kampánymenedzsment | 🟢 | **✅ MEGVALÓSÍTVA** - `/campaigns` modul |
| 2 | Értékesítési folyamat | 🟡 | Deal pipeline van, de nincs ajánlat→számla |
| 3 | Kedvezmény-kezelés | 🟢 | **✅ MEGVALÓSÍTVA** - `/discounts` modul (5 típus) |
| 4 | Ügyfélkezelés (ticketing) | 🟢 | Sales events + Support tickets |
| 5 | Reklamációkezelés | 🟢 | **✅ MEGVALÓSÍTVA** - `/complaints` modul |
| 6 | Ügyfél törzsadatok | 🟢 | Companies + company_contacts |
| 7 | Front office (2 csatorna) | 🟡 | Email + Support tickets (2 csatorna megvan) |

**Meglévő funkciók:**
- ✅ Cégek és kapcsolattartók kezelése
- ✅ Deal pipeline (lead → tárgyalás → ajánlat → won/lost)
- ✅ Sales events (hívás, email, meeting) rögzítése
- ✅ Súlyozott forecast számítás
- ✅ Felelős kolléga hozzárendelése
- ✅ **ÚJ:** Kampánymenedzsment (célközönség, export, statisztika)
- ✅ **ÚJ:** Kedvezmények (5 típus: nincs, mennyiségi, időszaki, értékhatár, törzsvásárló)
- ✅ **ÚJ:** Reklamációkezelés (státusz workflow, eszkaláció, megoldás)

**Még fejleszthető:**
- Ajánlat → Számla automatizáció (de lehet külső rendszerben)

---

### 3. MODUL: Internetes értékesítés / webáruház (1 260 000 Ft)

**❌ NEM RELEVÁNS** - A Pepper House étterem, nem webáruházat üzemeltet. Ez a modul kihagyható.

**Megjegyzés:** A webáruház forgalom követése viszont elérhető a `/webshop` modulban, ami a fűszer/szósz online értékesítés nyomon követésére szolgál - de ez nem teljes webáruház rendszer, csak forgalomkövetés.

---

### 4. MODUL: Kontrolling és döntéstámogatás (900 000 Ft)

**✅ RELEVÁNS** - A kontrolling modul a pénzügyi rendszer egyik legfontosabb része.

| # | Követelmény | Állapot | Megjegyzés |
|---|-------------|---------|------------|
| 1 | Adatbázis kapcsolat | 🟢 | Supabase PostgreSQL direkt |
| 2 | Riport export (XLS/CSV) | 🟢 | ExportModal - XLS, CSV export |
| 3 | Mutatószámok, terv-tény | 🟢 | Bevétel/költség/fedezet eltérés + Dashboard KPI-ok |
| 4 | Ad-hoc lekérdezések | 🟡 | Fix riportok, szűrők vannak |
| 5 | Mértékegységek (HUF, %) | 🟢 | HUF és % kimutatások |
| 6 | Napi adatbetöltés | 🟢 | Valós idejű, Excel import is |
| 7 | Elemzési modellek | 🟡 | Terv-tény van, költségelemzés részben |

**Meglévő funkciók:**
- ✅ Budget tervezés (havi szinten, egységenként)
- ✅ Terv-tény összehasonlítás (bevétel, költség, fedezet)
- ✅ Eltérés % megjelenítés színkódolással
- ✅ Havi tábla riport (költség-bevétel)
- ✅ Excel/CSV export
- ✅ Havi navigáció
- ✅ **ÚJ:** Dashboard mobil KPI-ok (napi/heti/havi toggle)
- ✅ **ÚJ:** Budget vs Tény progress bar
- ✅ **ÚJ:** Webáruház forgalom követés

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
- ✅ **ÚJ:** Webáruház napi forgalom (`/webshop`)

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
| 6 | Feladatkövetés | 🟢 | **ÚJ:** Support tickets + M365 Planner |
| 7 | IT biztonság, üzletfolytonosság | 🟢 | Supabase + M365 SLA |

**Fejlesztendő:**
- IT biztonsági szabályzat dokumentálása *(dokumentáció feladat)*

---

### 7. MODUL: CRM (2 170 000 Ft)

**✅ RELEVÁNS** - Ugyanaz a B/1. követelménysor, mint a 2. modulnál.

| # | Követelmény | Állapot | Megjegyzés |
|---|-------------|---------|------------|
| 1 | Kampánymenedzsment | 🟢 | **✅ MEGVALÓSÍTVA** |
| 2 | Értékesítési folyamat | 🟡 | Deal pipeline van |
| 3 | Kedvezmény-kezelés | 🟢 | **✅ MEGVALÓSÍTVA** |
| 4 | Ügyfélkezelés | 🟢 | Sales events, history, tickets |
| 5 | Reklamációkezelés | 🟢 | **✅ MEGVALÓSÍTVA** |
| 6 | Ügyfél törzsadatok | 🟢 | Companies + contacts |
| 7 | Front office (2 csatorna) | 🟢 | Email + Support tickets |

**Lásd: 2. modul**

---

## Fejlesztések összefoglalója (2026.02.09)

### ✅ Elkészült fejlesztések

| Funkció | Modul | URL | Leírás |
|---------|-------|-----|--------|
| Hibabejelentő (A11) | Support | `/support` | Ticket rendszer kategóriákkal, státuszokkal |
| Audit log (A5) | Admin | `/audit-log` | INSERT/UPDATE/DELETE naplózás JSONB diff-fel |
| Kampánymenedzsment | CRM | `/campaigns` | Célközönség, export, eredmények |
| Reklamációkezelés | CRM | `/complaints` | Workflow, eszkaláció, megoldás tracking |
| Kedvezmények | Sales | `/discounts` | 5 típus (mennyiségi, időszaki, stb.) |
| Webáruház forgalom | Pénzügy | `/webshop` | Napi bevétel import, top termékek |
| UI átrendezés | - | - | Logikus menüstruktúra |
| Mobil dashboard | - | `/` | Napi/Heti/Havi KPI toggle |
| Teszt nézetváltó | Admin | Navbar | Admin/Unit/Events nézet szimuláció |

### 🔴 Még hiányzó elemek

| Funkció | Modul | Prioritás | Megjegyzés |
|---------|-------|-----------|------------|
| Felhasználói kézikönyv | A1 | 🟡 Közepes | Dokumentáció feladat |
| GDPR nyilatkozat | A3 | 🟡 Közepes | Jogi dokumentum |
| Ajánlat → Számla | Sales | 🟢 Alacsony | Külső rendszerben is lehet |
| Dokumentum iktatás | Iratkezelés | 🟡 Közepes | Csak ha 1. modul kötelező |
| Eszköznyilvántartás | Pénzügy | 🟢 Alacsony | Csak ha 5. modul teljes |

---

## Modulok értékelése - FRISSÍTETT

| Modul | Költség | Készültség | Státusz |
|-------|---------|------------|---------|
| 1. Elektronikus iratkezelés | 2 450 000 Ft | 40% | ⚠️ Fejlesztés szükséges |
| 2. Értékesítés és ügyfélkapcsolat | 4 200 000 Ft | **85%** | ✅ Szinte kész |
| 3. Internetes értékesítés | 1 260 000 Ft | - | ❌ Kihagyható |
| 4. Kontrolling | 900 000 Ft | **80%** | ✅ Kész |
| 5. Pénzügyi és számviteli | 784 000 Ft | 50% | ⚠️ Részben (külső könyvelés) |
| 6. Táv- és csoportmunka | 1 680 000 Ft | **90%** | ✅ M365 lefedi |
| 7. CRM | 2 170 000 Ft | **85%** | ✅ Szinte kész |

**Összesen elérhető (releváns modulok):** 12 184 000 Ft

---

## Következő lépések

1. ~~**Fejlesztés**: Kritikus hiányok pótlása~~ ✅ KÉSZ
2. **Dokumentáció**: Felhasználói kézikönyv és GDPR nyilatkozat
3. **Tesztelés**: Valós adatokkal feltöltés, heti használat bizonyítása
4. **Képzés**: E-learning anyag vagy oktatási jegyzőkönyv
5. **Döntés**: 1. és 5. modul teljes implementálása szükséges-e?

---

*Frissítve: 2026-02-09 - Claude AI*
