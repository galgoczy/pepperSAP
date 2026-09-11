-- =============================================================================
-- Több zárás / pénztárgép / nap + zárás-validációs mezők
-- Készült: 2026-06-04
--
-- Eddig egy pénztárgéphez naponta pontosan egy zárás tartozott
-- (unique_daily_cash_register). Mostantól egy pénztárgéphez egy napon belül
-- több zárás is rögzíthető (closure_number sorszámmal), és mindegyik
-- hozzáadódik a napi forgalomhoz.
--
-- Új mezők záranként:
--   * closure_number     – napon belüli sorszám az adott pénztárgépre (1, 2, …)
--   * closure_sequence   – a pénztárgép saját zárás-sorszáma (Z-jelentés száma);
--                          az időrendben előző záráshoz képest +1 kellene legyen
--   * cumulative_revenue – göngyölt forgalom a Z-jelentésről; az előző zárás
--                          göngyölt forgalma + ezen zárás forgalma kellene legyen
--
-- Idempotens.
-- =============================================================================

ALTER TABLE cash_register_revenue
  ADD COLUMN IF NOT EXISTS closure_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS closure_sequence INTEGER,
  ADD COLUMN IF NOT EXISTS cumulative_revenue DECIMAL(12, 2);

-- A régi "egy zárás / pénztárgép / nap" megkötés feloldása, helyette a
-- sorszámot is tartalmazó egyediség.
ALTER TABLE cash_register_revenue
  DROP CONSTRAINT IF EXISTS unique_daily_cash_register;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_daily_cash_register_closure'
  ) THEN
    ALTER TABLE cash_register_revenue
      ADD CONSTRAINT unique_daily_cash_register_closure
      UNIQUE (daily_revenue_id, cash_register_id, closure_number);
  END IF;
END $$;

COMMENT ON COLUMN cash_register_revenue.closure_number IS 'Napon belüli zárás sorszáma az adott pénztárgépre (1, 2, …)';
COMMENT ON COLUMN cash_register_revenue.closure_sequence IS 'A pénztárgép saját zárás-sorszáma (Z-jelentés száma); időrendben +1 kellene legyen';
COMMENT ON COLUMN cash_register_revenue.cumulative_revenue IS 'Göngyölt forgalom a Z-jelentésről; előző göngyölt + ezen zárás forgalma kellene legyen';
