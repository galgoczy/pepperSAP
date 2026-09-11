-- =============================================================================
-- Jegyzőkönyv "ellenőrizve" pipa – összes egység, pénztárgép (részletes)
-- Készült: 2026-09-06
--
-- A részletes admin jelentés Jkv. oszlopában az eltéréses zárásoknál eddig
-- automatikus jelölés volt: ✓ ha az elütés/jegyzőkönyv rögzítve van, ✗ ha
-- hiányzik. Mostantól a ✓ helyén pipálható négyzet van: az admin bepipálja,
-- ha ellenőrizte, hogy a jegyzőkönyv tényleg megvan. A pipa egy záráshoz
-- (cash_register_revenue sor) tartozik, és minden admin számára közös.
--
-- Ha egy időszakban egy gép minden jegyzőkönyve megvan ÉS pipálva is van, az
-- egyszerű és a könyvelési jelentésben a göngyölt mellett "Jkv." zöld pipa.
--
-- Semmilyen forgalmi adathoz nem nyúl. Ha a zárás-sort törlik, a pipa is
-- törlődik (CASCADE). Idempotens.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM user_profiles WHERE id = auth.uid() $$;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;

CREATE TABLE IF NOT EXISTS register_protocol_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_revenue_id UUID NOT NULL REFERENCES cash_register_revenue(id) ON DELETE CASCADE,
  -- Denormalizálva, hogy időszakra és gépre gyorsan lekérdezhető legyen.
  cash_register_id UUID REFERENCES cash_registers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT register_protocol_checks_unique UNIQUE (cash_register_revenue_id)
);

CREATE INDEX IF NOT EXISTS idx_register_protocol_checks_date
  ON register_protocol_checks(date);

ALTER TABLE register_protocol_checks ENABLE ROW LEVEL SECURITY;

-- Olvas: minden bejelentkezett (a jelentést a könyvelő is látja).
-- Ír / töröl: csak admin.
DROP POLICY IF EXISTS "rpc_select" ON register_protocol_checks;
CREATE POLICY "rpc_select" ON register_protocol_checks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rpc_insert" ON register_protocol_checks;
CREATE POLICY "rpc_insert" ON register_protocol_checks
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "rpc_update" ON register_protocol_checks;
CREATE POLICY "rpc_update" ON register_protocol_checks
  FOR UPDATE TO authenticated USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "rpc_delete" ON register_protocol_checks;
CREATE POLICY "rpc_delete" ON register_protocol_checks
  FOR DELETE TO authenticated USING (get_my_role() = 'admin');

COMMENT ON TABLE register_protocol_checks IS
  'Admin pipa: az eltéréses zárás jegyzőkönyve ellenőrizve (összes egység – részletes jelentés)';
