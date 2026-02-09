-- Support tickets table for bug reporting and feedback (A11 requirement)
-- Created: 2026-02-09

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reporter info
  user_id UUID REFERENCES auth.users(id),
  reporter_name TEXT NOT NULL,
  reporter_email TEXT,

  -- Ticket details
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'bug', -- bug, feature, question, other
  severity TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, critical

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'new', -- new, in_progress, resolved, closed
  assigned_to UUID REFERENCES auth.users(id),

  -- Resolution
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,

  -- Metadata
  browser_info TEXT,
  page_url TEXT,
  screenshot_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at DESC);

-- RLS policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update tickets
CREATE POLICY "Admins can update tickets" ON support_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- Comments
COMMENT ON TABLE support_tickets IS 'Support tickets for bug reporting and user feedback (DIMOP A11 requirement)';
COMMENT ON COLUMN support_tickets.category IS 'bug, feature, question, other';
COMMENT ON COLUMN support_tickets.severity IS 'low, normal, high, critical';
COMMENT ON COLUMN support_tickets.status IS 'new, in_progress, resolved, closed';
