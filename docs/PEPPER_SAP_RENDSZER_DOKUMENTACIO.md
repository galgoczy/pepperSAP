# Pepper House SAP - Rendszer Dokumentáció

## Pályázati Megfelelőség Értékelés

**Dokumentum verziója:** 1.0
**Készült:** 2026. január 28.

---

## 1. Rendszer Áttekintés

A Pepper House SAP egy korszerű, webalapú vállalati erőforrás-tervező (ERP) rendszer, amely a vendéglátóipari egységek működésének támogatására készült. A rendszer React 19 + Vite frontend és Supabase (PostgreSQL) backend architektúrán alapul.

### 1.1 Technológiai háttér
- **Frontend:** React 19, Vite, Tailwind CSS, React Router v7
- **Backend:** Supabase (PostgreSQL), Row Level Security
- **Hitelesítés:** Supabase Auth + Microsoft 365 integráció
- **Riporting:** jsPDF, Excel export

---

## 2. Pályázati Kritériumok Szerinti Értékelés

### 2.1 Beszerzés és készletgazdálkodás

| Funkció | Státusz | Leírás |
|---------|---------|--------|
| Készletnyilvántartás | ⚠️ Tervezett | Placeholder oldal létezik, API integráció szükséges |
| Készletmozgás követés | ⚠️ Tervezett | Bevételezés, kiadás, selejt tervezve |
| Beszállító kezelés | ✅ Megvan | Cégek modul: beszállító kategóriák (zöldség, pékáru, hús, stb.) |
| Költségnyilvántartás | ✅ Megvan | Kifizetések modul teljes funkcionalitással |

**Megfelelőség:** 40% - A beszállító kezelés működik, készletgazdálkodás fejlesztést igényel

**MVP Fejlesztési igény:**
- Készlet entitás és mozgások adatbázis tábla
- Készlet bevételezés/kiadás form
- Egyszerű készletriport
- Minimum készlet figyelmeztetés

---

### 2.2 Elektronikus iratkezelés

| Funkció | Státusz | Leírás |
|---------|---------|--------|
| Dokumentum feltöltés | ✅ Megvan | Dokumentumok oldal teljes funkcionalitással |
| Témakörök kezelése | ✅ Megvan | Kategorizálás témakörökkel |
| Keresés és szűrés | ✅ Megvan | Név, témakör, egység, év szerinti szűrés |
| SharePoint integráció | ⚠️ Előkészítve | OAuth flow kész, Azure konfiguráció szükséges |
| Hozzáférés-kezelés | ✅ Megvan | Admin/mindenki szintű jogosultságok |
| Metaadatok | ✅ Megvan | Cím, leírás, címkék, dátum, egység |

**Megfelelőség:** 85% - Teljes funkcionalitás, SharePoint integráció aktiválás szükséges

**MVP Fejlesztési igény:**
- Azure App Registration konfigurálás
- SharePoint mappa struktúra létrehozása
- Automatikus szinkronizálás aktiválása

---

### 2.3 Értékesítés és ügyfélkapcsolat (CRM)

| Funkció | Státusz | Leírás |
|---------|---------|--------|
| Ügyfélnyilvántartás | ✅ Megvan | Cégek + kontakt személyek |
| Sales pipeline | ✅ Megvan | Ajánlat/szerződés/teljesítés fázisok |
| Deal/Opportunity kezelés | ✅ Megvan | Teljes deal pipeline, státuszok, valószínűségek |
| Súlyozott forecast | ✅ Megvan | Érték × valószínűség automatikus számítás |
| Havi előrejelzés | ✅ Megvan | Várható zárás szerint csoportosítva |
| Eseménynapló | ✅ Megvan | Hívás, email, meeting, ajánlat rögzítése |
| Deal-esemény kapcsolat | ✅ Megvan | Események deal-hez köthetők |
| Kapcsolattartó hozzárendelés | ✅ Megvan | Belső és ügyfél oldali kontakt |

**Megfelelőség:** 95% - Teljes körű CRM funkcionalitás

**MVP Fejlesztési igény:**
- Opcionális: automatikus emlékeztetők
- Opcionális: email integráció

---

### 2.4 Internetes értékesítés – webáruház

| Funkció | Státusz | Leírás |
|---------|---------|--------|
| Webáruház | ❌ Nincs | Nem releváns a vendéglátás fő profilhoz |
| Online rendelés | ❌ Nincs | Nem releváns |

**Megfelelőség:** 0% - Nem releváns kritérium a cég profiljához

