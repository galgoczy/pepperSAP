-- Webshop integration (daily revenue import)
-- Created: 2026-02-09

-- Webshop daily revenue table
CREATE TABLE IF NOT EXISTS webshop_daily_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Date and unit
  date DATE NOT NULL,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

  -- Revenue data
  gross_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,

  -- Additional stats
  average_order_value DECIMAL(12, 2) GENERATED ALWAYS AS (
    CASE WHEN order_count > 0 THEN gross_revenue / order_count ELSE 0 END
  ) STORED,

  -- Source info
  source TEXT DEFAULT 'manual', -- manual, api, import
  import_reference TEXT, -- file name or API reference

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Unique constraint
  UNIQUE(date, unit_id)
);

-- Webshop top products (daily)
CREATE TABLE IF NOT EXISTS webshop_top_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Date and unit
  date DATE NOT NULL,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

  -- Product info
  product_name TEXT NOT NULL,
  product_sku TEXT,
  category TEXT,

  -- Sales data
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  gross_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Rank for the day
  rank INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product categories for webshop
CREATE TABLE IF NOT EXISTS webshop_product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webshop_revenue_date ON webshop_daily_revenue(date DESC);
CREATE INDEX idx_webshop_revenue_unit ON webshop_daily_revenue(unit_id);
CREATE INDEX idx_webshop_revenue_date_unit ON webshop_daily_revenue(date, unit_id);
CREATE INDEX idx_webshop_products_date ON webshop_top_products(date DESC);
CREATE INDEX idx_webshop_products_unit ON webshop_top_products(unit_id);
CREATE INDEX idx_webshop_products_category ON webshop_top_products(category);

-- RLS policies
ALTER TABLE webshop_daily_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webshop_top_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE webshop_product_categories ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to webshop_daily_revenue" ON webshop_daily_revenue
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins full access to webshop_top_products" ON webshop_top_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins full access to webshop_product_categories" ON webshop_product_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Unit users can view their own unit's data
CREATE POLICY "Units can view own webshop_daily_revenue" ON webshop_daily_revenue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'unit'
      AND unit_id = webshop_daily_revenue.unit_id
    )
  );

CREATE POLICY "Units can view own webshop_top_products" ON webshop_top_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'unit'
      AND unit_id = webshop_top_products.unit_id
    )
  );

-- Everyone can read categories
CREATE POLICY "Everyone can read product categories" ON webshop_product_categories
  FOR SELECT USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_webshop_revenue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webshop_revenue_updated_at
  BEFORE UPDATE ON webshop_daily_revenue
  FOR EACH ROW
  EXECUTE FUNCTION update_webshop_revenue_updated_at();

-- Audit trigger
DROP TRIGGER IF EXISTS audit_webshop_daily_revenue ON webshop_daily_revenue;
CREATE TRIGGER audit_webshop_daily_revenue
  AFTER INSERT OR UPDATE OR DELETE ON webshop_daily_revenue
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Insert sample categories
INSERT INTO webshop_product_categories (name, description, color) VALUES
  ('Fűszerek', 'Fűszerek és ízesítők', '#EF4444'),
  ('Szószok', 'Szószok és mártások', '#F97316'),
  ('Italok', 'Üdítők és italok', '#3B82F6'),
  ('Ajándék', 'Ajándékcsomagok', '#8B5CF6'),
  ('Egyéb', 'Egyéb termékek', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Comments
COMMENT ON TABLE webshop_daily_revenue IS 'Napi webáruház forgalom egységenként';
COMMENT ON TABLE webshop_top_products IS 'Napi top termékek egységenként';
COMMENT ON TABLE webshop_product_categories IS 'Webáruház termék kategóriák';
