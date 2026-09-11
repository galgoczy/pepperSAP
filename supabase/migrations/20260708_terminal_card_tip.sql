-- =============================================================================
-- Bankkártya terminál részletezés: teljes összeg + borravaló + kasszából kivét
-- Készült: 2026-07-08
--
-- Eddig a terminál bankkártya forgalmat egyetlen mezőben (terminal_card, a
-- "borravaló nélküli" összeg) tároltuk. Mostantól ezt szétbontjuk:
--   * terminal_card_total    – a terminál TELJES összege (borravalóval együtt)
--   * terminal_card_tip      – ebből a bankkártyás borravaló
--   * terminal_tip_withdrawn – a borravalót kivették-e a kasszából
--                              (ekkor a borravaló 60%-a a nap végén tartalék költség)
--
-- A meglévő terminal_card oszlop MARAD, és továbbra is a "borravaló nélküli"
-- összeget tartja (= total - tip), így a számítások/riportok végeredménye nem
-- változik. A UI ezt kiszámolja és menti.
--
-- Idempotens.
-- =============================================================================

ALTER TABLE cash_register_revenue
  ADD COLUMN IF NOT EXISTS terminal_card_total DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS terminal_card_tip DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS terminal_tip_withdrawn BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN cash_register_revenue.terminal_card_total IS 'Bankkártya terminál teljes összeg (borravalóval együtt)';
COMMENT ON COLUMN cash_register_revenue.terminal_card_tip IS 'Bankkártyás borravaló a terminálon';
COMMENT ON COLUMN cash_register_revenue.terminal_tip_withdrawn IS 'A borravalót kivették a kasszából (ekkor a 60%-a tartalék költség)';