**MVP Fejlesztési igény:** Nem szükséges, nincs webáruház tevékenység

---

### 2.5 Kontrolling és döntéstámogatás

| Funkció | Státusz | Leírás |
|---------|---------|--------|
| Budget tervezés | ✅ Megvan | Havi/egységenkénti tervadatok |
| Terv-tény elemzés | ✅ Megvan | Automatikus összehasonlítás |
| Eltérés számítás | ✅ Megvan | Ft és % eltérés kimutatása |
| Színkódolt figyelmeztetések | ✅ Megvan | Zöld/sárga/piros küszöbértékek |
| Fedezet számítás | ✅ Megvan | Bevétel - költség automatikusan |
| Havi navigáció | ✅ Megvan | Időszakok közötti váltás |
| Státusz workflow | ✅ Megvan | Tervezet → Jóváhagyott → Lezárt |
| Előző hónap másolás | ✅ Megvan | Gyors budget létrehozás |

**Megfelelőség:** 90% - Teljes körű kontrolling modul

**MVP Fejlesztési igény:**
- Negyedéves/éves összesítés
- Export funkció bővítése

---

### 2.6 Munkafolyamat-irányítás (Workflow)

| Funkció | Státusz | Leírás |
|---------|---------|--------|
| Napi adatrögzítési workflow | ✅ Megvan | Bevétel → Házipénztár → Kifizetések |
| Budget jóváhagyás | ✅ Megvan | Draft → Approved → Locked |
| Rendezvény kezelés | ✅ Megvan | Projekt alapú workflow |
| Szerepkör alapú hozzáférés | ✅ Megvan | Admin, Unit, Events, Accountant |
| Napi riport generálás | ✅ Megvan | PDF export |

**Megfelelőség:** 70% - Alapvető workflow-k működnek

**MVP Fejlesztési igény:**
- Jóváhagyási értesítések
- Automatikus státusz átmenetek
- Feladat emlékeztetők

---

### 2.7 Online marketing támogatás

| Funkció | Státusz | Leírás |
|---------|---------|--------|
| Marketing kampányok | ❌ Nincs | Nem implementált |
| Közösségi média | ❌ Nincs | Nem implementált |
| Email marketing | ❌ Nincs | Nem implementált |

**Megfelelőség:** 0% - Nem fókuszterület

**MVP Fejlesztési igény:** Alacsony prioritás, nem core funkcionalitás

---

### 2.8 Pénzügyi és számviteli folyamatok

| Funkció | Státusz | Leírás |
|---------|---------|--------|
| Napi bevétel rögzítés | ✅ Megvan | ÁFA kulcsok, fizetési módok |
| Pénztárgép adatok | ✅ Megvan | Több pénztárgép támogatás |
| Házipénztár kezelés | ✅ Megvan | Készpénz, EFO, tartalék |
| Kifizetések | ✅ Megvan | Hivatalos/nem hivatalos, többdeviza |
| Elütések kezelése | ✅ Megvan | Készpénz eltérések nyilvántartása |
| Havi riportok | ✅ Megvan | Többféle riport típus |
| Export | ✅ Megvan | Excel, PDF export |
| Havi pénzügyi összesítő | ✅ Megvan | Költség-bevétel táblázat |

**Megfelelőség:** 95% - Átfogó pénzügyi nyilvántartás

**MVP Fejlesztési igény:**
- Könyvelő export formátum
- Bankszámla egyeztetés (opcionális)

---

### 2.9 Táv- és csoportmunka támogatása

| Funkció | Státusz | Leírás |
|---------|---------|--------|
| Webes hozzáférés | ✅ Megvan | Böngészőből bárhonnan |
| Többfelhasználós | ✅ Megvan | Egyidejű használat |
| Mobil optimalizált | ✅ Megvan | Responsive dizájn |
| Microsoft 365 integráció | ⚠️ Előkészítve | OAuth flow kész |
| Szerepkör alapú adathozzáférés | ✅ Megvan | RLS biztosítja |

**Megfelelőség:** 75% - Alapvető távmunka támogatás

**MVP Fejlesztési igény:**
- Értesítések (push/email)
- Offline mód (PWA)

---

### 2.10 Ügyfélkapcsolat-kezelés (CRM)

