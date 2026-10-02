-- Per-cash-register daily guest count.
-- The daily guest count is now entered per cash register (under the software
-- revenue field) instead of once on the daily revenue form; the daily_revenue
-- total is the sum of these.
ALTER TABLE cash_register_revenue ADD COLUMN IF NOT EXISTS guest_count INTEGER;

COMMENT ON COLUMN cash_register_revenue.guest_count IS 'Napi fogyasztói létszám ezen a pénztárgépen (fő)';
