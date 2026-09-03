# Adatmentés – napi biztonsági mentés Mac minivel

A pepperSAP minden adata egyetlen Supabase (PostgreSQL) adatbázisban van. Feltöltött
fájlokat nem tárolunk Supabase Storage-ban (a dokumentumok a Microsoft 365-ben
vannak), tehát **a teljes mentés = az adatbázis mentése**.

Ez a leírás egy irodai Mac minit állít be úgy, hogy minden éjjel készítsen saját
mentést, ellenőrizze is, és tartsa meg a régebbieket.

## Miért kell, ha a Supabase is ment?

A Supabase napi mentést készít, de az a **saját fiókunkon belül** van. Nem véd az
ellen, ha a projektet véletlenül törlik, ha a fiókhoz elveszik a hozzáférés, vagy ha
egy hibás művelet napokig észrevétlen marad és a megőrzési idő már túllépte. A saját,
házon belüli másolat ettől független.

---

## 1. Előkészítés a Mac minin

### 1.1 Homebrew és a Postgres kliens

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install libpq
```

A `libpq` adja a `pg_dump` és `pg_restore` parancsokat. Apple Silicon Macen ide kerülnek:
`/opt/homebrew/opt/libpq/bin/`. Intel Macen: `/usr/local/opt/libpq/bin/` — ezt a
konfigurációban be kell állítani (lásd lentebb).

Ellenőrzés:

```bash
/opt/homebrew/opt/libpq/bin/pg_dump --version
```

> **Fontos:** a `pg_dump` verziója nem lehet régebbi, mint az adatbázis szerveré. A
> `brew install libpq` mindig friss verziót ad, ezért jó ez, és nem a macOS-ben
> esetleg meglévő régi kliens.

### 1.2 A kapcsolati sztring megszerzése

A Supabase felületén: **Project → Connect** gomb (jobb felül) → **PostgreSQL**
(nem a pooler „Transaction” módja, mert az nem alkalmas `pg_dump`-hoz) →
**Session pooler** vagy **Direct connection**.

- **Session pooler** (`aws-0-...pooler.supabase.com:5432`) – ezt válaszd, ez IPv4-en
  is működik, tehát egy sima irodai hálózatról biztosan elérhető.
- **Direct connection** (`db.<projekt>.supabase.co:5432`) – csak akkor, ha a hálózat
  tud IPv6-ot.

A kapott sztring így néz ki (a `[YOUR-PASSWORD]` helyére az adatbázis jelszava kerül):

```
postgresql://postgres.uqqcwfgmpegkdizkqbrd:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

### 1.3 Konfigurációs fájl

A jelszó **soha nem kerül a git-be**. Hozz létre egy fájlt a Mac minin:

```bash
nano ~/.pepper-backup.env
```

Tartalma:

```bash
# A teljes kapcsolati sztring, jelszóval együtt.
PEPPER_DB_URI="postgresql://postgres.uqqcwfgmpegkdizkqbrd:JELSZO@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Hova kerüljenek a mentések.
PEPPER_BACKUP_DIR="$HOME/PepperBackup"

# Másodpéldány (külső lemez vagy felhő mappa). Üresen hagyható, de erősen ajánlott.
PEPPER_BACKUP_SECONDARY_DIR="$HOME/Library/CloudStorage/GoogleDrive-…/Sajat meghajto/PepperBackup"

# Megőrzés: hány napi és hány havi mentés maradjon.
PEPPER_KEEP_DAILY=30
PEPPER_KEEP_MONTHLY=12

# Intel Macen írd át /usr/local/opt/libpq/bin/… -re.
PEPPER_PG_DUMP="/opt/homebrew/opt/libpq/bin/pg_dump"
PEPPER_PG_RESTORE="/opt/homebrew/opt/libpq/bin/pg_restore"
```

Jogosultság szűkítése, hogy más felhasználó ne olvashassa:

```bash
chmod 600 ~/.pepper-backup.env
```

### 1.4 A script telepítése

```bash
mkdir -p ~/PepperBackup
cp scripts/backup/pepper-backup.sh ~/pepper-backup.sh
chmod +x ~/pepper-backup.sh
```

Első futtatás kézzel:

```bash
~/pepper-backup.sh
```

Sikeres futásnál a `~/PepperBackup/daily/` mappában megjelenik a `pepper-ÉÉÉÉ-HH-NN.dump`
fájl, és a `~/PepperBackup/backup.log` végén ott a „Mentés kész” sor.

---

## 2. Napi időzítés (launchd)

```bash
cp scripts/backup/com.pepperhouse.sap-backup.plist ~/Library/LaunchAgents/
nano ~/Library/LaunchAgents/com.pepperhouse.sap-backup.plist
```

A fájlban a három `/PATH/TO` helyére írd a valódi útvonalat, például
`/Users/pepper/pepper-backup.sh` és `/Users/pepper/PepperBackup/...`.

Betöltés:

```bash
launchctl unload ~/Library/LaunchAgents/com.pepperhouse.sap-backup.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.pepperhouse.sap-backup.plist
launchctl list | grep pepperhouse
```

Azonnali próbafuttatás az időzítőn keresztül:

```bash
launchctl start com.pepperhouse.sap-backup
```

