-- Opening-balance revisions can target either the official pocket
-- (Pénztár zseb) or the reserve pocket (Tartalék).
ALTER TABLE opening_balance_revisions
  ADD COLUMN IF NOT EXISTS pocket TEXT NOT NULL DEFAULT 'official';

-- Best-effort constraint (only added if it doesn't already exist).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'opening_balance_revisions_pocket_check'
  ) THEN
    ALTER TABLE opening_balance_revisions
      ADD CONSTRAINT opening_balance_revisions_pocket_check
      CHECK (pocket IN ('official', 'reserve'));
  END IF;
END $$;

COMMENT ON COLUMN opening_balance_revisions.pocket IS 'Melyik zsebet érinti: official (Pénztár zseb) vagy reserve (Tartalék)';
