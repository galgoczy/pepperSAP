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

### 2.1 Environment Variables
Add hozzá ezeket a Supabase projekthez (Settings → Edge Functions → Environment Variables):

```
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
```

### 2.2 Auth Provider beállítása
1. Menj: Authentication → Providers
2. Keresd meg: "Azure (Microsoft)"
3. Engedélyezd és add meg:
   - **Azure Client ID**: (az 1.5-ből)
   - **Azure Client Secret**: (az 1.5-ből)
   - **Azure Tenant URL**: `https://login.microsoftonline.com/YOUR_TENANT_ID`

### 2.3 Redirect URL ellenőrzése
A Supabase Authentication oldalon találod a pontos Redirect URL-t.
Ezt kell megadni az Azure App Registration-ben.

---

## 3. Storage Account beállítása (info@pepperhouse.hu)

A dokumentumok egy kijelölt fiók OneDrive-jára kerülnek.

### 3.1 Első bejelentkezés
1. Az admin felületen menj a Dokumentumok oldalra
2. Kattints a "SharePoint csatlakoztatása" gombra
3. Jelentkezz be az info@pepperhouse.hu fiókkal
4. Fogadd el a jogosultságokat

### 3.2 Mappastruktúra
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

## 4. Felhasználói bejelentkezés engedélyezése (opcionális)

Ha azt szeretnéd, hogy más felhasználók is Microsoft fiókkal jelentkezhessenek be:

### 4.1 Multi-tenant app
Az App Registration-ben:
1. Menj: "Authentication"
2. Supported account types: `Accounts in any organizational directory`

### 4.2 Vagy: Külső felhasználók hozzáadása
Az Azure AD-ben:
1. Menj: "Users" → "External users"
2. Invite the users you want to allow

---

## 5. Tesztelés

### 5.1 Checklist
- [ ] Azure App Registration létrehozva
- [ ] API permissions megadva és jóváhagyva
- [ ] Supabase Auth provider beállítva
- [ ] Redirect URI-k egyeznek
- [ ] Storage account (info@pepperhouse.hu) csatlakoztatva
- [ ] Mappastruktúra létrejött

### 5.2 Hibakeresés
- **"AADSTS50011"**: Redirect URI nem egyezik - ellenőrizd mindkét helyen
- **"AADSTS65001"**: Admin consent szükséges - menj az API permissions-hez
- **"AADSTS700016"**: Rossz tenant - ellenőrizd a tenant ID-t

---

## Környezeti változók összefoglaló

```env
# .env.local (fejlesztéshez)
VITE_AZURE_CLIENT_ID=your-client-id
VITE_AZURE_TENANT_ID=your-tenant-id

# Supabase Edge Functions (production)
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
```

---

## Támogatás

Ha elakadsz, a Microsoft dokumentáció:
- [App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/overview)
- [OneDrive API](https://docs.microsoft.com/en-us/graph/api/resources/onedrive)
