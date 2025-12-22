-- Document Management Schema
-- For Microsoft 365 / SharePoint integration

-- Document topics (categories)
CREATE TABLE IF NOT EXISTS document_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default topics
INSERT INTO document_topics (name, description, sort_order) VALUES
  ('Számlák', 'Bejövő és kimenő számlák', 1),
  ('Szerződések', 'Szerződések és megállapodások', 2),
  ('HR dokumentumok', 'Munkaügyi dokumentumok', 3),
  ('Hatósági', 'Hatósági engedélyek, dokumentumok', 4),
  ('Pénzügy', 'Pénzügyi kimutatások, jelentések', 5),
  ('Egyéb', 'Egyéb dokumentumok', 99)
ON CONFLICT (name) DO NOTHING;

-- Documents metadata table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,

  -- SharePoint/OneDrive references
  sharepoint_item_id TEXT,              -- Microsoft Graph item ID
  sharepoint_drive_id TEXT,             -- Drive ID
  sharepoint_path TEXT,                 -- Full path in SharePoint
  sharepoint_web_url TEXT,              -- Direct link to file

  -- File info
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,

  -- Metadata
  document_date DATE,                   -- User-specified date (optional)
  topic_id UUID REFERENCES document_topics(id),
  unit_id UUID REFERENCES units(id),    -- Optional unit association
  tags TEXT[] DEFAULT '{}',             -- Array of tags
  year INTEGER,                         -- Extracted from folder or document_date

  -- Access control
  access_level TEXT DEFAULT 'admin' CHECK (access_level IN ('admin', 'all')),

  -- Sync status
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'error', 'deleted')),
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,

  -- Audit
  uploaded_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_topic ON documents(topic_id);
CREATE INDEX IF NOT EXISTS idx_documents_unit ON documents(unit_id);
CREATE INDEX IF NOT EXISTS idx_documents_year ON documents(year);
CREATE INDEX IF NOT EXISTS idx_documents_access ON documents(access_level);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);

-- Microsoft tokens storage (encrypted, for the designated storage account)
CREATE TABLE IF NOT EXISTS microsoft_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,      -- info@pepperhouse.hu
  access_token TEXT,                     -- Encrypted
  refresh_token TEXT,                    -- Encrypted
  expires_at TIMESTAMPTZ,
  drive_id TEXT,                         -- The user's OneDrive/SharePoint drive ID
  is_storage_account BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE document_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE microsoft_tokens ENABLE ROW LEVEL SECURITY;

-- Topics: everyone can read
CREATE POLICY "document_topics_select" ON document_topics
  FOR SELECT USING (true);

-- Topics: only admin can modify
CREATE POLICY "document_topics_admin" ON document_topics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Documents: access based on access_level
CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (
    access_level = 'all'
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Documents: only admin can insert/update/delete
CREATE POLICY "documents_admin" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Microsoft tokens: only admin
CREATE POLICY "microsoft_tokens_admin" ON microsoft_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE document_topics IS 'Document categories/topics for organization';
COMMENT ON TABLE documents IS 'Document metadata with SharePoint references';
COMMENT ON TABLE microsoft_tokens IS 'Microsoft OAuth tokens for SharePoint access';
COMMENT ON COLUMN documents.access_level IS 'admin = only admins can see, all = everyone can see';
COMMENT ON COLUMN documents.sharepoint_path IS 'Path like: /Számlák/2024/invoice.pdf';
