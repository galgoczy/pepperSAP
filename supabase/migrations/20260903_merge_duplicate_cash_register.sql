-- =============================================================================
-- Két pénztárgép-rekord egyesítése (elgépelt AP-szám)
-- Készült: 2026-09-03
--
-- Helyzet: ugyanaz a fizikai gép két rekordként szerepel, mert az AP-számot
-- elírták. A gép 2026-08-19 után átkerült RSR-ből a Knorr 105-be, és ott
-- "Átmeneti kassza" néven, hibás AP-számmal vették fel újra.
--
--   APA13610439  "RSR 4"           RSR         88 zárás, 2025-12-07 -> 2026-09-02
--   AP13610439   "Átmeneti kassza" Knorr 105    9 zárás, 2026-08-24 -> 2026-09-03
--
-- Hogy ez tényleg egy gép, azt a zárás-sorszám és a göngyölt forgalom igazolja:
--
--   08-03  RSR 4            408, 409     göngyölt –            forgalom 0
--   08-19  RSR 4            410          göngyölt 50 806 031   forgalom 0
--   08-24  Átmeneti kassza  411          göngyölt 51 279 788   forgalom 473 757
--   08-25  Átmeneti kassza  412          göngyölt 51 615 232   forgalom 335 444
--
--   50 806 031 + 473 757 = 51 279 788  ✓
--   51 279 788 + 335 444 = 51 615 232  ✓
--
-- A sorszám 408-tól 412-ig megszakítás nélkül fut, a göngyölt lánc pedig fillérre
-- stimmel az egységváltáson át. Az egyesítés tehát helyreállítja a valóságot.
--
-- MEGTARTJUK: APA13610439 (ez a helyes AP-szám, ezen van a 9 hónapnyi előzmény).
-- BEOLVASZTJUK: AP13610439 (9 zárás kerül át).
--
-- FONTOS – forgalom NEM mozdul egységek között: a napi forgalom a daily_revenue-hoz
-- kötődik (annak van egység + dátum mezője), a pénztárgép csak hivatkozás. Az RSR
-- napjai az RSR-nél, a Knorr 105 napjai a Knorr 105-nél maradnak.
--
-- A script a hozzárendelési időszakokat is rendezi (RSR ... 08-23, Knorr 105
-- 08-24-től), mert ezt utólag az Áthelyezés gombbal nem lehetne megtenni: az a
-- 08-24-én kezdődő időszakot 08-23-ra zárná le, amit az adatbázis visszautasít.
--
-- Idempotens: ha a MERGE_AP már nem létezik, nem csinál semmit.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. LÉPÉS – állapot az egyesítés előtt (csak olvas)
-- -----------------------------------------------------------------------------
SELECT
  cr.id, cr.ap_number, cr.name, u.name AS jelenlegi_egyseg, cr.status,
  (SELECT count(*) FROM cash_register_revenue r WHERE r.cash_register_id = cr.id) AS zarasok,
  (SELECT min(dr.date) FROM cash_register_revenue r
     JOIN daily_revenue dr ON dr.id = r.daily_revenue_id
   WHERE r.cash_register_id = cr.id) AS elso_nap,
  (SELECT max(dr.date) FROM cash_register_revenue r
     JOIN daily_revenue dr ON dr.id = r.daily_revenue_id
   WHERE r.cash_register_id = cr.id) AS utolso_nap
FROM cash_registers cr
LEFT JOIN units u ON u.id = cr.unit_id
WHERE cr.ap_number IN ('APA13610439', 'AP13610439')
ORDER BY cr.ap_number;

-- -----------------------------------------------------------------------------
-- 2. LÉPÉS – az egyesítés
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  KEEP_AP      CONSTANT TEXT := 'APA13610439';   -- ez marad (helyes AP-szám)
  MERGE_AP     CONSTANT TEXT := 'AP13610439';    -- ez olvad bele
  MOVE_DATE    CONSTANT DATE := '2026-08-24';    -- ettől a naptól a másik egységnél
  MOVE_TO_UNIT CONSTANT TEXT := 'Knorr 105';     -- ide került a gép

  v_keep      UUID;
  v_merge     UUID;
  v_to_unit   UUID;
  v_moved     INT;
  v_conflicts INT;
