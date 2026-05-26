-- EFO Payments table
-- 2026-05-26

CREATE TABLE IF NOT EXISTS efo_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

  -- Employee info
  employee_name TEXT NOT NULL,

  -- Amount and calculation
  total_amount DECIMAL(12,2) NOT NULL,
  requires_qualification BOOLEAN DEFAULT true,
  official_amount DECIMAL(12,2) NOT NULL,
  extra_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Payment details
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
  payment_date DATE NOT NULL,

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_efo_payments_unit_date ON efo_payments(unit_id, payment_date);

-- RLS
ALTER TABLE efo_payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own unit efo_payments" ON efo_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR unit_id = efo_payments.unit_id)
    )
  );

CREATE POLICY "Users can insert efo_payments for own unit" ON efo_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR unit_id = efo_payments.unit_id)
    )
  );

CREATE POLICY "Users can update efo_payments for own unit" ON efo_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR unit_id = efo_payments.unit_id)
    )
  );

CREATE POLICY "Users can delete efo_payments for own unit" ON efo_payments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR unit_id = efo_payments.unit_id)
    )
  );

-- Trigger for updated_at
CREATE TRIGGER efo_payments_updated_at
  BEFORE UPDATE ON efo_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE efo_payments IS 'EFO kifizetések - alkalmazotti kifizetések hivatalos/extra bontással';
COMMENT ON COLUMN efo_payments.requires_qualification IS 'Szakképzést igénylő munkakör (true = 22000 Ft küszöb, false = 19000 Ft)';
COMMENT ON COLUMN efo_payments.official_amount IS 'Hivatalos (számlás) összeg';
COMMENT ON COLUMN efo_payments.extra_amount IS 'Extra (tartalék) összeg';
