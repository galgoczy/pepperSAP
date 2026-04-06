-- Add guest_count (fogyasztói létszám) column to daily_revenue
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT NULL;
