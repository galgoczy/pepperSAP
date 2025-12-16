-- Add VAT rate and net amount columns to event_revenues
ALTER TABLE event_revenues
ADD COLUMN IF NOT EXISTS vat_rate INTEGER DEFAULT 27,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(12,2);

-- Add VAT rate, net amount, is_efo, and is_official columns to event_expenses
ALTER TABLE event_expenses
ADD COLUMN IF NOT EXISTS vat_rate INTEGER DEFAULT 27,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS is_efo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN event_revenues.vat_rate IS 'VAT rate percentage (0, 5, 18, 27)';
COMMENT ON COLUMN event_revenues.net_amount IS 'Net amount (without VAT)';
COMMENT ON COLUMN event_expenses.vat_rate IS 'VAT rate percentage (0, 5, 18, 27) - only for official invoiced expenses';
COMMENT ON COLUMN event_expenses.net_amount IS 'Net amount (without VAT)';
COMMENT ON COLUMN event_expenses.is_efo IS 'True if this is an EFO expense (employment related)';
COMMENT ON COLUMN event_expenses.is_official IS 'True if this is an official (invoiced) expense';
