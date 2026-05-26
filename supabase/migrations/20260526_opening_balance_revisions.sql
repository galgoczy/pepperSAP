-- Create table for opening balance revision requests
CREATE TABLE IF NOT EXISTS opening_balance_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

  -- The date for which the opening balance should be revised
  target_date DATE NOT NULL,

  -- Current and proposed values
  current_opening_balance DECIMAL(12,2) NOT NULL,
  proposed_opening_balance DECIMAL(12,2) NOT NULL,

  -- Reason for revision
  reason TEXT NOT NULL,

  -- Status: pending, approved, rejected
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Admin response
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  -- Metadata
  requested_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opening_balance_revisions_unit_date ON opening_balance_revisions(unit_id, target_date);
CREATE INDEX IF NOT EXISTS idx_opening_balance_revisions_status ON opening_balance_revisions(status);

-- RLS
ALTER TABLE opening_balance_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view revisions for their unit" ON opening_balance_revisions;
CREATE POLICY "Users can view revisions for their unit" ON opening_balance_revisions
  FOR SELECT USING (
    unit_id IN (SELECT unit_id FROM user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can request revisions for their unit" ON opening_balance_revisions;
CREATE POLICY "Users can request revisions for their unit" ON opening_balance_revisions
  FOR INSERT WITH CHECK (
    unit_id IN (SELECT unit_id FROM user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Only admins can update revisions" ON opening_balance_revisions;
CREATE POLICY "Only admins can update revisions" ON opening_balance_revisions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
