-- Fix privilege escalation on user_profiles
-- ------------------------------------------------------------------
-- Problem: the "Own profile access" policy was defined as
--   FOR ALL USING (auth.uid() = id)
-- which let any authenticated user UPDATE their own row, including the
-- `role` column. A non-admin could therefore set role = 'admin' and gain
-- full access (RLS is the only real authorization boundary in this app).
--
-- Fix: replace the broad self-access policy with granular SELECT / INSERT /
-- UPDATE policies, and guard the privileged columns (role, unit_id) with a
-- BEFORE trigger so only admins can change them.
--
-- NOTE: after this change a brand-new admin can no longer self-provision an
-- 'admin' profile from the client on first login. Existing admins are
-- unaffected (their profiles already exist); new admins must be granted the
-- role by an existing admin (e.g. via the Users page or directly in SQL).

-- 1. Remove the over-permissive policy.
DROP POLICY IF EXISTS "Own profile access" ON user_profiles;

-- 2. Granular self-access policies.
CREATE POLICY "Read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. Guard privileged columns against self-escalation.
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
    IF NEW.role IN ('admin', 'accountant') THEN
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
