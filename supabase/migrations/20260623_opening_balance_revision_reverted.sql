-- =============================================================================
-- Nyitóegyenleg-revízió teljes visszavonása ('reverted' státusz)
-- Készült: 2026-06-23
--
-- Eddig egy jóváhagyott revíziót csak egy ÚJ, fix értékre rögzítő revízióval
-- lehetett "visszaállítani" — de az szintén horgony maradt, így onnantól nem
-- számolt újra. Ezt oldja fel a 'reverted' státusz: a revíziót teljesen
-- visszavonja (kikerül a jóváhagyott horgonyok közül), így a házipénztár-sorozat
-- ismét a történetből, tisztán számol tovább.
--
-- Idempotens: a meglévő status CHECK-et (bármilyen néven) eldobjuk, majd a
-- bővített értékkészlettel újra létrehozzuk.
-- =============================================================================

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'opening_balance_revisions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%pocket%'
  LOOP
    EXECUTE format('ALTER TABLE opening_balance_revisions DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE opening_balance_revisions
  ADD CONSTRAINT opening_balance_revisions_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'reverted'));
