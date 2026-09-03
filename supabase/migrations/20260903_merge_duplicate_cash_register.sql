-- =============================================================================
-- Két pénztárgép-rekord egyesítése (elgépelt AP-szám)
-- Készült: 2026-09-03
--
-- Helyzet: ugyanaz a fizikai gép két rekordként szerepel, mert az AP-számot az
-- egyik egységnél elírták (pl. "AP13610439" vs "APA13610439"). Emiatt a
-- könyvelési jelentés két sorban hozza, a zárás-sorszám lánca és a göngyölt
-- ellenőrzés pedig kettészakad.
--
-- Ez a script a MEGTARTANDÓ rekordra vezeti át a másik zárásait, átveszi a
-- hozzárendelési időszakait, majd törli a felesleges rekordot.
--
-- FONTOS – rögzített forgalom NEM veszik el: a napi forgalom a daily_revenue-hoz
-- kötődik (annak van egység + dátum mezője), a pénztárgép csak hivatkozás. A
-- zárások átvezetése tehát nem írja át, melyik egységhez melyik nap tartozik.
--
-- Használat:
--   1) Futtasd le az 1. lépés lekérdezését, és nézd meg, melyik a helyes AP-szám
--      (a gépen olvasható szám a mérvadó).
--   2) A 2. lépésben állítsd be a KEEP_AP és a MERGE_AP értéket, majd futtasd.
--   3) Utána a 3. lépés lekérdezésével ellenőrizd az eredményt.
--   4) Ha a gép új helyre kerül: Egységek -> a pénztárgép -> Áthelyezés, cél az
--      új egység, dátum a költözés napja. Ez lezárja az összes korábbi
--      hozzárendelést, és az új egységnél nyit egyet – a napi rögzítés onnantól
--      ott kínálja fel. A múltbeli forgalom nem mozdul: az a naphoz és az akkori
--      egységhez tartozik, nem a gép jelenlegi helyéhez.
--
-- Idempotens: ha a MERGE_AP már nem létezik, nem csinál semmit.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. LÉPÉS – mi van most? (csak olvas)
-- -----------------------------------------------------------------------------
SELECT
  cr.id,
  cr.ap_number,
  cr.name,
  u.name  AS jelenlegi_egyseg,
  cr.status,
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
  -- ÁLLÍTSD BE: melyik AP-szám a helyes (ez marad meg), és melyiket olvasztjuk bele.
  KEEP_AP   CONSTANT TEXT := 'APA13610439';
  MERGE_AP  CONSTANT TEXT := 'AP13610439';

  v_keep  UUID;
  v_merge UUID;
  v_moved INT;
  v_conflicts INT;
BEGIN
  SELECT id INTO v_keep  FROM cash_registers WHERE ap_number = KEEP_AP;
  SELECT id INTO v_merge FROM cash_registers WHERE ap_number = MERGE_AP;

  IF v_merge IS NULL THEN
    RAISE NOTICE 'A(z) % AP-szám nem létezik – nincs mit egyesíteni.', MERGE_AP;
    RETURN;
  END IF;
  IF v_keep IS NULL THEN
    RAISE EXCEPTION 'A megtartandó AP-szám (%) nem található. Ellenőrizd a KEEP_AP értékét.', KEEP_AP;
  END IF;
  IF v_keep = v_merge THEN
    RAISE EXCEPTION 'A két AP-szám ugyanaz a rekord.';
  END IF;

  -- Ütközés-ellenőrzés: ugyanazon a napon (daily_revenue) ne legyen mindkét
  -- rekordon azonos sorszámú zárás, mert az sértené a (daily_revenue_id,
  -- cash_register_id, closure_number) egyediséget. Külön egységeknél ez nem
  -- fordulhat elő (más a daily_revenue), de ha mégis, inkább álljunk meg.
  SELECT count(*) INTO v_conflicts
  FROM cash_register_revenue a
  JOIN cash_register_revenue b
    ON b.daily_revenue_id = a.daily_revenue_id
   AND COALESCE(b.closure_number, 1) = COALESCE(a.closure_number, 1)
  WHERE a.cash_register_id = v_merge
    AND b.cash_register_id = v_keep;

  IF v_conflicts > 0 THEN
    RAISE EXCEPTION
      'Ütközés: % olyan zárás van, ami ugyanarra a napra és sorszámra esne. Előbb rendezd ezeket kézzel.',
      v_conflicts;
  END IF;

  -- Zárások átvezetése a megtartandó rekordra.
  UPDATE cash_register_revenue
     SET cash_register_id = v_keep
   WHERE cash_register_id = v_merge;
  GET DIAGNOSTICS v_moved = ROW_COUNT;
  RAISE NOTICE 'Átvezetett zárás: %', v_moved;

  -- Hozzárendelési időszakok átvétele, hogy a napi rögzítés a megfelelő
  -- egységeknél és napokon továbbra is felkínálja a gépet. A duplikátumokat
  -- (azonos egység + azonos kezdet) eldobjuk.
  UPDATE cash_register_assignments a
     SET cash_register_id = v_keep
   WHERE a.cash_register_id = v_merge
     AND NOT EXISTS (
       SELECT 1 FROM cash_register_assignments k
       WHERE k.cash_register_id = v_keep
         AND k.unit_id = a.unit_id
         AND k.start_date = a.start_date
     );
  DELETE FROM cash_register_assignments WHERE cash_register_id = v_merge;

  -- A felesleges rekord törlése. A törlés-védelem trigger már nem akadályozza,
  -- mert forgalom nem tartozik hozzá.
  DELETE FROM cash_registers WHERE id = v_merge;
  RAISE NOTICE 'A(z) % rekord törölve, minden a(z) % alá került.', MERGE_AP, KEEP_AP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. LÉPÉS – ellenőrzés (csak olvas)
-- -----------------------------------------------------------------------------
SELECT
  cr.ap_number,
  cr.name,
  u.name AS jelenlegi_egyseg,
  (SELECT count(*) FROM cash_register_revenue r WHERE r.cash_register_id = cr.id) AS zarasok,
  (SELECT count(DISTINCT dr.unit_id) FROM cash_register_revenue r
     JOIN daily_revenue dr ON dr.id = r.daily_revenue_id
   WHERE r.cash_register_id = cr.id) AS erintett_egysegek
FROM cash_registers cr
LEFT JOIN units u ON u.id = cr.unit_id
WHERE cr.ap_number IN ('APA13610439', 'AP13610439');

-- A hozzárendelési időszakok a gép alatt (ezeket az Egységek menüben is látod):
SELECT a.start_date, a.end_date, u.name AS egyseg
FROM cash_register_assignments a
JOIN units u ON u.id = a.unit_id
JOIN cash_registers cr ON cr.id = a.cash_register_id
WHERE cr.ap_number = 'APA13610439'
ORDER BY a.start_date;