| Funkció | Státusz | Leírás |
|---------|---------|--------|
| Ügyfél adatbázis | ✅ Megvan | Cégek és személyek |
| Kontakt kezelés | ✅ Megvan | Cégenkénti kontaktok |
| Kommunikáció napló | ✅ Megvan | Sales események |
| Ügyfél kategorizálás | ✅ Megvan | Ügyfél/beszállító/mindkettő |
| Deal tracking | ✅ Megvan | Opportunity pipeline |
| Forecast | ✅ Megvan | Súlyozott előrejelzés |
| Dashboard | ✅ Megvan | Sales KPI-k a főoldalon |

**Megfelelőség:** 95% - Teljes körű CRM

---

## 3. Összesített Megfelelőség

| Kritérium | Megfelelőség | Prioritás |
|-----------|--------------|-----------|
| 1. Beszerzés és készletgazdálkodás | 40% | Közepes |
| 2. Elektronikus iratkezelés | 85% | Alacsony |
| 3. Értékesítés és ügyfélkapcsolat | 95% | - |
| 4. Internetes értékesítés | 0%* | N/A |
| 5. Kontrolling és döntéstámogatás | 90% | - |
| 6. Munkafolyamat-irányítás | 70% | Közepes |
| 7. Online marketing | 0%* | N/A |
| 8. Pénzügyi és számviteli | 95% | - |
| 9. Táv- és csoportmunka | 75% | Alacsony |
| 10. CRM | 95% | - |

*Nem releváns a cég tevékenységéhez

**Átlagos megfelelőség (releváns kritériumok):** 80%

---

## 4. Fejlesztési Prioritások (MVP szint)

### Magas prioritás
1. **Készletgazdálkodás alapok** - Készlet entitás, mozgások, egyszerű riport

### Közepes prioritás
2. **SharePoint aktiválás** - Azure konfiguráció, mappa struktúra
3. **Workflow bővítés** - Értesítések, emlékeztetők

### Alacsony prioritás
4. **Offline mód** - PWA implementáció
5. **Email integráció** - CRM automatizálás

---

## 5. Meglévő Modulok Részletes Leírása

### 5.1 Dashboard (Főoldal)
- Admin dashboard KPI kártyákkal
- Sales pipeline widget
- Legutóbbi bejegyzések
- Egységenkénti hozzáférés

### 5.2 Napi adatok
- Éttermi szoftver forgalom rögzítés
- Pénztárgép adatok ÁFA kulcsonként
- Fizetési módok (készpénz, kártya)
- Házipénztár kezelés
- Napi kifizetések

### 5.3 Kifizetések
- Beszállítói számlák rögzítése
- Hivatalos/nem hivatalos megkülönböztetés
- Több deviza támogatás
- Fizetési mód választás

### 5.4 Rendezvények
- Projekt/esemény alapú kezelés
- Bevétel és költség összesítés
- Részletes projekt oldal

### 5.5 Riportok
- Havi forgalom riport
- Pénztárgép jelentés
- Készpénz bevétel kimutatás
- Rendezvény összesítő
- Havi tábla (költség-bevétel)
- Export funkciók

### 5.6 Ügyfelek
- Cégek nyilvántartása
- Kontakt személyek
- Típus (ügyfél/beszállító)
- Beszállító kategóriák

### 5.7 Dealek
- Opportunity kezelés
- Pipeline nézet
- Státusz workflow
- Súlyozott forecast
- Havi előrejelzés

### 5.8 Sales események
- Kommunikáció napló
- Prioritás kezelés
- Deal kapcsolat

### 5.9 Dokumentumok
- Fájl feltöltés
- Témakör kezelés
- Keresés és szűrés
- SharePoint integráció (előkészítve)

### 5.10 Budget
- Havi tervadatok
- Egységenkénti budget
- Státusz workflow
- Előző hónap másolás

### 5.11 Kontrolling
- Terv-tény elemzés
- Eltérés számítás
- Színkódolt indikátorok
- Egységenkénti bontás

### 5.12 Adminisztráció
- Egységek kezelése
- Felhasználók kezelése
- Beállítások

---

## 6. Következtetés

A Pepper House SAP rendszer **erős alapokkal** rendelkezik a pályázati kritériumok többségében. A **CRM, pénzügyi és kontrolling modulok** közel teljes funkcionalitást nyújtanak.

A legfontosabb fejlesztési területek:
1. Készletgazdálkodás modul implementálása
2. SharePoint integráció aktiválása
3. Workflow automatizálás bővítése

A rendszer jelenlegi állapotában a releváns kritériumok **80%-át teljesíti**, a tervezett MVP fejlesztésekkel ez **90%+ szintre** emelhető.
