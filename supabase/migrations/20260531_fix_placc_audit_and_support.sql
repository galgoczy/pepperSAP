-- =============================================================================
-- Hibajavítás: Pepper Placc üzenetküldés, Audit napló nézet és Támogatás menü
-- Készült: 2026-05-31
--
-- Ez a migráció HÁROM élesben jelentkező hibát javít, és teljesen idempotens
-- (többször is lefuttatható). Csak a hiányzó oszlopokat / szabályzatokat adja
-- hozzá, meglévő táblát NEM hoz létre újra eltérő definícióval.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. BUG 1 + BUG 2: audit_log tábla hiányzó oszlopainak pótlása
-- -----------------------------------------------------------------------------
-- Tünet (Bug 1): a Pepper Placc-ban üzenet küldésekor:
--   "column \"user_name\" of relation \"audit_log\" does not exist"
--
-- Ok: a 20260531_fix_audit_triggers.sql az audit_trigger_func() triggert
--     felteszi a workspace_messages (Pepper Placc üzenetek) táblára is. A
--     trigger függvénye INSERT-et hajt végre az audit_log táblába a
--     table_name, record_id, action, user_id, user_email, USER_NAME, old_data,
--     new_data, changed_fields oszlopokkal. Ha az éles adatbázisban az
--     audit_log táblát egy régebbi definíció hozta létre user_name nélkül,
--     a CREATE TABLE IF NOT EXISTS sosem adta hozzá az új oszlopot -> a trigger
--     INSERT-je elhasal, és visszagörgeti a Placc-üzenet beszúrását is.
--
-- Tünet (Bug 2): az "Audit napló" (AuditLogPage.jsx) a user_name oszlopra
--     szűr (user_name.ilike), illetve a *-ot kéri le, így a hiányzó oszlop
--     miatt a lekérdezés is hibára futhat.
--
-- Megoldás: minden olyan oszlopot biztosítunk, amelyet a log_audit_event /
-- audit_trigger_func() függvény ír, ÉS amelyet az AuditLogPage olvas. Az
-- ADD COLUMN IF NOT EXISTS biztonságos akkor is, ha az oszlop már létezik.

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS table_name     TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS record_id      TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS action         TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_id        UUID;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_email     TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_name      TEXT;   -- a hiányzó oszlop (Bug 1 fő oka)
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS old_data       JSONB;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS new_data       JSONB;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS changed_fields TEXT[];
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip_address     TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_agent     TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ DEFAULT NOW();


-- -----------------------------------------------------------------------------
-- 2. BUG 3: support_tickets tábla és RLS szabályzatok javítása
-- -----------------------------------------------------------------------------
-- Tünet: a "Támogatás" menü "Hiba a bejelentések betöltésekor" üzenettel
--        elhasal a support_tickets SELECT-jénél.
--
-- Ok: a 20260209_support_tickets.sql admin szabályzatai egy AL-LEKÉRDEZÉST
--     használnak a user_profiles táblán:
--       EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
--     Mivel a user_profiles táblán is van RLS, ez "infinite recursion detected
--     in policy" típusú hibát okozhat (klasszikus Supabase hiba), ami a teljes
--     SELECT-et megbuktatja.
--
-- Megoldás:
--   (a) Biztosítjuk, hogy a tábla és minden, az oldal által használt oszlop
--       létezzen (CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS).
--   (b) A rekurzív szabályzatokat lecseréljük a már meglévő, NEM rekurzív
--       SECURITY DEFINER segédfüggvényre: get_my_role() (lásd
--       20260528_fix_budget_view_security.sql), amely a user_profiles tábla
--       role oszlopát olvassa RLS-megkerüléssel.
--
-- A felhasználói szerepkör TÉNYLEGES tárolási helye ebben a repóban:
--   tábla: user_profiles, oszlop: role, admin érték: 'admin'.

-- 2/a. A tábla létrehozása, ha még nem létezik (létező táblát NEM ír felül).
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  reporter_name TEXT NOT NULL,
  reporter_email TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'bug',
  severity TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  browser_info TEXT,
  page_url TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2/b. Minden, az oldal (SupportPage.jsx) által írt/olvasott oszlop biztosítása.
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS user_id          UUID;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS reporter_name    TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS reporter_email   TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS subject          TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS description      TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category         TEXT DEFAULT 'bug';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS severity         TEXT DEFAULT 'normal';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'new';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_to      UUID;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolved_at      TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS browser_info     TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS page_url         TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS screenshot_url   TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- 2/c. RLS bekapcsolása (idempotens, ha már be van kapcsolva, nem hibázik).
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- 2/d. NEM rekurzív SECURITY DEFINER segédfüggvény biztosítása.
--      Ha a 20260528_fix_budget_view_security.sql már lefutott, ez csak
--      felülírja ugyanazzal a definícióval. Ha még nem, itt jön létre, hogy
--      ez a migráció önállóan is futtatható legyen.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;

-- 2/e. Régi (rekurzív és egyéb) szabályzatok eltávolítása, majd újraépítés.
DROP POLICY IF EXISTS "Users can view own tickets"   ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets"     ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets"  ON support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets"    ON support_tickets;

-- Saját jegyek olvasása.
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- Saját jegy létrehozása.
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin: minden jegy olvasása (NEM rekurzív, get_my_role() segédfüggvénnyel).
CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR SELECT USING (get_my_role() = 'admin');

-- Admin: jegyek frissítése (NEM rekurzív, get_my_role() segédfüggvénnyel).
CREATE POLICY "Admins can update tickets" ON support_tickets
  FOR UPDATE USING (get_my_role() = 'admin');
