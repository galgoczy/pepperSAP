-- =============================================================================
-- Pénztárgépek megjelenési sorrendje (egységenként)
-- Készült: 2026-06-05
--
-- Az egység be tudja állítani, milyen sorrendben jelenjenek meg a pénztárgépek
-- a napi jelentésben (egymás alatt). A sorrend a pénztárgépen tárolódik
-- (display_order), egységenként értelmezve. Admin is ezt a sorrendet látja.
-- Idempotens.
-- =============================================================================

ALTER TABLE cash_registers
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Backfill: a még sorrend nélküli gépeket egységenként a létrehozás szerint
-- számozzuk (0, 1, 2, …), hogy legyen egy stabil kiindulási sorrend.
WITH ordered AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY unit_id ORDER BY created_at ASC) - 1 AS rn
  FROM cash_registers
  WHERE display_order IS NULL
)
UPDATE cash_registers cr
SET display_order = o.rn
FROM ordered o
WHERE cr.id = o.id;

CREATE INDEX IF NOT EXISTS idx_cash_registers_order
  ON cash_registers(unit_id, display_order);

COMMENT ON COLUMN cash_registers.display_order IS 'Megjelenési sorrend a napi jelentésben, egységenként (kisebb = előrébb)';
