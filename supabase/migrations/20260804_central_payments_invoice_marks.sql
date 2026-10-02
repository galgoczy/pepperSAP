-- =============================================================================
-- Központi kifizetések bevonása a számla-nyilvántartásba
-- Készült: 2026-08-04
--
-- A Központ költségeit továbbra is a central_payments táblában rögzítjük (ez
-- mozgatja helyesen a központi házipénztár egyenlegét) — ez marad az EGYETLEN
-- rögzítési pont, nincs ál-egység és nincs dupla könyvelés.
--
-- Hogy a központi (számlás) kifizetések is nyomon követhetők legyenek a Számlák
-- felületen, ugyanazok az admin-oldali jelölések kellenek rájuk, mint az
-- expenses táblán: beérkezett / szkennelt. (A "fizetett" csak átutalásos
-- számlánál értelmezett, a központi kifizetés készpénzes, így ott nem jelenik meg.)
--
-- Idempotens.
-- =============================================================================

ALTER TABLE central_payments
  ADD COLUMN IF NOT EXISTS received BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS scanned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scanned_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN central_payments.received IS 'Beérkezett-e a fizikai számla (admin jelöli a Beérkezett számlák fülön)';
COMMENT ON COLUMN central_payments.scanned IS 'Be lett-e szkennelve a számla';
COMMENT ON COLUMN central_payments.paid IS 'Ki lett-e fizetve (központi kifizetésnél jellemzően nem használt)';
