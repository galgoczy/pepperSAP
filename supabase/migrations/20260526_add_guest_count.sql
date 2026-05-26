-- Add guest_count column to daily_revenue table
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN daily_revenue.guest_count IS 'Napi fogyasztói létszám';
