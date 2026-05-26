-- Knorr 105 KP Expenses Import (csak készpénzes, hivatalos)

DO $$
DECLARE
  v_unit_id UUID;
BEGIN
  SELECT id INTO v_unit_id FROM units WHERE name ILIKE '%knorr%105%' LIMIT 1;
  IF v_unit_id IS NULL THEN
    RAISE EXCEPTION 'Unit Knorr 105 not found';
  END IF;

  -- DELETE existing April-May 2026 expenses first
  DELETE FROM expenses
  WHERE unit_id = v_unit_id
    AND invoice_date >= '2026-04-01'
    AND invoice_date <= '2026-05-31';

  INSERT INTO expenses (unit_id, invoice_date, supplier_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-30', 'Koták András', 'KA-2026-1', 40000.0, true, 'cash', NULL);

  INSERT INTO expenses (unit_id, invoice_date, supplier_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-18', 'Magyar Posta', 'SZ/0222011/03571/00001', 12000.0, true, 'cash', NULL);

  INSERT INTO expenses (unit_id, invoice_date, supplier_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-14', 'Klixon Kft', 'E-KLXN-2026-182', 19892.0, true, 'cash', NULL);

END $$;