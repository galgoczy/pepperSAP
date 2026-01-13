-- Budget Targets Schema
-- For controlling / plan vs actual variance analysis

-- =============================================================================
-- BUDGET_TARGETS TABLE (Tervadatok)
-- =============================================================================
CREATE TABLE IF NOT EXISTS budget_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time period
  year_month TEXT NOT NULL,              -- '2026-01' format (YYYY-MM)
  period_type TEXT DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),

  -- Dimension: unit OR category (mutually exclusive)
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  category TEXT,                          -- 'events', 'K0', 'K00', 'total'

  -- Planned values (Tervezett értékek)
  planned_revenue DECIMAL(12,2) DEFAULT 0,          -- Tervezett bevétel
  planned_cost DECIMAL(12,2) DEFAULT 0,             -- Tervezett költség
  planned_margin DECIMAL(12,2) DEFAULT 0,           -- Tervezett fedezet (auto or manual)

  -- Detailed cost breakdown (optional)
  planned_wage_cost DECIMAL(12,2),        -- Tervezett bérköltség
  planned_material_cost DECIMAL(12,2),    -- Tervezett anyagköltség
  planned_overhead DECIMAL(12,2),         -- Tervezett rezsi/overhead
  planned_other_cost DECIMAL(12,2),       -- Egyéb tervezett költség

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'locked')),

  -- Audit
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints: either unit_id OR category, not both
  CONSTRAINT budget_dimension CHECK (
    (unit_id IS NOT NULL AND category IS NULL) OR
    (unit_id IS NULL AND category IS NOT NULL)
  ),

  -- Unique constraint per period/dimension
  CONSTRAINT budget_unique_unit UNIQUE (year_month, unit_id),
  CONSTRAINT budget_unique_category UNIQUE (year_month, category)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_budget_year_month ON budget_targets(year_month);
CREATE INDEX IF NOT EXISTS idx_budget_unit ON budget_targets(unit_id);
CREATE INDEX IF NOT EXISTS idx_budget_category ON budget_targets(category);
CREATE INDEX IF NOT EXISTS idx_budget_status ON budget_targets(status);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE budget_targets ENABLE ROW LEVEL SECURITY;

-- Everyone can read budgets
CREATE POLICY "budget_targets_select" ON budget_targets
  FOR SELECT USING (true);

-- Only admin can modify budgets
CREATE POLICY "budget_targets_admin" ON budget_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- TRIGGER FOR updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_budget_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Auto-calculate margin if not provided
  IF NEW.planned_margin IS NULL OR NEW.planned_margin = 0 THEN
    NEW.planned_margin = COALESCE(NEW.planned_revenue, 0) - COALESCE(NEW.planned_cost, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budget_targets_updated_at
  BEFORE INSERT OR UPDATE ON budget_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_targets_updated_at();

-- =============================================================================
-- HELPER VIEW: Budget with actual data comparison
-- =============================================================================
-- This view joins budget targets with actual monthly data for variance analysis
-- Note: Actual data comes from aggregating daily_revenue and expenses tables

CREATE OR REPLACE VIEW budget_vs_actual AS
SELECT
  bt.id as budget_id,
  bt.year_month,
  bt.unit_id,
  bt.category,
  u.name as unit_name,
  bt.planned_revenue,
  bt.planned_cost,
  bt.planned_margin,
  bt.status,
  -- Actual data will be calculated in application layer
  -- as it requires complex aggregation from multiple tables
  bt.created_at,
  bt.updated_at
FROM budget_targets bt
LEFT JOIN units u ON bt.unit_id = u.id
ORDER BY bt.year_month DESC, u.name;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE budget_targets IS 'Budget/plan data for controlling and variance analysis';
COMMENT ON COLUMN budget_targets.year_month IS 'Period in YYYY-MM format';
COMMENT ON COLUMN budget_targets.planned_revenue IS 'Planned revenue for the period';
COMMENT ON COLUMN budget_targets.planned_cost IS 'Planned total cost for the period';
COMMENT ON COLUMN budget_targets.planned_margin IS 'Planned margin (revenue - cost)';
COMMENT ON COLUMN budget_targets.status IS 'draft=editable, approved=reviewed, locked=finalized';
