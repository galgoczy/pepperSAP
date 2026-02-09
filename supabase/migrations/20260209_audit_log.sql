-- Audit log table for tracking data changes (A5 requirement)
-- Created: 2026-02-09

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL, -- UUID as text for flexibility
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE

  -- Who changed it
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_name TEXT,

  -- Change details
  old_data JSONB, -- NULL for INSERT
  new_data JSONB, -- NULL for DELETE
  changed_fields TEXT[], -- List of changed column names (for UPDATE)

  -- Context
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- RLS: Only admins can view audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  old_json JSONB;
  new_json JSONB;
  changed_cols TEXT[];
  col_name TEXT;
  current_user_id UUID;
  current_user_email TEXT;
  current_user_name TEXT;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();

  -- Try to get user email and name
  IF current_user_id IS NOT NULL THEN
    SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;
    SELECT full_name INTO current_user_name FROM user_profiles WHERE id = current_user_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);

    INSERT INTO audit_log (table_name, record_id, action, user_id, user_email, user_name, new_data)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', current_user_id, current_user_email, current_user_name, new_json);

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);

    -- Find changed columns
    changed_cols := ARRAY[]::TEXT[];
    FOR col_name IN SELECT jsonb_object_keys(old_json)
    LOOP
      IF old_json->col_name IS DISTINCT FROM new_json->col_name THEN
        changed_cols := array_append(changed_cols, col_name);
      END IF;
    END LOOP;

    -- Only log if something actually changed (excluding updated_at)
    IF array_length(changed_cols, 1) > 0 AND NOT (changed_cols = ARRAY['updated_at']) THEN
      INSERT INTO audit_log (table_name, record_id, action, user_id, user_email, user_name, old_data, new_data, changed_fields)
      VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', current_user_id, current_user_email, current_user_name, old_json, new_json, changed_cols);
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);

    INSERT INTO audit_log (table_name, record_id, action, user_id, user_email, user_name, old_data)
    VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', current_user_id, current_user_email, current_user_name, old_json);

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for main tables
-- Daily revenue
DROP TRIGGER IF EXISTS audit_daily_revenue ON daily_revenue;
CREATE TRIGGER audit_daily_revenue
  AFTER INSERT OR UPDATE OR DELETE ON daily_revenue
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Cash register revenue
DROP TRIGGER IF EXISTS audit_cash_register_revenue ON cash_register_revenue;
CREATE TRIGGER audit_cash_register_revenue
  AFTER INSERT OR UPDATE OR DELETE ON cash_register_revenue
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Expenses
DROP TRIGGER IF EXISTS audit_expenses ON expenses;
CREATE TRIGGER audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Deals
DROP TRIGGER IF EXISTS audit_deals ON deals;
CREATE TRIGGER audit_deals
  AFTER INSERT OR UPDATE OR DELETE ON deals
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Companies
DROP TRIGGER IF EXISTS audit_companies ON companies;
CREATE TRIGGER audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Budget entries
DROP TRIGGER IF EXISTS audit_budget_entries ON budget_entries;
CREATE TRIGGER audit_budget_entries
  AFTER INSERT OR UPDATE OR DELETE ON budget_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Events
DROP TRIGGER IF EXISTS audit_events ON events;
CREATE TRIGGER audit_events
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Documents
DROP TRIGGER IF EXISTS audit_documents ON documents;
CREATE TRIGGER audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- User profiles
DROP TRIGGER IF EXISTS audit_user_profiles ON user_profiles;
CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Units
DROP TRIGGER IF EXISTS audit_units ON units;
CREATE TRIGGER audit_units
  AFTER INSERT OR UPDATE OR DELETE ON units
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Comments
COMMENT ON TABLE audit_log IS 'Audit log for tracking all data changes (DIMOP A5 requirement)';
COMMENT ON COLUMN audit_log.action IS 'INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN audit_log.changed_fields IS 'List of column names that changed (UPDATE only)';
