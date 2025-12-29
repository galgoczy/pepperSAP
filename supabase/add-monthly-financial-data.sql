-- HAVI PÉNZÜGYI ADATOK SÉMA
-- Kézi bevitel és Excel importhoz
-- FONTOS: Futtasd MIUTÁN a schema-complete.sql már lefutott és létezik a units tábla!

-- ============================================
-- 1. HAVI PÉNZÜGYI ADATOK TÁBLA
-- ============================================

-- Ellenőrizzük, hogy a units tábla létezik-e
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'units') THEN
    RAISE EXCEPTION 'A units tábla nem létezik! Először futtasd a schema-complete.sql fájlt.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS monthly_financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Időszak
  year_month TEXT NOT NULL, -- Format: '2025-01'

  -- Egység vagy speciális kategória
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  category TEXT CHECK (category IN ('K0', 'K00', 'bank_costs')), -- Speciális kategóriák (unit_id NULL ha ez van)

  -- Kézi bevitelű mezők (admin tölti ki)
  paid_wages DECIMAL(12,2) DEFAULT 0,              -- Kifizetett bér
  wage_contributions DECIMAL(12,2) DEFAULT 0,      -- Bérjárulékok
  raw_material_distribution DECIMAL(12,2) DEFAULT 0, -- Nyersanyag disztribúció (+/-)
  wage_distribution DECIMAL(12,2) DEFAULT 0,       -- Bér disztribúció (+/-)
  subvention DECIMAL(12,2) DEFAULT 0,              -- Szubvenció (bevétel)
  k0_revenue DECIMAL(12,2) DEFAULT 0,              -- K0 bevétel (csak K0 kategóriánál)
  bank_costs_amount DECIMAL(12,2) DEFAULT 0,       -- Bankköltségek (csak bank_costs kategóriánál)

  -- Excel importból származó mezők
  transfer_expenses DECIMAL(12,2) DEFAULT 0,       -- Utalásos költségek
  equipment_expenses DECIMAL(12,2) DEFAULT 0,      -- Eszközbeszerzés/javítás
  rent_utilities DECIMAL(12,2) DEFAULT 0,          -- Bérlet - közmű

  -- Metaadatok
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Egy rekord per egység/kategória per hónap
  UNIQUE(year_month, unit_id),
  UNIQUE(year_month, category),

  -- Vagy unit_id VAGY category kell lennie, de nem mindkettő
  CHECK (
    (unit_id IS NOT NULL AND category IS NULL) OR
    (unit_id IS NULL AND category IS NOT NULL)
  )
);

-- Index a gyors lekérdezéshez
CREATE INDEX IF NOT EXISTS idx_monthly_financial_data_year_month
ON monthly_financial_data(year_month);

CREATE INDEX IF NOT EXISTS idx_monthly_financial_data_unit_id
ON monthly_financial_data(unit_id);

-- ============================================
-- 2. EXCEL IMPORT KONFIGURÁCIÓ TÁBLA
-- ============================================

CREATE TABLE IF NOT EXISTS excel_import_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SharePoint file info
  file_path TEXT NOT NULL,          -- Teljes elérési út a SharePoint-on
  sheet_name TEXT NOT NULL,         -- Munkalap neve

  -- Adattípus amit importál
  data_type TEXT NOT NULL CHECK (data_type IN (
    'transfer_expenses',     -- Utalásos költségek
    'equipment_expenses',    -- Eszközbeszerzés/javítás
    'rent_utilities',        -- Bérlet - közmű
    'k0_expenses',           -- K0 költségek
    'k00_expenses'           -- K00 költségek
  )),

  -- Mapping konfiguráció (JSON formátumban)
  -- Pl.: {"month_row": 1, "unit_column": "A", "data_start_row": 2}
  mapping_config JSONB NOT NULL DEFAULT '{}',

  -- Státusz
  is_active BOOLEAN DEFAULT true,
  last_import_at TIMESTAMPTZ,
  last_import_status TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE monthly_financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_import_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage monthly financial data" ON monthly_financial_data;
DROP POLICY IF EXISTS "Users can view monthly financial data" ON monthly_financial_data;
DROP POLICY IF EXISTS "Admins can manage excel import config" ON excel_import_config;

-- Monthly financial data policies
CREATE POLICY "Admins can manage monthly financial data"
ON monthly_financial_data
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view monthly financial data"
ON monthly_financial_data
FOR SELECT
TO authenticated
USING (true);

-- Excel import config policies (admin only)
CREATE POLICY "Admins can manage excel import config"
ON excel_import_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- 4. UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_monthly_financial_data_updated_at ON monthly_financial_data;
CREATE TRIGGER update_monthly_financial_data_updated_at
    BEFORE UPDATE ON monthly_financial_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_excel_import_config_updated_at ON excel_import_config;
CREATE TRIGGER update_excel_import_config_updated_at
    BEFORE UPDATE ON excel_import_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. INITIAL DATA - Speciális kategóriák
-- ============================================

-- Megjegyzés: A speciális kategóriák (K0, K00, bankköltségek)
-- automatikusan létrejönnek amikor az admin először rögzít adatot
