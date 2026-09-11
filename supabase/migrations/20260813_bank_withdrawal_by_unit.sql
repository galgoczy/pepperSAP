-- =============================================================================
-- Készpénzfelvét (bank): a felvevő neve + egység-szintű rögzítés engedélyezése
-- Készült: 2026-08-13
--
-- 1) Új mező: withdrawn_by_name — KÖTELEZŐ a felületen, a készpénzt ténylegesen
--    felvevő személy neve (elszámoltathatóság).
--
-- 2) RLS: eddig a 20260611_tighten_cash_rls.sql a nem-admin beszúrást szigorúan
--    a saját egységből induló, 'pending' átküldésre korlátozta (a 'bank' forrást
--    kifejezetten tiltotta). Mostantól az egység a SAJÁT házipénztárába rögzíthet
--    bankos készpénzfelvételt.
--
--    Tudatos kompromisszum: ez a művelet a saját egyenleget növeli jóváhagyás
--    nélkül. Ezért szűkre szabjuk (csak a saját egységbe, csak 'bank' forrásból,
--    saját néven), és az admin a "Készpénzfelvételek" fülön látja, módosíthatja
--    vagy törölheti mindet. A kontroll tehát üzleti (átlátható, nevesített,
--    utólag javítható), nem technikai tiltás.
--
-- Idempotens.
-- =============================================================================

ALTER TABLE cash_transfers
  ADD COLUMN IF NOT EXISTS withdrawn_by_name TEXT;

COMMENT ON COLUMN cash_transfers.withdrawn_by_name IS 'Bankos készpénzfelvételnél a készpénzt felvevő személy neve';

-- A saját egységbe szóló bankos készpénzfelvét engedélyezése nem-adminnak.
DROP POLICY IF EXISTS "ct_insert_own_bank_withdrawal" ON cash_transfers;
CREATE POLICY "ct_insert_own_bank_withdrawal" ON cash_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() <> 'accountant'
    AND source_type = 'bank'
    AND source_unit_id IS NULL
    AND destination_type = 'unit'
    AND destination_unit_id = get_my_unit_id()
    AND initiated_by = auth.uid()
  );

-- =============================================================================
-- Megjegyzés: ha a 20260611_tighten_cash_rls.sql még NEM futott le, akkor a
-- tábla RLS-e feltehetően megengedő, és ez a policy egyszerűen hozzáadódik —
-- semmit nem ront el.
-- =============================================================================
