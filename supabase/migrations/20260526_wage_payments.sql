-- Create wage_payments table for weekly wage payments
CREATE TABLE IF NOT EXISTS wage_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,

  -- Worker info
  worker_name TEXT NOT NULL,

  -- Amounts
  official_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  extra_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wage_payments_unit_date ON wage_payments(unit_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_wage_payments_date ON wage_payments(payment_date);

-- RLS
ALTER TABLE wage_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view wage payments for their unit" ON wage_payments;
CREATE POLICY "Users can view wage payments for their unit" ON wage_payments
  FOR SELECT USING (
    unit_id IN (SELECT unit_id FROM user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can insert wage payments for their unit" ON wage_payments;
CREATE POLICY "Users can insert wage payments for their unit" ON wage_payments
  FOR INSERT WITH CHECK (
    unit_id IN (SELECT unit_id FROM user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can update wage payments for their unit" ON wage_payments;
CREATE POLICY "Users can update wage payments for their unit" ON wage_payments
  FOR UPDATE USING (
    unit_id IN (SELECT unit_id FROM user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can delete wage payments for their unit" ON wage_payments;
CREATE POLICY "Users can delete wage payments for their unit" ON wage_payments
  FOR DELETE USING (
    unit_id IN (SELECT unit_id FROM user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
