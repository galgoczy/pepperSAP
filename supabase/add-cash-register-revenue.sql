-- Add cash_register_revenue table for tracking revenue per cash register
-- This replaces the single daily_revenue with per-cash-register tracking

CREATE TABLE IF NOT EXISTS cash_register_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_revenue_id UUID NOT NULL REFERENCES daily_revenue(id) ON DELETE CASCADE,
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,

  -- VAT breakdown for this cash register
  vat_0_percent DECIMAL(12, 2) DEFAULT 0,
  vat_5_percent DECIMAL(12, 2) DEFAULT 0,
  vat_18_percent DECIMAL(12, 2) DEFAULT 0,
  vat_27_percent DECIMAL(12, 2) DEFAULT 0,
  tips DECIMAL(12, 2) DEFAULT 0,

  -- Discrepancy for this cash register
  discrepancy_amount DECIMAL(12, 2) DEFAULT 0,
  discrepancy_currency VARCHAR(3) DEFAULT 'HUF',
  discrepancy_note TEXT,

  -- Payment methods from this cash register
  cash_payment DECIMAL(12, 2) DEFAULT 0,
  card_payment DECIMAL(12, 2) DEFAULT 0,
  szep_card_payment DECIMAL(12, 2) DEFAULT 0,

  -- Terminal data for this cash register
  terminal_card DECIMAL(12, 2) DEFAULT 0,
  terminal_szep DECIMAL(12, 2) DEFAULT 0,
  terminal_discrepancy_note TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one entry per cash register per daily revenue
  CONSTRAINT unique_daily_cash_register UNIQUE (daily_revenue_id, cash_register_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_cash_register_revenue_daily ON cash_register_revenue(daily_revenue_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_revenue_register ON cash_register_revenue(cash_register_id);

-- Enable Row Level Security
ALTER TABLE cash_register_revenue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow all authenticated users to read cash register revenue
CREATE POLICY "Authenticated users can view cash register revenue"
  ON cash_register_revenue
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to manage cash register revenue
CREATE POLICY "Authenticated users can insert cash register revenue"
  ON cash_register_revenue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update cash register revenue"
  ON cash_register_revenue
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete cash register revenue"
  ON cash_register_revenue
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cash_register_revenue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cash_register_revenue_timestamp
  BEFORE UPDATE ON cash_register_revenue
  FOR EACH ROW
  EXECUTE FUNCTION update_cash_register_revenue_updated_at();

-- Add comments
COMMENT ON TABLE cash_register_revenue IS 'Per-cash-register revenue data linked to daily_revenue entries';
COMMENT ON COLUMN cash_register_revenue.daily_revenue_id IS 'Reference to the parent daily revenue entry';
COMMENT ON COLUMN cash_register_revenue.cash_register_id IS 'Reference to the specific cash register';
