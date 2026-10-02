-- Daily-level actual tips (minden fajta tényleges borravaló). Recorded only;
-- not used in any calculation.
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS actual_tips DECIMAL(12,2);

COMMENT ON COLUMN daily_revenue.actual_tips IS 'Napi tényleges borravaló (minden fajta) - csak feljegyzés, számításban nem szerepel';
