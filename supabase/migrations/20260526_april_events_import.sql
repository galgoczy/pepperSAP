-- April 2026 Events Import
-- Generated from rendezveny_aprilis.xlsx
-- 13 events, total revenue: 5,591,430 Ft

DO $$
DECLARE
  events_unit_id UUID;
  new_event_id UUID;
BEGIN
  SELECT id INTO events_unit_id FROM units WHERE type = 'events' LIMIT 1;
  
  IF events_unit_id IS NULL THEN
    RAISE EXCEPTION 'No events unit found';
  END IF;

  -- Event: Koncert Maxakkord (2026-04-10)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Koncert Maxakkord', 'event', '2026-04-10', 'Főzés helye: Knorr105')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Koncert Maxakkord', 483526, 'transfer', '2026-04-10', 'Étel: 167400 Ft, Ital: 303126 Ft, Egyéb: 13000 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 57060, 'Étel költség - Koncert Maxakkord', 'transfer', '2026-04-10');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 72761, 'Ital költség - Koncert Maxakkord', 'transfer', '2026-04-10');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 4000, 'Logisztika költség - Koncert Maxakkord', 'transfer', '2026-04-10');

  -- Event: Rita Kft (2026-04-10)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Rita Kft', 'event', '2026-04-10', 'Főzés helye: Knorr105')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Rita Kft', 47400, 'transfer', '2026-04-10', 'Étel: 47400 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 29844, 'Étel költség - Rita Kft', 'transfer', '2026-04-10');

  -- Event: BPMK (2026-04-14)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'BPMK', 'event', '2026-04-14', 'Főzés helye: Knorr105')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'BPMK', 602679, 'transfer', '2026-04-14', 'Étel: 334264 Ft, Ital: 87122 Ft, Személyzet: 73025 Ft, Kitelepülés: 80328 Ft, Eszközbérlet: 27940 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 37194, 'Étel költség - BPMK', 'transfer', '2026-04-14');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 16540, 'Ital költség - BPMK', 'transfer', '2026-04-14');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 3000, 'Logisztika költség - BPMK', 'transfer', '2026-04-14');

  -- Event: Károli GáspárEgyetem (2026-04-15)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Károli GáspárEgyetem', 'event', '2026-04-15', 'Főzés helye: Knorr105')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Károli GáspárEgyetem', 651969, 'transfer', '2026-04-15', 'Étel: 493801 Ft, Ital: 115811 Ft, Személyzet: 35857 Ft, Egyéb: 6500 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 74460, 'Étel költség - Károli GáspárEgyetem', 'transfer', '2026-04-15');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 34940, 'Ital költség - Károli GáspárEgyetem', 'transfer', '2026-04-15');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 5000, 'Logisztika költség - Károli GáspárEgyetem', 'transfer', '2026-04-15');

  -- Event: Forever (2026-04-17)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Forever', 'event', '2026-04-17', 'Főzés helye: Knorr105')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Forever', 458442, 'transfer', '2026-04-17', 'Étel: 261061 Ft, Ital: 43351 Ft, Személyzet: 36530 Ft, Kitelepülés: 57150 Ft, Bútor: 57150 Ft, Egyéb: 3200 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 40247, 'Étel költség - Forever', 'transfer', '2026-04-17');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 18512, 'Ital költség - Forever', 'transfer', '2026-04-17');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Személyzet', 15000, 'Személyzet költség - Forever', 'transfer', '2026-04-17');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 4500, 'Logisztika költség - Forever', 'transfer', '2026-04-17');

  -- Event: Knorr69 Konf. (2026-04-17)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Knorr69 Konf.', 'event', '2026-04-17', 'Főzés helye: Knorr105')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Knorr69 Konf.', 1129084, 'transfer', '2026-04-17', 'Étel: 782544 Ft, Ital: 283105 Ft, Személyzet: 55535 Ft, Egyéb: 7900 Ft');

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

  -- Event: Viki szülinap (2026-04-18)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Viki szülinap', 'event', '2026-04-18', 'Főzés helye: Szentkirályi')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Viki szülinap', 342641, 'transfer', '2026-04-18', 'Étel: 311492 Ft, Személyzet: 31149 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 68806, 'Étel költség - Viki szülinap', 'transfer', '2026-04-18');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Személyzet', 38500, 'Személyzet költség - Viki szülinap', 'transfer', '2026-04-18');

  -- Event: Csucsu szülinap (2026-04-18)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Csucsu szülinap', 'event', '2026-04-18', 'Főzés helye: Szentkirályi')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Csucsu szülinap', 481900, 'transfer', '2026-04-18', 'Étel: 270000 Ft, Ital: 141900 Ft, Személyzet: 30000 Ft, Logisztika: 40000 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 106185, 'Étel költség - Csucsu szülinap', 'transfer', '2026-04-18');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 141900, 'Ital költség - Csucsu szülinap', 'transfer', '2026-04-18');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Személyzet', 59500, 'Személyzet költség - Csucsu szülinap', 'transfer', '2026-04-18');

  -- Event: Nyúl Kupa (2026-04-19)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Nyúl Kupa', 'event', '2026-04-19', 'Főzés helye: Szentkirályi')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Nyúl Kupa', 330210, 'transfer', '2026-04-19', 'Étel: 267420 Ft, Ital: 62790 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 66069, 'Étel költség - Nyúl Kupa', 'transfer', '2026-04-19');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Ital', 8400, 'Ital költség - Nyúl Kupa', 'transfer', '2026-04-19');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 3000, 'Logisztika költség - Nyúl Kupa', 'transfer', '2026-04-19');

  -- Event: Colorcon (2026-04-21)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Colorcon', 'event', '2026-04-21', 'Főzés helye: MÁK')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Colorcon', 465582, 'transfer', '2026-04-21', 'Étel: 427482 Ft, Logisztika: 38100 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 117147, 'Étel költség - Colorcon', 'transfer', '2026-04-21');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 6000, 'Logisztika költség - Colorcon', 'transfer', '2026-04-21');

  -- Event: Shell (2026-04-27)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Shell', 'event', '2026-04-27', 'Főzés helye: MÁK')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Shell', 139065, 'transfer', '2026-04-27', 'Étel: 120015 Ft, Logisztika: 19050 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 25193, 'Étel költség - Shell', 'transfer', '2026-04-27');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 3000, 'Logisztika költség - Shell', 'transfer', '2026-04-27');

  -- Event: Colorcon (2026-04-28)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Colorcon', 'event', '2026-04-28', 'Főzés helye: MÁK')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Colorcon', 243332, 'transfer', '2026-04-28', 'Étel: 217932 Ft, Logisztika: 25400 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 5000, 'Logisztika költség - Colorcon', 'transfer', '2026-04-28');

  -- Event: Pasek Gabi (2026-04-30)
  INSERT INTO events (unit_id, name, event_type, event_date, description)
  VALUES (events_unit_id, 'Pasek Gabi', 'event', '2026-04-30', 'Főzés helye: Knorr105')
  RETURNING id INTO new_event_id;

  INSERT INTO event_revenues (event_id, unit_id, partner_name, amount, payment_method, invoice_date, notes)
  VALUES (new_event_id, events_unit_id, 'Pasek Gabi', 215600, 'transfer', '2026-04-30', 'Étel: 215600 Ft');

  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Alapanyag - Étel', 43921, 'Étel költség - Pasek Gabi', 'transfer', '2026-04-30');
  INSERT INTO event_expenses (event_id, unit_id, supplier_name, amount, item_description, payment_method, invoice_date)
  VALUES (new_event_id, events_unit_id, 'Logisztika', 5000, 'Logisztika költség - Pasek Gabi', 'transfer', '2026-04-30');

END $$;
