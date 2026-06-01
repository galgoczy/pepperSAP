-- =============================================================================
-- Új adminok felvétele: hr@pepperhouse.hu és iroda@pepperhouse.hu
-- Készült: 2026-05-31
--
-- Beállítja ezt a két felhasználót admin szerepkörre a user_profiles táblában.
-- Csak akkor tesz bármit, ha a felhasználó már létezik az auth.users táblában
-- (azaz legalább egyszer bejelentkezett / létre lett hozva a Supabase Authban).
-- Ha még nincs profil sora, létrehozza; ha már van, admin-ra állítja a role-t.
--
-- Idempotens.
-- =============================================================================

DO $$
DECLARE
  target_email TEXT;
  emails TEXT[] := ARRAY['hr@pepperhouse.hu', 'iroda@pepperhouse.hu'];
  auth_id UUID;
BEGIN
  FOREACH target_email IN ARRAY emails
  LOOP
    SELECT id INTO auth_id FROM auth.users WHERE email = target_email;

    IF auth_id IS NULL THEN
      RAISE NOTICE '% még nem létezik az auth.users táblában - előbb hozd létre a Supabase Authban (vagy jelentkezzen be egyszer).', target_email;
      CONTINUE;
    END IF;

    INSERT INTO user_profiles (id, email, full_name, role, unit_id)
    VALUES (auth_id, target_email, split_part(target_email, '@', 1), 'admin', NULL)
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin';

    RAISE NOTICE '% beállítva adminra.', target_email;
  END LOOP;
END $$;
