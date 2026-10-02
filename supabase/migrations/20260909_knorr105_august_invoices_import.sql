-- =============================================================================
-- Knorr 105 – 2026. augusztusi számlák felvétele az Excel táblából
-- Készült: 2026-09-09
--
-- A táblában 19 számla szerepel, összesen 7 240 803 Ft. Mind hivatalos számla,
-- ÁFA kulcs 27% (az oszlop alapértelmezése, ezért nem írjuk be külön — így
-- akkor is jó, ha a 20260907-es migráció még nem futott le).
--
-- Beérkezett jelölés: a táblában a halvány narancs jelöli. 18 sor jelölt,
-- egy sor NEM (Balu Market Kft., 2026-08-24, 2 927 Ft) — az beérkezett
-- jelölés nélkül kerül be.
--
-- Fizetési mód: a táblában 15 Helit sornál üres volt az oszlop; egyeztetve
-- ezek is BANKKÁRTYÁSAK (az első Helit sorban ott a "bk"). A bankkártyás
-- tételek a bankszámlát terhelik, tehát a házipénztár és a tartalék
-- egyenlegét ez a script NEM mozdítja el. Egyetlen készpénzes tétel van
-- (Balu Market, 2 927 Ft), az a házipénztárt csökkenti ennyivel.
--
-- A táblában nem szerepelt, ezért üresen marad: tétel megnevezése, fizetési
-- határidő, teljesítés dátuma. A deviza HUF.
--
-- Idempotens: számlaszám szerint ellenőriz, a számlaszám nélküli tételt pedig
-- szállító + dátum + összeg hármassal. Kétszer futtatva sem duplikál.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM units WHERE name ILIKE '%knorr%105%') THEN
    RAISE EXCEPTION 'Nincs Knorr 105 egység. Nézd meg: SELECT id, name FROM units ORDER BY name;';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Számlaszámmal rendelkező tételek (18 db)
-- ---------------------------------------------------------------------------
INSERT INTO expenses (
  unit_id, supplier_name, invoice_number, amount, currency,
  payment_method, invoice_date, is_official,
  received, received_at, notes
)
SELECT
  u.id, v.supplier_name, v.invoice_number, v.amount, 'HUF',
  v.payment_method, v.invoice_date, true,
  v.received, CASE WHEN v.received THEN NOW() END,
  'Knorr 105 tábla alapján rögzítve (2026. augusztus)'
FROM units u
CROSS JOIN (VALUES
    ('Helit Kft.', '617122085', 696697, 'card', DATE '2026-08-03', true),
    ('Helit Kft.', '617122791', 452705, 'card', DATE '2026-08-04', true),
    ('Helit Kft.', '617123634', 427413, 'card', DATE '2026-08-05', true),
    ('Helit Kft.', '617124213', 364186, 'card', DATE '2026-08-06', true),
    ('Helit Kft.', '617124829', 282722, 'card', DATE '2026-08-07', true),
    ('Helit Kft.', '617125654', 602174, 'card', DATE '2026-08-08', true),
    ('Helit Kft.', '617003894', 942276, 'card', DATE '2026-08-11', true),
    ('Helit Kft.', '617127719', 353851, 'card', DATE '2026-08-12', true),
    ('Helit Kft.', '617128745', 232658, 'card', DATE '2026-08-13', true),
    ('Helit Kft.', '617129215', 128120, 'card', DATE '2026-08-14', true),
    ('Helit Kft.', '617133571', 654074, 'card', DATE '2026-08-24', true),
    ('Helit Kft.', '617134334', 445144, 'card', DATE '2026-08-25', true),
    ('Helit Kft.', '617135226', 365400, 'card', DATE '2026-08-26', true),
    ('Helit Kft.', '617136249', 282216, 'card', DATE '2026-08-27', true),
    ('Helit Kft.', '617136589', 372296, 'card', DATE '2026-08-28', true),
    ('Helit Kft.', '617137863', 513090, 'card', DATE '2026-08-31', true),
    ('UNI-Flock Kft', '426712', 75654, 'card', DATE '2026-08-10', true),
    ('Ikea', 'A29100004/0950/00017', 47200, 'card', DATE '2026-08-31', true)
) AS v(supplier_name, invoice_number, amount, payment_method, invoice_date, received)
WHERE u.name ILIKE '%knorr%105%'
  AND NOT EXISTS (
    SELECT 1 FROM expenses e
     WHERE e.unit_id = u.id
       AND e.invoice_number = v.invoice_number
  );

-- ---------------------------------------------------------------------------
-- 2) Számlaszám nélküli tétel (1 db) – szállító + dátum + összeg alapján
-- ---------------------------------------------------------------------------
INSERT INTO expenses (
  unit_id, supplier_name, amount, currency,
  payment_method, invoice_date, is_official,
  received, received_at, notes
)
SELECT
  u.id, v.supplier_name, v.amount, 'HUF',
  v.payment_method, v.invoice_date, true,
  v.received, CASE WHEN v.received THEN NOW() END,
  'Knorr 105 tábla alapján rögzítve (2026. augusztus)'
FROM units u
CROSS JOIN (VALUES
    ('Balu Market Kft.', 2927, 'cash', DATE '2026-08-24', false)
) AS v(supplier_name, amount, payment_method, invoice_date, received)
WHERE u.name ILIKE '%knorr%105%'
  AND NOT EXISTS (
    SELECT 1 FROM expenses e
     WHERE e.unit_id = u.id
       AND e.supplier_name = v.supplier_name
       AND e.invoice_date = v.invoice_date
       AND e.amount = v.amount
  );

-- ---------------------------------------------------------------------------
-- 3) Ellenőrzés
-- ---------------------------------------------------------------------------
SELECT
  count(*)                                   AS osszes_szamla,
  count(*) FILTER (WHERE e.received)         AS beerkezettnek_jelolt,
  sum(e.amount)                              AS osszeg,
  sum(e.amount) FILTER (WHERE e.payment_method = 'cash') AS keszpenzes
FROM expenses e
JOIN units u ON u.id = e.unit_id
WHERE u.name ILIKE '%knorr%105%'
  AND e.invoice_date BETWEEN DATE '2026-08-01' AND DATE '2026-08-31'
  AND e.is_official;
-- Várt: osszes_szamla = 19, beerkezettnek_jelolt = 18,
--       osszeg = 7240803, keszpenzes = 2927
