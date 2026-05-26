-- ============================================
-- CASH MANAGEMENT TABLES
-- Házipénztár rendszer
-- ============================================

-- Cash Transfers between units/central
-- Átutalások egységek és központ között
CREATE TABLE IF NOT EXISTS cash_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source (who sends)
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('unit', 'events', 'central')),
  source_unit_id UUID REFERENCES units(id) ON DELETE SET NULL,

  -- Destination (who receives)
  destination_type VARCHAR(20) NOT NULL CHECK (destination_type IN ('unit', 'events', 'central')),
  destination_unit_id UUID REFERENCES units(id) ON DELETE SET NULL,

  -- Transfer details
  amount DECIMAL(12, 2) NOT NULL,
  original_amount DECIMAL(12, 2), -- Original amount before modification
  transfer_type VARCHAR(20) DEFAULT 'cash' CHECK (transfer_type IN ('cash', 'reserve')),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Status workflow: pending -> approved/modified/cancelled
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'modified', 'cancelled')),

  -- Metadata
  notes TEXT,
  initiated_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints: source and destination must be different
  CONSTRAINT different_source_dest CHECK (
    NOT (source_type = destination_type AND source_unit_id IS NOT DISTINCT FROM destination_unit_id)
  )
);

-- Central Payments (admin only - withdrawals from central cash/reserve)
-- Központi kifizetések
CREATE TABLE IF NOT EXISTS central_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Payment type determines which balance it affects
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('cash', 'reserve')),
  -- cash = from official cash (with invoice)
  -- reserve = from reserve (without invoice)

  -- Invoice details (optional for reserve payments)
  supplier_name TEXT,
  invoice_number TEXT,
  item_description TEXT,

  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash Revisions (admin only - record discrepancies between physical and calculated)
-- Revíziók - amikor nem stimmel a számított és a tényleges összeg
CREATE TABLE IF NOT EXISTS cash_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  revision_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Revision type
  revision_type VARCHAR(20) NOT NULL CHECK (revision_type IN ('cash', 'reserve')),

  -- The discrepancy amount (can be positive or negative)
  -- Positive = found more money than calculated
  -- Negative = found less money than calculated
  discrepancy_amount DECIMAL(12, 2) NOT NULL,

  -- Optional breakdown
  calculated_amount DECIMAL(12, 2), -- What the system calculated
  physical_amount DECIMAL(12, 2),   -- What was physically counted

  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash Pockets (admin only - temporary cash allocations)
-- Zsebek - ideiglenes készpénz elkülönítések
CREATE TABLE IF NOT EXISTS cash_pockets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Original amount when pocket was created
  initial_amount DECIMAL(12, 2) NOT NULL,

  -- Current remaining amount (updated on partial returns)
  current_amount DECIMAL(12, 2) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),

  -- Informational date (no strict enforcement)
  expected_return_date DATE,

  created_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pocket Transactions (for tracking partial returns)
-- Zseb tranzakciók - részleges visszafizetések követése
CREATE TABLE IF NOT EXISTS pocket_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  pocket_id UUID NOT NULL REFERENCES cash_pockets(id) ON DELETE CASCADE,

  -- Amount: positive = money taken out, negative = money returned
  amount DECIMAL(12, 2) NOT NULL,

  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('initial', 'withdrawal', 'return', 'close')),

  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cash_transfers_source ON cash_transfers(source_type, source_unit_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_destination ON cash_transfers(destination_type, destination_unit_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_status ON cash_transfers(status);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_date ON cash_transfers(transfer_date);

CREATE INDEX IF NOT EXISTS idx_central_payments_date ON central_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_central_payments_type ON central_payments(payment_type);

CREATE INDEX IF NOT EXISTS idx_cash_revisions_date ON cash_revisions(revision_date);

CREATE INDEX IF NOT EXISTS idx_cash_pockets_status ON cash_pockets(status);
CREATE INDEX IF NOT EXISTS idx_pocket_transactions_pocket ON pocket_transactions(pocket_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_pockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pocket_transactions ENABLE ROW LEVEL SECURITY;

-- Transfers: users can see their unit's transfers, admins see all
DROP POLICY IF EXISTS "Users can view their transfers" ON cash_transfers;
CREATE POLICY "Users can view their transfers" ON cash_transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'admin'
        OR user_profiles.unit_id = source_unit_id
        OR user_profiles.unit_id = destination_unit_id
      )
    )
  );

DROP POLICY IF EXISTS "Users can create transfers from their unit" ON cash_transfers;
CREATE POLICY "Users can create transfers from their unit" ON cash_transfers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.unit_id = source_unit_id)
    )
  );

DROP POLICY IF EXISTS "Users can update transfers they receive or admin" ON cash_transfers;
CREATE POLICY "Users can update transfers they receive or admin" ON cash_transfers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'admin'
        OR user_profiles.unit_id = destination_unit_id
      )
    )
  );

-- Central payments, revisions, pockets: admin only
DROP POLICY IF EXISTS "Admins can manage central_payments" ON central_payments;
CREATE POLICY "Admins can manage central_payments" ON central_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can manage cash_revisions" ON cash_revisions;
CREATE POLICY "Admins can manage cash_revisions" ON cash_revisions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can manage cash_pockets" ON cash_pockets;
CREATE POLICY "Admins can manage cash_pockets" ON cash_pockets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can manage pocket_transactions" ON pocket_transactions;
CREATE POLICY "Admins can manage pocket_transactions" ON pocket_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_cash_transfers_updated_at ON cash_transfers;
CREATE TRIGGER update_cash_transfers_updated_at BEFORE UPDATE
ON cash_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_central_payments_updated_at ON central_payments;
CREATE TRIGGER update_central_payments_updated_at BEFORE UPDATE
ON central_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cash_pockets_updated_at ON cash_pockets;
CREATE TRIGGER update_cash_pockets_updated_at BEFORE UPDATE
ON cash_pockets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
