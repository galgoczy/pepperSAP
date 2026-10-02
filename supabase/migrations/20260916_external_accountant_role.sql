-- =============================================================================
-- Külső könyvelő szerepkör (ext_accountant) – CSAK olvas, és csak a
-- "Pénztárgép forgalom - könyvelés" jelentést látja (tetszőleges időszakra).
-- Készült: 2026-09-16
--
-- Mit csinál:
--   1. A profil-jogosultság őrt kiegészíti: 'ext_accountant' szerepkört senki
--      nem adhat magának (ugyanúgy privilegizált, mint az admin/accountant).
--   2. Olvasási jogot ad a jelentéshez kellő két táblára (daily_revenue,
--      cash_register_revenue). A többi szükséges tábla (units, cash_registers,
--      register_cumulative_checks, register_protocol_checks) már most is
--      olvasható minden bejelentkezett felhasználónak.
--   3. Az ÖSSZES public táblára RESTRICTIVE (tiltó) policy-t tesz, ami az
--      ext_accountant szerepkörnek megtiltja az INSERT/UPDATE/DELETE-et. Ez a
--      biztonsági háló arra az esetre, ha valaki a felület megkerülésével,
--      közvetlenül az API-n próbálna írni.
--
-- Adatot NEM módosít, meglévő policy-t NEM dob el, és a meglévő szerepkörök
-- (admin, unit, events, accountant) viselkedésén nem változtat: a tiltó
-- policy-k kizárólag az ext_accountant-ra vonatkoznak, amit ma még senki nem
-- használ. Idempotens: többször is lefuttatható.
--
-- HASZNÁLAT (a migráció után, egyszer):
--   a) Supabase → Authentication → Users → "Add user": a külső könyvelő
--      e-mail címe + jelszó (nem kell @pepperhouse.hu cím, és nem kell
--      Microsoft-fiók – a bejelentkező oldalon az "Egyéb email/jelszó" úton lép be).
--   b) Ezután a Felhasználók menüben állítsd a szerepkörét "Külső könyvelő"-re,
--      VAGY futtasd le a fájl végén lévő (kikommentezett) SQL blokkot.
-- =============================================================================

-- Segédfüggvény (ha már létezik, változatlanul felülírja) --------------------
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM user_profiles WHERE id = auth.uid() $$;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;

-- ===========================================================================
-- 1) Privilégium-őr: az ext_accountant is privilegizált szerepkör
-- ===========================================================================
CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may change anything.
  IF get_my_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Non-admins cannot change their role or unit assignment.
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.unit_id IS DISTINCT FROM OLD.unit_id THEN
      RAISE EXCEPTION 'Nem módosíthatod a saját szerepkörödet vagy egységedet.';
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- Non-admins cannot self-provision a privileged role.
    IF NEW.role IN ('admin', 'accountant', 'ext_accountant') THEN
      RAISE EXCEPTION 'Privilegizált szerepkört nem hozhatsz létre magadnak.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileges ON user_profiles;
CREATE TRIGGER guard_profile_privileges
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_profile_privilege_escalation();

-- ===========================================================================
-- 2) Olvasás a jelentéshez
--
-- A jelentés a daily_revenue sorait kéri le, beágyazva a cash_register_revenue
-- zárásokkal. Mindkettőre külön, ENGEDÉLYEZŐ (permissive) policy kerül – a
-- meglévőket nem bántjuk, a permissive policy-k VAGY kapcsolatban állnak, így
-- ez senkitől nem vesz el jogot, csak a könyvelőknek ad olvasást.
-- ===========================================================================
-- (Az RLS mindkét táblán be van kapcsolva az alap séma óta – szándékosan nem
-- állítgatjuk, hogy a napi rögzítés meglévő jogosultságain ne változtassunk.)
DROP POLICY IF EXISTS "dr_select_accountants" ON daily_revenue;
CREATE POLICY "dr_select_accountants" ON daily_revenue
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('accountant', 'ext_accountant'));

