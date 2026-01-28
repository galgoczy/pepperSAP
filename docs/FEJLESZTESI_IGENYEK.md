# Pepper House SAP - Fejlesztési Igények Összefoglaló

## MVP szintű fejlesztések pályázati megfelelőséghez

---

### Kritérium megfelelőség összesítés

| # | Kritérium | Jelenlegi | MVP cél |
|---|-----------|-----------|---------|
| 1 | Beszerzés/készlet | 40% | 70% |
| 2 | Iratkezelés | 85% | 95% |
| 3 | Értékesítés/CRM | 95% | 95% |
| 4 | Webáruház | N/A | N/A |
| 5 | Kontrolling | 90% | 95% |
| 6 | Workflow | 70% | 85% |
| 7 | Marketing | N/A | N/A |
| 8 | Pénzügy | 95% | 95% |
| 9 | Távmunka | 75% | 85% |
| 10 | CRM | 95% | 95% |
| **Átlag** | **80%** | **90%** |

---

### Magas prioritás

| Fejlesztés | Becsült méret | Leírás |
|------------|---------------|--------|
| **Készletgazdálkodás** | Nagy | Készlet entitás, mozgások, minimum figyelmeztetés |

**Részletek:**
- `inventory_items` tábla létrehozása
- `inventory_movements` tábla (bevét/kiad/selejt)
- Készlet lista oldal
- Mozgás rögzítő form
- Alapvető riport

---

### Közepes prioritás

| Fejlesztés | Becsült méret | Leírás |
|------------|---------------|--------|
| **SharePoint aktiválás** | Kicsi | Azure konfiguráció, szinkron |
| **Workflow értesítések** | Közepes | Email értesítések, emlékeztetők |

**SharePoint részletek:**
- Azure App Registration
- Környezeti változók beállítása
- SharePoint mappa struktúra

**Workflow részletek:**
- Budget jóváhagyás értesítés
- Deal lejárat emlékeztető
- Napi zárás emlékeztető

---

### Alacsony prioritás

| Fejlesztés | Becsült méret | Leírás |
|------------|---------------|--------|
| **PWA/Offline mód** | Közepes | Service worker, offline cache |
| **Email integráció** | Közepes | CRM email szinkron |
| **Negyedéves riportok** | Kicsi | Kontrolling bővítés |

---

### Nem szükséges fejlesztések

| Kritérium | Indoklás |
|-----------|----------|
| Webáruház | Nincs online értékesítés |
| Marketing | Nem core funkcionalitás |

---

### Összesítés

| Prioritás | Fejlesztések | Becsült összmunka |
|-----------|--------------|-------------------|
| Magas | 1 | ~20-30 óra |
| Közepes | 2 | ~15-20 óra |
| Alacsony | 3 | ~20-30 óra |
| **Összesen** | **6** | **~55-80 óra** |

---

### Ajánlott sorrend

1. ✅ Készletgazdálkodás MVP
2. ✅ SharePoint aktiválás
3. ⚪ Workflow értesítések
4. ⚪ Kontrolling bővítés
5. ⚪ PWA implementáció
6. ⚪ Email integráció

---

**Készült:** 2026. január 28.
