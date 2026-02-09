-- Discount types management (B/1. requirement: Kedvezmény-kezelés)
-- Created: 2026-02-09

-- Discount types table
CREATE TABLE IF NOT EXISTS discount_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed_amount

  -- Discount value
  value DECIMAL(10, 2) NOT NULL, -- percentage (0-100) or fixed amount

  -- Conditions
  condition_type TEXT NOT NULL DEFAULT 'none', -- none, quantity, period, value_threshold, customer
  min_quantity INTEGER, -- For quantity-based discounts
  min_value DECIMAL(12, 2), -- For value threshold discounts
  valid_from DATE, -- For period-based discounts
  valid_to DATE, -- For period-based discounts

  -- Applicability
  applies_to TEXT DEFAULT 'all', -- all, specific_customers, specific_products
  customer_ids UUID[], -- Array of company IDs if specific_customers

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Deal discounts (applied discounts on deals)
CREATE TABLE IF NOT EXISTS deal_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  discount_type_id UUID REFERENCES discount_types(id) ON DELETE SET NULL,

  -- Applied values (snapshot at time of application)
  discount_name TEXT NOT NULL,
  discount_type TEXT NOT NULL, -- percentage, fixed_amount
  discount_value DECIMAL(10, 2) NOT NULL,
  calculated_amount DECIMAL(12, 2), -- Actual discount amount in currency

  -- Notes
  notes TEXT,

  -- Metadata
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_discount_types_active ON discount_types(is_active);
CREATE INDEX idx_discount_types_condition ON discount_types(condition_type);
CREATE INDEX idx_deal_discounts_deal ON deal_discounts(deal_id);

-- RLS policies
ALTER TABLE discount_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_discounts ENABLE ROW LEVEL SECURITY;

-- Admins can manage discount types
CREATE POLICY "Admins full access to discount_types" ON discount_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Everyone can view active discount types
CREATE POLICY "Everyone can view active discount_types" ON discount_types
  FOR SELECT USING (is_active = true);

-- Admins can manage deal discounts
CREATE POLICY "Admins full access to deal_discounts" ON deal_discounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_discount_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER discount_types_updated_at
  BEFORE UPDATE ON discount_types
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_types_updated_at();

-- Audit trigger
DROP TRIGGER IF EXISTS audit_discount_types ON discount_types;
CREATE TRIGGER audit_discount_types
  AFTER INSERT OR UPDATE OR DELETE ON discount_types
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Insert default discount types
INSERT INTO discount_types (name, description, discount_type, value, condition_type, min_quantity, is_active)
VALUES
  ('Mennyiségi kedvezmény 5%', '10 db feletti rendelés esetén 5% kedvezmény', 'percentage', 5, 'quantity', 10, true),
  ('Mennyiségi kedvezmény 10%', '50 db feletti rendelés esetén 10% kedvezmény', 'percentage', 10, 'quantity', 50, true),
  ('Törzsvásárlói kedvezmény', 'Visszatérő ügyfeleknek 3% kedvezmény', 'percentage', 3, 'customer', NULL, true);

INSERT INTO discount_types (name, description, discount_type, value, condition_type, valid_from, valid_to, is_active)
VALUES
  ('Tavaszi akció 2026', 'Tavaszi időszakban 15% kedvezmény', 'percentage', 15, 'period', '2026-03-01', '2026-05-31', true),
  ('Nyári akció 2026', 'Nyári időszakban 10% kedvezmény', 'percentage', 10, 'period', '2026-06-01', '2026-08-31', true);

-- Comments
COMMENT ON TABLE discount_types IS 'Kedvezmény típusok definíciója (DIMOP B/1. Kedvezmény-kezelés)';
COMMENT ON TABLE deal_discounts IS 'Deal-ekre alkalmazott kedvezmények';
COMMENT ON COLUMN discount_types.condition_type IS 'none, quantity, period, value_threshold, customer';
COMMENT ON COLUMN discount_types.discount_type IS 'percentage (0-100) vagy fixed_amount (Ft)';
