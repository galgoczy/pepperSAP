-- =============================================================================
-- Knorr 86 – 2026. augusztusi számlák egyeztetése az Excel táblával
-- Készült: 2026-09-09
--
-- A tábla 31 tételéből 30 már fent volt online, forintra egyezően. Ez a script
-- ezért NEM visz fel új számlát, csak két dolgot pótol:
--
--   1) Beérkezett jelölés 6 számlán. A tábla készpénz/kártya blokkjában mind
--      a 11 sor meg van jelölve naranccsal, online viszont csak 5 volt.
--   2) A szállítólevél számok bekerülnek a megjegyzésbe 7 számlán.
--   3) A tábla 29. sorának szállítólevelei az MV Gastro MV-2026/33752
--      számlához kerülnek (egyeztetve).
--
-- A Spar A03104240/1800/00001 tétele NEM változik: a táblában "fejes sali"
-- áll, online viszont már ott a teljesebb "fejes saláta". Ezért nincs mit
-- pótolni rajta.
--
-- Amihez SZÁNDÉKOSAN nem nyúl:
--   * Dátumok. Tíz átutalásos számlánál eltér a tábla kelt dátuma az onlinetól,
--     de az online adat a helyes: a készpénz/kártya blokkban mind a 11 dátum
--     pontosan egyezik, az utalásos blokkban viszont négy külön számla ugyanazt
--     a 2026-08-03-at kapta, ami a rögzítés napja, nem a számla kelte.
--   * MV Gastro MV-2026/33126 (2026-07-28). Már fent van a júliusi hónapban.
--   * M.L. Energy 261086121 és MV Gastro MV-2026/33752. Ezek csak online
--     vannak meg, az Excel táblából hiányoznak - ott kell pótolni őket.
--
-- Semmit nem töröl, összeget nem módosít, egyenleget nem mozdít.
-- Idempotens: a jelölés csak a még jelöletleneket érinti, a megjegyzés pedig
-- csak akkor bővül, ha a szállítólevél még nincs benne.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM units WHERE name ILIKE '%knorr%86%') THEN
    RAISE EXCEPTION 'Nincs Knorr 86 egység. Nézd meg: SELECT id, name FROM units ORDER BY name;';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Beérkezett jelölés (6 számla)
-- ---------------------------------------------------------------------------
UPDATE expenses e
   SET received = true,
       received_at = COALESCE(e.received_at, NOW())
  FROM units u, (VALUES
    ('617128622'),
    ('617128558'),
    ('261807020'),
    ('617133820'),
    ('617135227'),
    ('617136643')
) AS v(invoice_number)
 WHERE e.unit_id = u.id
   AND u.name ILIKE '%knorr%86%'
   AND e.invoice_number = v.invoice_number
   AND e.received IS DISTINCT FROM true;

-- ---------------------------------------------------------------------------
-- 2) Szállítólevél számok a megjegyzésbe (7 számla)
--    Meglévő megjegyzést nem ír felül: új sorként fűzi hozzá.
-- ---------------------------------------------------------------------------
UPDATE expenses e
   SET notes = CASE
                 WHEN e.notes IS NULL OR btrim(e.notes) = '' THEN v.szlev
                 ELSE e.notes || E'\n' || v.szlev
               END
  FROM units u, (VALUES
    ('MV-2026/33262', 'Szállítólevél: VFRTRSZ-2026/33374, VFRTRSZ-2026/33431, VFRTRSZ-2026/33513'),
    ('12880/2026', 'Szállítólevél: SZ12075/2026'),
    ('13398/2026', 'Szállítólevél: SZ12505/2026'),
    ('MV-2026/33450', 'Szállítólevél: VFRTRSZ-2026/33550, VFRTRSZ-2026/33591, VFRTRSZ-2026/33688'),
    ('1604978658', 'Szállítólevél: 8993076658'),
    ('702659468', 'Szállítólevél: 962516368'),
    ('14221/2026', 'Szállítólevél: SZ13150/2026')
) AS v(invoice_number, szlev)
 WHERE e.unit_id = u.id
   AND u.name ILIKE '%knorr%86%'
   AND e.invoice_number = v.invoice_number
   AND (e.notes IS NULL OR position(v.szlev in e.notes) = 0);

-- ---------------------------------------------------------------------------
-- 3) A tábla 29. sorának szállítólevelei -> MV Gastro MV-2026/33752
--
--    A 29. sorban csak három szállítólevél áll, számla nélkül. NEM a fölötte
--    lévő Magyarüdítő sor folytatása: azok VFRTRSZ formátumúak, ami az MV
--    Gastro-é, a Magyarüdítő szállítólevele 962516368 alakú. Az MV Gastro
--    MV-2026/33752 számláé, ami online megvan (tétel: "zöldség áru"), de az
--    Excel táblából hiányzik. Egyeztetve.
-- ---------------------------------------------------------------------------
UPDATE expenses e
   SET notes = CASE
                 WHEN e.notes IS NULL OR btrim(e.notes) = '' THEN 'Szállítólevél: VFRTRSZ-2026/33879, VFRTRSZ-2026/33947, VFRTRSZ-2026/34028'
                 ELSE e.notes || E'\n' || 'Szállítólevél: VFRTRSZ-2026/33879, VFRTRSZ-2026/33947, VFRTRSZ-2026/34028'
               END
  FROM units u
 WHERE e.unit_id = u.id
   AND u.name ILIKE '%knorr%86%'
   AND e.invoice_number = 'MV-2026/33752'
   AND (e.notes IS NULL OR position('VFRTRSZ-2026/33879, VFRTRSZ-2026/33947, VFRTRSZ-2026/34028' in e.notes) = 0);

-- ---------------------------------------------------------------------------
-- 4) Ellenőrzés
-- ---------------------------------------------------------------------------
SELECT
  count(*)                             AS osszes_szamla,
  count(*) FILTER (WHERE e.received)   AS beerkezettnek_jelolt,
  count(*) FILTER (WHERE e.notes ILIKE 'Szállítólevél:%' OR e.notes ILIKE '%Szállítólevél:%') AS szallitolevellel,
  sum(e.amount)                        AS osszeg
FROM expenses e
JOIN units u ON u.id = e.unit_id
WHERE u.name ILIKE '%knorr%86%'
  AND e.invoice_date BETWEEN DATE '2026-08-01' AND DATE '2026-08-31'
  AND e.is_official;
-- Várt: osszes_szamla = 32, beerkezettnek_jelolt = 11,
--       szallitolevellel = 8, osszeg = 2406619
--       (7 a tábla soraiból + az MV Gastro MV-2026/33752)
