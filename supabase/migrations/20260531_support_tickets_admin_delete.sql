-- =============================================================================
-- Támogatás (support_tickets): admin törlési jog (DELETE) hozzáadása.
-- Készült: 2026-05-31
--
-- A korábbi RLS csak SELECT / INSERT / UPDATE policy-kat adott. Ahhoz, hogy az
-- admin a Támogatás menüben törölni tudjon egy bejelentést, kell egy DELETE
-- policy. A nem rekurzív get_my_role() segédfüggvényt használjuk.
--
-- Idempotens.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM user_profiles WHERE id = auth.uid() $$;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete tickets" ON support_tickets;
CREATE POLICY "Admins can delete tickets" ON support_tickets
  FOR DELETE
  USING (get_my_role() = 'admin');
