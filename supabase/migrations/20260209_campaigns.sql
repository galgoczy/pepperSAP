-- Campaign management tables (B/1. requirement: Kampánymenedzsment)
-- Created: 2026-02-09

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'email', -- email, phone, event, other

  -- Target audience
  target_audience JSONB, -- Filters for selecting companies/contacts
  target_count INTEGER DEFAULT 0, -- Number of targets

  -- Timeline
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, paused, completed, cancelled

  -- Ownership
  owner_id UUID REFERENCES auth.users(id),

  -- Results tracking
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  responded_count INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Campaign targets (links to companies/contacts)
CREATE TABLE IF NOT EXISTS campaign_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Target can be company or contact
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES company_contacts(id) ON DELETE CASCADE,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, opened, responded, converted, bounced, unsubscribed
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,

  -- Response details
  response_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one of company_id or contact_id must be set
  CONSTRAINT campaign_target_check CHECK (company_id IS NOT NULL OR contact_id IS NOT NULL)
);

-- Campaign results/feedback log
CREATE TABLE IF NOT EXISTS campaign_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  target_id UUID REFERENCES campaign_targets(id) ON DELETE CASCADE,

  -- Result details
  result_type TEXT NOT NULL, -- sent, opened, clicked, responded, converted, bounced, unsubscribed
  result_data JSONB, -- Additional data (e.g., click URL, response text)
  notes TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_owner ON campaigns(owner_id);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaign_targets_campaign ON campaign_targets(campaign_id);
CREATE INDEX idx_campaign_targets_company ON campaign_targets(company_id);
CREATE INDEX idx_campaign_targets_contact ON campaign_targets(contact_id);
CREATE INDEX idx_campaign_targets_status ON campaign_targets(status);
CREATE INDEX idx_campaign_results_campaign ON campaign_results(campaign_id);

-- RLS policies
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_results ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to campaigns" ON campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins full access to campaign_targets" ON campaign_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins full access to campaign_results" ON campaign_results
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Function to update campaign stats
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns SET
    target_count = (SELECT COUNT(*) FROM campaign_targets WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)),
    sent_count = (SELECT COUNT(*) FROM campaign_targets WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) AND sent_at IS NOT NULL),
    opened_count = (SELECT COUNT(*) FROM campaign_targets WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) AND opened_at IS NOT NULL),
    responded_count = (SELECT COUNT(*) FROM campaign_targets WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) AND responded_at IS NOT NULL),
    converted_count = (SELECT COUNT(*) FROM campaign_targets WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) AND converted_at IS NOT NULL)
  WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON campaign_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_stats();

-- Audit triggers
DROP TRIGGER IF EXISTS audit_campaigns ON campaigns;
CREATE TRIGGER audit_campaigns
  AFTER INSERT OR UPDATE OR DELETE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Comments
COMMENT ON TABLE campaigns IS 'Marketing campaigns (DIMOP B/1. Kampánymenedzsment)';
COMMENT ON TABLE campaign_targets IS 'Companies/contacts targeted by campaigns';
COMMENT ON TABLE campaign_results IS 'Feedback and results from campaign activities';