DROP POLICY IF EXISTS "crr_select_ext_accountant" ON cash_register_revenue;
CREATE POLICY "crr_select_ext_accountant" ON cash_register_revenue
  FOR SELECT TO authenticated
  USING (get_my_role() = 'ext_accountant');

-- ===========================================================================
-- 3) Írás tiltása az ext_accountant-nak – minden public táblán
--
-- A RESTRICTIVE policy ÉS kapcsolatban áll az engedélyezőkkel, tehát bármit is
-- engedne egy másik policy, ez felülírja. Csak az ext_accountant szerepkörre
-- fog, minden más felhasználó számára a feltétel igaz (a COALESCE azért kell,
-- hogy a még profil nélküli, első belépésnél lévő felhasználó létre tudja
-- hozni a saját profilját).
-- ===========================================================================
DO $$
DECLARE
  t record;
  no_rls text[] := '{}';
BEGIN
  FOR t IN
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    IF NOT t.relrowsecurity THEN
      no_rls := no_rls || t.relname;
      CONTINUE;  -- policy nélküli táblán a policy-nak nincs hatása
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'ext_acc_no_insert', t.relname);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated '
      'WITH CHECK (COALESCE(get_my_role(), '''') <> ''ext_accountant'')',
      'ext_acc_no_insert', t.relname);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'ext_acc_no_update', t.relname);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated '
      'USING (COALESCE(get_my_role(), '''') <> ''ext_accountant'') '
      'WITH CHECK (COALESCE(get_my_role(), '''') <> ''ext_accountant'')',
      'ext_acc_no_update', t.relname);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'ext_acc_no_delete', t.relname);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated '
      'USING (COALESCE(get_my_role(), '''') <> ''ext_accountant'')',
      'ext_acc_no_delete', t.relname);
  END LOOP;

  IF array_length(no_rls, 1) > 0 THEN
    RAISE NOTICE 'FIGYELEM: ezeken a táblákon nincs bekapcsolva az RLS, ezért '
                 'rájuk semmilyen policy nem vonatkozik (nem csak a külső '
                 'könyvelőre): %', array_to_string(no_rls, ', ');
  END IF;
END $$;

COMMENT ON COLUMN user_profiles.role IS
  'User role: admin (full access), unit (daily entries), events (event management), '
  'accountant (read-only reports), ext_accountant (read-only, csak a könyvelési pénztárgép jelentés)';

-- ===========================================================================
-- 4) A külső könyvelő profiljának beállítása
--
-- ELŐBB hozd létre a felhasználót a Supabase felületén (Authentication →
-- Users → Add user, email + jelszó), majd írd be ide a címét és futtasd le
-- ezt a blokkot. (Ugyanez elvégezhető a Felhasználók menüben is.)
-- ===========================================================================
-- DO $$
-- DECLARE
--   target_email TEXT := 'ide@ird.a.kulso.konyvelo.cimet';
--   target_id UUID;
-- BEGIN
--   SELECT id INTO target_id FROM auth.users WHERE lower(email) = lower(target_email);
--   IF target_id IS NULL THEN
--     RAISE NOTICE 'Nincs ilyen felhasználó az auth.users-ben: % – előbb hozd létre.', target_email;
--     RETURN;
--   END IF;
--   ALTER TABLE user_profiles DISABLE TRIGGER guard_profile_privileges;
--   INSERT INTO user_profiles (id, full_name, role, unit_id)
--   VALUES (target_id, split_part(target_email, '@', 1), 'ext_accountant', NULL)
--   ON CONFLICT (id) DO UPDATE SET role = 'ext_accountant', unit_id = NULL;
--   ALTER TABLE user_profiles ENABLE TRIGGER guard_profile_privileges;
--   RAISE NOTICE 'OK: % -> ext_accountant', target_email;
-- END $$;
