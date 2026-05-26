-- Re-import cash register revenue data for Knorr 105
DO $$
DECLARE
  v_unit_id UUID;
  v_daily_revenue_id UUID;
  v_register_1_id UUID;
  v_register_2_id UUID;
  v_register_3_id UUID;
  v_register_4_id UUID;
BEGIN
  SELECT id INTO v_unit_id FROM units WHERE name ILIKE '%knorr%105%' LIMIT 1;
  IF v_unit_id IS NULL THEN RAISE EXCEPTION 'Knorr 105 not found'; END IF;

  SELECT id INTO v_register_1_id FROM cash_registers WHERE ap_number = 'APA09111376' AND unit_id = v_unit_id LIMIT 1;
  SELECT id INTO v_register_2_id FROM cash_registers WHERE ap_number = 'APA24010154' AND unit_id = v_unit_id LIMIT 1;
  SELECT id INTO v_register_3_id FROM cash_registers WHERE ap_number = 'APA13609805' AND unit_id = v_unit_id LIMIT 1;
  SELECT id INTO v_register_4_id FROM cash_registers WHERE ap_number = 'APA09110892' AND unit_id = v_unit_id LIMIT 1;

  -- 2026-04-01
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-01';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 275210.0, 500.0, 245535.0, 0, 0, 0, 246035.0, 246035.0, 1145.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 275210.0, vat_0_percent = 500.0, vat_5_percent = 245535.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 246035.0, terminal_card = 246035.0, tips = 1145.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 608820.0, 2800.0, 568710.0, 0, 0, 1990.0, 569520.0, 569520.0, 110.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 608820.0, vat_0_percent = 2800.0, vat_5_percent = 568710.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 569520.0, terminal_card = 569520.0, tips = 110.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 408190.0, 1600.0, 389330.0, 0, 0, 0, 390930.0, 390930.0, -495.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 408190.0, vat_0_percent = 1600.0, vat_5_percent = 389330.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 390930.0, terminal_card = 390930.0, tips = -495.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 342965.0, 1350.0, 326270.0, 0, 0, 0, 327620.0, 327620.0, -675.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 342965.0, vat_0_percent = 1350.0, vat_5_percent = 326270.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 327620.0, terminal_card = 327620.0, tips = -675.0;
    END IF;
  END IF;

  -- 2026-04-02
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-02';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 280130.0, 1050.0, 257120.0, 0, 0, 0, 258170.0, 258905.0, 2315.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 280130.0, vat_0_percent = 1050.0, vat_5_percent = 257120.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 258170.0, terminal_card = 258905.0, tips = 2315.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 472080.0, 2590.0, 437905.0, 0, 0, 0, 440495.0, 440495.0, -4775.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 472080.0, vat_0_percent = 2590.0, vat_5_percent = 437905.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 440495.0, terminal_card = 440495.0, tips = -4775.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 430145.0, 1850.0, 410460.0, 0, 0, 0, 412310.0, 412310.0, 775.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 430145.0, vat_0_percent = 1850.0, vat_5_percent = 410460.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 412310.0, terminal_card = 412310.0, tips = 775.0;
    END IF;
  END IF;

  -- 2026-04-07
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-07';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 306695.0, 1350.0, 289455.0, 0, 0, 1990.0, 288815.0, 288815.0, 1130.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 306695.0, vat_0_percent = 1350.0, vat_5_percent = 289455.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 288815.0, terminal_card = 288815.0, tips = 1130.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 578305.0, 3200.0, 523280.0, 0, 0, 0, 526480.0, 526480.0, 1040.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 578305.0, vat_0_percent = 3200.0, vat_5_percent = 523280.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 526480.0, terminal_card = 526480.0, tips = 1040.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 330905.0, 1950.0, 302315.0, 0, 0, 0, 304265.0, 304265.0, 340.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 330905.0, vat_0_percent = 1950.0, vat_5_percent = 302315.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 304265.0, terminal_card = 304265.0, tips = 340.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 166655.0, 800.0, 155195.0, 0, 0, 0, 155995.0, 155995.0, 60.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 166655.0, vat_0_percent = 800.0, vat_5_percent = 155195.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 155995.0, terminal_card = 155995.0, tips = 60.0;
    END IF;
  END IF;

  -- 2026-04-08
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-08';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 404145.0, 750.0, 383665.0, 0, 0, 0, 384415.0, 384415.0, 2620.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 404145.0, vat_0_percent = 750.0, vat_5_percent = 383665.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 384415.0, terminal_card = 384415.0, tips = 2620.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 628945.0, 3850.0, 605930.0, 0, 0, 0, 609780.0, 609780.0, -3510.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 628945.0, vat_0_percent = 3850.0, vat_5_percent = 605930.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 609780.0, terminal_card = 609780.0, tips = -3510.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 314595.0, 1000.0, 298733.0, 0, 0, 1890.0, 297843.0, 297843.0, -332.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 314595.0, vat_0_percent = 1000.0, vat_5_percent = 298733.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1890.0, card_payment = 297843.0, terminal_card = 297843.0, tips = -332.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 300910.0, 1200.0, 287190.0, 0, 0, 1990.0, 286400.0, 286400.0, 0.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 300910.0, vat_0_percent = 1200.0, vat_5_percent = 287190.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 286400.0, terminal_card = 286400.0, tips = 0.0;
    END IF;
  END IF;

  -- 2026-04-09
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-09';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 364235.0, 750.0, 347795.0, 0, 0, 0, 348545.0, 348545.0, 1880.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 364235.0, vat_0_percent = 750.0, vat_5_percent = 347795.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 348545.0, terminal_card = 348545.0, tips = 1880.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 630670.0, 2800.0, 603840.0, 0, 0, 0, 606640.0, 606640.0, 3005.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 630670.0, vat_0_percent = 2800.0, vat_5_percent = 603840.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 606640.0, terminal_card = 606640.0, tips = 3005.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 377170.0, 1540.0, 350142.0, 0, 0, 0, 351682.0, 351682.0, 562.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 377170.0, vat_0_percent = 1540.0, vat_5_percent = 350142.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 351682.0, terminal_card = 351682.0, tips = 562.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 231830.0, 850.0, 218510.0, 0, 0, 2080.0, 217280.0, 217280.0, -540.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 231830.0, vat_0_percent = 850.0, vat_5_percent = 218510.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2080.0, card_payment = 217280.0, terminal_card = 217280.0, tips = -540.0;
    END IF;
  END IF;

  -- 2026-04-10
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-10';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 306795.0, 800.0, 301315.0, 0, 0, 0, 302115.0, 302115.0, 2210.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 306795.0, vat_0_percent = 800.0, vat_5_percent = 301315.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 302115.0, terminal_card = 302115.0, tips = 2210.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 542650.0, 3765.0, 522980.0, 0, 0, 2330.0, 524415.0, 524415.0, 2975.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 542650.0, vat_0_percent = 3765.0, vat_5_percent = 522980.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2330.0, card_payment = 524415.0, terminal_card = 524415.0, tips = 2975.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 302085.0, 1250.0, 286693.0, 0, 0, 0, 287943.0, 287943.0, -492.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 302085.0, vat_0_percent = 1250.0, vat_5_percent = 286693.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 287943.0, terminal_card = 287943.0, tips = -492.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 180920.0, 800.0, 174830.0, 0, 0, 0, 175630.0, 175630.0, -1000.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 180920.0, vat_0_percent = 800.0, vat_5_percent = 174830.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 175630.0, terminal_card = 175630.0, tips = -1000.0;
    END IF;
  END IF;

  -- 2026-04-13
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-13';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 396495.0, 1300.0, 378715.0, 0, 0, 0, 380015.0, 380015.0, 520.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 396495.0, vat_0_percent = 1300.0, vat_5_percent = 378715.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 380015.0, terminal_card = 380015.0, tips = 520.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 503650.0, 4200.0, 477795.0, 0, 0, 1890.0, 480105.0, 480105.0, 120.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 503650.0, vat_0_percent = 4200.0, vat_5_percent = 477795.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1890.0, card_payment = 480105.0, terminal_card = 480105.0, tips = 120.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 382650.0, 1800.0, 365502.0, 0, 0, 0, 367302.0, 367302.0, -18.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 382650.0, vat_0_percent = 1800.0, vat_5_percent = 365502.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 367302.0, terminal_card = 367302.0, tips = -18.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 422950.0, 1050.0, 269800.0, 0, 0, 0, 270850.0, 421760.0, -1090.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 422950.0, vat_0_percent = 1050.0, vat_5_percent = 269800.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 270850.0, terminal_card = 421760.0, tips = -1090.0;
    END IF;
  END IF;

  -- 2026-04-14
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-14';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 477235.0, 1500.0, 459465.0, 0, 0, 1990.0, 458975.0, 458975.0, 1290.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 477235.0, vat_0_percent = 1500.0, vat_5_percent = 459465.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 458975.0, terminal_card = 458975.0, tips = 1290.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 721000.0, 3300.0, 680970.0, 0, 0, 0, 684270.0, 684270.0, 570.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 721000.0, vat_0_percent = 3300.0, vat_5_percent = 680970.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 684270.0, terminal_card = 684270.0, tips = 570.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 439345.0, 2610.0, 389025.0, 0, 0, 0, 391635.0, 391635.0, 0.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 439345.0, vat_0_percent = 2610.0, vat_5_percent = 389025.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 391635.0, terminal_card = 391635.0, tips = 0.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 338635.0, 1900.0, 327170.0, 0, 0, 0, 329070.0, 329070.0, 100.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 338635.0, vat_0_percent = 1900.0, vat_5_percent = 327170.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 329070.0, terminal_card = 329070.0, tips = 100.0;
    END IF;
  END IF;

  -- 2026-04-15
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-15';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 466365.0, 1300.0, 444520.0, 0, 0, 0, 445820.0, 445820.0, 3510.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 466365.0, vat_0_percent = 1300.0, vat_5_percent = 444520.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 445820.0, terminal_card = 445820.0, tips = 3510.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 594855.0, 3350.0, 568085.0, 0, 0, 0, 571435.0, 571435.0, -290.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 594855.0, vat_0_percent = 3350.0, vat_5_percent = 568085.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 571435.0, terminal_card = 571435.0, tips = -290.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 379890.0, 1750.0, 358558.0, 0, 0, 0, 360308.0, 360308.0, 1108.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 379890.0, vat_0_percent = 1750.0, vat_5_percent = 358558.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 360308.0, terminal_card = 360308.0, tips = 1108.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 356985.0, 2250.0, 341935.0, 0, 0, 1890.0, 342295.0, 342295.0, 90.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 356985.0, vat_0_percent = 2250.0, vat_5_percent = 341935.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1890.0, card_payment = 342295.0, terminal_card = 342295.0, tips = 90.0;
    END IF;
  END IF;

  -- 2026-04-16
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-16';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 387410.0, 850.0, 374285.0, 0, 0, 0, 375135.0, 375135.0, 790.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 387410.0, vat_0_percent = 850.0, vat_5_percent = 374285.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 375135.0, terminal_card = 375135.0, tips = 790.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 645820.0, 3100.0, 612720.0, 0, 0, 0, 615820.0, 615820.0, 275.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 645820.0, vat_0_percent = 3100.0, vat_5_percent = 612720.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 615820.0, terminal_card = 615820.0, tips = 275.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 379000.0, 2300.0, 367643.0, 0, 0, 1990.0, 367953.0, 367953.0, 418.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 379000.0, vat_0_percent = 2300.0, vat_5_percent = 367643.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 367953.0, terminal_card = 367953.0, tips = 418.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 313785.0, 1750.0, 288690.0, 0, 0, 0, 297590.0, 290440.0, -440.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 313785.0, vat_0_percent = 1750.0, vat_5_percent = 288690.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 297590.0, terminal_card = 290440.0, tips = -440.0;
    END IF;
  END IF;

  -- 2026-04-17
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-17';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 377595.0, 900.0, 357700.0, 0, 0, 0, 358600.0, 358600.0, 1005.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 377595.0, vat_0_percent = 900.0, vat_5_percent = 357700.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 358600.0, terminal_card = 358600.0, tips = 1005.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 576975.0, 3400.0, 549610.0, 0, 0, 1990.0, 551020.0, 551020.0, 2060.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 576975.0, vat_0_percent = 3400.0, vat_5_percent = 549610.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 551020.0, terminal_card = 551020.0, tips = 2060.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 338895.0, 2150.0, 312601.0, 0, 0, 0, 314751.0, 314751.0, -324.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 338895.0, vat_0_percent = 2150.0, vat_5_percent = 312601.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 314751.0, terminal_card = 314751.0, tips = -324.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 191750.0, 1000.0, 189210.0, 0, 0, 0, 190210.0, 190210.0, -100.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 191750.0, vat_0_percent = 1000.0, vat_5_percent = 189210.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 190210.0, terminal_card = 190210.0, tips = -100.0;
    END IF;
  END IF;

  -- 2026-04-20
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-20';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 427810.0, 1100.0, 407105.0, 0, 0, 0, 408205.0, 408205.0, 1290.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 427810.0, vat_0_percent = 1100.0, vat_5_percent = 407105.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 408205.0, terminal_card = 408205.0, tips = 1290.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 640835.0, 3600.0, 607300.0, 0, 0, 0, 610900.0, 610900.0, 945.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 640835.0, vat_0_percent = 3600.0, vat_5_percent = 607300.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 610900.0, terminal_card = 610900.0, tips = 945.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 377155.0, 1370.0, 359580.0, 0, 0, 0, 360950.0, 360950.0, -705.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 377155.0, vat_0_percent = 1370.0, vat_5_percent = 359580.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 360950.0, terminal_card = 360950.0, tips = -705.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 284560.0, 1500.0, 274189.0, 0, 0, 2740.0, 272949.0, 272949.0, -2551.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 284560.0, vat_0_percent = 1500.0, vat_5_percent = 274189.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2740.0, card_payment = 272949.0, terminal_card = 272949.0, tips = -2551.0;
    END IF;
  END IF;

  -- 2026-04-21
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-21';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 508400.0, 1150.0, 492905.0, 0, 0, 0, 494055.0, 494055.0, 205.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 508400.0, vat_0_percent = 1150.0, vat_5_percent = 492905.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 494055.0, terminal_card = 494055.0, tips = 205.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 557840.0, 2500.0, 510380.0, 0, 0, 1990.0, 510890.0, 510890.0, 3135.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 557840.0, vat_0_percent = 2500.0, vat_5_percent = 510380.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 510890.0, terminal_card = 510890.0, tips = 3135.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 436745.0, 1750.0, 418973.0, 0, 0, 0, 420723.0, 420723.0, 448.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 436745.0, vat_0_percent = 1750.0, vat_5_percent = 418973.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 420723.0, terminal_card = 420723.0, tips = 448.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 364725.0, 1600.0, 331205.0, 1290.0, 0, 0, 334095.0, 334095.0, 330.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 364725.0, vat_0_percent = 1600.0, vat_5_percent = 331205.0, vat_18_percent = 1290.0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 334095.0, terminal_card = 334095.0, tips = 330.0;
    END IF;
  END IF;

  -- 2026-04-22
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-22';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 663670.0, 3100.0, 633205.0, 0, 0, 0, 636305.0, 636305.0, 1750.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 663670.0, vat_0_percent = 3100.0, vat_5_percent = 633205.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 636305.0, terminal_card = 636305.0, tips = 1750.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 446835.0, 2050.0, 421305.0, 0, 0, 0, 456425.0, 423355.0, 2270.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 446835.0, vat_0_percent = 2050.0, vat_5_percent = 421305.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 456425.0, terminal_card = 423355.0, tips = 2270.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 312950.0, 1450.0, 307840.0, 0, 0, 2300.0, 306990.0, 306990.0, 540.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 312950.0, vat_0_percent = 1450.0, vat_5_percent = 307840.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2300.0, card_payment = 306990.0, terminal_card = 306990.0, tips = 540.0;
    END IF;
  END IF;

  -- 2026-04-22
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-22';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 489810.0, 1200.0, 461580.0, 0, 0, 0, 462780.0, 462780.0, 255.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 489810.0, vat_0_percent = 1200.0, vat_5_percent = 461580.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 462780.0, terminal_card = 462780.0, tips = 255.0;
    END IF;
  END IF;

  -- 2026-04-23
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-23';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 363325.0, 1050.0, 348695.0, 0, 0, 0, 349745.0, 349745.0, 10.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 363325.0, vat_0_percent = 1050.0, vat_5_percent = 348695.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 349745.0, terminal_card = 349745.0, tips = 10.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 767270.0, 3850.0, 726110.0, 0, 0, 1990.0, 727970.0, 727970.0, 6230.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 767270.0, vat_0_percent = 3850.0, vat_5_percent = 726110.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 727970.0, terminal_card = 727970.0, tips = 6230.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 406960.0, 2000.0, 398538.0, 0, 0, 0, 400538.0, 400538.0, 2513.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 406960.0, vat_0_percent = 2000.0, vat_5_percent = 398538.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 400538.0, terminal_card = 400538.0, tips = 2513.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 302945.0, 900.0, 286905.0, 0, 0, 0, 287805.0, 287805.0, -4230.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 302945.0, vat_0_percent = 900.0, vat_5_percent = 286905.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 287805.0, terminal_card = 287805.0, tips = -4230.0;
    END IF;
  END IF;

  -- 2026-04-24
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-24';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 344025.0, 700.0, 324685.0, 0, 0, 0, 325385.0, 325385.0, 1470.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 344025.0, vat_0_percent = 700.0, vat_5_percent = 324685.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 325385.0, terminal_card = 325385.0, tips = 1470.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 585335.0, 2750.0, 544755.0, 0, 0, 0, 547505.0, 547505.0, 2685.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 585335.0, vat_0_percent = 2750.0, vat_5_percent = 544755.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 547505.0, terminal_card = 547505.0, tips = 2685.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 306865.0, 1700.0, 290525.0, 0, 0, 0, 292225.0, 292225.0, -1155.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 306865.0, vat_0_percent = 1700.0, vat_5_percent = 290525.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 292225.0, terminal_card = 292225.0, tips = -1155.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 235355.0, 1350.0, 218225.0, 470.0, 0, 2550.0, 217495.0, 217495.0, -985.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 235355.0, vat_0_percent = 1350.0, vat_5_percent = 218225.0, vat_18_percent = 470.0, vat_27_percent = 0,
        cash_payment = 2550.0, card_payment = 217495.0, terminal_card = 217495.0, tips = -985.0;
    END IF;
  END IF;

  -- 2026-04-27
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-27';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 418515.0, 900.0, 392520.0, 0, 0, 0, 393420.0, 393420.0, 2185.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 418515.0, vat_0_percent = 900.0, vat_5_percent = 392520.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 393420.0, terminal_card = 393420.0, tips = 2185.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 645235.0, 3357.0, 604138.0, 0, 0, 2350.0, 605145.0, 605145.0, 700.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 645235.0, vat_0_percent = 3357.0, vat_5_percent = 604138.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2350.0, card_payment = 605145.0, terminal_card = 605145.0, tips = 700.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 356855.0, 1200.0, 336163.0, 0, 0, 0, 337363.0, 337363.0, -167.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 356855.0, vat_0_percent = 1200.0, vat_5_percent = 336163.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 337363.0, terminal_card = 337363.0, tips = -167.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 236970.0, 1200.0, 229800.0, 0, 0, 0, 231000.0, 231000.0, -1895.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 236970.0, vat_0_percent = 1200.0, vat_5_percent = 229800.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 231000.0, terminal_card = 231000.0, tips = -1895.0;
    END IF;
  END IF;

  -- 2026-04-28
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-28';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 422250.0, 950.0, 408150.0, 0, 0, 0, 409100.0, 409100.0, 965.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 422250.0, vat_0_percent = 950.0, vat_5_percent = 408150.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 409100.0, terminal_card = 409100.0, tips = 965.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 703015.0, 3450.0, 661150.0, 0, 0, 0, 664600.0, 664600.0, -2415.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 703015.0, vat_0_percent = 3450.0, vat_5_percent = 661150.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 664600.0, terminal_card = 664600.0, tips = -2415.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 417010.0, 1915.0, 382035.0, 0, 0, 0, 383950.0, 383950.0, -1560.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 417010.0, vat_0_percent = 1915.0, vat_5_percent = 382035.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 383950.0, terminal_card = 383950.0, tips = -1560.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 352045.0, 1400.0, 333695.0, 0, 0, 0, 335095.0, 335095.0, 250.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 352045.0, vat_0_percent = 1400.0, vat_5_percent = 333695.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 335095.0, terminal_card = 335095.0, tips = 250.0;
    END IF;
  END IF;

  -- 2026-04-29
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-29';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 406715.0, 800.0, 364765.0, 0, 0, 0, 365565.0, 365565.0, 1775.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 406715.0, vat_0_percent = 800.0, vat_5_percent = 364765.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 365565.0, terminal_card = 365565.0, tips = 1775.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 574700.0, 2400.0, 533740.0, 0, 0, 0, 536140.0, 536140.0, 1960.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 574700.0, vat_0_percent = 2400.0, vat_5_percent = 533740.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 536140.0, terminal_card = 536140.0, tips = 1960.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 422575.0, 1570.0, 389391.0, 0, 0, 0, 390961.0, 390961.0, 5241.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 422575.0, vat_0_percent = 1570.0, vat_5_percent = 389391.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 390961.0, terminal_card = 390961.0, tips = 5241.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 339470.0, 1750.0, 329700.0, 0, 0, 1990.0, 329460.0, 329460.0, -1060.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 339470.0, vat_0_percent = 1750.0, vat_5_percent = 329700.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 329460.0, terminal_card = 329460.0, tips = -1060.0;
    END IF;
  END IF;

  -- 2026-04-30
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-04-30';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 420245.0, 450.0, 360105.0, 0, 0, 0, 360555.0, 360555.0, 3940.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 420245.0, vat_0_percent = 450.0, vat_5_percent = 360105.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 360555.0, terminal_card = 360555.0, tips = 3940.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 562120.0, 2400.0, 512665.0, 0, 0, 0, 515065.0, 515065.0, 280.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 562120.0, vat_0_percent = 2400.0, vat_5_percent = 512665.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 515065.0, terminal_card = 515065.0, tips = 280.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 319135.0, 1350.0, 293000.0, 0, 0, 0, 294350.0, 294350.0, 1075.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 319135.0, vat_0_percent = 1350.0, vat_5_percent = 293000.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 294350.0, terminal_card = 294350.0, tips = 1075.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 136510.0, 150.0, 130015.0, 0, 0, 2550.0, 127615.0, 127615.0, -215.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 136510.0, vat_0_percent = 150.0, vat_5_percent = 130015.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2550.0, card_payment = 127615.0, terminal_card = 127615.0, tips = -215.0;
    END IF;
  END IF;

  -- 2026-05-04
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-04';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 409810.0, 1300.0, 372280.0, 0, 0, 0, 373580.0, 373580.0, -1160.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 409810.0, vat_0_percent = 1300.0, vat_5_percent = 372280.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 373580.0, terminal_card = 373580.0, tips = -1160.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 629260.0, 2700.0, 570100.0, 0, 0, 0, 572800.0, 572800.0, 1600.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 629260.0, vat_0_percent = 2700.0, vat_5_percent = 570100.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 572800.0, terminal_card = 572800.0, tips = 1600.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 340240.0, 1550.0, 302808.0, 0, 0, 0, 304358.0, 304358.0, 753.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 340240.0, vat_0_percent = 1550.0, vat_5_percent = 302808.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 304358.0, terminal_card = 304358.0, tips = 753.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 280765.0, 950.0, 263760.0, 0, 0, 1990.0, 262720.0, 262720.0, -2265.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 280765.0, vat_0_percent = 950.0, vat_5_percent = 263760.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 262720.0, terminal_card = 262720.0, tips = -2265.0;
    END IF;
  END IF;

  -- 2026-05-05
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-05';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 414535.0, 1300.0, 384435.0, 0, 0, 0, 385735.0, 385735.0, 8500.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 414535.0, vat_0_percent = 1300.0, vat_5_percent = 384435.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 385735.0, terminal_card = 385735.0, tips = 8500.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 649350.0, 4750.0, 580900.0, 0, 0, 0, 585650.0, 585650.0, -500.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 649350.0, vat_0_percent = 4750.0, vat_5_percent = 580900.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 585650.0, terminal_card = 585650.0, tips = -500.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 382045.0, 1650.0, 352405.0, 0, 0, 0, 354055.0, 354055.0, -2415.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 382045.0, vat_0_percent = 1650.0, vat_5_percent = 352405.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 354055.0, terminal_card = 354055.0, tips = -2415.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 320290.0, 1750.0, 286355.0, 0, 0, 2440.0, 285665.0, 285665.0, 285.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 320290.0, vat_0_percent = 1750.0, vat_5_percent = 286355.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2440.0, card_payment = 285665.0, terminal_card = 285665.0, tips = 285.0;
    END IF;
  END IF;

  -- 2026-05-06
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-06';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 421390.0, 1150.0, 390460.0, 0, 0, 0, 391610.0, 391610.0, -12930.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 421390.0, vat_0_percent = 1150.0, vat_5_percent = 390460.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 391610.0, terminal_card = 391610.0, tips = -12930.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 733785.0, 3300.0, 668845.0, 0, 0, 0, 672145.0, 672145.0, 3010.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 733785.0, vat_0_percent = 3300.0, vat_5_percent = 668845.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 672145.0, terminal_card = 672145.0, tips = 3010.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 395160.0, 1950.0, 368953.0, 0, 0, 3139.0, 367763.0, 367763.0, 3473.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 395160.0, vat_0_percent = 1950.0, vat_5_percent = 368953.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 3139.0, card_payment = 367763.0, terminal_card = 367763.0, tips = 3473.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 345885.0, 1850.0, 323835.0, 0, 0, 2040.0, 323645.0, 323645.0, 720.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 345885.0, vat_0_percent = 1850.0, vat_5_percent = 323835.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2040.0, card_payment = 323645.0, terminal_card = 323645.0, tips = 720.0;
    END IF;
  END IF;

  -- 2026-05-07
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-07';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 479785.0, 1250.0, 460925.0, 0, 0, 0, 462175.0, 462175.0, 9640.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 479785.0, vat_0_percent = 1250.0, vat_5_percent = 460925.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 462175.0, terminal_card = 462175.0, tips = 9640.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 629985.0, 5640.0, 626460.0, 0, 0, 1990.0, 630110.0, 630110.0, 435.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 629985.0, vat_0_percent = 5640.0, vat_5_percent = 626460.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 630110.0, terminal_card = 630110.0, tips = 435.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 405925.0, 2500.0, 372210.0, 0, 0, 0, 374710.0, 374710.0, -210.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 405925.0, vat_0_percent = 2500.0, vat_5_percent = 372210.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 374710.0, terminal_card = 374710.0, tips = -210.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 273465.0, 1000.0, 262565.0, 0, 0, 0, 263565.0, 263565.0, -760.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 273465.0, vat_0_percent = 1000.0, vat_5_percent = 262565.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 263565.0, terminal_card = 263565.0, tips = -760.0;
    END IF;
  END IF;

  -- 2026-05-08
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-08';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 357190.0, 1750.0, 341995.0, 0, 0, 0, 343745.0, 343745.0, 1955.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 357190.0, vat_0_percent = 1750.0, vat_5_percent = 341995.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 343745.0, terminal_card = 343745.0, tips = 1955.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 577635.0, 3950.0, 533015.0, 0, 0, 0, 536965.0, 536965.0, 495.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 577635.0, vat_0_percent = 3950.0, vat_5_percent = 533015.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 536965.0, terminal_card = 536965.0, tips = 495.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 285510.0, 1700.0, 263438.0, 0, 0, 0, 265138.0, 265138.0, 588.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 285510.0, vat_0_percent = 1700.0, vat_5_percent = 263438.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 265138.0, terminal_card = 265138.0, tips = 588.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 240570.0, 1100.0, 222430.0, 0, 0, 0, 223530.0, 223530.0, -40.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 240570.0, vat_0_percent = 1100.0, vat_5_percent = 222430.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 223530.0, terminal_card = 223530.0, tips = -40.0;
    END IF;
  END IF;

  -- 2026-05-11
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-11';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 373040.0, 850.0, 347025.0, 0, 0, 0, 347875.0, 347875.0, 2190.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 373040.0, vat_0_percent = 850.0, vat_5_percent = 347025.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 347875.0, terminal_card = 347875.0, tips = 2190.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 668270.0, 4000.0, 625645.0, 0, 0, 0, 629645.0, 629645.0, -1380.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 668270.0, vat_0_percent = 4000.0, vat_5_percent = 625645.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 629645.0, terminal_card = 629645.0, tips = -1380.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 370795.0, 5460.0, 342660.0, 0, 0, 0, 348120.0, 348120.0, -870.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 370795.0, vat_0_percent = 5460.0, vat_5_percent = 342660.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 348120.0, terminal_card = 348120.0, tips = -870.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 325850.0, 2200.0, 313560.0, 0, 0, 2040.0, 313720.0, 313720.0, -880.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 325850.0, vat_0_percent = 2200.0, vat_5_percent = 313560.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2040.0, card_payment = 313720.0, terminal_card = 313720.0, tips = -880.0;
    END IF;
  END IF;

  -- 2026-05-12
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-12';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 508320.0, 1250.0, 483223.0, 0, 0, 0, 484473.0, 484473.0, 7498.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 508320.0, vat_0_percent = 1250.0, vat_5_percent = 483223.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 484473.0, terminal_card = 484473.0, tips = 7498.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 703635.0, 4000.0, 649615.0, 0, 0, 0, 653615.0, 653615.0, 645.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 703635.0, vat_0_percent = 4000.0, vat_5_percent = 649615.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 653615.0, terminal_card = 653615.0, tips = 645.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 393100.0, 1750.0, 372913.0, 0, 0, 0, 374663.0, 374663.0, 63.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 393100.0, vat_0_percent = 1750.0, vat_5_percent = 372913.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 374663.0, terminal_card = 374663.0, tips = 63.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 297630.0, 1850.0, 283200.0, 0, 0, 1990.0, 283060.0, 283060.0, 520.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 297630.0, vat_0_percent = 1850.0, vat_5_percent = 283200.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 283060.0, terminal_card = 283060.0, tips = 520.0;
    END IF;
  END IF;

  -- 2026-05-13
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-13';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 491395.0, 1150.0, 457715.0, 0, 0, 0, 458865.0, 458865.0, 1190.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 491395.0, vat_0_percent = 1150.0, vat_5_percent = 457715.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 458865.0, terminal_card = 458865.0, tips = 1190.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 688190.0, 3000.0, 642890.0, 0, 0, 0, 645890.0, 645890.0, 2840.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 688190.0, vat_0_percent = 3000.0, vat_5_percent = 642890.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 645890.0, terminal_card = 645890.0, tips = 2840.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 367175.0, 2430.0, 351295.0, 0, 0, 0, 353725.0, 353725.0, 275.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 367175.0, vat_0_percent = 2430.0, vat_5_percent = 351295.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 353725.0, terminal_card = 353725.0, tips = 275.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 341315.0, 1750.0, 319685.0, 0, 0, 2440.0, 318995.0, 318995.0, 720.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 341315.0, vat_0_percent = 1750.0, vat_5_percent = 319685.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2440.0, card_payment = 318995.0, terminal_card = 318995.0, tips = 720.0;
    END IF;
  END IF;

  -- 2026-05-14
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-14';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 361545.0, 1050.0, 342155.0, 0, 0, 0, 343205.0, 343205.0, 2095.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 361545.0, vat_0_percent = 1050.0, vat_5_percent = 342155.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 343205.0, terminal_card = 343205.0, tips = 2095.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 659910.0, 3550.0, 619180.0, 0, 0, 0, 622730.0, 622730.0, 4410.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 659910.0, vat_0_percent = 3550.0, vat_5_percent = 619180.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 622730.0, terminal_card = 622730.0, tips = 4410.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 397720.0, 1850.0, 359190.0, 0, 0, 0, 361040.0, 361040.0, 840.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 397720.0, vat_0_percent = 1850.0, vat_5_percent = 359190.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 361040.0, terminal_card = 361040.0, tips = 840.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 254310.0, 1450.0, 243960.0, 0, 0, 2050.0, 243360.0, 243360.0, 260.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 254310.0, vat_0_percent = 1450.0, vat_5_percent = 243960.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2050.0, card_payment = 243360.0, terminal_card = 243360.0, tips = 260.0;
    END IF;
  END IF;

  -- 2026-05-15
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-15';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 399240.0, 1700.0, 375115.0, 0, 0, 0, 376815.0, 376815.0, -85.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 399240.0, vat_0_percent = 1700.0, vat_5_percent = 375115.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 376815.0, terminal_card = 376815.0, tips = -85.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 574110.0, 4100.0, 528950.0, 0, 0, 0, 533050.0, 533050.0, 1700.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 574110.0, vat_0_percent = 4100.0, vat_5_percent = 528950.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 533050.0, terminal_card = 533050.0, tips = 1700.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 306330.0, 1650.0, 288946.0, 0, 0, 0, 290596.0, 290596.0, 0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 306330.0, vat_0_percent = 1650.0, vat_5_percent = 288946.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 290596.0, terminal_card = 290596.0, tips = 0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 180875.0, 800.0, 174765.0, 0, 0, 1890.0, 173675.0, 173675.0, 3730.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 180875.0, vat_0_percent = 800.0, vat_5_percent = 174765.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1890.0, card_payment = 173675.0, terminal_card = 173675.0, tips = 3730.0;
    END IF;
  END IF;

  -- 2026-05-18
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-18';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 388815.0, 1150.0, 368285.0, 0, 0, 0, 369435.0, 369435.0, 1560.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 388815.0, vat_0_percent = 1150.0, vat_5_percent = 368285.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 369435.0, terminal_card = 369435.0, tips = 1560.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 568500.0, 3070.0, 536755.0, 0, 0, 0, 539825.0, 539825.0, 785.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 568500.0, vat_0_percent = 3070.0, vat_5_percent = 536755.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 539825.0, terminal_card = 539825.0, tips = 785.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 389225.0, 1780.0, 363055.0, 0, 0, 0, 364835.0, 364835.0, -600.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 389225.0, vat_0_percent = 1780.0, vat_5_percent = 363055.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 364835.0, terminal_card = 364835.0, tips = -600.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 218325.0, 500.0, 217815.0, 0, 0, 2140.0, 216175.0, 216175.0, 2020.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 218325.0, vat_0_percent = 500.0, vat_5_percent = 217815.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2140.0, card_payment = 216175.0, terminal_card = 216175.0, tips = 2020.0;
    END IF;
  END IF;

  -- 2026-05-19
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-19';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 478050.0, 1100.0, 456360.0, 0, 0, 0, 457460.0, 457460.0, 3200.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 478050.0, vat_0_percent = 1100.0, vat_5_percent = 456360.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 457460.0, terminal_card = 457460.0, tips = 3200.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 612915.0, 3650.0, 578850.0, 0, 0, 0, 582500.0, 582500.0, 7965.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 612915.0, vat_0_percent = 3650.0, vat_5_percent = 578850.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 582500.0, terminal_card = 582500.0, tips = 7965.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 347165.0, 1150.0, 321370.0, 0, 0, 0, 322520.0, 322520.0, 285.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 347165.0, vat_0_percent = 1150.0, vat_5_percent = 321370.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 322520.0, terminal_card = 322520.0, tips = 285.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 316195.0, 1050.0, 309595.0, 0, 0, 1990.0, 308655.0, 308655.0, 680.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 316195.0, vat_0_percent = 1050.0, vat_5_percent = 309595.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 1990.0, card_payment = 308655.0, terminal_card = 308655.0, tips = 680.0;
    END IF;
  END IF;

  -- 2026-05-20
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-20';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 486415.0, 700.0, 453700.0, 0, 0, 0, 454400.0, 454400.0, -1325.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 486415.0, vat_0_percent = 700.0, vat_5_percent = 453700.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 454400.0, terminal_card = 454400.0, tips = -1325.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 714645.0, 5490.0, 637685.0, 0, 0, 0, 643175.0, 643175.0, 635.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 714645.0, vat_0_percent = 5490.0, vat_5_percent = 637685.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 643175.0, terminal_card = 643175.0, tips = 635.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 377230.0, 1300.0, 356760.0, 0, 0, 0, 358060.0, 358060.0, 130.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 377230.0, vat_0_percent = 1300.0, vat_5_percent = 356760.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 358060.0, terminal_card = 358060.0, tips = 130.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 216020.0, 450.0, 214980.0, 0, 0, 0, 215430.0, 213440.0, 1020.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 216020.0, vat_0_percent = 450.0, vat_5_percent = 214980.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 215430.0, terminal_card = 213440.0, tips = 1020.0;
    END IF;
  END IF;

  -- 2026-05-21
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-21';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 454160.0, 750.0, 436440.0, 0, 0, 0, 437190.0, 437190.0, 1730.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 454160.0, vat_0_percent = 750.0, vat_5_percent = 436440.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 437190.0, terminal_card = 437190.0, tips = 1730.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 598565.0, 3000.0, 556705.0, 0, 0, 0, 559705.0, 559705.0, 3550.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 598565.0, vat_0_percent = 3000.0, vat_5_percent = 556705.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 559705.0, terminal_card = 559705.0, tips = 3550.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 412570.0, 2000.0, 375001.0, 0, 0, 0, 377001.0, 384861.0, 291.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 412570.0, vat_0_percent = 2000.0, vat_5_percent = 375001.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 377001.0, terminal_card = 384861.0, tips = 291.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 265520.0, 1550.0, 260950.0, 0, 0, 2540.0, 259960.0, 259960.0, 0.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 265520.0, vat_0_percent = 1550.0, vat_5_percent = 260950.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 2540.0, card_payment = 259960.0, terminal_card = 259960.0, tips = 0.0;
    END IF;
  END IF;

  -- 2026-05-22
  SELECT id INTO v_daily_revenue_id FROM daily_revenue WHERE unit_id = v_unit_id AND date = '2026-05-22';
  IF v_daily_revenue_id IS NOT NULL THEN
    IF v_register_1_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_1_id, 336560.0, 600.0, 307500.0, 0, 0, 0, 308100.0, 308100.0, -400.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 336560.0, vat_0_percent = 600.0, vat_5_percent = 307500.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 308100.0, terminal_card = 308100.0, tips = -400.0;
    END IF;
    IF v_register_2_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_2_id, 526115.0, 2900.0, 500170.0, 0, 0, 0, 503070.0, 503070.0, 1790.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 526115.0, vat_0_percent = 2900.0, vat_5_percent = 500170.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 503070.0, terminal_card = 503070.0, tips = 1790.0;
    END IF;
    IF v_register_3_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_3_id, 354615.0, 2000.0, 326305.0, 0, 0, 0, 328305.0, 328305.0, 1475.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 354615.0, vat_0_percent = 2000.0, vat_5_percent = 326305.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 328305.0, terminal_card = 328305.0, tips = 1475.0;
    END IF;
    IF v_register_4_id IS NOT NULL THEN
      INSERT INTO cash_register_revenue (daily_revenue_id, cash_register_id, software_revenue, vat_0_percent, vat_5_percent, vat_18_percent, vat_27_percent, cash_payment, card_payment, terminal_card, tips)
      VALUES (v_daily_revenue_id, v_register_4_id, 210510.0, 1050.0, 203150.0, 0, 0, 0, 204200.0, 204080.0, -1220.0)
      ON CONFLICT (daily_revenue_id, cash_register_id) DO UPDATE SET
        software_revenue = 210510.0, vat_0_percent = 1050.0, vat_5_percent = 203150.0, vat_18_percent = 0, vat_27_percent = 0,
        cash_payment = 0, card_payment = 204200.0, terminal_card = 204080.0, tips = -1220.0;
    END IF;
  END IF;

END $$;