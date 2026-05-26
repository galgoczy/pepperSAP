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

-- =============================================
-- Knorr 105 Expenses Import
-- =============================================

DO $$
DECLARE
  v_unit_id UUID;
BEGIN
  -- Get unit_id
  SELECT id INTO v_unit_id FROM units WHERE name ILIKE '%knorr%105%' LIMIT 1;
  IF v_unit_id IS NULL THEN
    RAISE EXCEPTION 'Unit Knorr 105 not found';
  END IF;

  -- APRIL 2026 Expenses
  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-02', 'TEDI', 'A23601070/0523/00001', 3150, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-09', 'Central Drinks', '2026/CD26007529', 77667, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-10', 'TEDI', 'A23601071/0527/00001', 4500, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-10', 'TESCO GLOBAL', 'A05702970/1656/00002', 13393, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-10', 'OÁZIS KFT', 'A23473726/0182/00002', 7370, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-10', 'HELIT KFT', '617053409', 56492, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-10', 'KICHEN SHOP HUNGARY', 'KC85724', 30120, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-13', 'Bike Cafe', '2026/00318', 10990, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-13', 'Tescoma', 'SZ/A28200150/1493/00001', 11860, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-11', 'Tesco', 'A05702970/1657/00001', 24093, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-16', 'HELIT', '617056668', 54334, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-23', 'HELIT', '617061157', 50424, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-23', 'AUCHAN MAGYARORSZÁG', 'AI09/0121821', 13491, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-18', 'Rojik Kft', 'M-002814-LI/2026', 1785, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-24', 'ALZA.hu', 'AHUW261102294', 222960, true, 'transfer', 'ez a tv RSR');

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-29', 'HELIT', '617064850', 66161, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-29', 'Meta', '816173190832598', 8027, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-30', 'Koták András', 'KA-2026-1', 40000, false, 'cash', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-30', 'Uni-Flock', '416185', 165796, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-27', 'Meta', '816173190832598', 7380, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-16', 'UNI-FLOCK KFT', '415260', 87276, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-16', 'UNI-FLOCK KFT', '415163', -87276, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-04-16', 'Metro', '2026-0-0-11-0010-011530', 16041, true, 'transfer', NULL);

  -- MAY 2026 Expenses
  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-01', 'Tesco', 'A05702969/1677/00001', 31746, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-07', 'VOYAGEX MORINI KFT', 'KS2670550', 37793, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-07', 'HELIT KFT', '617069485', 121491, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-08', 'Altificer Hungary Kft', 'RTFCR-2026-5340', 28778, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-08', 'Rozmár', 'KS2670550', 37793, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-13', 'UNI-FLOCK', '417325', 142367, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-15', 'HELIT KFT', '617074783', 51337, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-15', 'CENTRAL DRINKS', '2026/CD26010865', 275551, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-18', 'Magyar Posta', 'SZ/0222011/03571/00001', 12000, false, 'cash', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-14', 'Klixon Kft', 'E-KLXN-2026-182', 19892, false, 'cash', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-06', 'Aldi', 'A05201524/0378/00001', 13279, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-14', 'ALZA.hu', 'dijbekérő 596319424', 69390, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-21', 'OÁZIS', 'A23473770/0218/00001', 2890, true, 'transfer', NULL);

  INSERT INTO expenses (unit_id, invoice_date, vendor_name, invoice_number, amount, is_official, payment_method, notes)
  VALUES (v_unit_id, '2026-05-21', 'HELIT', '617078336', 157666, true, 'transfer', NULL);

END $$;
