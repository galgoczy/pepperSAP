-- =============================================================================
-- Rendszerszintű beállítások – „Szigorú elszámolás mód”
-- Készült: 2026-09-03
--
-- Az eddigi beállítások a böngészőben éltek (localStorage), tehát felhasználón-
-- ként és gépenként mások voltak. A szigorú elszámolás viszont az egész
-- rendszerre vonatkozó szabály: minden egységnél ugyanúgy kell működnie, ezért
-- az adatbázisban él. Egyetlen kulcs-érték tábla, JSON értékkel, hogy a
-- későbbi rendszerbeállítások is ide kerülhessenek.
--
-- strict_accounting:
--   { "enabled": false, "since": null }
--   enabled – be van-e kapcsolva a kapu (alapból KI)
--   since   – ettől a naptól számítanak a napok (a korábbi történet nem zár le
--             semmit); null = nincs korlát
--
-- Idempotens. Adathoz nem nyúl.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM user_profiles WHERE id = auth.uid() $$;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;

CREATE TABLE IF NOT EXISTS system_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Olvas: minden bejelentkezett (a napi rögzítőnek tudnia kell a szabályt).
-- Ír: csak admin.
DROP POLICY IF EXISTS "ss_select" ON system_settings;
CREATE POLICY "ss_select" ON system_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ss_insert" ON system_settings;
CREATE POLICY "ss_insert" ON system_settings
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "ss_update" ON system_settings;
CREATE POLICY "ss_update" ON system_settings
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- Alapérték: kikapcsolva. Ha már létezik, nem írja felül.
INSERT INTO system_settings (key, value)
VALUES ('strict_accounting', '{"enabled": false, "since": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE system_settings IS 'Rendszerszintű (minden egységre érvényes) beállítások, kulcs–JSON párok';
