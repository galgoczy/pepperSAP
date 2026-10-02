-- =============================================================================
-- Támogatás (support_tickets): a régi "title" oszlop NOT NULL megkötésének
-- feloldása.
-- Készült: 2026-05-31
--
-- Tünet: bejelentés beküldésekor:
--   "null value in column \"title\" of relation \"support_tickets\"
--    violates not-null constraint"  (SQLSTATE 23502)
--
-- Ok: az éles support_tickets táblát egy RÉGEBBI séma hozta létre, amelyben van
--     egy NOT NULL "title" oszlop. A jelenlegi alkalmazás már nem ezt, hanem a
--     "subject" oszlopot tölti (lásd SupportPage.jsx), így a "title" NULL marad
--     és a beszúrás elhasal.
--
-- Megoldás: ha létezik a "title" oszlop, oldjuk fel a NOT NULL megkötését, és
--     töltsük fel a meglévő sorokat a subject értékével. Ha az oszlop nem
--     létezik (újabb séma), a blokk nem csinál semmit. Idempotens.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_tickets' AND column_name = 'title'
  ) THEN
    -- NOT NULL feloldása, hogy a "subject"-alapú beszúrás működjön.
    EXECUTE 'ALTER TABLE support_tickets ALTER COLUMN title DROP NOT NULL';

    -- Meglévő NULL title-ök feltöltése a subject-ből (ha az is létezik).
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'support_tickets' AND column_name = 'subject'
    ) THEN
      EXECUTE 'UPDATE support_tickets SET title = subject WHERE title IS NULL AND subject IS NOT NULL';
    END IF;
  END IF;
END $$;
