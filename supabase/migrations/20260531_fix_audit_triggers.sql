-- Fix the audit log: the original 20260209_audit_log migration attaches
-- triggers to tables that don't exist in this database (deals, companies,
-- budget_entries, documents). Creating a trigger on a missing table raises an
-- error that aborts the whole script, so the audit_trigger_func() and the
-- triggers may never have been created -> audit_log stays empty.
--
-- This migration is defensive and idempotent: it (re)creates the function and
-- attaches the trigger ONLY to tables that actually exist, so it can never
-- abort on a missing table.

-- 1. (Re)create the generic audit trigger function.
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
  current_user_id := auth.uid();

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
    changed_cols := ARRAY[]::TEXT[];
    FOR col_name IN SELECT jsonb_object_keys(old_json)
    LOOP
      IF old_json->col_name IS DISTINCT FROM new_json->col_name THEN
        changed_cols := array_append(changed_cols, col_name);
      END IF;
    END LOOP;

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

-- 2. Attach the trigger to every existing table of interest (skip missing ones).
DO $$
DECLARE
  t TEXT;
  audited_tables TEXT[] := ARRAY[
    'daily_revenue', 'cash_register_revenue', 'house_cash', 'expenses',
    'efo_payments', 'wage_payments', 'events', 'event_revenues', 'event_expenses',
    'protocol_items', 'user_profiles', 'units', 'cash_registers',
    'workspace_messages', 'opening_balance_revisions'
  ];
BEGIN
  FOREACH t IN ARRAY audited_tables
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$I ON %1$I;', t);
      EXECUTE format(
        'CREATE TRIGGER audit_%1$I AFTER INSERT OR UPDATE OR DELETE ON %1$I FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();',
        t
      );
    END IF;
  END LOOP;
END $$;
