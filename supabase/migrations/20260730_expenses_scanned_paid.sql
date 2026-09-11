-- =============================================================================
-- Számlák állapot-jelölései: "szkennelt" és "fizetett"
-- Készült: 2026-07-30
--
-- A Beérkezett számlák fülön eddig csak a "beérkezett" jelölés létezett.
-- Mostantól két további állapot jelölhető:
--   * scanned – a számla be lett szkennelve
--   * paid    – a számla ki lett fizetve (CSAK átutalásos számlánál értelmezett)
--
-- Ezek kizárólag admin-oldali nyilvántartási jelölések: az egységek
-- adatrögzítését és a meglévő adatokat NEM érintik.
--
-- Idempotens.
-- =============================================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS scanned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scanned_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES auth.users(id);

-- Gyors szűrés a még nem szkennelt / nem fizetett hivatalos számlákra.
CREATE INDEX IF NOT EXISTS idx_expenses_scanned
  ON expenses(scanned)
  WHERE is_official = true;

CREATE INDEX IF NOT EXISTS idx_expenses_paid
  ON expenses(paid)
  WHERE is_official = true;

COMMENT ON COLUMN expenses.scanned IS 'Be lett-e szkennelve a számla (admin jelöli a Beérkezett számlák fülön)';
COMMENT ON COLUMN expenses.paid IS 'Ki lett-e fizetve a számla (csak átutalásos számlánál értelmezett)';
