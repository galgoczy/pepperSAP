-- =============================================================================
-- Átküldés (cash_transfers): a küldő egység kezelhesse a SAJÁT, még jóvá nem
-- hagyott átküldését (módosítás / törlés).
-- Készült: 2026-05-31
--
-- Háttér: a Házipénztár "Összes átküldés" listában a küldő egység (vagy admin)
-- mostantól szerkesztheti/törölheti a 'pending' státuszú átküldését. Ehhez a
-- cash_transfers táblán UPDATE és DELETE jogosultság kell a küldő egységnek a
-- függőben lévő sorokra. Az eddigi policy-k jellemzően csak a CÉL egységnek
-- (jóváhagyás) adtak UPDATE-et, a forrás egységnek nem, DELETE pedig egyáltalán
-- nem volt -> ezért nem működött a felületi gomb.
--
-- Idempotens: DROP POLICY IF EXISTS + CREATE POLICY. A meglévő, nem rekurzív
-- segédfüggvényeket használja (get_my_role(), get_my_unit_id()) - lásd
-- supabase/fix-rls.sql.
-- =============================================================================

-- Biztosítjuk a nem rekurzív segédfüggvényeket (ha már léteznek, felülírja).
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM user_profiles WHERE id = auth.uid() $$;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;

CREATE OR REPLACE FUNCTION get_my_unit_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT unit_id FROM user_profiles WHERE id = auth.uid() $$;
GRANT EXECUTE ON FUNCTION get_my_unit_id() TO authenticated;

ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;

-- A küldő egység (vagy admin) módosíthatja a SAJÁT, függőben lévő átküldését.
-- (Külön néven, hogy ne ütközzön a meglévő jóváhagyási UPDATE policy-val.)
DROP POLICY IF EXISTS "Source unit can update own pending transfer" ON cash_transfers;
CREATE POLICY "Source unit can update own pending transfer" ON cash_transfers
  FOR UPDATE
  USING (
    status = 'pending'
    AND (get_my_role() = 'admin' OR source_unit_id = get_my_unit_id())
  )
  WITH CHECK (
    get_my_role() = 'admin' OR source_unit_id = get_my_unit_id()
  );

-- A küldő egység (vagy admin) törölheti a SAJÁT, függőben lévő átküldését.
DROP POLICY IF EXISTS "Source unit can delete own pending transfer" ON cash_transfers;
CREATE POLICY "Source unit can delete own pending transfer" ON cash_transfers
  FOR DELETE
  USING (
    status = 'pending'
    AND (get_my_role() = 'admin' OR source_unit_id = get_my_unit_id())
  );

-- =============================================================================
-- Megjegyzés: ez a migráció CSAK hozzáad (a meglévő SELECT/INSERT/jóváhagyási
-- UPDATE policy-kat nem törli). Ha korábban egyáltalán nem volt RLS a táblán és
-- minden hitelesített user mindent látott/írt, az továbbra is működik; ez a
-- migráció a hiányzó forrás-egység UPDATE/DELETE jogot pótolja.
-- =============================================================================
