-- Add software_revenue field to cash_register_revenue table
-- This allows tracking software revenue per cash register

ALTER TABLE cash_register_revenue
ADD COLUMN IF NOT EXISTS software_revenue DECIMAL(12, 2) DEFAULT NULL;

-- Add manual override flag to daily_revenue
-- When true, the total_revenue is manually entered and not auto-summed from registers
ALTER TABLE daily_revenue
ADD COLUMN IF NOT EXISTS software_revenue_manual_override BOOLEAN DEFAULT false;

COMMENT ON COLUMN cash_register_revenue.software_revenue IS 'Software revenue for this specific cash register (optional)';
COMMENT ON COLUMN daily_revenue.software_revenue_manual_override IS 'If true, total_revenue is manually set; if false, it can be auto-summed from cash_register_revenue.software_revenue';
