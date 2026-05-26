-- =============================================
-- Knorr 105 Cash Register Import
-- 4 cash registers with detailed VAT breakdown
-- =============================================

DO $$
DECLARE
  v_unit_id UUID;
  v_cr1_id UUID;
  v_cr2_id UUID;
  v_cr3_id UUID;
  v_cr4_id UUID;
  v_rev_id UUID;
BEGIN
  -- Get unit_id
  SELECT id INTO v_unit_id FROM units WHERE name ILIKE '%knorr%105%' LIMIT 1;
  IF v_unit_id IS NULL THEN
    RAISE EXCEPTION 'Unit Knorr 105 not found';
  END IF;

  -- Create cash registers if not exist
  INSERT INTO cash_registers (unit_id, ap_number, name, status)
  VALUES (v_unit_id, 'A09111376', 'Pénztárgép 1', 'active')
  ON CONFLICT (ap_number) DO NOTHING;
  INSERT INTO cash_registers (unit_id, ap_number, name, status)
  VALUES (v_unit_id, 'A24010154', 'Pénztárgép 2', 'active')
  ON CONFLICT (ap_number) DO NOTHING;
  INSERT INTO cash_registers (unit_id, ap_number, name, status)
  VALUES (v_unit_id, 'A13609805', 'Pénztárgép 3', 'active')
  ON CONFLICT (ap_number) DO NOTHING;
  INSERT INTO cash_registers (unit_id, ap_number, name, status)
  VALUES (v_unit_id, 'A09110892', 'Pénztárgép 4', 'active')
  ON CONFLICT (ap_number) DO NOTHING;

  -- Get cash register IDs
  SELECT id INTO v_cr1_id FROM cash_registers WHERE ap_number = 'A09111376';
  SELECT id INTO v_cr2_id FROM cash_registers WHERE ap_number = 'A24010154';
  SELECT id INTO v_cr3_id FROM cash_registers WHERE ap_number = 'A13609805';
  SELECT id INTO v_cr4_id FROM cash_registers WHERE ap_number = 'A09110892';

  -- 2026-04-01
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-01';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 275210.0, 500.0, 245535.0, 0, 0, 0, 246035.0, 1145.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 608820.0, 2800.0, 568710.0, 0, 0, 1990.0, 569520.0, 110.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 408190.0, 1600.0, 389330.0, 0, 0, 0, 390930.0, -495.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 342965.0, 1350.0, 326270.0, 0, 0, 0, 327620.0, -675.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-02
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-02';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 280130.0, 1050.0, 257120.0, 0, 0, 0, 258170.0, 2315.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 472080.0, 2590.0, 437905.0, 0, 0, 0, 440495.0, -4775.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 430145.0, 1850.0, 410460.0, 0, 0, 0, 412310.0, 775.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 226070.0, 900.0, 218130.0, 0, 0, 0, 219030.0, -990.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-07
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-07';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 306695.0, 1350.0, 289455.0, 0, 0, 1990.0, 288815.0, 1130.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 578305.0, 3200.0, 523280.0, 0, 0, 0, 526480.0, 1040.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 330905.0, 1950.0, 302315.0, 0, 0, 0, 304265.0, 340.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 166655.0, 800.0, 155195.0, 0, 0, 0, 155995.0, 60.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-08
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-08';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 404145.0, 750.0, 383665.0, 0, 0, 0, 384415.0, 2620.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 628945.0, 3850.0, 605930.0, 0, 0, 0, 609780.0, -3510.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 314595.0, 1000.0, 298733.0, 0, 0, 1890.0, 297843.0, -332.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 300910.0, 1200.0, 287190.0, 0, 0, 1990.0, 286400.0, 0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-09
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-09';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 364235.0, 750.0, 347795.0, 0, 0, 0, 348545.0, 1880.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 630670.0, 2800.0, 603840.0, 0, 0, 0, 606640.0, 3005.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 377170.0, 1540.0, 350142.0, 0, 0, 0, 351682.0, 562.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 231830.0, 850.0, 218510.0, 0, 0, 2080.0, 217280.0, -540.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-10
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-10';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 306795.0, 800.0, 301315.0, 0, 0, 0, 302115.0, 2210.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 542650.0, 3765.0, 522980.0, 0, 0, 2330.0, 524415.0, 2975.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 302085.0, 1250.0, 286693.0, 0, 0, 0, 287943.0, -492.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 180920.0, 800.0, 174830.0, 0, 0, 0, 175630.0, -1000.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-13
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-13';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 396495.0, 1300.0, 378715.0, 0, 0, 0, 380015.0, 520.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 503650.0, 4200.0, 477795.0, 0, 0, 1890.0, 480105.0, 120.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 382650.0, 1800.0, 365502.0, 0, 0, 0, 367302.0, -18.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 422950.0, 1050.0, 269800.0, 0, 0, 0, 270850.0, -1090.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-14
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-14';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 477235.0, 1500.0, 459465.0, 0, 0, 1990.0, 458975.0, 1290.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 721000.0, 3300.0, 680970.0, 0, 0, 0, 684270.0, 570.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 439345.0, 2610.0, 389025.0, 0, 0, 0, 391635.0, 0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 338635.0, 1900.0, 327170.0, 0, 0, 0, 329070.0, 100.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-15
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-15';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 466365.0, 1300.0, 444520.0, 0, 0, 0, 445820.0, 3510.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 594855.0, 3350.0, 568085.0, 0, 0, 0, 571435.0, -290.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 379890.0, 1750.0, 358558.0, 0, 0, 0, 360308.0, 1108.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 356985.0, 2250.0, 341935.0, 0, 0, 1890.0, 342295.0, 90.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-16
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-16';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 387410.0, 850.0, 374285.0, 0, 0, 0, 375135.0, 790.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 645820.0, 3100.0, 612720.0, 0, 0, 0, 615820.0, 275.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 379000.0, 2300.0, 367643.0, 0, 0, 1990.0, 367953.0, 418.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 313785.0, 1750.0, 288690.0, 0, 0, 0, 297590.0, -440.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-17
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-17';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 377595.0, 900.0, 357700.0, 0, 0, 0, 358600.0, 1005.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 576975.0, 3400.0, 549610.0, 0, 0, 1990.0, 551020.0, 2060.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 338895.0, 2150.0, 312601.0, 0, 0, 0, 314751.0, -324.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 191750.0, 1000.0, 189210.0, 0, 0, 0, 190210.0, -100.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-20
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-20';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 427810.0, 1100.0, 407105.0, 0, 0, 0, 408205.0, 1290.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 640835.0, 3600.0, 607300.0, 0, 0, 0, 610900.0, 945.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 377155.0, 1370.0, 359580.0, 0, 0, 0, 360950.0, -705.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 284560.0, 1500.0, 274189.0, 0, 0, 2740.0, 272949.0, -2551.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-21
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-21';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 508400.0, 1150.0, 492905.0, 0, 0, 0, 494055.0, 205.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 557840.0, 2500.0, 510380.0, 0, 0, 1990.0, 510890.0, 3135.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 436745.0, 1750.0, 418973.0, 0, 0, 0, 420723.0, 448.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 364725.0, 1600.0, 331205.0, 1290.0, 0, 0, 334095.0, 330.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-22
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-22';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 489810.0, 1200.0, 461580.0, 0, 0, 0, 462780.0, 255.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 663670.0, 3100.0, 633205.0, 0, 0, 0, 636305.0, 1750.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 446835.0, 2050.0, 421305.0, 0, 0, 0, 456425.0, 2270.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 312950.0, 1450.0, 307840.0, 0, 0, 2300.0, 306990.0, 540.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-23
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-23';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 363325.0, 1050.0, 348695.0, 0, 0, 0, 349745.0, 10.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 767270.0, 3850.0, 726110.0, 0, 0, 1990.0, 727970.0, 6230.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 406960.0, 2000.0, 398538.0, 0, 0, 0, 400538.0, 2513.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 302945.0, 900.0, 286905.0, 0, 0, 0, 287805.0, -4230.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-24
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-24';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 344025.0, 700.0, 324685.0, 0, 0, 0, 325385.0, 1470.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 585335.0, 2750.0, 544755.0, 0, 0, 0, 547505.0, 2685.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 306865.0, 1700.0, 290525.0, 0, 0, 0, 292225.0, -1155.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 235355.0, 1350.0, 218225.0, 470.0, 0, 2550.0, 217495.0, -985.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-27
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-27';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 418515.0, 900.0, 392520.0, 0, 0, 0, 393420.0, 2185.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 645235.0, 3357.0, 604138.0, 0, 0, 2350.0, 605145.0, 700.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 356855.0, 1200.0, 336163.0, 0, 0, 0, 337363.0, -167.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 236970.0, 1200.0, 229800.0, 0, 0, 0, 231000.0, -1895.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-28
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-28';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 422250.0, 950.0, 408150.0, 0, 0, 0, 409100.0, 965.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 703015.0, 3450.0, 661150.0, 0, 0, 0, 664600.0, -2415.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 417010.0, 1915.0, 382035.0, 0, 0, 0, 383950.0, -1560.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 352045.0, 1400.0, 333695.0, 0, 0, 0, 335095.0, 250.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-29
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-29';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 406715.0, 800.0, 364765.0, 0, 0, 0, 365565.0, 1775.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 574700.0, 2400.0, 533740.0, 0, 0, 0, 536140.0, 1960.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 422575.0, 1570.0, 389391.0, 0, 0, 0, 390961.0, 5241.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 339470.0, 1750.0, 329700.0, 0, 0, 1990.0, 329460.0, -1060.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-04-30
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-30';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 420245.0, 450.0, 360105.0, 0, 0, 0, 360555.0, 3940.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 562120.0, 2400.0, 512665.0, 0, 0, 0, 515065.0, 280.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 319135.0, 1350.0, 293000.0, 0, 0, 0, 294350.0, 1075.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 136510.0, 150.0, 130015.0, 0, 0, 2550.0, 127615.0, -215.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-04
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-04';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 409810.0, 1300.0, 372280.0, 0, 0, 0, 373580.0, -1160.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 629260.0, 2700.0, 570100.0, 0, 0, 0, 572800.0, 1600.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 340240.0, 1550.0, 302808.0, 0, 0, 0, 304358.0, 753.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 280765.0, 950.0, 263760.0, 0, 0, 1990.0, 262720.0, -2265.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-05
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-05';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 414535.0, 1300.0, 384435.0, 0, 0, 0, 385735.0, 8500.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 649350.0, 4750.0, 580900.0, 0, 0, 0, 585650.0, -500.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 382045.0, 1650.0, 352405.0, 0, 0, 0, 354055.0, -2415.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 320290.0, 1750.0, 286355.0, 0, 0, 2440.0, 285665.0, 285.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-06
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-06';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 421390.0, 1150.0, 390460.0, 0, 0, 0, 391610.0, -12930.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 733785.0, 3300.0, 668845.0, 0, 0, 0, 672145.0, 3010.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 395160.0, 1950.0, 368953.0, 0, 0, 3139.0, 367763.0, 3473.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 345885.0, 1850.0, 323835.0, 0, 0, 2040.0, 323645.0, 720.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-07
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-07';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 479785.0, 1250.0, 460925.0, 0, 0, 0, 462175.0, 9640.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 629985.0, 5640.0, 626460.0, 0, 0, 1990.0, 630110.0, 435.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 405925.0, 2500.0, 372210.0, 0, 0, 0, 374710.0, -210.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 273465.0, 1000.0, 262565.0, 0, 0, 0, 263565.0, -760.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-08
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-08';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 357190.0, 1750.0, 341995.0, 0, 0, 0, 343745.0, 1955.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 577635.0, 3950.0, 533015.0, 0, 0, 0, 536965.0, 495.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 285510.0, 1700.0, 263438.0, 0, 0, 0, 265138.0, 588.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 240570.0, 1100.0, 222430.0, 0, 0, 0, 223530.0, -40.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-11
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-11';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 373040.0, 850.0, 347025.0, 0, 0, 0, 347875.0, 2190.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 668270.0, 4000.0, 625645.0, 0, 0, 0, 629645.0, -1380.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 370795.0, 5460.0, 342660.0, 0, 0, 0, 348120.0, -870.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 325850.0, 2200.0, 313560.0, 0, 0, 2040.0, 313720.0, -880.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-12
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-12';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 508320.0, 1250.0, 483223.0, 0, 0, 0, 484473.0, 7498.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 703635.0, 4000.0, 649615.0, 0, 0, 0, 653615.0, 645.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 393100.0, 1750.0, 372913.0, 0, 0, 0, 374663.0, 63.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 297630.0, 1850.0, 283200.0, 0, 0, 1990.0, 283060.0, 520.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-13
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-13';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 491395.0, 1150.0, 457715.0, 0, 0, 0, 458865.0, 1190.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 688190.0, 3000.0, 642890.0, 0, 0, 0, 645890.0, 2840.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 367175.0, 2430.0, 351295.0, 0, 0, 0, 353725.0, 275.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 341315.0, 1750.0, 319685.0, 0, 0, 2440.0, 318995.0, 720.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-14
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-14';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 361545.0, 1050.0, 342155.0, 0, 0, 0, 343205.0, 2095.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 659910.0, 3550.0, 619180.0, 0, 0, 0, 622730.0, 4410.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 397720.0, 1850.0, 359190.0, 0, 0, 0, 361040.0, 840.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 254310.0, 1450.0, 243960.0, 0, 0, 2050.0, 243360.0, 260.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-15
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-15';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 399240.0, 1700.0, 375115.0, 0, 0, 0, 376815.0, -85.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 574110.0, 4100.0, 528950.0, 0, 0, 0, 533050.0, 1700.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 306330.0, 1650.0, 288946.0, 0, 0, 0, 290596.0, 0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 180875.0, 800.0, 174765.0, 0, 0, 1890.0, 173675.0, 3730.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-18
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-18';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 388815.0, 1150.0, 368285.0, 0, 0, 0, 369435.0, 1560.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 568500.0, 3070.0, 536755.0, 0, 0, 0, 539825.0, 785.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 389225.0, 1780.0, 363055.0, 0, 0, 0, 364835.0, -600.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 218325.0, 500.0, 217815.0, 0, 0, 2140.0, 216175.0, 2020.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-19
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-19';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 478050.0, 1100.0, 456360.0, 0, 0, 0, 457460.0, 3200.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 612915.0, 3650.0, 578850.0, 0, 0, 0, 582500.0, 7965.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 347165.0, 1150.0, 321370.0, 0, 0, 0, 322520.0, 285.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 316195.0, 1050.0, 309595.0, 0, 0, 1990.0, 308655.0, 680.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-20
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-20';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 486415.0, 700.0, 453700.0, 0, 0, 0, 454400.0, -1325.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 714645.0, 5490.0, 637685.0, 0, 0, 0, 643175.0, 635.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 377230.0, 1300.0, 356760.0, 0, 0, 0, 358060.0, 130.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 216020.0, 450.0, 214980.0, 0, 0, 0, 215430.0, 1020.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-21
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-21';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 454160.0, 750.0, 436440.0, 0, 0, 0, 437190.0, 1730.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 598565.0, 3000.0, 556705.0, 0, 0, 0, 559705.0, 3550.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 412570.0, 2000.0, 375001.0, 0, 0, 0, 377001.0, 291.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 265520.0, 1550.0, 260950.0, 0, 0, 2540.0, 259960.0, 0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

  -- 2026-05-22
  SELECT id INTO v_rev_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-22';
  IF v_rev_id IS NOT NULL THEN
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr1_id, 336560.0, 600.0, 307500.0, 0, 0, 0, 308100.0, -400.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr2_id, 526115.0, 2900.0, 500170.0, 0, 0, 0, 503070.0, 1790.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr3_id, 354615.0, 2000.0, 326305.0, 0, 0, 0, 328305.0, 1475.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
    INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, tips)
    VALUES (v_rev_id, v_cr4_id, 210510.0, 1050.0, 203150.0, 0, 0, 0, 204200.0, -1220.0)
    ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
      software_revenue = EXCLUDED.software_revenue,
      vat_0_percent = EXCLUDED.vat_0_percent,
      vat_5_percent = EXCLUDED.vat_5_percent,
      vat_18_percent = EXCLUDED.vat_18_percent,
      vat_27_percent = EXCLUDED.vat_27_percent,
      cash_payment = EXCLUDED.cash_payment,
      card_payment = EXCLUDED.card_payment,
      tips = EXCLUDED.tips;
  END IF;

END $$;
