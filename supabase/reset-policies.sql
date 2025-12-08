-- PEPPER HOUSE - POLICY RESET SCRIPT
-- Futtasd ezt ha "policy already exists" hibát kapsz

-- ============================================
-- POLICY-K TÖRLÉSE
-- ============================================

-- User Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Units policies
DROP POLICY IF EXISTS "Users can view their unit" ON units;
DROP POLICY IF EXISTS "Admins can manage units" ON units;

-- Daily Revenue policies
DROP POLICY IF EXISTS "Users can view own unit revenue" ON daily_revenue;
DROP POLICY IF EXISTS "Users can insert own unit revenue" ON daily_revenue;
DROP POLICY IF EXISTS "Users can update own unit revenue" ON daily_revenue;
DROP POLICY IF EXISTS "Admins can delete revenue" ON daily_revenue;

-- House Cash policies
DROP POLICY IF EXISTS "Users can manage own unit cash" ON house_cash;

-- Expenses policies
DROP POLICY IF EXISTS "Users can manage own unit expenses" ON expenses;

-- Events policies
DROP POLICY IF EXISTS "Users can manage own unit events" ON events;

-- Event Revenues policies
DROP POLICY IF EXISTS "Users can manage own unit event revenues" ON event_revenues;

-- Event Expenses policies
DROP POLICY IF EXISTS "Users can manage own unit event expenses" ON event_expenses;

-- ============================================
-- TRIGGEREK TÖRLÉSE (ha újra kell futtatni)
-- ============================================

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_units_updated_at ON units;
DROP TRIGGER IF EXISTS update_daily_revenue_updated_at ON daily_revenue;
DROP TRIGGER IF EXISTS update_house_cash_updated_at ON house_cash;
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_event_revenues_updated_at ON event_revenues;
DROP TRIGGER IF EXISTS update_event_expenses_updated_at ON event_expenses;

-- ============================================
-- MOST FUTTASD A schema.sql-T ÚJRA!
-- ============================================
