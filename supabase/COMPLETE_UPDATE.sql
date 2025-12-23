-- =============================================================================
-- PEPPER HOUSE - TELJES SQL FRISSÍTÉS
-- Futtasd ezt a Supabase SQL Editor-ban
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. MICROSOFT TOKENS TÁBLA FRISSÍTÉSE (ha még nincs)
-- -----------------------------------------------------------------------------
ALTER TABLE microsoft_tokens
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id);

ALTER TABLE microsoft_tokens
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- -----------------------------------------------------------------------------
-- 2. CONTACTS & SALES TÁBLÁK
-- -----------------------------------------------------------------------------

-- Companies (Cégek - ügyfelek és beszállítók)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'customer' CHECK (type IN ('customer', 'supplier', 'both')),
  supplier_category TEXT CHECK (supplier_category IN (
    'vegetables', 'bakery', 'eggs', 'meat', 'game', 'fish',
    'softdrinks', 'alcohol', 'mixed'
  )),
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_number TEXT,
  our_contact_id UUID REFERENCES user_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company contacts (Kontaktszemélyek)
CREATE TABLE IF NOT EXISTS company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales events (CRM események)
CREATE TABLE IF NOT EXISTS sales_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'call', 'email', 'meeting', 'inquiry', 'offer',
    'contract', 'delivery', 'followup', 'complaint'
  )),
  event_date DATE NOT NULL,
  our_contact_id UUID REFERENCES user_profiles(id),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN (
    'normal', 'notable', 'high', 'followup'
  )),
  amount DECIMAL(12,2),
  currency TEXT DEFAULT 'HUF',
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);
CREATE INDEX IF NOT EXISTS idx_companies_supplier_category ON companies(supplier_category);
CREATE INDEX IF NOT EXISTS idx_company_contacts_company ON company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_events_company ON sales_events(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_events_type ON sales_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sales_events_priority ON sales_events(priority);

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

-- Companies RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select" ON companies;
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "companies_admin" ON companies;
CREATE POLICY "companies_admin" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Company contacts RLS
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_contacts_select" ON company_contacts;
CREATE POLICY "company_contacts_select" ON company_contacts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "company_contacts_admin" ON company_contacts;
CREATE POLICY "company_contacts_admin" ON company_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sales events RLS
ALTER TABLE sales_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_events_select" ON sales_events;
CREATE POLICY "sales_events_select" ON sales_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "sales_events_admin" ON sales_events;
CREATE POLICY "sales_events_admin" ON sales_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 4. USER PROFILES RLS FRISSÍTÉS (INSERT engedélyezés OAuth-hoz)
-- -----------------------------------------------------------------------------

-- Engedélyezd, hogy az auth.uid() felhasználó létrehozhassa a saját profilját
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
CREATE POLICY "user_profiles_insert_own" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. KOMMENTEK
-- -----------------------------------------------------------------------------
COMMENT ON TABLE companies IS 'Cégek (ügyfelek és beszállítók)';
COMMENT ON TABLE company_contacts IS 'Céges kontaktszemélyek';
COMMENT ON TABLE sales_events IS 'Sales/CRM események';

COMMENT ON COLUMN companies.type IS 'customer=ügyfél, supplier=beszállító, both=mindkettő';
COMMENT ON COLUMN sales_events.priority IS 'normal=!, notable=!!, high=!!!, followup=!!!U';
COMMENT ON COLUMN sales_events.probability IS 'Csak ajánlatoknál: esély % (0-100)';
