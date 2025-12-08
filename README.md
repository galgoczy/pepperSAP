# Pepper House Pénzügyi Nyilvántartó Rendszer

Modern pénzügyi nyilvántartó webalkalmazás a Pepper House vendéglátó vállalkozás számára.

## Funkciók

- **Napi forgalom rögzítés** - Éttermi szoftver és pénztárgép adatok ÁFA bontással
- **Házipénztár kezelés** - Hivatalos és egyéb zseb nyilvántartása
- **Kifizetések** - Számlák és kiadások rögzítése
- **Rendezvények** - Projektek bevételeinek és költségeinek kezelése
- **Riportok és exportok** - Havi összesítők CSV/Excel formátumban
- **Többféle felhasználói szerepkör** - Admin, éttermi egység, rendezvény egység

## Technológiai stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth)
- **Deployment:** Vercel

## Telepítés

### 1. Függőségek telepítése

```bash
npm install
```

### 2. Környezeti változók

Hozz létre egy `.env.local` fájlt a projekt gyökérkönyvtárában:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase adatbázis beállítása

Futtasd a `supabase/schema.sql` fájl tartalmát a Supabase SQL editorban.

### 4. Fejlesztői szerver indítása

```bash
npm run dev
```

## Build és Deployment

```bash
npm run build
```

A Vercel automatikusan deployol minden push után a GitHub repositoryból.

## Felhasználói szerepkörök

- **Admin** - Teljes hozzáférés minden funkcióhoz és egységhez
- **Unit** - Éttermi egység kezelése (napi adatok, kifizetések)
- **Events** - Rendezvény egység kezelése (projektek, bevételek, költségek)

## Első felhasználó létrehozása

1. Hozz létre egy felhasználót a Supabase Auth panelen
2. Add hozzá a user_profiles táblához:

```sql
INSERT INTO user_profiles (id, full_name, role)
VALUES ('user-id-from-auth', 'Admin Név', 'admin');
```

## Projekt struktúra

```
src/
├── components/
│   ├── auth/        # Autentikáció
│   ├── common/      # Közös UI komponensek
│   ├── dashboard/   # Dashboard komponensek
│   ├── daily/       # Napi adatok formok
│   ├── events/      # Rendezvény modul
│   ├── expenses/    # Kifizetések modul
│   ├── layout/      # Layout komponensek
│   └── reports/     # Riportok
├── contexts/        # React Context-ek
├── hooks/           # Custom hooks
├── lib/             # Utility függvények
└── pages/           # Oldal komponensek
```

## Licensz

Privát projekt - Minden jog fenntartva

© 2024 Pepper House
