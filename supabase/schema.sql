-- PEPPER HOUSE PÉNZÜGYI RENDSZER - ADATBÁZIS SÉMA
-- Supabase PostgreSQL

-- ============================================
-- 1. TÁBLÁK LÉTREHOZÁSA
-- ============================================

-- EGYSÉGEK
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('restaurant', 'events')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FELHASZNÁLÓK BŐVÍTÉSE (auth.users mellett)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'unit', 'events')),
  unit_id UUID REFERENCES units(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NAPI FORGALOM (Éttermi egységek)
CREATE TABLE IF NOT EXISTS daily_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Éttermi szoftver szerinti forgalom
  total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Pénztárgép forgalom ÁFA szerint
  vat_0_percent DECIMAL(12,2) DEFAULT 0,
  vat_5_percent DECIMAL(12,2) DEFAULT 0,
  vat_18_percent DECIMAL(12,2) DEFAULT 0,
  vat_27_percent DECIMAL(12,2) DEFAULT 0,
  tips DECIMAL(12,2) DEFAULT 0,

  -- Elütés
  discrepancy_amount DECIMAL(12,2) DEFAULT 0,
  discrepancy_currency TEXT DEFAULT 'HUF' CHECK (discrepancy_currency IN ('HUF', 'EUR')),
  discrepancy_note TEXT,

  -- Fizetési módok
  cash_payment DECIMAL(12,2) DEFAULT 0,
  card_payment DECIMAL(12,2) DEFAULT 0,
  szep_card_payment DECIMAL(12,2) DEFAULT 0,

  -- Bankkártya terminál
  terminal_card DECIMAL(12,2) DEFAULT 0,
  terminal_szep DECIMAL(12,2) DEFAULT 0,
  terminal_discrepancy_note TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(unit_id, date)
);

-- HÁZIPÉNZTÁR ÁLLÁS
CREATE TABLE IF NOT EXISTS house_cash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Váltópénz
  change_amount DECIMAL(12,2) DEFAULT 0,

  -- Hivatalos zseb
  official_daily_cash DECIMAL(12,2) DEFAULT 0,
  official_other_income DECIMAL(12,2) DEFAULT 0,
  official_cash_expenses DECIMAL(12,2) DEFAULT 0,
  official_employment_expenses DECIMAL(12,2) DEFAULT 0,
  official_total DECIMAL(12,2) DEFAULT 0,

  -- Egyéb zseb
  other_difference DECIMAL(12,2) DEFAULT 0,
  other_extra_income DECIMAL(12,2) DEFAULT 0,
  other_expenses DECIMAL(12,2) DEFAULT 0,
  other_total DECIMAL(12,2) DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(unit_id, date)
);

-- KIFIZETÉSEK (Éttermi egységek)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

  supplier_name TEXT NOT NULL,
  invoice_number TEXT,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'HUF' CHECK (currency IN ('HUF', 'EUR')),
  item_description TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'mol_card', 'clearing', 'transfer')),

  invoice_date DATE NOT NULL,
  payment_deadline DATE,
  fulfillment_date DATE,

  is_official BOOLEAN DEFAULT true,
  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RENDEZVÉNYEK/PROJEKTEK (Rendezvény egység)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('protocol', 'event', 'lunch_service', 'delivery', 'other')),
  event_date DATE NOT NULL,
  description TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RENDEZVÉNY BEVÉTELEK
CREATE TABLE IF NOT EXISTS event_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

  partner_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'HUF' CHECK (currency IN ('HUF', 'EUR')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'transfer')),

  invoice_date DATE NOT NULL,
  payment_deadline DATE,
  fulfillment_date DATE,

  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RENDEZVÉNY KÖLTSÉGEK
CREATE TABLE IF NOT EXISTS event_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

  supplier_name TEXT NOT NULL,
  invoice_number TEXT,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'HUF' CHECK (currency IN ('HUF', 'EUR')),
  item_description TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'mol_card', 'transfer', 'clearing')),

  invoice_date DATE NOT NULL,
  payment_deadline DATE,
  fulfillment_date DATE,

  is_official BOOLEAN DEFAULT true,
  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. INDEXEK
-- ============================================

CREATE INDEX IF NOT EXISTS idx_daily_revenue_unit_date ON daily_revenue(unit_id, date);
CREATE INDEX IF NOT EXISTS idx_house_cash_unit_date ON house_cash(unit_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_unit_date ON expenses(unit_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_events_unit_date ON events(unit_id, event_date);
CREATE INDEX IF NOT EXISTS idx_event_revenues_event ON event_revenues(event_id);
CREATE INDEX IF NOT EXISTS idx_event_expenses_event ON event_expenses(event_id);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_cash ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_expenses ENABLE ROW LEVEL SECURITY;

-- User Profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Units policies
CREATE POLICY "Users can view their unit" ON units
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.unit_id = units.id)
    )
  );

CREATE POLICY "Admins can manage units" ON units
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Daily Revenue policies
CREATE POLICY "Users can view own unit revenue" ON daily_revenue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.unit_id = daily_revenue.unit_id)
    )
  );

CREATE POLICY "Users can insert own unit revenue" ON daily_revenue
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.unit_id = daily_revenue.unit_id)
    )
  );

CREATE POLICY "Users can update own unit revenue" ON daily_revenue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.unit_id = daily_revenue.unit_id)
    )
  );

CREATE POLICY "Admins can delete revenue" ON daily_revenue
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- House Cash policies
CREATE POLICY "Users can manage own unit cash" ON house_cash
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.unit_id = house_cash.unit_id)
    )
  );

-- Expenses policies
CREATE POLICY "Users can manage own unit expenses" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.unit_id = expenses.unit_id)
    )
  );

-- Events policies
CREATE POLICY "Users can manage own unit events" ON events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.unit_id = events.unit_id)
    )
  );

-- Event Revenues policies
CREATE POLICY "Users can manage own unit event revenues" ON event_revenues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.unit_id = event_revenues.unit_id)
    )
  );

-- Event Expenses policies
CREATE POLICY "Users can manage own unit event expenses" ON event_expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.unit_id = event_expenses.unit_id)
    )
  );

-- ============================================
-- 4. KEZDETI ADATOK (SEED)
-- ============================================

-- Egységek létrehozása
INSERT INTO units (name, type) VALUES
  ('Központi Étterem', 'restaurant'),
  ('Második Helyszín', 'restaurant'),
  ('Rendezvény Egység', 'events')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. TRIGGEREK AZ UPDATED_AT MEZŐHÖZ
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE
ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE
ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_revenue_updated_at BEFORE UPDATE
ON daily_revenue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_house_cash_updated_at BEFORE UPDATE
ON house_cash FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE
ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE
ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_revenues_updated_at BEFORE UPDATE
ON event_revenues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_expenses_updated_at BEFORE UPDATE
ON event_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
