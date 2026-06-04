-- =============================================================================
-- Pénztárgép dátum-vezérelt egység-hozzárendelés + törlés-védelem
-- Készült: 2026-06-02
--
-- Háttér: a napi forgalom (cash_register_revenue) a daily_revenue-hoz kötődik,
-- annak van unit_id + date mezője, ezért a múltbeli forgalom mindig a RÖGZÍTÉS
-- NAPJÁN érvényes egységhez tartozik. A jelentések emiatt önmagukban helyesek.
--
-- Amit ez a migráció megold: egy pénztárgép DÁTUM SZERINT tartozzon egy
-- egységhez. Egy géphez egy vagy több "hozzárendelési időszak" tartozik
-- (mettől–meddig melyik egységnél volt). A napi rögzítő a KIVÁLASZTOTT NAP
-- alapján dönti el, melyik gépeket kínálja fel az adott egységnél, így:
--   * korábbi nap szerkesztésekor / régi adat importálásakor a megfelelő
--     gépek jelennek meg,
--   * áthelyezéskor a régi egységnél a megadott napig, az újnál attól a naptól
--     jelenik meg a gép (az AP-szám ugyanaz marad – egyetlen rekord),
--   * MOST hozzáadott géphez nem keletkezik visszamenőleges statisztika: csak
--     az "érvényes ettől" naptól kínáljuk fel (alapból a mai naptól).
--
-- Idempotens.
-- =============================================================================

-- A korábbi, intervallumokra alkalmatlan előzmény-tábla helyett rendes,
-- dátum-tartományos hozzárendelési tábla.
DROP TABLE IF EXISTS cash_register_unit_history;

CREATE TABLE IF NOT EXISTS cash_register_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  start_date DATE NOT NULL,        -- inkluzív: ettől a naptól tartozik az egységhez
  end_date DATE,                   -- inkluzív; NULL = nyitott (jelenleg is ott van)
  moved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT assignment_dates_valid CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_cr_assignments_register
  ON cash_register_assignments(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cr_assignments_unit_dates
  ON cash_register_assignments(unit_id, start_date, end_date);

-- Backfill: minden meglévő géphez egy hozzárendelés a jelenlegi egységénél.
-- A start_date szándékosan a múltba mutat, hogy a meglévő gépek bármely
-- korábbi napon elérhetők maradjanak (adatbevitel / régi import). Ha a gép már
-- selejtezve van, a hozzárendelés a selejtezés napján lezárul.
INSERT INTO cash_register_assignments (cash_register_id, unit_id, start_date, end_date)
SELECT
  cr.id,
  cr.unit_id,
  '2000-01-01'::date,
  CASE WHEN cr.status = 'inactive'
       THEN COALESCE(cr.deactivated_at::date, CURRENT_DATE)
       ELSE NULL END
FROM cash_registers cr
WHERE cr.unit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cash_register_assignments a WHERE a.cash_register_id = cr.id
  );

ALTER TABLE cash_register_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read register assignments" ON cash_register_assignments;
CREATE POLICY "Authenticated can read register assignments"
  ON cash_register_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can insert register assignments" ON cash_register_assignments;
CREATE POLICY "Authenticated can insert register assignments"
  ON cash_register_assignments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update register assignments" ON cash_register_assignments;
CREATE POLICY "Authenticated can update register assignments"
  ON cash_register_assignments FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Törlés-védelem: ha van rögzített forgalom, ne lehessen véglegesen törölni
-- (a múltbeli adatok megőrzéséhez selejtezni kell helyette).
CREATE OR REPLACE FUNCTION prevent_cash_register_delete_with_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cash_register_revenue WHERE cash_register_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'A pénztárgép nem törölhető, mert tartozik hozzá rögzített forgalom. Selejtezd helyette (a múltbeli adatok megőrzéséhez).';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS guard_cash_register_delete ON cash_registers;
CREATE TRIGGER guard_cash_register_delete
  BEFORE DELETE ON cash_registers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cash_register_delete_with_data();
