-- =============================================================================
-- "Több zárás / nap" kapcsoló: mostantól alapból BEKAPCSOLVA
-- Készült: 2026-09-06
--
-- A napi jelentésben pénztárgépenként több zárás rögzítése eddig egység-szintű,
-- alapból kikapcsolt beállítás volt. Mostantól minden egységnél be van
-- kapcsolva; a kapcsolóval továbbra is kikapcsolható egységenként.
-- Idempotens, többször is futtatható.
-- =============================================================================

ALTER TABLE unit_revenue_settings
  ALTER COLUMN multiple_closures_enabled SET DEFAULT true;

-- A már meglévő egység-beállításokat is bekapcsoljuk (az alkalmazás a hiányzó
-- sort/értéket is bekapcsoltnak veszi, ez a sor a kifejezetten false-ra állított
-- egységeket is átállítja).
UPDATE unit_revenue_settings
  SET multiple_closures_enabled = true
  WHERE multiple_closures_enabled IS DISTINCT FROM true;

COMMENT ON COLUMN unit_revenue_settings.multiple_closures_enabled IS 'Ha true, a napi jelentésben pénztárgépenként több zárás rögzíthető (alapból true)';
