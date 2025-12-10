-- Add cash_registers table for managing cash registers per unit
-- Each unit can have multiple cash registers, each with an associated card terminal

CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  ap_number VARCHAR(12) NOT NULL, -- AP number (e.g., AP1234567890)
  terminal_number VARCHAR(50), -- Associated card terminal number
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  -- active: in use, data required
  -- inactive: decommissioned, no longer in use
  -- suspended: temporarily not in use, no data required
  name VARCHAR(100), -- Optional friendly name (e.g., "Főkassza", "Terasz kassza")
  notes TEXT, -- Optional notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deactivated_at TIMESTAMP WITH TIME ZONE, -- When the register was decommissioned

  CONSTRAINT unique_ap_number UNIQUE (ap_number),
  CONSTRAINT ap_number_format CHECK (ap_number ~ '^AP[0-9]{1,10}$')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cash_registers_unit_id ON cash_registers(unit_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON cash_registers(status);

-- Enable Row Level Security
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow all authenticated users to read cash registers
CREATE POLICY "Authenticated users can view cash registers"
  ON cash_registers
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to manage cash registers
CREATE POLICY "Authenticated users can insert cash registers"
  ON cash_registers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update cash registers"
  ON cash_registers
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete cash registers"
  ON cash_registers
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cash_registers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cash_registers_timestamp
  BEFORE UPDATE ON cash_registers
  FOR EACH ROW
  EXECUTE FUNCTION update_cash_registers_updated_at();

-- Add comment explaining the table
COMMENT ON TABLE cash_registers IS 'Cash registers (pénztárgépek) per unit. Each unit can have multiple cash registers.';
COMMENT ON COLUMN cash_registers.ap_number IS 'Official AP number (starts with AP, followed by up to 10 digits)';
COMMENT ON COLUMN cash_registers.terminal_number IS 'Associated card terminal identifier';
COMMENT ON COLUMN cash_registers.status IS 'active = in use, inactive = decommissioned, suspended = temporarily not in use';
