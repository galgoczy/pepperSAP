-- Add discrepancies JSONB column for multiple discrepancy entries per cash register
-- Each entry: {amount: number, currency: 'HUF'|'EUR', note: string}

ALTER TABLE cash_register_revenue
ADD COLUMN IF NOT EXISTS discrepancies JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN cash_register_revenue.discrepancies IS 'Array of discrepancy entries: [{amount, currency, note}, ...]';
