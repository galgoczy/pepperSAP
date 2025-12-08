-- PEPPER HOUSE - RLS POLICY FIX
-- Egyszerűsített RLS policy-k a körkörös függőség elkerülésére

-- ============================================
-- 1. RÉGI POLICY-K TÖRLÉSE
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their unit" ON units;
DROP POLICY IF EXISTS "Admins can manage units" ON units;
DROP POLICY IF EXISTS "Users can view own unit revenue" ON daily_revenue;
DROP POLICY IF EXISTS "Users can insert own unit revenue" ON daily_revenue;
DROP POLICY IF EXISTS "Users can update own unit revenue" ON daily_revenue;
DROP POLICY IF EXISTS "Admins can delete revenue" ON daily_revenue;
DROP POLICY IF EXISTS "Users can manage own unit cash" ON house_cash;
DROP POLICY IF EXISTS "Users can manage own unit expenses" ON expenses;
DROP POLICY IF EXISTS "Users can manage own unit events" ON events;
DROP POLICY IF EXISTS "Users can manage own unit event revenues" ON event_revenues;
DROP POLICY IF EXISTS "Users can manage own unit event expenses" ON event_expenses;

-- ============================================
-- 2. HELPER FUNCTION (RLS bypass-al)
-- ============================================

-- Szerepkör lekérdezése az aktuális userhez
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

-- Unit ID lekérdezése az aktuális userhez
CREATE OR REPLACE FUNCTION get_my_unit_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unit_id FROM user_profiles WHERE id = auth.uid();
$$;

-- ============================================
-- 3. ÚJ POLICY-K
-- ============================================

-- USER PROFILES
-- Mindenki láthatja a saját profilját
CREATE POLICY "Own profile access" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- Adminok láthatják az összes profilt
CREATE POLICY "Admin full access to profiles" ON user_profiles
  FOR ALL USING (get_my_role() = 'admin');

-- UNITS
-- Mindenki láthatja az összes egységet (nem titkos adat)
CREATE POLICY "Everyone can view units" ON units
  FOR SELECT USING (true);

-- Csak adminok módosíthatnak
CREATE POLICY "Admin manage units" ON units
  FOR ALL USING (get_my_role() = 'admin');

-- DAILY REVENUE
CREATE POLICY "View own unit revenue" ON daily_revenue
  FOR SELECT USING (
    get_my_role() = 'admin' OR unit_id = get_my_unit_id()
  );

CREATE POLICY "Insert own unit revenue" ON daily_revenue
  FOR INSERT WITH CHECK (
    get_my_role() = 'admin' OR unit_id = get_my_unit_id()
  );

CREATE POLICY "Update own unit revenue" ON daily_revenue
  FOR UPDATE USING (
    get_my_role() = 'admin' OR unit_id = get_my_unit_id()
  );

CREATE POLICY "Admin delete revenue" ON daily_revenue
  FOR DELETE USING (get_my_role() = 'admin');

-- HOUSE CASH
CREATE POLICY "Manage own unit cash" ON house_cash
  FOR ALL USING (
    get_my_role() = 'admin' OR unit_id = get_my_unit_id()
  );

-- EXPENSES
CREATE POLICY "Manage own unit expenses" ON expenses
  FOR ALL USING (
    get_my_role() = 'admin' OR unit_id = get_my_unit_id()
  );

-- EVENTS
CREATE POLICY "Manage own unit events" ON events
  FOR ALL USING (
    get_my_role() = 'admin' OR get_my_role() = 'events' OR unit_id = get_my_unit_id()
  );

-- EVENT REVENUES
CREATE POLICY "Manage own unit event revenues" ON event_revenues
  FOR ALL USING (
    get_my_role() = 'admin' OR get_my_role() = 'events' OR unit_id = get_my_unit_id()
  );

-- EVENT EXPENSES
CREATE POLICY "Manage own unit event expenses" ON event_expenses
  FOR ALL USING (
    get_my_role() = 'admin' OR get_my_role() = 'events' OR unit_id = get_my_unit_id()
  );

-- ============================================
-- KÉSZ! Most már működnie kell.
-- ============================================
