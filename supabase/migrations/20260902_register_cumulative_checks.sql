-- =============================================================================
-- Göngyölt forgalom "ellenőrizve" pipa – összes egység, pénztárgép (egyszerű)
-- Készült: 2026-09-02
--
-- Az admin jelentésben a pénztárgép időszaki göngyölt forgalma mellett egy
-- pipával jelölhető, hogy a számot ellenőrizték. A pipa egy (pénztárgép,
-- időszak) párhoz tartozik, és minden admin számára közös – ezért adatbázisban
-- él, nem a böngészőben.
--
-- Semmilyen forgalmi adathoz nem nyúl. Idempotens.
-- =============================================================================

-- Segédfüggvény a policy-khoz (azonos a 20260611_tighten_cash_rls.sql-ben
-- lévővel; ha már létezik, változatlanul felülírja).
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM user_profiles WHERE id = auth.uid() $$;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;

CREATE TABLE IF NOT EXISTS register_cumulative_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT register_cumulative_checks_unique UNIQUE (cash_register_id, period_start, period_end),
  CONSTRAINT register_cumulative_checks_period_valid CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_register_cumulative_checks_period
  ON register_cumulative_checks(period_start, period_end);

ALTER TABLE register_cumulative_checks ENABLE ROW LEVEL SECURITY;

-- Olvas: minden bejelentkezett (a jelentést a könyvelő is látja).
-- Ír / töröl: csak admin.
DROP POLICY IF EXISTS "rcc_select" ON register_cumulative_checks;
CREATE POLICY "rcc_select" ON register_cumulative_checks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rcc_insert" ON register_cumulative_checks;
CREATE POLICY "rcc_insert" ON register_cumulative_checks
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "rcc_delete" ON register_cumulative_checks;
CREATE POLICY "rcc_delete" ON register_cumulative_checks
  FOR DELETE TO authenticated USING (get_my_role() = 'admin');

COMMENT ON TABLE register_cumulative_checks IS
  'Admin pipa: a pénztárgép adott időszaki göngyölt forgalma ellenőrizve (összes egység – egyszerű jelentés)';
