-- =============================================
-- Knorr 105 Import Script - April & May 2026
-- Generated: 2026-05-26
-- =============================================

-- Daily Revenue Import
DO $$
DECLARE
  v_unit_id UUID;
BEGIN
  -- Get unit_id
  SELECT id INTO v_unit_id FROM units WHERE name ILIKE '%knorr%105%' LIMIT 1;
  IF v_unit_id IS NULL THEN
    RAISE EXCEPTION 'Unit Knorr 105 not found';
  END IF;

  -- =============================================
  -- APRIL 2026 Daily Revenue
  -- =============================================

  -- April 1
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-01', 1635185, 892, 137800, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 2
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-02', 1408425, 775, NULL, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 7
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-07', 1382560, 824, NULL, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 8
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-08', 1648595, 905, 120500, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 9
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-09', 1603905, 883, 84800, 10000)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 10
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-10', 1332450, 756, NULL, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 13
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-13', 1705745, 881, 15960, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 14
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-14', 1976215, 1074, 31860, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 15
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-15', 1798095, 1055, 57560, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 16
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-16', 1726015, 997, 603320, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 17
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-17', 1485215, 867, 256500, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 20
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-20', 1730360, 980, 55850, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 21
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-21', 1867710, 1046, 139970, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 22
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-22', 1937515, 1056, 144440, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 23
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-23', 1840500, 1015, 97050, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 24
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-24', 1471580, 843, NULL, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 27
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-27', 1657575, 987, 21200, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 28
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-28', 1894320, 1038, 322190, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 29
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-29', 1743460, 982, 95400, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- April 30
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-04-30', 1438010, 824, NULL, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- =============================================
  -- MAY 2026 Daily Revenue
  -- =============================================

  -- May 4
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-04', 1660075, 946, 13250, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 5
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-05', 1766220, 988, 99160, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 6
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-06', 1896220, 1064, 72300, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 7
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-07', 1838065, 1022, 117320, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 8
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-08', 1460905, 821, NULL, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 11
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-11', 1737955, 995, 112150, 10000)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 12
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-12', 1902685, 998, 97600, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 13
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-13', 1888075, 1041, 231680, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 14
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-14', 1673485, 951, 3420, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 15
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-15', 1460555, 787, 125550, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 18
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-18', 1564865, 909, 83040, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 19
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-19', 1754325, 1011, 73170, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 20
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-20', 1794310, 958, 95400, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 21
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-21', 1730815, 996, 133880, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

  -- May 22
  INSERT INTO daily_revenue (unit_id, date, total_revenue, guest_count, protocol_gross, extra_cash_revenue)
  VALUES (v_unit_id, '2026-05-22', 1426800, 806, 30320, NULL)
  ON CONFLICT (unit_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    guest_count = EXCLUDED.guest_count,
    protocol_gross = EXCLUDED.protocol_gross,
    extra_cash_revenue = EXCLUDED.extra_cash_revenue;

END $$;

-- NOTE: Expenses are in separate file: 20260526_knorr105_expenses.sql
-- (Only cash/KP expenses, marked as is_official=true)
