-- =============================================================================
-- RSR – 2026. augusztusi számlák egyeztetése az Excel táblával
-- Készült: 2026-09-09
--
-- Itt fordított a helyzet, mint a többi egységnél: online 22 számla van
-- (974 457 Ft), a táblában csak 15 sor (774 281 Ft). A tábla a hiányos, ezért
-- ez a script nem "feltölti" az onlinet a tábla alapján, hanem csak a
-- konkrétan egyeztetett eltéréseket rendezi.
--
-- Egyeztetve, ebben a sorrendben:
--   1) Két duplikáció törlése (Fejér Food, Rojik) – páronként EGY sor marad.
--   2) Két elgépelt számlaszám javítása a tábla szerint.
--   3) Egy elgépelt összeg javítása a tábla szerint (Assist-Trend).
--   4) Két hiányzó számla felvétele (Magyarüdítő, Rauch).
--   5) Beérkezett jelölés két számlán (PEPCO, Auchan).
--
-- Amihez SZÁNDÉKOSAN nem nyúl:
--   * A Helit 617131773 jelölése. A táblában nincs megjelölve, online igen –
--     az online állapot az előrébb tartó, azt nem vesszük vissza.
--   * A nyolc olyan számla, ami csak online van meg. Azokat a táblában kell
--     pótolni.
--   * Szállítónevek. Az Auchan online "MH MAGYARORSZÁG KFT" néven fut, de a
--     számlaszám, összeg és dátum egyezik – ez a szállító átnevezése.
--
-- Idempotens: minden lépés csak a még javítatlan sorokat érinti, kétszer
-- futtatva sem töröl többet és nem duplikál.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM units WHERE name = 'RSR') THEN
    RAISE EXCEPTION 'Nincs "RSR" nevű egység. Nézd meg: SELECT id, name FROM units ORDER BY name;';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Duplikációk törlése
--
--    Csak és kizárólag erre a két számlaszámra, csak az RSR egységnél, csak
--    2026. augusztusban. Csoportonként (egység + számlaszám + összeg + kelt)
--    a legrégebben rögzített sor MARAD, a többi törlődik. A Rojiknál a két sor
--    szállítóneve eltér ("ROJIK KFT" és "ROJIK"), ezért a nevet nem is nézzük.
--
--    Hogy futtatás ELŐTT látszódjon, mit érint: a törlés alatt közvetlenül ott
--    van ugyanez SELECT-ként, valódi utasításként (nem kommentben, hogy ne
--    lehessen elrontani a kimásolásnál).
-- ---------------------------------------------------------------------------

-- Futtatás előtti ellenőrzés: ez a négy sor az érintett (2 Fejér Food, 2 Rojik).
-- A törlés páronként a korábbi created_at értékűt hagyja meg.
SELECT e.id, e.supplier_name, e.invoice_number, e.amount, e.invoice_date, e.created_at
FROM expenses e
JOIN units u ON u.id = e.unit_id
WHERE u.name = 'RSR'
  AND e.invoice_date BETWEEN DATE '2026-08-01' AND DATE '2026-08-31'
  AND e.invoice_number IN ('FF/2026-007660', 'A-003622-LI/2026')
ORDER BY e.invoice_number, e.created_at;
WITH dupes AS (
  SELECT e.id,
         ROW_NUMBER() OVER (
           PARTITION BY e.unit_id, e.invoice_number, e.amount, e.invoice_date
           ORDER BY e.created_at NULLS LAST, e.id
         ) AS rn
    FROM expenses e
    JOIN units u ON u.id = e.unit_id
   WHERE u.name = 'RSR'
     AND e.invoice_date BETWEEN DATE '2026-08-01' AND DATE '2026-08-31'
     AND e.invoice_number IN ('FF/2026-007660', 'A-003622-LI/2026')
)
DELETE FROM expenses
 WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

