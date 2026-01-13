-- Deals / Opportunities Schema
-- For sales pipeline management with weighted forecasting

-- =============================================================================
-- DEALS TABLE (Üzleti lehetőségek)
-- =============================================================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,                    -- Deal megnevezése
  description TEXT,                       -- Részletes leírás

  -- Financial data
  expected_value DECIMAL(12,2),          -- Várható érték
  currency TEXT DEFAULT 'HUF',

  -- Status and probability
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN (
    'lead',         -- Érdeklődés (10%)
    'negotiation',  -- Tárgyalás (30%)
    'proposal',     -- Ajánlat (60%)
    'won',          -- Megnyert (100%)
    'lost'          -- Elvesztett (0%)
  )),
  probability INTEGER DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),

  -- Dates
  expected_close_date DATE,              -- Várható zárás dátuma
  actual_close_date DATE,                -- Tényleges zárás (won/lost esetén)

  -- Relations
  our_contact_id UUID REFERENCES user_profiles(id),      -- Felelős kollégánk
  company_contact_id UUID REFERENCES company_contacts(id), -- Ügyfél kapcsolattartó

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_our_contact ON deals(our_contact_id);

-- =============================================================================
-- ADD deal_id TO SALES_EVENTS
-- =============================================================================
-- This allows linking CRM events to specific deals
ALTER TABLE sales_events
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_events_deal ON sales_events(deal_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Deals: everyone can read, admin can do everything
CREATE POLICY "deals_select" ON deals
  FOR SELECT USING (true);

CREATE POLICY "deals_admin" ON deals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- TRIGGER FOR updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deals_updated_at();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE deals IS 'Sales opportunities / deals linked to companies';
COMMENT ON COLUMN deals.status IS 'lead=érdeklődés, negotiation=tárgyalás, proposal=ajánlat, won=megnyert, lost=elvesztett';
COMMENT ON COLUMN deals.probability IS 'Chance of winning (0-100%), can be manual or auto-set based on status';
COMMENT ON COLUMN deals.expected_close_date IS 'Expected date when deal will be closed';
COMMENT ON COLUMN deals.actual_close_date IS 'Actual close date (set when status becomes won or lost)';
