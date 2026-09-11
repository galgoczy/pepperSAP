-- May 2026 Events Import
-- Generated from ma_jusi_rendezvenyek.xlsx (12 events)
-- Assumptions (same as April import): VAT 27%, payment_method transfer,
-- net_amount = round(gross / 1.27), partner_name = event name.

DELETE FROM event_expenses WHERE event_id IN (SELECT id FROM events WHERE event_date >= '2026-05-01' AND event_date <= '2026-05-31');
DELETE FROM event_revenues WHERE event_id IN (SELECT id FROM events WHERE event_date >= '2026-05-01' AND event_date <= '2026-05-31');
DELETE FROM events WHERE event_date >= '2026-05-01' AND event_date <= '2026-05-31';

DO $$
DECLARE
  events_unit_id UUID;
  new_event_id UUID;
  knorr105_id UUID;
  szentkiralyi_id UUID;
  allamkincstar_id UUID;
  rsr_id UUID;
BEGIN
  SELECT id INTO events_unit_id FROM units WHERE type = 'events' LIMIT 1;
  IF events_unit_id IS NULL THEN RAISE EXCEPTION 'No events unit found'; END IF;
  SELECT id INTO knorr105_id FROM units WHERE name = 'Knorr 105' LIMIT 1;
  SELECT id INTO szentkiralyi_id FROM units WHERE name = 'Szentkirályi' LIMIT 1;
  SELECT id INTO allamkincstar_id FROM units WHERE name = 'Államkincstár' LIMIT 1;
  SELECT id INTO rsr_id FROM units WHERE name = 'RSR' LIMIT 1;

  -- MakkMarci RSR (2026-05-09) - RSR
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'MakkMarci RSR', 'event', '2026-05-09', NULL, rsr_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'MakkMarci RSR', 202800, 27, 257556, 'transfer', '2026-05-09', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "257556"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 37449, 'Étel költség - MakkMarci RSR', 'transfer', '2026-05-09');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 16800, 'Ital költség - MakkMarci RSR', 'transfer', '2026-05-09');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Logisztika', 2500, 'Logisztika költség - MakkMarci RSR', 'transfer', '2026-05-09');

  -- Óbuda Napja (2026-05-09) - Szentkirályi
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Óbuda Napja', 'event', '2026-05-09', NULL, szentkiralyi_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Óbuda Napja', 908200, 27, 1153414, 'transfer', '2026-05-09', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "640080"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "189738"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "114300"}, {"description": "Logisztika", "vat_rate": "27", "currency": "HUF", "gross_amount": "44450"}, {"description": "Bútor", "vat_rate": "27", "currency": "HUF", "gross_amount": "164846"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 193057, 'Étel költség - Óbuda Napja', 'transfer', '2026-05-09');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 44133, 'Ital költség - Óbuda Napja', 'transfer', '2026-05-09');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Személyzet', 72000, 'Személyzet költség - Óbuda Napja', 'transfer', '2026-05-09');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Logisztika', 5000, 'Logisztika költség - Óbuda Napja', 'transfer', '2026-05-09');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Egyéb', 112852, 'Egyéb költség - Óbuda Napja', 'transfer', '2026-05-09');

  -- Knorr105 Tavaszi kocc. (2026-05-14) - Knorr105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Knorr105 Tavaszi kocc.', 'event', '2026-05-14', NULL, knorr105_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Knorr105 Tavaszi kocc.', 4107025, 27, 5215922, 'transfer', '2026-05-14', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "3266123"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "1162050"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "399129"}, {"description": "Eszközbérlet", "vat_rate": "27", "currency": "HUF", "gross_amount": "331470"}, {"description": "Bútor", "vat_rate": "27", "currency": "HUF", "gross_amount": "57150"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 1911167, 'Étel költség - Knorr105 Tavaszi kocc.', 'transfer', '2026-05-14');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Személyzet', 524457, 'Személyzet költség - Knorr105 Tavaszi kocc.', 'transfer', '2026-05-14');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Logisztika', 5000, 'Logisztika költség - Knorr105 Tavaszi kocc.', 'transfer', '2026-05-14');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Eszközök', 334483, 'Eszköz költség - Knorr105 Tavaszi kocc.', 'transfer', '2026-05-14');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Egyéb', 316236, 'Egyéb költség - Knorr105 Tavaszi kocc.', 'transfer', '2026-05-14');

  -- Szülők Bálja (2026-05-15) - MÁK
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Szülők Bálja', 'event', '2026-05-15', NULL, allamkincstar_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Szülők Bálja', 1259393, 27, 1599429, 'transfer', '2026-05-15', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "876643"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "350000"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "105197"}, {"description": "Logisztika", "vat_rate": "27", "currency": "HUF", "gross_amount": "69850"}, {"description": "Eszközbérlet", "vat_rate": "27", "currency": "HUF", "gross_amount": "197739"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 159813, 'Étel költség - Szülők Bálja', 'transfer', '2026-05-15');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 120000, 'Ital költség - Szülők Bálja', 'transfer', '2026-05-15');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Személyzet', 183500, 'Személyzet költség - Szülők Bálja', 'transfer', '2026-05-15');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Logisztika', 7000, 'Logisztika költség - Szülők Bálja', 'transfer', '2026-05-15');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Eszközök', 144145, 'Eszköz költség - Szülők Bálja', 'transfer', '2026-05-15');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Egyéb', 20000, 'Egyéb költség - Szülők Bálja', 'transfer', '2026-05-15');

  -- Rákoscsabai Isk. RSR (2026-05-15) - Knorr105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Rákoscsabai Isk. RSR', 'event', '2026-05-15', NULL, knorr105_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Rákoscsabai Isk. RSR', 39965, 27, 50756, 'transfer', '2026-05-15', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "20038"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "17018"}, {"description": "Eszközbérlet", "vat_rate": "27", "currency": "HUF", "gross_amount": "12700"}, {"description": "Egyéb", "vat_rate": "27", "currency": "HUF", "gross_amount": "1000"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 13754, 'Étel költség - Rákoscsabai Isk. RSR', 'transfer', '2026-05-15');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 5680, 'Ital költség - Rákoscsabai Isk. RSR', 'transfer', '2026-05-15');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Logisztika', 2000, 'Logisztika költség - Rákoscsabai Isk. RSR', 'transfer', '2026-05-15');

  -- Esküvő (2026-05-16) - Szentkirályi
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Esküvő', 'event', '2026-05-16', NULL, szentkiralyi_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Esküvő', 2854219, 27, 3624858, 'transfer', '2026-05-16', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "2752050"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "412808"}, {"description": "Logisztika", "vat_rate": "27", "currency": "HUF", "gross_amount": "180000"}, {"description": "Eszközbérlet", "vat_rate": "27", "currency": "HUF", "gross_amount": "280000"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 454680, 'Étel költség - Esküvő', 'transfer', '2026-05-16');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Személyzet', 512500, 'Személyzet költség - Esküvő', 'transfer', '2026-05-16');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Logisztika', 136070, 'Logisztika költség - Esküvő', 'transfer', '2026-05-16');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Eszközök', 385610, 'Eszköz költség - Esküvő', 'transfer', '2026-05-16');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Egyéb', 433950, 'Egyéb költség - Esküvő', 'transfer', '2026-05-16');

  -- BPMK (2026-05-19) - Knorr105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'BPMK', 'event', '2026-05-19', NULL, knorr105_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'BPMK', 403450, 27, 512382, 'transfer', '2026-05-19', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "262636"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "68453"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "73025"}, {"description": "Kitelepülés", "vat_rate": "27", "currency": "HUF", "gross_amount": "80328"}, {"description": "Eszközbérlet", "vat_rate": "27", "currency": "HUF", "gross_amount": "27940"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 54086, 'Étel költség - BPMK', 'transfer', '2026-05-19');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 12300, 'Ital költség - BPMK', 'transfer', '2026-05-19');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Személyzet', 20000, 'Személyzet költség - BPMK', 'transfer', '2026-05-19');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Logisztika', 5500, 'Logisztika költség - BPMK', 'transfer', '2026-05-19');

  -- Főmterv közgyűlés (2026-05-21) - Knorr105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Főmterv közgyűlés', 'event', '2026-05-21', NULL, knorr105_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Főmterv közgyűlés', 3917400, 27, 4975098, 'transfer', '2026-05-21', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "2784348"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "762000"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "222250"}, {"description": "Eszközbérlet", "vat_rate": "27", "currency": "HUF", "gross_amount": "361950"}, {"description": "Bútor", "vat_rate": "27", "currency": "HUF", "gross_amount": "844550"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 571657, 'Étel költség - Főmterv közgyűlés', 'transfer', '2026-05-21');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 126470, 'Ital költség - Főmterv közgyűlés', 'transfer', '2026-05-21');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Személyzet', 137000, 'Személyzet költség - Főmterv közgyűlés', 'transfer', '2026-05-21');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Logisztika', 6000, 'Logisztika költség - Főmterv közgyűlés', 'transfer', '2026-05-21');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Eszközök', 952500, 'Eszköz költség - Főmterv közgyűlés', 'transfer', '2026-05-21');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Egyéb', 19200, 'Egyéb költség - Főmterv közgyűlés', 'transfer', '2026-05-21');

  -- Közlekedési Min. (2026-05-27) - MÁK
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Közlekedési Min.', 'event', '2026-05-27', NULL, allamkincstar_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Közlekedési Min.', 477737, 27, 606726, 'transfer', '2026-05-27', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "438785"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "54991"}, {"description": "Logisztika", "vat_rate": "27", "currency": "HUF", "gross_amount": "63500"}, {"description": "Eszközbérlet", "vat_rate": "27", "currency": "HUF", "gross_amount": "44450"}, {"description": "Egyéb", "vat_rate": "27", "currency": "HUF", "gross_amount": "5000"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 110256, 'Étel költség - Közlekedési Min.', 'transfer', '2026-05-27');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 14000, 'Ital költség - Közlekedési Min.', 'transfer', '2026-05-27');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Logisztika', 6000, 'Logisztika költség - Közlekedési Min.', 'transfer', '2026-05-27');

  -- KnorrRobotika (2026-05-28) - Knorr105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'KnorrRobotika', 'event', '2026-05-28', NULL, knorr105_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'KnorrRobotika', 61569, 27, 78192, 'transfer', '2026-05-28', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "48006"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "7007"}, {"description": "Egyéb", "vat_rate": "27", "currency": "HUF", "gross_amount": "23179"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 15240, 'Étel költség - KnorrRobotika', 'transfer', '2026-05-28');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 3410, 'Ital költség - KnorrRobotika', 'transfer', '2026-05-28');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Egyéb', 19500, 'Egyéb költség - KnorrRobotika', 'transfer', '2026-05-28');

  -- Csizmadia Zoltán (2026-05-29) - Knorr105
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Csizmadia Zoltán', 'event', '2026-05-29', NULL, knorr105_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Csizmadia Zoltán', 94016, 27, 119400, 'transfer', '2026-05-29', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "119400"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 27084, 'Étel költség - Csizmadia Zoltán', 'transfer', '2026-05-29');

  -- Danada Judit RSR (2026-05-31) - RSR
  INSERT INTO events (unit_id, name, event_type, event_date, description, cooking_location_id)
  VALUES (events_unit_id, 'Danada Judit RSR', 'event', '2026-05-31', NULL, rsr_id) RETURNING id INTO new_event_id;
  INSERT INTO event_revenues (event_id, unit_id, partner_name, net_amount, vat_rate, amount, payment_method, invoice_date, line_items)
  VALUES (new_event_id, events_unit_id, 'Danada Judit RSR', 141732, 27, 180000, 'transfer', '2026-05-31', '[{"description": "Étel", "vat_rate": "27", "currency": "HUF", "gross_amount": "100000"}, {"description": "Ital", "vat_rate": "27", "currency": "HUF", "gross_amount": "40000"}, {"description": "Személyzet", "vat_rate": "27", "currency": "HUF", "gross_amount": "40000"}]');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 41000, 'Étel költség - Danada Judit RSR', 'transfer', '2026-05-31');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 12315, 'Ital költség - Danada Judit RSR', 'transfer', '2026-05-31');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Személyzet', 45000, 'Személyzet költség - Danada Judit RSR', 'transfer', '2026-05-31');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date) VALUES (new_event_id, events_unit_id, 'Logisztika', 2000, 'Logisztika költség - Danada Judit RSR', 'transfer', '2026-05-31');

END $$;

-- Total revenue: 18373733 Ft | Total costs: 8354354 Ft | events: 12
