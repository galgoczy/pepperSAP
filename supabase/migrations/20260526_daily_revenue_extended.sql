-- Extended daily_revenue fields
-- 2026-05-26

-- VIP fields (info only, not calculated)
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS vip_loading DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS vip_revenue DECIMAL(12,2) DEFAULT 0;

-- Protocol revenue (with VAT)
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS protocol_net DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS protocol_gross DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS protocol_vat_rate DECIMAL(5,2) DEFAULT 27;

-- McKinsey revenue (with VAT) - primarily for Államkincstár
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS mckinsey_net DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS mckinsey_gross DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS mckinsey_vat_rate DECIMAL(5,2) DEFAULT 27;

-- Extra cash revenue (egyéb kp bevétel)
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS extra_cash_revenue DECIMAL(12,2) DEFAULT 0;

-- Comments
COMMENT ON COLUMN daily_revenue.vip_loading IS 'VIP töltés - csak info';
COMMENT ON COLUMN daily_revenue.vip_revenue IS 'VIP forgalom - csak info';
COMMENT ON COLUMN daily_revenue.protocol_net IS 'Protokoll bevétel nettó';
COMMENT ON COLUMN daily_revenue.protocol_gross IS 'Protokoll bevétel bruttó';
COMMENT ON COLUMN daily_revenue.protocol_vat_rate IS 'Protokoll ÁFA kulcs (%)';
COMMENT ON COLUMN daily_revenue.mckinsey_net IS 'McKinsey bevétel nettó (Államkincstár)';
COMMENT ON COLUMN daily_revenue.mckinsey_gross IS 'McKinsey bevétel bruttó (Államkincstár)';
COMMENT ON COLUMN daily_revenue.mckinsey_vat_rate IS 'McKinsey ÁFA kulcs (%)';
COMMENT ON COLUMN daily_revenue.extra_cash_revenue IS 'Egyéb készpénz bevétel';