BEGIN
  SELECT id INTO v_keep  FROM cash_registers WHERE ap_number = KEEP_AP;
  SELECT id INTO v_merge FROM cash_registers WHERE ap_number = MERGE_AP;
  SELECT id INTO v_to_unit FROM units WHERE name = MOVE_TO_UNIT;

  IF v_merge IS NULL THEN
    RAISE NOTICE 'A(z) % AP-szám nem létezik – nincs mit egyesíteni.', MERGE_AP;
    RETURN;
  END IF;
  IF v_keep IS NULL THEN
    RAISE EXCEPTION 'A megtartandó AP-szám (%) nem található.', KEEP_AP;
  END IF;
  IF v_to_unit IS NULL THEN
    RAISE EXCEPTION 'A(z) "%" egység nem található. Ellenőrizd a MOVE_TO_UNIT értékét.', MOVE_TO_UNIT;
  END IF;

  -- Ütközés-ellenőrzés: ugyanazon a napon (daily_revenue) ne legyen mindkét
  -- rekordon azonos sorszámú zárás – az sértené a (daily_revenue_id,
  -- cash_register_id, closure_number) egyediséget. Külön egységeknél nem
  -- fordulhat elő (más a daily_revenue), de ha mégis, inkább álljunk meg.
  SELECT count(*) INTO v_conflicts
  FROM cash_register_revenue a
  JOIN cash_register_revenue b
    ON b.daily_revenue_id = a.daily_revenue_id
   AND COALESCE(b.closure_number, 1) = COALESCE(a.closure_number, 1)
  WHERE a.cash_register_id = v_merge
    AND b.cash_register_id = v_keep;

  IF v_conflicts > 0 THEN
    RAISE EXCEPTION 'Ütközés: % zárás esne azonos napra és sorszámra. Előbb rendezd kézzel.', v_conflicts;
  END IF;

  -- a) Zárások átvezetése a megtartandó rekordra.
  UPDATE cash_register_revenue SET cash_register_id = v_keep WHERE cash_register_id = v_merge;
  GET DIAGNOSTICS v_moved = ROW_COUNT;
  RAISE NOTICE 'Átvezetett zárás: %', v_moved;

  -- b) A beolvasztott rekord hozzárendeléseit eldobjuk – helyettük tiszta,
  --    egymást nem átfedő időszakokat építünk a megtartandó gép alá.
  DELETE FROM cash_register_assignments WHERE cash_register_id = v_merge;

  -- A költözés előtt kezdődő, még nyitott időszakokat lezárjuk a költözés
  -- előtti napon.
  UPDATE cash_register_assignments
     SET end_date = MOVE_DATE - 1
   WHERE cash_register_id = v_keep
     AND end_date IS NULL
     AND start_date < MOVE_DATE;

  -- A költözés napján vagy után kezdődő, nyitott időszakokat eldobjuk: helyettük
  -- egyetlen, egyértelmű időszak jön létre a cél egységnél.
  DELETE FROM cash_register_assignments
   WHERE cash_register_id = v_keep
     AND end_date IS NULL
     AND start_date >= MOVE_DATE;

  INSERT INTO cash_register_assignments (cash_register_id, unit_id, start_date, end_date)
  VALUES (v_keep, v_to_unit, MOVE_DATE, NULL);

  -- c) A gép "jelenlegi egysége" mutasson a tényleges helyre.
  UPDATE cash_registers SET unit_id = v_to_unit WHERE id = v_keep;

  -- d) A felesleges rekord törlése. A törlés-védelem trigger már nem akadályozza,
  --    mert forgalom nem tartozik hozzá.
  DELETE FROM cash_registers WHERE id = v_merge;

  RAISE NOTICE 'Kész: % beolvadt a(z) % alá, a gép %-tól a(z) "%" egységnél van.',
    MERGE_AP, KEEP_AP, MOVE_DATE, MOVE_TO_UNIT;
END $$;

-- -----------------------------------------------------------------------------
-- 3. LÉPÉS – ellenőrzés (csak olvas)
-- -----------------------------------------------------------------------------
-- Egy rekord maradt, minden zárással, két érintett egységgel:
SELECT
  cr.ap_number, cr.name, u.name AS jelenlegi_egyseg,
  (SELECT count(*) FROM cash_register_revenue r WHERE r.cash_register_id = cr.id) AS zarasok,
  (SELECT count(DISTINCT dr.unit_id) FROM cash_register_revenue r
     JOIN daily_revenue dr ON dr.id = r.daily_revenue_id
   WHERE r.cash_register_id = cr.id) AS erintett_egysegek
FROM cash_registers cr
LEFT JOIN units u ON u.id = cr.unit_id
WHERE cr.ap_number IN ('APA13610439', 'AP13610439');

-- A hozzárendelési időszakok (az Egységek menüben is ezt látod):
SELECT a.start_date, a.end_date, u.name AS egyseg
FROM cash_register_assignments a
JOIN units u ON u.id = a.unit_id
JOIN cash_registers cr ON cr.id = a.cash_register_id
WHERE cr.ap_number = 'APA13610439'
ORDER BY a.start_date;

-- A zárás-sorszám lánc a váltás körül – 408..412 folytonosnak kell lennie:
SELECT dr.date, u.name AS egyseg, r.closure_sequence, r.cumulative_revenue,
       (COALESCE(r.vat_0_percent,0) + COALESCE(r.vat_5_percent,0)
      + COALESCE(r.vat_18_percent,0) + COALESCE(r.vat_27_percent,0)) AS forgalom
FROM cash_register_revenue r
JOIN cash_registers cr ON cr.id = r.cash_register_id
JOIN daily_revenue dr  ON dr.id = r.daily_revenue_id
JOIN units u           ON u.id = dr.unit_id
WHERE cr.ap_number = 'APA13610439'
  AND r.closure_sequence IS NOT NULL
  AND dr.date >= '2026-08-01'
ORDER BY r.closure_sequence;

-- -----------------------------------------------------------------------------
-- OPCIONÁLIS – a teljesen üres RSR-es zárás-sorok
-- -----------------------------------------------------------------------------
-- 08-24 után az RSR-nél maradt néhány csupa nulla, sorszám nélküli zárás-sor.
-- A jelentésekből ezeket a rendszer amúgy is kiszűri, tehát nem zavarnak. Ha
-- mégis takarítanád, ELŐBB nézd meg őket ezzel, és csak utána töröld:
--
-- SELECT dr.date, u.name, r.*
-- FROM cash_register_revenue r
-- JOIN cash_registers cr ON cr.id = r.cash_register_id
-- JOIN daily_revenue dr  ON dr.id = r.daily_revenue_id
-- JOIN units u           ON u.id = dr.unit_id
-- WHERE cr.ap_number = 'APA13610439' AND u.name = 'RSR' AND dr.date >= '2026-08-24';
