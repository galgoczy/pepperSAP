-- Contacts & Sales CRM Schema
-- For company contacts and sales pipeline management

-- =============================================================================
-- COMPANIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'customer' CHECK (type IN ('customer', 'supplier', 'both')),
  supplier_category TEXT CHECK (supplier_category IN (
    'vegetables', 'bakery', 'eggs', 'meat', 'game', 'fish',
    'softdrinks', 'alcohol', 'mixed'
  )),

  -- Contact info
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_number TEXT,

  -- Our contact person
  our_contact_id UUID REFERENCES user_profiles(id),

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);
CREATE INDEX IF NOT EXISTS idx_companies_supplier_category ON companies(supplier_category);
CREATE INDEX IF NOT EXISTS idx_companies_our_contact ON companies(our_contact_id);

-- =============================================================================
-- COMPANY CONTACTS TABLE (Contact persons within companies)
-- =============================================================================
CREATE TABLE IF NOT EXISTS company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Contact info
  name TEXT NOT NULL,
  title TEXT,                          -- Job title / position
  phone TEXT,
  email TEXT,

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_company_contacts_company ON company_contacts(company_id);

-- =============================================================================
-- SALES EVENTS TABLE (CRM activities)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Event info
  event_type TEXT NOT NULL CHECK (event_type IN (
    'call', 'email', 'meeting', 'inquiry', 'offer',
    'contract', 'delivery', 'followup', 'complaint'
  )),
  event_date DATE NOT NULL,

  -- Our contact person who handled this
  our_contact_id UUID REFERENCES user_profiles(id),

  -- Priority / Importance
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN (
    'normal',    -- ! Hétköznapi
    'notable',   -- !! Említésre méltó
    'high',      -- !!! Kiemelt
    'followup'   -- !!!U Utókövetés igényel
  )),

  -- Financial data (for offers, contracts, deliveries)
  amount DECIMAL(12,2),
  currency TEXT DEFAULT 'HUF',

  -- Probability (for offers only)
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_sales_events_company ON sales_events(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_events_type ON sales_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sales_events_date ON sales_events(event_date);
CREATE INDEX IF NOT EXISTS idx_sales_events_priority ON sales_events(priority);
CREATE INDEX IF NOT EXISTS idx_sales_events_our_contact ON sales_events(our_contact_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_events ENABLE ROW LEVEL SECURITY;

-- Companies: admin can do everything, others can read
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (true);

CREATE POLICY "companies_admin" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Company contacts: admin can do everything, others can read
CREATE POLICY "company_contacts_select" ON company_contacts
  FOR SELECT USING (true);

CREATE POLICY "company_contacts_admin" ON company_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sales events: admin can do everything, others can read
CREATE POLICY "sales_events_select" ON sales_events
  FOR SELECT USING (true);

CREATE POLICY "sales_events_admin" ON sales_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE companies IS 'Companies (customers and suppliers)';
COMMENT ON TABLE company_contacts IS 'Contact persons within companies';
COMMENT ON TABLE sales_events IS 'Sales CRM events and activities';

COMMENT ON COLUMN companies.type IS 'customer = ügyfél, supplier = beszállító, both = mindkettő';
COMMENT ON COLUMN companies.supplier_category IS 'Only for suppliers: what they supply';
COMMENT ON COLUMN sales_events.priority IS 'normal=!, notable=!!, high=!!!, followup=!!!U (needs follow-up)';
COMMENT ON COLUMN sales_events.probability IS 'Only for offers: chance of winning (0-100%)';
