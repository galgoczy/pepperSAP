-- Per-cash-register default change amount (váltópénz), so units don't have to
-- type it every day. The daily házipénztár change amount defaults to the sum
-- of the unit's active registers' values (falling back to 30000 if unset).
ALTER TABLE cash_registers
  ADD COLUMN IF NOT EXISTS default_change_amount DECIMAL(12,2);

COMMENT ON COLUMN cash_registers.default_change_amount IS 'Alapértelmezett váltópénz ezen a pénztárgépen (Ft)';
