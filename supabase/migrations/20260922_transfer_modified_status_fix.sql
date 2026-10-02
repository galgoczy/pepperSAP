-- =============================================================================
-- Átküldések: a 'modified' állapot megszüntetése (gyökérok javítás)
-- Készült: 2026-09-22
--
-- A hiba: ha egy átküldést jóváhagyáskor más összeggel fogadtak el, a sor
-- status mezője 'modified' lett (a felület közben azt írta ki, hogy "módosítva
-- és jóváhagyva"). Az egyenlegszámítások viszont csak a status = 'approved'
-- sorokat nézték, ezért az ilyen átküldés SEHOL nem mozgatott pénzt: a küldő
-- egység házipénztárából nem ment ki, a fogadónál (egység vagy Központ) nem
-- jött be. Csak a listában és az előzményekben látszott.
--
-- A javítás két részből áll:
--   * kód: a módosítás mostantól 'approved'-ot ír, a "Módosítva" jelzést pedig
--     az adja, hogy van eltérő original_amount (az eredeti összeg megmarad);
--   * ez a migráció: a meglévő 'modified' sorokat átállítja 'approved'-ra.
--     Az ÖSSZEGEKHEZ NEM NYÚL, csak az állapothoz.
--
-- KÖVETKEZMÉNY: az érintett átküldések innentől számítanak az egyenlegekbe.
-- A script futás közben tételesen kiírja, melyik sorokat állította át és
-- mekkora összeggel – érdemes elmenteni a kimenetet, és utána ellenőrizni az
-- érintett egységek, illetve a Központ egyenlegét.
--
-- Idempotens: másodszorra már nincs mit átállítani, ezt jelzi és kilép.
-- =============================================================================

-- ELŐBB nézd meg, mit fog érinteni (csak olvas):
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

DO $$
DECLARE
  r           RECORD;
  fixed_count INT := 0;
  total_cash  NUMERIC := 0;
  total_res   NUMERIC := 0;
BEGIN
  FOR r IN
    SELECT t.id, t.transfer_date, t.transfer_type, t.amount, t.original_amount,
           COALESCE(us.name, t.source_type)      AS honnan,
           COALESCE(ud.name, t.destination_type) AS hova
    FROM cash_transfers t
    LEFT JOIN units us ON us.id = t.source_unit_id
    LEFT JOIN units ud ON ud.id = t.destination_unit_id
    WHERE t.status = 'modified'
    ORDER BY t.transfer_date, t.id
  LOOP
    RAISE NOTICE 'Átállítva: % | % -> % | % | % Ft%',
      r.transfer_date, r.honnan, r.hova, r.transfer_type, r.amount,
      CASE WHEN r.original_amount IS NULL THEN ''
           ELSE ' (eredetileg ' || r.original_amount || ' Ft)' END;

    fixed_count := fixed_count + 1;
    IF r.transfer_type = 'cash' THEN
      total_cash := total_cash + r.amount;
    ELSE
      total_res := total_res + r.amount;
    END IF;
  END LOOP;

  IF fixed_count = 0 THEN
    RAISE NOTICE 'Nincs ''modified'' állapotú átküldés. Nem változott semmi.';
    RETURN;
  END IF;

  -- Csak az állapot változik; az összeg és az eredeti összeg marad.
  UPDATE cash_transfers SET status = 'approved' WHERE status = 'modified';

  RAISE NOTICE '--------------------------------------------------------------';
  RAISE NOTICE 'Összesen % átküldés állapota lett ''approved''.', fixed_count;
  RAISE NOTICE 'Ezek innentől számítanak az egyenlegekbe: készpénz % Ft, tartalék % Ft.',
    total_cash, total_res;
  RAISE NOTICE 'Ellenőrizd az érintett egységek és a Központ egyenlegét.';
END $$;

-- Ellenőrzés futtatás után: nem maradhat 'modified' sor (csak olvas).
--
--   SELECT status, count(*) FROM cash_transfers GROUP BY status ORDER BY status;
