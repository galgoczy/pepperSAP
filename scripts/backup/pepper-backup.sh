#!/bin/bash
#
# pepperSAP – napi biztonsági mentés a Supabase adatbázisról.
#
# Egy teljes pg_dump-ot készít (custom formátum, tömörítve), ELLENŐRZI, hogy az
# archívum olvasható, majd forgatja a régi mentéseket. Bármi hiba esetén nem
# nullával lép ki, és értesítést dob a macOS-en, hogy a hiba ne maradjon némán.
#
# Beállítás és időzítés: docs/ADATMENTES.md
#
# A konfigurációt (benne a jelszavas kapcsolati sztringgel) NEM ez a fájl
# tartalmazza, hanem ~/.pepper-backup.env (chmod 600). Így a jelszó soha nem
# kerül a git-be.

set -euo pipefail

CONFIG_FILE="${PEPPER_BACKUP_CONFIG:-$HOME/.pepper-backup.env}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "HIBA: hiányzik a konfiguráció: $CONFIG_FILE" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${PEPPER_DB_URI:?HIBA: a PEPPER_DB_URI nincs beállítva a konfigurációban}"
BACKUP_DIR="${PEPPER_BACKUP_DIR:-$HOME/PepperBackup}"
SECONDARY_DIR="${PEPPER_BACKUP_SECONDARY_DIR:-}"
KEEP_DAILY="${PEPPER_KEEP_DAILY:-30}"
KEEP_MONTHLY="${PEPPER_KEEP_MONTHLY:-12}"
# Egy valódi mentés jóval nagyobb ennél; ez alatt hibát jelzünk (üres/csonka dump).
MIN_SIZE_BYTES="${PEPPER_MIN_SIZE_BYTES:-51200}"
PG_DUMP="${PEPPER_PG_DUMP:-/opt/homebrew/opt/libpq/bin/pg_dump}"
PG_RESTORE="${PEPPER_PG_RESTORE:-/opt/homebrew/opt/libpq/bin/pg_restore}"

DAILY_DIR="$BACKUP_DIR/daily"
MONTHLY_DIR="$BACKUP_DIR/monthly"
LOG_FILE="$BACKUP_DIR/backup.log"
STAMP="$(date +%Y-%m-%d)"
NOW="$(date '+%Y-%m-%d %H:%M:%S')"
TARGET="$DAILY_DIR/pepper-$STAMP.dump"

mkdir -p "$DAILY_DIR" "$MONTHLY_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

notify() {
  # Látható visszajelzés a Mac minin; ha nincs GUI munkamenet, csendben elbukik.
  /usr/bin/osascript -e "display notification \"$1\" with title \"pepperSAP mentés\"" 2>/dev/null || true
}

fail() {
  log "HIBA: $*"
  notify "SIKERTELEN mentés: $*"
  exit 1
}

log "=== Mentés indul ($NOW) ==="

[[ -x "$PG_DUMP" ]] || fail "nem található a pg_dump itt: $PG_DUMP (brew install libpq)"
[[ -x "$PG_RESTORE" ]] || fail "nem található a pg_restore itt: $PG_RESTORE"

# 1) Mentés ideiglenes fájlba, hogy egy megszakadt futás soha ne írja felül a
#    tegnapi jó mentést egy féllel.
TMP_FILE="$(mktemp "$DAILY_DIR/.pepper-$STAMP.XXXXXX")"
cleanup() { rm -f "$TMP_FILE"; }
trap cleanup EXIT

log "pg_dump indul..."
if ! "$PG_DUMP" \
      --dbname="$PEPPER_DB_URI" \
      --format=custom \
      --compress=9 \
      --no-owner \
      --no-privileges \
      --schema=public \
      --file="$TMP_FILE" 2>>"$LOG_FILE"; then
  fail "a pg_dump hibára futott (részletek a logban: $LOG_FILE)"
fi

# 2) Ellenőrzés: van-e értelmes méret, és olvasható-e az archívum. A
#    pg_restore --list végigolvassa a tartalomjegyzéket, tehát egy csonka vagy
#    sérült fájl itt kibukik – nem csak a fájl létezését nézzük.
SIZE="$(stat -f%z "$TMP_FILE" 2>/dev/null || stat -c%s "$TMP_FILE")"
if (( SIZE < MIN_SIZE_BYTES )); then
  fail "a mentés gyanúsan kicsi ($SIZE bájt, elvárt minimum $MIN_SIZE_BYTES)"
