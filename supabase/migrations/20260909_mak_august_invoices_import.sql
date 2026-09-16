-- =============================================================================
-- MÁK (Államkincstár) 2026. augusztusi számlák szinkronizálása az Excel táblából
-- Készült: 2026-09-09
--
-- Két dolgot csinál:
--   1) Felveszi azt a 21 számlát, ami a MÁK Excel táblában szerepel, de online
--      még nincs rögzítve.
--   2) A MÁK tábla szerint beérkezett, de online még nem jelölt számlákat
--      megjelöli beérkezettként.
--
-- Kiindulás (egyeztetve): mind hivatalos számla, ÁFA kulcs 27%. A 27%-ot nem
-- írjuk be külön, mert az oszlop alapértelmezése pontosan ez — így akkor is jó
-- lesz, ha a 20260907-es migráció még nem futott le (utólag is 27%-ot kap,
-- mert hivatalos).
--
-- A MÁK táblában NEM szerepelt, ezért üresen marad: tétel megnevezése,
-- fizetési határidő, teljesítés dátuma. A deviza HUF (a tábla Ft-ban számol).
-- A beérkezés IDŐPONTJA sem szerepelt a táblában, ezért a jelölés ideje a
-- futtatás pillanata lesz — maga a tény (beérkezett) a táblából jön.
--
-- A számlák bankkártyás/készpénzes kifizetések: a bankkártyás tételek a
-- bankszámlát terhelik, tehát a házipénztár és a tartalék egyenlegét EZ A
-- SCRIPT NEM MOZDÍTJA EL.
--
-- Idempotens: kétszer lefuttatva sem hoz létre duplikátumot, és nem ír felül
-- meglévő jelölést. Semmit nem töröl és nem módosít a felvitt adatokon kívül.
-- =============================================================================

-- Biztonsági fék: ha nincs ilyen nevű egység, inkább álljon meg hangosan,
-- mint hogy csendben 0 sort írjon be.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM units WHERE name = 'Államkincstár') THEN
    RAISE EXCEPTION 'Nincs "Államkincstár" nevű egység. Nézd meg: SELECT id, name FROM units ORDER BY name;';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) A csak a MÁK táblában szereplő számlák felvétele
-- ---------------------------------------------------------------------------
INSERT INTO expenses (
  unit_id, supplier_name, invoice_number, amount, currency,
  payment_method, invoice_date, is_official,
  received, received_at, notes
)
SELECT
  u.id, v.supplier_name, v.invoice_number, v.amount, 'HUF',
  v.payment_method, v.invoice_date, true,
  true, NOW(), 'MÁK tábla alapján rögzítve (2026. augusztus)'
FROM units u
CROSS JOIN (VALUES
    ('Helit', '617122152', 261039, 'card', DATE '2026-08-03'),
    ('Lidl', 'A31900281/0440/00003', 5293, 'card', DATE '2026-08-03'),
    ('Helit', '617123935', 432205, 'card', DATE '2026-08-05'),
    ('Helit', '617125331', 263489, 'card', DATE '2026-08-07'),
    ('Helit', '617126226', 140864, 'card', DATE '2026-08-10'),
    ('Helit', '617127231', 279293, 'card', DATE '2026-08-11'),
    ('Helit', '617128054', 324339, 'card', DATE '2026-08-12'),
    ('Helit', '617128758', 173320, 'card', DATE '2026-08-13'),
    ('Helit', '617129519', 266385, 'card', DATE '2026-08-14'),
    ('Lidl', 'A31900281/0451/00001', 5094, 'card', DATE '2026-08-14'),
    ('Helit', '617130617', 214899, 'card', DATE '2026-08-17'),
    ('Helit', '617131420', 191559, 'card', DATE '2026-08-18'),
    ('Helit', '617131965', 394138, 'card', DATE '2026-08-19'),
    ('Helit', '617131966', 2728, 'card', DATE '2026-08-19'),
    ('Helit', '617133613', 230217, 'card', DATE '2026-08-24'),
    ('Lidl', 'A31900281/0461/00002', 5164, 'card', DATE '2026-08-25'),
    ('Helit', '617135632', 478972, 'card', DATE '2026-08-26'),
    ('Helit', '617137010', 268281, 'card', DATE '2026-08-28'),
    ('Helit', '617138010', 259202, 'card', DATE '2026-08-31'),
    ('Helit', '617138011', 16761, 'card', DATE '2026-08-31'),
    ('Lidl', 'A31900282/0464/00011', 5483, 'card', DATE '2026-08-31')
) AS v(supplier_name, invoice_number, amount, payment_method, invoice_date)
WHERE u.name = 'Államkincstár'
  AND NOT EXISTS (
    SELECT 1 FROM expenses e
     WHERE e.unit_id = u.id
       AND e.invoice_number = v.invoice_number
  );

-- ---------------------------------------------------------------------------
-- 2) A már meglévő számlák megjelölése beérkezettként
--    (a MÁK táblában narancssal jelölve = beérkezett)
-- ---------------------------------------------------------------------------
UPDATE expenses e
   SET received = true,
       received_at = COALESCE(e.received_at, NOW())
  FROM units u
 WHERE e.unit_id = u.id
   AND u.name = 'Államkincstár'
   AND e.invoice_number IN ('E-TT-2026-320', '617135633')
   AND e.received IS DISTINCT FROM true;

-- ---------------------------------------------------------------------------
-- 3) Ellenőrzés: futtasd le ezt is, és nézd meg az eredményt
-- ---------------------------------------------------------------------------
SELECT
  count(*) FILTER (WHERE e.received)            AS beerkezettnek_jelolt,
  count(*)                                      AS osszes_szamla,
  sum(e.amount)                                 AS osszeg
FROM expenses e
JOIN units u ON u.id = e.unit_id
WHERE u.name = 'Államkincstár'
  AND e.invoice_date BETWEEN DATE '2026-08-01' AND DATE '2026-08-31'
  AND e.is_official;
-- Várt eredmény: 23 beérkezettnek jelölt a 2026. augusztusi hivatalos
-- számlákból (21 új + 2 meglévő), plusz a "Krisztián számla", ami csak
-- online van meg -> osszes_szamla = 24.
