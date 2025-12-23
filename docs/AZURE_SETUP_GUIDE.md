# Microsoft 365 / Azure AD Beállítási Útmutató

Ez az útmutató segít beállítani a Microsoft 365 integrációt a Pepper House rendszerhez.

## 1. Azure Portal - App Registration

### 1.1 Bejelentkezés
1. Menj a https://portal.azure.com oldalra
2. Jelentkezz be a Microsoft 365 admin fiókkal

### 1.2 App Registration létrehozása
1. Keresd meg: "App registrations" vagy "Alkalmazásregisztrációk"
2. Kattints: "+ New registration"
3. Töltsd ki:
   - **Name**: `Pepper House Pénzügyi Rendszer`
   - **Supported account types**: `Accounts in this organizational directory only` (Single tenant)
   - **Redirect URI**:
     - Platform: `Web`
     - URL: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`

4. Kattints "Register"

> **FONTOS**: A Redirect URI-t a Supabase Dashboard-ból tudod kimásolni:
> Authentication → Providers → Azure → Callback URL (copy icon)

### 1.3 Client Secret létrehozása
1. Az app oldalán menj: "Certificates & secrets"
2. Kattints: "+ New client secret"
3. Description: `Pepper House Production`
4. Expires: `24 months` (vagy amit szeretnél)
5. **FONTOS**: Másold ki a "Value" értéket! Ez csak egyszer látható!

### 1.4 API Permissions beállítása
1. Menj: "API permissions"
2. Kattints: "+ Add a permission"
3. Válaszd: "Microsoft Graph"
4. Válaszd: "Delegated permissions"
5. Add hozzá ezeket:
   - `openid` (bejelentkezéshez)
   - `email` (email cím lekérdezés)
   - `profile` (profil adatok)
   - `User.Read` (alapértelmezett)
   - `Files.ReadWrite.All` (OneDrive/SharePoint fájlok)
   - `Sites.ReadWrite.All` (SharePoint site-ok)
   - `offline_access` (refresh token)

6. Kattints: "Grant admin consent for [Organization]"

### 1.5 Fontos adatok összegyűjtése
Az app "Overview" oldaláról másold ki:
- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Client Secret**: (amit az 1.3-ban mentettél)

---

## 2. Supabase Beállítások

### 2.1 Auth Provider beállítása (KÖTELEZŐ - Bejelentkezéshez!)
1. Menj: **Authentication → Providers**
2. Keresd meg: **"Azure (Microsoft)"** és kapcsold be
3. Add meg:
   - **Azure Client ID**: (az 1.5-ből)
   - **Azure Client Secret**: (az 1.3-ból)
   - **Azure Tenant URL**: `https://login.microsoftonline.com/YOUR_TENANT_ID`

4. **Másold ki a Callback URL-t** és add hozzá az Azure App Registration-ben:
   - Azure Portal → App Registration → Authentication → Add a redirect URI
   - `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

### 2.2 Redirect URI-k az Azure-ban
Az Azure App Registration → Authentication részben ezeknek kell lennie:
```
https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
https://your-vercel-app.vercel.app/auth/microsoft/callback
```

### 2.3 Vercel Environment Variables
A Vercel Dashboard → Settings → Environment Variables:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_AZURE_CLIENT_ID=your-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
```

---

## 3. Engedélyezett Felhasználók

A rendszer csak az alábbi @pepperhouse.hu email címeket engedi be:

| Email | Szerepkör | Egység |
|-------|-----------|--------|
| `gergo@pepperhouse.hu` | Admin | - |
| `info@pepperhouse.hu` | Admin | - |
| `szentkiralyi@pepperhouse.hu` | Unit | Szentkirályi |
| `rendezveny@pepperhouse.hu` | Events | Rendezvény Egység |

> A szerepkör kiosztás automatikus - az első bejelentkezéskor a rendszer létrehozza a profilt.

---

## 4. Storage Account beállítása (info@pepperhouse.hu)

A dokumentumok egy kijelölt fiók OneDrive-jára kerülnek.

### 4.1 Első bejelentkezés
1. Az admin felületen menj a Dokumentumok oldalra
2. Kattints a "SharePoint csatlakoztatása" gombra
3. Jelentkezz be az info@pepperhouse.hu fiókkal
4. Fogadd el a jogosultságokat

### 4.2 Mappastruktúra
A rendszer automatikusan létrehozza:
```
OneDrive/
└── PepperHouse Documents/
    ├── Számlák/
    │   ├── 2024/
    │   └── 2025/
    ├── Szerződések/
    │   ├── 2024/
    │   └── 2025/
    ├── HR dokumentumok/
    │   └── ...
    └── ...
```

---

## 5. Tesztelés

### 5.1 Checklist
- [ ] Azure App Registration létrehozva
- [ ] API permissions megadva és jóváhagyva
- [ ] **Supabase Auth Azure provider beállítva**
- [ ] Redirect URI-k egyeznek (Azure ÉS Supabase)
- [ ] Vercel env vars beállítva
- [ ] Storage account (info@pepperhouse.hu) csatlakoztatva
- [ ] Mappastruktúra létrejött

### 5.2 Hibakeresés
- **"AADSTS50011"**: Redirect URI nem egyezik - ellenőrizd mindkét helyen
- **"AADSTS65001"**: Admin consent szükséges - menj az API permissions-hez
- **"AADSTS700016"**: Rossz tenant - ellenőrizd a tenant ID-t
- **"provider is not enabled"**: Supabase-ben nincs bekapcsolva az Azure provider

---

## 6. SQL Futtatása

Futtasd a Supabase SQL Editor-ban:
`supabase/COMPLETE_UPDATE.sql`

Ez létrehozza:
- companies (cégek)
- company_contacts (kontaktszemélyek)
- sales_events (CRM események)
- microsoft_tokens frissítése

---

## Támogatás

Ha elakadsz:
- [Supabase Azure Auth](https://supabase.com/docs/guides/auth/social-login/auth-azure)
- [App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/overview)