fi

TABLES="$("$PG_RESTORE" --list "$TMP_FILE" 2>/dev/null | grep -c 'TABLE DATA' || true)"
if (( TABLES < 1 )); then
  fail "az archívum nem olvasható, vagy egyetlen tábla adatát sem tartalmazza"
fi

mv "$TMP_FILE" "$TARGET"
trap - EXIT
chmod 600 "$TARGET"
log "Kész: $TARGET ($((SIZE / 1024 / 1024)) MB, $TABLES tábla)"

# 3) Havi példány: a hónap első mentése megmarad hosszú távra is.
MONTH_FILE="$MONTHLY_DIR/pepper-$(date +%Y-%m).dump"
if [[ ! -f "$MONTH_FILE" ]]; then
  cp "$TARGET" "$MONTH_FILE"
  chmod 600 "$MONTH_FILE"
  log "Havi példány létrehozva: $MONTH_FILE"
fi

# 4) Másodpéldány (külső lemez / felhő mappa), ha be van állítva. Ha a cél épp
#    nem érhető el, az nem dönti el a mentést, de figyelmeztetünk rá.
#
#    Külső lemeznél ELŐBB ellenőrizzük, hogy a kötet tényleg csatolva van. A
#    /Volumes maga is írható, ezért egy lecsatolt lemez esetén a mkdir simán
#    létrehozná a mappát a belső lemezen: a mentés jónak látszana, valójában
#    nem a külső HDD-re kerülne, ráadásul a lemez később nem tudna a saját
#    nevén felcsatolódni.
volume_mounted() {
  local dir="$1"
  case "$dir" in
    /Volumes/*)
      local rest="${dir#/Volumes/}"
      local vol="/Volumes/${rest%%/*}"
      mount | grep -q " on ${vol} " || return 1
      ;;
  esac
  return 0
}

if [[ -n "$SECONDARY_DIR" ]]; then
  if ! volume_mounted "$SECONDARY_DIR"; then
    log "FIGYELEM: a másodpéldány célja nincs csatolva, kimarad: $SECONDARY_DIR"
    notify "A mentés kész, de a külső lemez nincs csatlakoztatva."
  elif mkdir -p "$SECONDARY_DIR" 2>/dev/null && cp "$TARGET" "$SECONDARY_DIR/" 2>>"$LOG_FILE"; then
    chmod 600 "$SECONDARY_DIR/$(basename "$TARGET")" 2>/dev/null || true
    log "Másodpéldány: $SECONDARY_DIR/$(basename "$TARGET")"
    # A másodpéldányt is forgatjuk, különben a külső lemez idővel megtelik.
    sec_old="$(ls -1t "$SECONDARY_DIR"/pepper-*.dump 2>/dev/null | tail -n +$((KEEP_DAILY + 1)) || true)"
    if [[ -n "$sec_old" ]]; then
      echo "$sec_old" | while read -r f; do rm -f "$f"; log "Törölve (másodpéldány forgatás): $f"; done
    fi
  else
    log "FIGYELEM: a másodpéldány nem készült el ide: $SECONDARY_DIR"
    notify "A mentés kész, de a másodpéldány nem készült el."
  fi
fi

# 5) Forgatás: a napi mentésekből az utolsó KEEP_DAILY, a haviakból KEEP_MONTHLY marad.
prune() {
  local dir="$1" keep="$2"
  local files
  files="$(ls -1t "$dir"/pepper-*.dump 2>/dev/null | tail -n +$((keep + 1)) || true)"
  if [[ -n "$files" ]]; then
    echo "$files" | while read -r f; do
      rm -f "$f"
      log "Törölve (forgatás): $f"
    done
  fi
}
prune "$DAILY_DIR" "$KEEP_DAILY"
prune "$MONTHLY_DIR" "$KEEP_MONTHLY"

DAILY_COUNT="$(ls -1 "$DAILY_DIR"/pepper-*.dump 2>/dev/null | wc -l | tr -d ' ')"
log "=== Mentés kész. Napi mentések száma: $DAILY_COUNT ==="
notify "Napi mentés kész ($((SIZE / 1024 / 1024)) MB)."
