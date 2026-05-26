-- Add line_items JSONB column to event_revenues for storing itemized breakdown
ALTER TABLE event_revenues ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]';

-- Comment for clarity
COMMENT ON COLUMN event_revenues.line_items IS 'Array of line items: [{description, vat_rate, currency, gross_amount}]';
