# Pepper House SAP - Modul Összefoglaló

## Rendszer modulok egy oldalon

---

### Pénzügyi modulok

| Modul | Funkciók |
|-------|----------|
| **Napi adatok** | Bevétel rögzítés, ÁFA bontás, pénztárgép adatok, házipénztár |
| **Kifizetések** | Számlák, kiadások, hivatalos/nem hivatalos, több deviza |
| **Riportok** | Havi összesítők, pénztárgép jelentés, Excel/PDF export |
| **Budget** | Havi tervadatok, egységenkénti tervezés, státusz workflow |
| **Kontrolling** | Terv-tény elemzés, eltérés %, színkódolt figyelmeztetések |

---

### CRM modulok

| Modul | Funkciók |
|-------|----------|
| **Ügyfelek** | Cégek, kontakt személyek, ügyfél/beszállító típus |
| **Sales események** | Hívás, email, meeting napló, prioritások |
| **Dealek** | Opportunity pipeline, státuszok, súlyozott forecast |

---

### Működési modulok

| Modul | Funkciók |
|-------|----------|
| **Rendezvények** | Projektek, bevétel/költség összesítés |
| **Dokumentumok** | Fájl kezelés, témakörök, SharePoint integráció |
| **Készletek** | *Tervezett* - API integráció szükséges |

---

### Adminisztráció

| Modul | Funkciók |
|-------|----------|
| **Egységek** | Üzletek, költséghelyek kezelése |
| **Felhasználók** | Jogosultságok, szerepkörök |
| **Beállítások** | Rendszer konfiguráció |

---

### Összesen: **12 aktív modul** + 1 tervezett

---

### Felhasználói szerepkörök

| Szerepkör | Hozzáférés |
|-----------|------------|
| **Admin** | Minden modul, minden egység |
| **Unit (Egység)** | Napi adatok, kifizetések, riportok |
| **Events** | Rendezvények modul |
| **Accountant** | Pénztárgép riportok |

---

### Technológia

- React 19 + Vite frontend
- Supabase (PostgreSQL) backend
- Tailwind CSS dizájn
- Microsoft 365 integráció (előkészítve)

---

**Verzió:** 1.0.0 | **Utolsó frissítés:** 2026. január 28.
