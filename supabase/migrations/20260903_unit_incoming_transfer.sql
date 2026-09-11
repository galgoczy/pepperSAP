-- =============================================================================
-- „Nekem küldtek!” – az egység maga rögzíti a NEKI érkezett átküldést
-- Készült: 2026-09-03
--
-- Eddig átküldést csak a KÜLDŐ oldal indíthatott (az egység a sajátjából, admin
-- bármit). Ha a Központ (vagy egy másik egység) átadott pénzt/tartalékot, de nem
-- rögzítette, az egység házipénztárában nem jelent meg. Mostantól az egység a
-- SAJÁT házipénztárába rögzítheti a beérkezett átküldést; jóváhagyás nélkül
-- érvényes, és az admin listájában ugyanúgy megjelenik, mint bármely más
-- átküldés (módosítható, törölhető).
--
-- Tudatos kompromisszum – ugyanaz, mint a 20260813 bankos készpénzfelvételnél:
-- a művelet a saját egyenleget növeli jóváhagyás nélkül, ezért szűkre szabjuk
-- (csak a saját egységbe, csak 'central'/'unit' forrásból, saját néven, és nem
-- önmagából). A kontroll üzleti: az admin mindent lát és javíthat.
--
-- Idempotens. Meglévő adathoz nem nyúl.
-- =============================================================================

DROP POLICY IF EXISTS "ct_insert_own_incoming" ON cash_transfers;
CREATE POLICY "ct_insert_own_incoming" ON cash_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() <> 'accountant'
    AND destination_type = 'unit'
    AND destination_unit_id = get_my_unit_id()
    AND source_type IN ('central', 'unit')
    -- Központi forrásnál nincs forrás-egység; egységtől érkezőnél nem lehet
    -- önmaga (az nem mozgatna pénzt, csak felfújná az egyenleget).
    AND (
      (source_type = 'central' AND source_unit_id IS NULL)
      OR (source_type = 'unit' AND source_unit_id IS NOT NULL AND source_unit_id <> get_my_unit_id())
    )
    AND initiated_by = auth.uid()
  );

-- =============================================================================
-- Megjegyzés: ha a 20260611_tighten_cash_rls.sql még NEM futott le, a tábla RLS-e
-- feltehetően megengedő, és ez a policy egyszerűen hozzáadódik — semmit nem ront el.
-- =============================================================================