### 2.1 Hogy a gép biztosan fusson hajnalban

A LaunchAgent akkor fut, ha a felhasználó be van jelentkezve. Egy dedikált Mac minin
állítsd be:

- **Rendszerbeállítások → Felhasználók → Bejelentkezési opciók → Automatikus
  bejelentkezés**: legyen bekapcsolva.
- **Rendszerbeállítások → Energiatakarékosság**: „Automatikus alvás megakadályozása,
  ha a kijelző ki van kapcsolva”, és „Indítás áramkimaradás után”.
- Biztonsági ébresztés a mentés előtt:

```bash
sudo pmset repeat wakeorpoweron MTWRFSU 03:25:00
```

Ha a gép mégis aludt, a launchd az ébredés után pótolja a kimaradt futást.

---

## 3. Mit csinál pontosan a script

1. **Ideiglenes fájlba** menti az adatbázist (`pg_dump`, custom formátum,
   tömörítve). Így egy megszakadt futás soha nem írja felül a tegnapi jó mentést.
2. **Ellenőrzi** a mentést: elég nagy-e, és a `pg_restore --list` végig tudja-e
   olvasni. Egy csonka vagy sérült fájl itt kibukik, nem hónapok múlva.
3. Csak ezután nevezi át a végleges névre.
4. A hónap első mentéséről **havi példányt** is tesz félre.
5. Ha be van állítva, **másodpéldányt** másol a külső lemezre vagy felhő mappába.
6. **Forgat**: az utolsó 30 napi és 12 havi mentés marad meg.
7. Mindent naplóz (`~/PepperBackup/backup.log`), és hiba esetén macOS értesítést dob,
   valamint nem nullával lép ki.

A mentés a `public` séma teljes tartalmát viszi: minden tábla, adat, index,
megszorítás. A `auth` séma (bejelentkezési felhasználók) nem része — azt a Supabase
kezeli, és új projektbe amúgy sem lehet közvetlenül visszatölteni. Vészhelyzetben a
felhasználókat a felületen kell újra létrehozni, az adat viszont teljes.

---

## 4. Visszaállítás

Próbáld ki egyszer élesben is, mert egy mentés csak akkor ér valamit, ha a
visszatöltés is menne. Teszthez érdemes egy **külön Supabase projektet** használni,
nem az éleset.

Teljes visszatöltés egy üres adatbázisba:

```bash
/opt/homebrew/opt/libpq/bin/pg_restore \
  --dbname="postgresql://postgres.<CEL-PROJEKT>:JELSZO@...:5432/postgres" \
  --no-owner --no-privileges --clean --if-exists \
  ~/PepperBackup/daily/pepper-2026-09-03.dump
```

Csak egyetlen tábla visszatöltése (például ha egy táblát letöröltek):

```bash
/opt/homebrew/opt/libpq/bin/pg_restore \
  --dbname="..." --no-owner --no-privileges \
  --data-only --table=daily_revenue \
  ~/PepperBackup/daily/pepper-2026-09-03.dump
```

Mi van a mentésben (tartalomjegyzék):

```bash
/opt/homebrew/opt/libpq/bin/pg_restore --list ~/PepperBackup/daily/pepper-2026-09-03.dump
```

---

## 5. Adatvédelem

A mentés **személyes adatokat tartalmaz** (dolgozói nevek, bérek, EFO adatok), ezért:

- A Mac minin legyen bekapcsolva a **FileVault** (Rendszerbeállítások → Adatvédelem
  és biztonság → FileVault). Enélkül a lemez kiszerelve bárki számára olvasható.
- A mentésfájlok jogosultsága `600` (csak a tulajdonos olvashatja) – ezt a script
  állítja be.
- A `~/.pepper-backup.env` szintén `600`, és nincs a git-ben.
- Ha a másodpéldány felhőbe megy, az a felhőszolgáltatónál is személyes adat: olyan
  céges fiókba tedd, amihez csak az arra jogosultak férnek hozzá.

---

## 6. Ellenőrzés – mit nézz meg havonta

- `tail -30 ~/PepperBackup/backup.log` – az utolsó futások rendben mentek-e.
- `ls -lh ~/PepperBackup/daily/` – megvan-e a mai fájl, és a méret nagyjából stabil-e
  (hirtelen zsugorodás gyanús).
- Évente egyszer: egy visszatöltési próba teszt projektbe (4. pont).

## 7. Hibaelhárítás

| Tünet | Ok és megoldás |
| --- | --- |
| `could not translate host name` | IPv6-only direct connection egy IPv4 hálózaton. Válts a Session poolerre a Supabase Connect ablakában. |
| `password authentication failed` | Rossz vagy időközben lecserélt adatbázis jelszó. Frissítsd a `~/.pepper-backup.env` fájlt. |
| `server version mismatch` | Régi `pg_dump`. `brew upgrade libpq`, és a konfigurációban a Homebrew-s útvonal legyen. |
| Nem fut hajnalban | `launchctl list | grep pepperhouse` – ha nincs benne, töltsd be újra. Nézd meg az automatikus bejelentkezést és az energiabeállításokat. |
| „a mentés gyanúsan kicsi” | A kapcsolat megszakadt futás közben. A régi mentések érintetlenek; futtasd újra kézzel. |
