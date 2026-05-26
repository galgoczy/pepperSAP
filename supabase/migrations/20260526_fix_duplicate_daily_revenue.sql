-- Fix duplicate daily_revenue entries for Knorr 105
-- Keep only the most recent entry for each unit_id + date combination

WITH duplicates AS (
  SELECT id, unit_id, date,
         ROW_NUMBER() OVER (PARTITION BY unit_id, date ORDER BY created_at DESC) as rn
  FROM daily_revenue
)
DELETE FROM daily_revenue
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_revenue_unit_date_unique'
  ) THEN
    ALTER TABLE daily_revenue ADD CONSTRAINT daily_revenue_unit_date_unique UNIQUE (unit_id, date);
  END IF;
END $$;
