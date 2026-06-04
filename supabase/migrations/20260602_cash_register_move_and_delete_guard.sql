-- =============================================================================
-- Pénztárgép áthelyezés + törlés-védelem
-- Készült: 2026-06-02
--
-- Háttér: a napi forgalom (cash_register_revenue) a daily_revenue-hoz kötődik,
-- annak van unit_id + date mezője. Tehát a múltbeli forgalom mindig a RÖGZÍTÉS
-- NAPJÁN érvényes egységhez tartozik, függetlenül attól, hogy a pénztárgép
-- jelenleg melyik egységnél van. Ezért egy pénztárgép másik egységbe helyezése
-- = a cash_registers.unit_id átírása (az AP-szám ugyanaz marad, nincs unique
-- ütközés), a régi adat pedig a régi egységnél marad.
--
-- Ez a migráció:
--   1) Audit/előzmény tábla az áthelyezésekhez (mikor, honnan, hová).
--   2) Trigger, ami MEGTILTJA a pénztárgép végleges törlését, ha van hozzá
--      rögzített forgalom (így nem lehet véletlenül múltbeli adatot elveszíteni).
-- Idempotens.
-- =============================================================================

-- 1) Áthelyezés-előzmény tábla
CREATE TABLE IF NOT EXISTS cash_register_unit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  from_unit_id UUID REFERENCES units(id),
  to_unit_id UUID REFERENCES units(id),
  effective_date DATE NOT NULL,
  moved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cr_unit_history_register
  ON cash_register_unit_history(cash_register_id);

ALTER TABLE cash_register_unit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read register history" ON cash_register_unit_history;
CREATE POLICY "Authenticated can read register history"
  ON cash_register_unit_history FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can insert register history" ON cash_register_unit_history;
CREATE POLICY "Authenticated can insert register history"
  ON cash_register_unit_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 2) Törlés-védelem: ha van rögzített forgalom, ne lehessen törölni
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
