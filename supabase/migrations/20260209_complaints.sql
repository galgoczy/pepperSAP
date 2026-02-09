-- Complaints/Reklamáció management (B/1. requirement: Reklamációkezelés)
-- Created: 2026-02-09

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Related entities
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES company_contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,

  -- Complaint details
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  complaint_type TEXT NOT NULL DEFAULT 'service', -- service, product, delivery, billing, other
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'new', -- new, in_progress, escalated, resolved, closed
  assigned_to UUID REFERENCES auth.users(id),
  escalated_to UUID REFERENCES auth.users(id),
  escalation_reason TEXT,

  -- Resolution
  resolution TEXT,
  resolution_type TEXT, -- refund, replacement, credit, apology, other
  resolution_amount DECIMAL(12, 2),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  -- Customer satisfaction
  customer_satisfied BOOLEAN,
  satisfaction_notes TEXT,

  -- Metadata
  source TEXT DEFAULT 'direct', -- direct, phone, email, web, social
  reference_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Complaint history/timeline
CREATE TABLE IF NOT EXISTS complaint_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,

  -- Action details
  action_type TEXT NOT NULL, -- status_change, note_added, escalated, assigned, resolved
  old_value TEXT,
  new_value TEXT,
  notes TEXT,

  -- Who and when
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_priority ON complaints(priority);
CREATE INDEX idx_complaints_company ON complaints(company_id);
CREATE INDEX idx_complaints_assigned ON complaints(assigned_to);
CREATE INDEX idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX idx_complaint_history_complaint ON complaint_history(complaint_id);

-- RLS policies
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_history ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with complaints
CREATE POLICY "Admins full access to complaints" ON complaints
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins full access to complaint_history" ON complaint_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_complaints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_complaints_updated_at();

-- Function to auto-generate reference number
CREATE OR REPLACE FUNCTION generate_complaint_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'RK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
      LPAD(CAST(FLOOR(RANDOM() * 10000) AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complaint_reference_trigger
  BEFORE INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION generate_complaint_reference();

-- Function to log complaint history
CREATE OR REPLACE FUNCTION log_complaint_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO complaint_history (complaint_id, action_type, new_value, created_by)
    VALUES (NEW.id, 'created', 'Reklamáció létrehozva', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, created_by)
      VALUES (NEW.id, 'status_change', OLD.status, NEW.status, auth.uid());
    END IF;
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO complaint_history (complaint_id, action_type, old_value, new_value, notes, created_by)
      VALUES (NEW.id, 'assigned', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT, 'Felelős megváltoztatva', auth.uid());
    END IF;
    -- Log escalation
    IF OLD.escalated_to IS NULL AND NEW.escalated_to IS NOT NULL THEN
      INSERT INTO complaint_history (complaint_id, action_type, new_value, notes, created_by)
      VALUES (NEW.id, 'escalated', NEW.escalated_to::TEXT, NEW.escalation_reason, auth.uid());
    END IF;
    -- Log resolution
    IF OLD.resolution IS NULL AND NEW.resolution IS NOT NULL THEN
      INSERT INTO complaint_history (complaint_id, action_type, new_value, notes, created_by)
      VALUES (NEW.id, 'resolved', NEW.resolution_type, NEW.resolution, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER complaint_history_trigger
  AFTER INSERT OR UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION log_complaint_history();

-- Audit trigger
DROP TRIGGER IF EXISTS audit_complaints ON complaints;
CREATE TRIGGER audit_complaints
  AFTER INSERT OR UPDATE OR DELETE ON complaints
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Comments
COMMENT ON TABLE complaints IS 'Customer complaints/reklamációk (DIMOP B/1. Reklamációkezelés)';
COMMENT ON TABLE complaint_history IS 'Timeline of complaint actions';
COMMENT ON COLUMN complaints.reference_number IS 'Auto-generated reference like RK-20260209-1234';
