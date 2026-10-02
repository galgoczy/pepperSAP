-- =============================================================================
-- Készpénzfelvét (bankból) átküldésként
-- Készült: 2026-06-08
--
-- Háttér: az admin a Házipénztárban rögzíthet bankból történő készpénzfelvételt.
-- Ezt átküldésként modellezzük (jóváhagyás nélkül, azonnal 'approved'): a forrás
-- a "bank" (külső, nem csökkenti sem a Központot, sem másik egységet), a cél a
-- választott egység, vagy közvetlenül a Központ.
--
-- Ehhez a cash_transfers.source_type CHECK megszorítását ki kell bővíteni a
-- 'bank' értékkel. A destination_type változatlan ('unit' | 'events' |
-- 'central'), mert a bank csak forrás lehet.
--
-- Idempotens: a meglévő source_type CHECK-et (bármilyen néven) eldobjuk, majd
-- ismert néven újra létrehozzuk a bővített értékkészlettel.
-- =============================================================================

DO $$
DECLARE c text;
BEGIN
  -- A kizárólag source_type-ra vonatkozó CHECK megszorítás(oka)t dobjuk el; a
  -- source+destination együttes (different_source_dest) megszorítást nem.
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'cash_transfers'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%source_type%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%destination_type%'
  LOOP
    EXECUTE format('ALTER TABLE cash_transfers DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE cash_transfers ADD CONSTRAINT cash_transfers_source_type_check
  CHECK (source_type IN ('unit', 'events', 'central', 'bank'));
