-- =============================================================================
-- Egység-szintű kapcsoló: "Több zárás / nap"
-- Készült: 2026-06-04
--
-- A napi jelentésben a pénztárgépeknél egy egység-szintű kapcsoló dönti el,
-- hogy a több-zárásos felület (a "További zárás a mai napra" gomb és a
-- további zárás-blokkok) látszik-e. Alapból kikapcsolva.
-- Idempotens.
-- =============================================================================

ALTER TABLE unit_revenue_settings
  ADD COLUMN IF NOT EXISTS multiple_closures_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN unit_revenue_settings.multiple_closures_enabled IS 'Ha true, a napi jelentésben pénztárgépenként több zárás rögzíthető (alapból false)';
