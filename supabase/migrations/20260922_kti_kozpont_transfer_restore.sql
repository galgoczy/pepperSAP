-- =============================================================================
-- KTI -> Központ átküldés visszaállítása (2026-08-31, 180 000 Ft)
-- Készült: 2026-09-22
--
-- Mi történt: az átküldést jóváhagyáskor 180 000 Ft-ról 80 000 Ft-ra
-- módosították. Az eredeti összeg megvan a soron (original_amount = 180 000) –
-- ezt húzza át a felület. A cash_transfers táblára NINCS audit trigger, tehát
-- ez az EGYETLEN megőrzött másolat az eredetiről: felülírni csak tudatosan.
--
-- FONTOS mellékkörülmény: a mérlegszámítások (egység házipénztár, Központ
-- egyenleg) kizárólag a status = 'approved' átküldéseket veszik figyelembe.
-- A 'modified' állapotú sor ezért JELENLEG SEHOL nem mozgat pénzt: sem a KTI
-- készpénzéből nem megy ki, sem a Központhoz nem érkezik be. Csak a listában
-- és az előzményekben látszik. A visszaállítás ezért az összeg mellett az
-- állapotot is 'approved'-ra teszi – ettől a 180 000 Ft valóban megjelenik
-- mindkét oldalon 2026-08-31-től.
--
-- FUTTATÁS UTÁN ellenőrizd a KTI és a Központ házipénztár egyenlegét
-- 2026-08-31-re: a KTI 180 000 Ft-tal kevesebb, a Központ 180 000 Ft-tal
-- több lesz, mint most.
--
-- A script pontosan EGY sorra fut. Ha nem talál, vagy többet talál, hibával
-- leáll és semmit nem módosít. Idempotens: második futáskor már nincs mit
-- javítani, ezt jelzi és kilép.
-- =============================================================================

-- ELŐBB nézd meg, mit fog érinteni (csak olvas):
--
--   SELECT t.id, t.transfer_date, t.transfer_type, t.status,
--          t.amount, t.original_amount,
--          u.name AS forras, t.destination_type, t.notes,
--          t.created_at, t.approved_at
--   FROM cash_transfers t
--   LEFT JOIN units u ON u.id = t.source_unit_id
--   WHERE t.transfer_date = '2026-08-31'
--     AND t.destination_type = 'central'
--     AND u.name = 'KTI';

DO $$
DECLARE
  target      cash_transfers%ROWTYPE;
  match_count INT;
BEGIN
  SELECT count(*) INTO match_count
  FROM cash_transfers t
  JOIN units u ON u.id = t.source_unit_id
  WHERE t.transfer_date = DATE '2026-08-31'
    AND t.destination_type = 'central'
    AND u.name = 'KTI'
    -- A státusz lehet 'modified' (eredeti állapot) vagy már 'approved' is, ha
    -- előbb futott a 20260922_transfer_modified_status_fix migráció – az
    -- azonosításhoz az összegpáros a döntő, így a két script sorrendje mindegy.
    AND t.status IN ('modified', 'approved')
    AND t.amount = 80000
    AND t.original_amount = 180000;

  IF match_count = 0 THEN
    RAISE NOTICE 'Nincs javítandó sor (vagy már vissza lett állítva). Nem változott semmi.';
    RETURN;
  END IF;

  IF match_count > 1 THEN
    RAISE EXCEPTION 'Több (%) egyező átküldés van, kézzel kell eldönteni, melyik a jó. Nem módosítottam semmit.', match_count;
  END IF;

  SELECT t.* INTO target
  FROM cash_transfers t
  JOIN units u ON u.id = t.source_unit_id
  WHERE t.transfer_date = DATE '2026-08-31'
    AND t.destination_type = 'central'
    AND u.name = 'KTI'
    -- A státusz lehet 'modified' (eredeti állapot) vagy már 'approved' is, ha
    -- előbb futott a 20260922_transfer_modified_status_fix migráció – az
    -- azonosításhoz az összegpáros a döntő, így a két script sorrendje mindegy.
    AND t.status IN ('modified', 'approved')
    AND t.amount = 80000
    AND t.original_amount = 180000;

  UPDATE cash_transfers
  SET amount = target.original_amount,
      -- A módosítás téves volt, tehát nem marad "Módosítva" nyom; az eredeti
      -- összeg innentől maga az összeg. A tényt a notes őrzi meg.
      original_amount = NULL,
      status = 'approved',
      notes = COALESCE(NULLIF(btrim(notes), '') || ' · ', '')
              || '2026-09-22: téves módosítás visszaállítva (80 000 -> 180 000 Ft)'
  WHERE id = target.id;

  RAISE NOTICE 'OK: % (KTI -> Központ, %) visszaállítva % Ft-ról % Ft-ra, állapot: approved.',
    target.id, target.transfer_date, target.amount, target.original_amount;
END $$;

-- Ellenőrzés futtatás után (csak olvas):
--
--   SELECT t.transfer_date, t.status, t.amount, t.original_amount, t.notes
--   FROM cash_transfers t
--   JOIN units u ON u.id = t.source_unit_id
--   WHERE t.transfer_date = '2026-08-31' AND u.name = 'KTI'
--     AND t.destination_type = 'central';

-- =============================================================================
-- Van-e MÁS is, ami a 'modified' állapot miatt kimarad az egyenlegekből?
-- Ez csak listáz, nem módosít. Ha ad találatot, azok az átküldések ugyanígy
-- nem mozgatnak pénzt egyik oldalon sem.
--
--   SELECT t.id, t.transfer_date, t.transfer_type,
--          COALESCE(us.name, t.source_type)      AS honnan,
--          COALESCE(ud.name, t.destination_type) AS hova,
--          t.amount, t.original_amount, t.notes
--   FROM cash_transfers t
--   LEFT JOIN units us ON us.id = t.source_unit_id
--   LEFT JOIN units ud ON ud.id = t.destination_unit_id
--   WHERE t.status = 'modified'
--   ORDER BY t.transfer_date;
-- =============================================================================