-- ---------------------------------------------------------------------------
-- 2) Elgépelt számlaszámok javítása (a tábla az irányadó)
-- ---------------------------------------------------------------------------
UPDATE expenses e
   SET invoice_number = v.helyes
  FROM units u, (VALUES
    ('A22500250/0593/000006', 'A22500250/0593/00006'),   -- Media Markt: eggyel több nulla volt
    ('ECRER-2026-41',         'ECRER-2026-141')          -- ECR-Contract: hiányzott egy 1-es
) AS v(elgepelt, helyes)
 WHERE e.unit_id = u.id
   AND u.name = 'RSR'
   AND e.invoice_number = v.elgepelt;

-- ---------------------------------------------------------------------------
-- 3) Elgépelt összeg javítása (Assist-Trend: 82 520 -> 82 510)
--    Átutalásos számla, tehát a házipénztárt és a tartalékot nem érinti.
-- ---------------------------------------------------------------------------
UPDATE expenses e
   SET amount = 82510
  FROM units u
 WHERE e.unit_id = u.id
   AND u.name = 'RSR'
   AND e.invoice_number = 'B06193/2026'
   AND e.amount = 82520;

-- ---------------------------------------------------------------------------
-- 4) A két hiányzó számla felvétele
--    Mindkettő átutalásos (a Rauchnál a tábla üresen hagyta, de a környezetből
--    egyértelmű), tehát a bankszámlát terhelik, egyenleget nem mozdítanak.
--    A tábla utalásos blokkja nincs beérkezettnek jelölve, ezért jelölés nélkül.
-- ---------------------------------------------------------------------------
INSERT INTO expenses (
  unit_id, supplier_name, invoice_number, amount, currency,
  payment_method, invoice_date, payment_deadline, is_official, notes
)
SELECT
  u.id, v.supplier_name, v.invoice_number, v.amount, 'HUF',
  'transfer', v.invoice_date, v.payment_deadline, true,
  'RSR tábla alapján rögzítve (2026. augusztus)'
FROM units u
CROSS JOIN (VALUES
    ('MAGYARÜDÍTŐ FORGALMAZÓ KFT', '702652424',  85973::numeric, DATE '2026-08-08', DATE '2026-08-29'),
    ('RAUCH',                      'AA0168533',   9600::numeric, DATE '2026-08-19', NULL::date)
) AS v(supplier_name, invoice_number, amount, invoice_date, payment_deadline)
WHERE u.name = 'RSR'
  AND NOT EXISTS (
    SELECT 1 FROM expenses e
     WHERE e.unit_id = u.id
       AND e.invoice_number = v.invoice_number
  );

-- ---------------------------------------------------------------------------
-- 5) Beérkezett jelölés (PEPCO, Auchan)
-- ---------------------------------------------------------------------------
UPDATE expenses e
   SET received = true,
       received_at = COALESCE(e.received_at, NOW())
  FROM units u, (VALUES
    ('A17301040/0330/00003'),   -- PEPCO
    ('AI09/0124790')            -- Auchan / MH Magyarország
) AS v(invoice_number)
 WHERE e.unit_id = u.id
   AND u.name = 'RSR'
   AND e.invoice_number = v.invoice_number
   AND e.received IS DISTINCT FROM true;

-- ---------------------------------------------------------------------------
-- 6) Ellenőrzés
-- ---------------------------------------------------------------------------
SELECT
  count(*)                            AS osszes_szamla,
  count(*) FILTER (WHERE e.received)  AS beerkezettnek_jelolt,
  sum(e.amount)                       AS osszeg
FROM expenses e
JOIN units u ON u.id = e.unit_id
WHERE u.name = 'RSR'
  AND e.invoice_date BETWEEN DATE '2026-08-01' AND DATE '2026-08-31'
  AND e.is_official;
-- Várt: osszes_szamla = 22
--       (22 volt, -2 duplikáció, +2 felvett)
--       beerkezettnek_jelolt = 13  (11 volt + PEPCO + Auchan)
--       osszeg = 973 037
--       (974 457 - 84 582 - 12 401 duplikáció - 10 javítás + 85 973 + 9 600)
