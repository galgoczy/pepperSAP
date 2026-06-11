-- =============================================================================
-- RLS szigorítás: pénztárgép- és átküldés-táblák (cross-tenant hozzáférés zárása)
-- Készült: 2026-06-11
--
-- Háttér (biztonsági review): az alábbi táblák RLS-e nyitott (USING(true)) vagy
-- hiányos volt, így bármely bejelentkezett felhasználó a böngészőből közvetlenül
-- olvashatta/írhatta MÁS egység pénzügyi adatát, illetve a saját egyenlegét a
-- semmiből felfújhatta egy önjóváhagyott "bank" átküldéssel.
--
-- Szabály:
--   * admin: mindent
--   * egység (unit/events): CSAK a saját egysége adatát írhatja, a sajátját +
--     (riportokhoz szükséges) olvasást lát
--   * könyvelő (accountant): CSAK olvas (riportokhoz), nem ír
--
-- Idempotens: minden érintett tábla összes meglévő policy-ját eldobjuk
-- (DO-blokk), majd a helyes készletet hozzuk létre. A nem rekurzív
-- segédfüggvényeket (get_my_role / get_my_unit_id) biztosítjuk.
-- =============================================================================

-- Segédfüggvények (ha már léteznek, felülírja) ------------------------------
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM user_profiles WHERE id = auth.uid() $$;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;

CREATE OR REPLACE FUNCTION get_my_unit_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT unit_id FROM user_profiles WHERE id = auth.uid() $$;
GRANT EXECUTE ON FUNCTION get_my_unit_id() TO authenticated;

-- Összes meglévő policy eldobása a négy érintett táblán --------------------
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('cash_register_revenue','cash_registers',
                        'cash_register_assignments','cash_transfers')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- ===========================================================================
-- 1) cash_register_revenue  (a napi pénztárgép-forgalom; ez táplálja a mérleget)
--    Olvas: admin + könyvelő mindent, egység a sajátját (a szülő
--    daily_revenue.unit_id alapján). Ír: admin + a saját egység. Könyvelő NEM ír.
-- ===========================================================================
ALTER TABLE cash_register_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crr_select" ON cash_register_revenue
  FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('admin','accountant')
    OR EXISTS (
      SELECT 1 FROM daily_revenue dr
      WHERE dr.id = cash_register_revenue.daily_revenue_id
        AND dr.unit_id = get_my_unit_id()
    )
  );

CREATE POLICY "crr_insert" ON cash_register_revenue
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM daily_revenue dr
      WHERE dr.id = cash_register_revenue.daily_revenue_id
        AND dr.unit_id = get_my_unit_id()
    )
  );

CREATE POLICY "crr_update" ON cash_register_revenue
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM daily_revenue dr
      WHERE dr.id = cash_register_revenue.daily_revenue_id
        AND dr.unit_id = get_my_unit_id()
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM daily_revenue dr
      WHERE dr.id = cash_register_revenue.daily_revenue_id
        AND dr.unit_id = get_my_unit_id()
    )
  );

CREATE POLICY "crr_delete" ON cash_register_revenue
  FOR DELETE TO authenticated
  USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM daily_revenue dr
      WHERE dr.id = cash_register_revenue.daily_revenue_id
        AND dr.unit_id = get_my_unit_id()
    )
  );

-- ===========================================================================
-- 2) cash_registers  (pénztárgép-törzs; a kezelő UI admin-only)
--    Olvas: mindenki (metaadat, kevésbé érzékeny + a napi rögzítéshez kell).
--    Ír: csak admin.
-- ===========================================================================
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cr_select" ON cash_registers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cr_insert" ON cash_registers
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "cr_update" ON cash_registers
  FOR UPDATE TO authenticated USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "cr_delete" ON cash_registers
  FOR DELETE TO authenticated USING (get_my_role() = 'admin');

-- ===========================================================================
-- 3) cash_register_assignments  (dátumos egység-hozzárendelés; admin-only írás)
-- ===========================================================================
ALTER TABLE cash_register_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cra_select" ON cash_register_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cra_insert" ON cash_register_assignments
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "cra_update" ON cash_register_assignments
  FOR UPDATE TO authenticated USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "cra_delete" ON cash_register_assignments
  FOR DELETE TO authenticated USING (get_my_role() = 'admin');

-- ===========================================================================
-- 4) cash_transfers  (átküldések; ITT volt a legsúlyosabb gond)
--    Olvas: admin + könyvelő mindent (riportokhoz), egység a sajátját
--    (forrás VAGY cél). Beszúrás: admin bármit; egység CSAK saját forrásból,
--    'pending' státuszban, és NEM 'bank'/'central' forrással (így nem tud
--    önjóváhagyott, semmiből keletkező egyenleget csinálni). Jóváhagyás: a cél
--    egység vagy admin. Saját 'pending' szerkesztése/törlése: a forrás egység.
-- ===========================================================================
ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ct_select" ON cash_transfers
  FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('admin','accountant')
    OR source_unit_id = get_my_unit_id()
    OR destination_unit_id = get_my_unit_id()
  );

-- Admin bármilyen átküldést beszúrhat (pl. bankos készpénzfelvét, központi).
CREATE POLICY "ct_insert_admin" ON cash_transfers
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- Nem-admin: csak SAJÁT forrásból, függőben, nem bank/központ forrással,
-- és csak a saját nevében (initiated_by).
CREATE POLICY "ct_insert_own_pending" ON cash_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() <> 'accountant'
    AND source_unit_id = get_my_unit_id()
    AND source_type NOT IN ('bank','central')
    AND status = 'pending'
    AND initiated_by = auth.uid()
  );

-- Admin bármit módosíthat.
CREATE POLICY "ct_update_admin" ON cash_transfers
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- A CÉL egység jóváhagyhatja/módosíthatja a neki szóló átküldést.
CREATE POLICY "ct_update_destination" ON cash_transfers
  FOR UPDATE TO authenticated
  USING (destination_unit_id = get_my_unit_id())
  WITH CHECK (destination_unit_id = get_my_unit_id());

-- A FORRÁS egység szerkesztheti a saját, még függőben lévő átküldését.
CREATE POLICY "ct_update_source_pending" ON cash_transfers
  FOR UPDATE TO authenticated
  USING (status = 'pending' AND source_unit_id = get_my_unit_id())
  WITH CHECK (source_unit_id = get_my_unit_id());

-- Törlés: admin bármit; a forrás egység a saját függőben lévőjét.
CREATE POLICY "ct_delete_admin" ON cash_transfers
  FOR DELETE TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "ct_delete_source_pending" ON cash_transfers
  FOR DELETE TO authenticated
  USING (status = 'pending' AND source_unit_id = get_my_unit_id());

-- =============================================================================
-- Megjegyzés: alkalmazás után érdemes végigpróbálni: napi rögzítés mentése
-- (egység), átküldés létrehozás/jóváhagyás/módosítás/törlés, bankos
-- készpénzfelvét (admin), valamint a könyvelői riportok (olvasás).
-- =============================================================================
