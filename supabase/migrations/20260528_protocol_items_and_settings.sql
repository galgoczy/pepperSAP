-- Protocol items and unit revenue settings
-- 2026-05-28

-- =============================================================================
-- 1. Ensure "Egyéb pénztárgép" unit exists
-- =============================================================================
INSERT INTO units (name, type, is_active)
VALUES ('Egyéb pénztárgép', 'restaurant', true)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 2. Add new revenue columns to daily_revenue
-- =============================================================================
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS ordit_net DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS ordit_gross DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS ordit_vat_rate DECIMAL(5,2) DEFAULT 27;

ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS event_revenue_net DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS event_revenue_gross DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS event_revenue_vat_rate DECIMAL(5,2) DEFAULT 27;

COMMENT ON COLUMN daily_revenue.ordit_net IS 'Ordit bevétel nettó';
COMMENT ON COLUMN daily_revenue.ordit_gross IS 'Ordit bevétel bruttó';
COMMENT ON COLUMN daily_revenue.ordit_vat_rate IS 'Ordit ÁFA kulcs (%)';
COMMENT ON COLUMN daily_revenue.event_revenue_net IS 'Rendezvény bevétel nettó';
COMMENT ON COLUMN daily_revenue.event_revenue_gross IS 'Rendezvény bevétel bruttó';
COMMENT ON COLUMN daily_revenue.event_revenue_vat_rate IS 'Rendezvény ÁFA kulcs (%)';

-- =============================================================================
-- 3. Protocol items table (detailed protocol entries)
-- =============================================================================
CREATE TABLE IF NOT EXISTS protocol_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_revenue_id UUID NOT NULL REFERENCES daily_revenue(id) ON DELETE CASCADE,

  -- Item type: 'bekeszites' (catering) or 'ettermi' (restaurant consumption)
  item_type TEXT NOT NULL CHECK (item_type IN ('bekeszites', 'ettermi')),

  -- Common fields
  duka_number TEXT,
  cost_center TEXT,
  customer TEXT,
  item_date DATE,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_rate DECIMAL(5,2) DEFAULT 27,

  -- Bekészítés specific fields
  order_number TEXT,
  project_number TEXT,
  start_time TIME,
  end_time TIME,
  guest_count INTEGER,
  package_type INTEGER CHECK (package_type BETWEEN 1 AND 5),
  is_refill BOOLEAN DEFAULT false,
  location TEXT,

  -- Éttermi fogyasztás specific field (time instead of start/end)
  consumption_time TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_items_daily_revenue ON protocol_items(daily_revenue_id);
CREATE INDEX IF NOT EXISTS idx_protocol_items_type ON protocol_items(item_type);

-- =============================================================================
-- 4. Unit revenue settings table
-- =============================================================================
CREATE TABLE IF NOT EXISTS unit_revenue_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

  -- Visibility toggles for each revenue type
  show_vip BOOLEAN DEFAULT true,
  show_protocol BOOLEAN DEFAULT true,
  show_mckinsey BOOLEAN DEFAULT false,  -- Only Államkincstár by default
  show_ordit BOOLEAN DEFAULT false,
  show_event_revenue BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(unit_id)
);

-- =============================================================================
-- 5. Project number suggestions table (for autocomplete)
-- =============================================================================
CREATE TABLE IF NOT EXISTS protocol_project_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number TEXT NOT NULL UNIQUE,
  description TEXT,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_project_numbers_usage ON protocol_project_numbers(usage_count DESC);

-- =============================================================================
-- 6. RLS Policies
-- =============================================================================
ALTER TABLE protocol_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_revenue_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_project_numbers ENABLE ROW LEVEL SECURITY;

-- Protocol items: same access as daily_revenue (via parent)
CREATE POLICY "protocol_items_select" ON protocol_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_revenue dr
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE dr.id = protocol_items.daily_revenue_id
        AND (up.role = 'admin' OR up.unit_id = dr.unit_id)
    )
  );

CREATE POLICY "protocol_items_insert" ON protocol_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_revenue dr
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE dr.id = protocol_items.daily_revenue_id
        AND (up.role = 'admin' OR up.unit_id = dr.unit_id)
    )
  );

CREATE POLICY "protocol_items_update" ON protocol_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM daily_revenue dr
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE dr.id = protocol_items.daily_revenue_id
        AND (up.role = 'admin' OR up.unit_id = dr.unit_id)
    )
  );

CREATE POLICY "protocol_items_delete" ON protocol_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM daily_revenue dr
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE dr.id = protocol_items.daily_revenue_id
        AND (up.role = 'admin' OR up.unit_id = dr.unit_id)
    )
  );

-- Unit revenue settings: admin only for write, everyone can read
CREATE POLICY "unit_revenue_settings_select" ON unit_revenue_settings
  FOR SELECT USING (true);

CREATE POLICY "unit_revenue_settings_admin" ON unit_revenue_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Project numbers: everyone can read, insert updates usage
CREATE POLICY "protocol_project_numbers_select" ON protocol_project_numbers
  FOR SELECT USING (true);

CREATE POLICY "protocol_project_numbers_insert" ON protocol_project_numbers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "protocol_project_numbers_update" ON protocol_project_numbers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid()
    )
  );

-- =============================================================================
-- 7. Initialize default settings for existing units
-- =============================================================================
INSERT INTO unit_revenue_settings (unit_id, show_vip, show_protocol, show_mckinsey, show_ordit, show_event_revenue)
SELECT
  id,
  true,  -- show_vip
  true,  -- show_protocol
  CASE WHEN name = 'Államkincstár' THEN true ELSE false END,  -- show_mckinsey
  false, -- show_ordit
  false  -- show_event_revenue
FROM units
WHERE type = 'restaurant'
ON CONFLICT (unit_id) DO NOTHING;

-- =============================================================================
-- 8. Trigger for updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_protocol_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protocol_items_updated_at
  BEFORE UPDATE ON protocol_items
  FOR EACH ROW
  EXECUTE FUNCTION update_protocol_items_updated_at();

CREATE OR REPLACE FUNCTION update_unit_revenue_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unit_revenue_settings_updated_at
  BEFORE UPDATE ON unit_revenue_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_unit_revenue_settings_updated_at();

-- =============================================================================
-- 9. Function to update project number usage
-- =============================================================================
CREATE OR REPLACE FUNCTION upsert_project_number(p_number TEXT, p_description TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO protocol_project_numbers (project_number, description, usage_count, last_used_at)
  VALUES (p_number, p_description, 1, NOW())
  ON CONFLICT (project_number) DO UPDATE SET
    usage_count = protocol_project_numbers.usage_count + 1,
    last_used_at = NOW(),
    description = COALESCE(EXCLUDED.description, protocol_project_numbers.description);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON TABLE protocol_items IS 'Detailed protocol revenue items (bekészítés, éttermi fogyasztás)';
COMMENT ON TABLE unit_revenue_settings IS 'Per-unit visibility settings for revenue types in daily reports';
COMMENT ON TABLE protocol_project_numbers IS 'Autocomplete suggestions for protocol project numbers';
