-- =============================================================================
-- Számlák "beérkezett" jelölése
-- Készült: 2026-06-05
--
-- A hivatalos (számlás) készpénzes / bankkártyás kifizetések a Kifizetések menü
-- "Beérkezett számlák" fülén jelennek meg, ahol az admin kipipálhatja, ha a
-- fizikai számla a kezébe került. Ehhez kell a received jelölés.
-- Idempotens.
-- =============================================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS received BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES auth.users(id);

-- Gyors szűrés a még be nem érkezett, hivatalos számlákra.
CREATE INDEX IF NOT EXISTS idx_expenses_received
  ON expenses(received)
  WHERE is_official = true;

COMMENT ON COLUMN expenses.received IS 'Beérkezett-e a fizikai számla (admin jelöli a Beérkezett számlák fülön)';
