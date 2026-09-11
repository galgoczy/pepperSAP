-- =============================================================================
-- Protokoll tételek bővítése: Éttermi fogyasztás tételsorok, Bekészítés
-- "Egyedi" csomag és megjegyzés mező.
-- Készült: 2026-05-31
-- =============================================================================

-- 1) Éttermi fogyasztás tételsorai (szöveg + bruttó + ÁFA kulcs soronként).
--    JSONB tömb: [{ description, gross, vat_rate }, ...].
ALTER TABLE protocol_items ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb;

-- 2) Bekészítés szabadszöveges megjegyzés.
ALTER TABLE protocol_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3) "Egyedi" csomag engedélyezése a package_type-ban (6 = Egyedi).
--    A régi CHECK megkötés (BETWEEN 1 AND 5) lecserélése 1..6-ra.
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'protocol_items'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%package_type%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE protocol_items DROP CONSTRAINT %I', con_name);
  END IF;

  ALTER TABLE protocol_items
    ADD CONSTRAINT protocol_items_package_type_check
    CHECK (package_type IS NULL OR package_type BETWEEN 1 AND 6);
END $$;
