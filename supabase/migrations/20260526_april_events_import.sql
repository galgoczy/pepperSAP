-- April 2026 Events Import
-- Generated from rendezveny_aprilis.xlsx
-- 13 events, total revenue: 5,591,430 Ft
-- Updated with line_items breakdown and cooking_location_id

-- First, delete existing April 2026 event data to avoid duplicates
DELETE FROM event_expenses WHERE event_id IN (
  SELECT id FROM events WHERE event_date >= '2026-04-01' AND event_date <= '2026-04-30'
);
DELETE FROM event_revenues WHERE event_id IN (
  SELECT id FROM events WHERE event_date >= '2026-04-01' AND event_date <= '2026-04-30'
);
DELETE FROM events WHERE event_date >= '2026-04-01' AND event_date <= '2026-04-30';

DO $$
DECLARE
  events_unit_id UUID;
  new_event_id UUID;
  knorr105_id UUID;
  szentkiralyi_id UUID;
  allamkincstar_id UUID;
BEGIN
  SELECT id INTO events_unit_id FROM units WHERE type = 'events' LIMIT 1;

  IF events_unit_id IS NULL THEN
    RAISE EXCEPTION 'No events unit found';
  END IF;

  -- Get cooking location unit IDs
  SELECT id INTO knorr105_id FROM units WHERE name = 'Knorr 105' LIMIT 1;
  SELECT id INTO szentkiralyi_id FROM units WHERE name = 'Szentkirályi' LIMIT 1;
  SELECT id INTO allamkincstar_id FROM units WHERE name = 'Államkincstár' LIMIT 1;

  -- Event: Koncert Maxakkord (2026-04-10) - Főzés helye: Knorr 105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Koncert Maxakkord', 'event', '2026-04-10', NULL, knorr105_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Koncert Maxakkord', 380729, 27, 483526, 'transfer', '2026-04-10', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "167400"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "303126"}, {"description": "Egyéb", "vat_rate": "27", "currency": "HUF", "gross_amount": "13000"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 57060, 'Étel költség - Koncert Maxakkord', 'transfer', '2026-04-10');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 72761, 'Ital költség - Koncert Maxakkord', 'transfer', '2026-04-10');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 4000, 'Logisztika költség - Koncert Maxakkord', 'transfer', '2026-04-10');

  -- Event: Rita Kft (2026-04-10) - Főzés helye: Knorr 105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Rita Kft', 'event', '2026-04-10', NULL, knorr105_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Rita Kft', 37323, 27, 47400, 'transfer', '2026-04-10', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "47400"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 29844, 'Étel költség - Rita Kft', 'transfer', '2026-04-10');

  -- Event: BPMK (2026-04-14) - Főzés helye: Knorr 105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'BPMK', 'event', '2026-04-14', NULL, knorr105_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'BPMK', 474550, 27, 602679, 'transfer', '2026-04-14', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "334264"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "87122"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "73025"}, {"description": "Kitelepülés", "vat_rate": "27", "currency": "HUF", "gross_amount": "80328"}, {"description": "Eszközbérlet", "vat_rate": "27", "currency": "HUF", "gross_amount": "27940"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 37194, 'Étel költség - BPMK', 'transfer', '2026-04-14');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 16540, 'Ital költség - BPMK', 'transfer', '2026-04-14');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 3000, 'Logisztika költség - BPMK', 'transfer', '2026-04-14');

  -- Event: Károli Gáspár Egyetem (2026-04-15) - Főzés helye: Knorr 105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Károli Gáspár Egyetem', 'event', '2026-04-15', NULL, knorr105_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Károli Gáspár Egyetem', 513361, 27, 651969, 'transfer', '2026-04-15', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "493801"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "115811"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "35857"}, {"description": "Egyéb", "vat_rate": "27", "currency": "HUF", "gross_amount": "6500"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 74460, 'Étel költség - Károli Gáspár Egyetem', 'transfer', '2026-04-15');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 34940, 'Ital költség - Károli Gáspár Egyetem', 'transfer', '2026-04-15');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 5000, 'Logisztika költség - Károli Gáspár Egyetem', 'transfer', '2026-04-15');

  -- Event: Forever (2026-04-17) - Főzés helye: Knorr 105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Forever', 'event', '2026-04-17', NULL, knorr105_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Forever', 360978, 27, 458442, 'transfer', '2026-04-17', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "261061"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "43351"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "36530"}, {"description": "Kitelepülés", "vat_rate": "27", "currency": "HUF", "gross_amount": "57150"}, {"description": "Bútor", "vat_rate": "27", "currency": "HUF", "gross_amount": "57150"}, {"description": "Egyéb", "vat_rate": "27", "currency": "HUF", "gross_amount": "3200"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 40247, 'Étel költség - Forever', 'transfer', '2026-04-17');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 18512, 'Ital költség - Forever', 'transfer', '2026-04-17');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Személyzet', 15000, 'Személyzet költség - Forever', 'transfer', '2026-04-17');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 4500, 'Logisztika költség - Forever', 'transfer', '2026-04-17');

  -- Event: Knorr69 Konf. (2026-04-17) - Főzés helye: Knorr 105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Knorr69 Konf.', 'event', '2026-04-17', NULL, knorr105_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Knorr69 Konf.', 889043, 27, 1129084, 'transfer', '2026-04-17', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "782544"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "283105"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "55535"}, {"description": "Egyéb", "vat_rate": "27", "currency": "HUF", "gross_amount": "7900"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 251094, 'Étel költség - Knorr69 Konf.', 'transfer', '2026-04-17');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 137132, 'Ital költség - Knorr69 Konf.', 'transfer', '2026-04-17');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Személyzet', 78000, 'Személyzet költség - Knorr69 Konf.', 'transfer', '2026-04-17');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 6500, 'Logisztika költség - Knorr69 Konf.', 'transfer', '2026-04-17');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Eszközök', 155524, 'Eszköz költség - Knorr69 Konf.', 'transfer', '2026-04-17');

  -- Event: Viki szülinap (2026-04-18) - Főzés helye: Szentkirályi
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Viki szülinap', 'event', '2026-04-18', NULL, szentkiralyi_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Viki szülinap', 269796, 27, 342641, 'transfer', '2026-04-18', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "311492"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "31149"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 68806, 'Étel költség - Viki szülinap', 'transfer', '2026-04-18');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Személyzet', 38500, 'Személyzet költség - Viki szülinap', 'transfer', '2026-04-18');

  -- Event: Csucsu szülinap (2026-04-18) - Főzés helye: Szentkirályi
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Csucsu szülinap', 'event', '2026-04-18', NULL, szentkiralyi_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Csucsu szülinap', 379449, 27, 481900, 'transfer', '2026-04-18', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "270000"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "141900"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "30000"}, {"description": "Logisztika", "vat_rate": "27", "currency": "HUF", "gross_amount": "40000"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 106185, 'Étel költség - Csucsu szülinap', 'transfer', '2026-04-18');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 141900, 'Ital költség - Csucsu szülinap', 'transfer', '2026-04-18');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Személyzet', 59500, 'Személyzet költség - Csucsu szülinap', 'transfer', '2026-04-18');

  -- Event: Nyúl Kupa (2026-04-19) - Főzés helye: Szentkirályi
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Nyúl Kupa', 'event', '2026-04-19', NULL, szentkiralyi_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Nyúl Kupa', 260008, 27, 330210, 'transfer', '2026-04-19', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "267420"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "62790"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 66069, 'Étel költség - Nyúl Kupa', 'transfer', '2026-04-19');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 8400, 'Ital költség - Nyúl Kupa', 'transfer', '2026-04-19');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 3000, 'Logisztika költség - Nyúl Kupa', 'transfer', '2026-04-19');

  -- Event: Colorcon (2026-04-21) - Főzés helye: Államkincstár (MÁK)
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Colorcon', 'event', '2026-04-21', NULL, allamkincstar_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Colorcon', 366600, 27, 465582, 'transfer', '2026-04-21', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "427482"}, {"description": "Logisztika", "vat_rate": "27", "currency": "HUF", "gross_amount": "38100"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 117147, 'Étel költség - Colorcon', 'transfer', '2026-04-21');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 6000, 'Logisztika költség - Colorcon', 'transfer', '2026-04-21');

  -- Event: Shell (2026-04-27) - Főzés helye: Államkincstár (MÁK)
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Shell', 'event', '2026-04-27', NULL, allamkincstar_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Shell', 109500, 27, 139065, 'transfer', '2026-04-27', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "120015"}, {"description": "Logisztika", "vat_rate": "27", "currency": "HUF", "gross_amount": "19050"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 25193, 'Étel költség - Shell', 'transfer', '2026-04-27');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 3000, 'Logisztika költség - Shell', 'transfer', '2026-04-27');

  -- Event: Colorcon (2026-04-28) - Főzés helye: Államkincstár (MÁK)
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Colorcon', 'event', '2026-04-28', NULL, allamkincstar_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Colorcon', 191600, 27, 243332, 'transfer', '2026-04-28', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "217932"}, {"description": "Logisztika", "vat_rate": "27", "currency": "HUF", "gross_amount": "25400"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 5000, 'Logisztika költség - Colorcon', 'transfer', '2026-04-28');

  -- Event: Pasek Gabi (2026-04-30) - Főzés helye: Knorr 105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Pasek Gabi', 'event', '2026-04-30', NULL, knorr105_id)
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Pasek Gabi', 169764, 27, 215600, 'transfer', '2026-04-30', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "215600"}]');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 43921, 'Étel költség - Pasek Gabi', 'transfer', '2026-04-30');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 5000, 'Logisztika költség - Pasek Gabi', 'transfer', '2026-04-30');

END $$;
