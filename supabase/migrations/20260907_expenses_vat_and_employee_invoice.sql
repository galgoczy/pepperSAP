-- =============================================================================
-- Számlák: ÁFA kulcs és dolgozói számla
-- Készült: 2026-09-07
--
-- 1) ÁFA kulcs (vat_rate): '0', '5', '18', '27' vagy 'custom'. Az 'custom'
--    (egyedi) esetén a számla ÁFA tartalmát forintban írjuk be a vat_amount
--    oszlopba — akkor hasznos, ha egy számlán többféle kulcs szerepel.
--    Alapértelmezés: hivatalosnál 27%, nem hivatalosnál 0%.
--
--    Az ÁFA az Összeg mezőből, BRUTTÓ szemlélettel értendő: 27%-nál az ÁFA
--    tartalom az összeg 27/127-e (127 000 Ft → 27 000 Ft).
--
-- 2) Dolgozói számla (is_employee_invoice): más pénzmozgás, mint a többi
--    számláé. A teljes összeg a KÖZPONT készpénzét terheli (nem az egységét),
--    az egység tartaléka pedig a számla ÁFA tartalmának FELÉVEL csökken.
--
-- A régi számláknál nem adtuk meg az ÁFA kulcsot, ezért a megállapodás szerint
-- a hivatalosakat 27%-nak, a nem hivatalosakat 0%-nak vesszük. Ez egyetlen
-- egyenleget sem mozdít el: az ÁFA kulcs csak a dolgozói számlánál számít bele
-- pénzmozgásba, dolgozói számla pedig a múltban nem volt.
--
-- Semmilyen meglévő adatot nem töröl. Idempotens, többször is futtatható.
-- =============================================================================

-- Előbb NULL-ozhatóan vesszük fel, feltöltjük, és csak utána teszünk rá
-- alapértelmezést és NOT NULL-t. Így az újrafuttatás sem írja felül a
-- felhasználó által azóta beállított értékeket (csak a NULL-okat tölti).
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS vat_rate TEXT,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS is_employee_invoice BOOLEAN NOT NULL DEFAULT false;

UPDATE expenses
   SET vat_rate = CASE WHEN is_official IS TRUE THEN '27' ELSE '0' END
 WHERE vat_rate IS NULL;

ALTER TABLE expenses ALTER COLUMN vat_rate SET DEFAULT '27';
ALTER TABLE expenses ALTER COLUMN vat_rate SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE expenses
    ADD CONSTRAINT expenses_vat_rate_valid
    CHECK (vat_rate IN ('0', '5', '18', '27', 'custom'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- A dolgozói számlák a Központ egyenlegébe számítanak bele, ezért egységtől
-- függetlenül, egyben is le kell őket kérdezni.
CREATE INDEX IF NOT EXISTS idx_expenses_employee_invoice
  ON expenses(invoice_date)
  WHERE is_employee_invoice = true;

COMMENT ON COLUMN expenses.vat_rate IS 'ÁFA kulcs: 0 / 5 / 18 / 27 százalék, vagy "custom" (az ÁFA forintban a vat_amount oszlopban)';
COMMENT ON COLUMN expenses.vat_amount IS 'Egyedi ("custom") ÁFA kulcsnál a számla ÁFA tartalma forintban; egyébként NULL';
COMMENT ON COLUMN expenses.is_employee_invoice IS 'Dolgozói számla: a teljes összeg a Központ készpénzét terheli, az egység tartalékát az ÁFA tartalom fele';
