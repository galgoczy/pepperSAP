-- Workspace (Munkatér) - Internal communication module
-- Created: 2026-02-09

-- Channels table
CREATE TABLE IF NOT EXISTS workspace_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Channel type determines access
  -- common: everyone sees
  -- unit: only admin + specific unit
  -- events: only admin + events role
  -- leadership: only admins
  channel_type TEXT NOT NULL CHECK (channel_type IN ('common', 'unit', 'events', 'leadership')),

  -- For unit-specific channels
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,

  -- Settings
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS workspace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES workspace_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Message content
  content TEXT NOT NULL,

  -- Message type: text, link, task
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'link', 'task')),

  -- For link type
  link_url TEXT,
  link_title TEXT,

  -- For task type
  task_assignee_id UUID REFERENCES auth.users(id),
  task_due_date DATE,
  task_completed BOOLEAN DEFAULT false,
  task_completed_at TIMESTAMPTZ,
  task_completed_by UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- User notification preferences per channel
CREATE TABLE IF NOT EXISTS workspace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES workspace_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Notification settings
  notify_email BOOLEAN DEFAULT false,

  -- Last read timestamp for unread count
  last_read_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(channel_id, user_id)
);

-- Indexes
CREATE INDEX idx_workspace_messages_channel ON workspace_messages(channel_id);
CREATE INDEX idx_workspace_messages_created ON workspace_messages(created_at DESC);
CREATE INDEX idx_workspace_messages_user ON workspace_messages(user_id);
CREATE INDEX idx_workspace_messages_task_assignee ON workspace_messages(task_assignee_id) WHERE message_type = 'task';
CREATE INDEX idx_workspace_subscriptions_user ON workspace_subscriptions(user_id);

-- RLS policies
ALTER TABLE workspace_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_subscriptions ENABLE ROW LEVEL SECURITY;

-- Channel access policy
CREATE OR REPLACE FUNCTION can_access_channel(channel_row workspace_channels)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_unit_id UUID;
BEGIN
  -- Get user's role and unit
  SELECT role, unit_id INTO user_role, user_unit_id
  FROM user_profiles WHERE id = auth.uid();

  -- Admin can access all channels
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Common channels are accessible to everyone
  IF channel_row.channel_type = 'common' THEN
    RETURN true;
  END IF;

  -- Unit channels are accessible to that unit's members
  IF channel_row.channel_type = 'unit' AND channel_row.unit_id = user_unit_id THEN
    RETURN true;
  END IF;

  -- Events channel is accessible to events role
  IF channel_row.channel_type = 'events' AND user_role = 'events' THEN
    RETURN true;
  END IF;

  -- Leadership channel is only for admins (already checked above)
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Channels: users can see channels they have access to
CREATE POLICY "Users can view accessible channels" ON workspace_channels
  FOR SELECT USING (can_access_channel(workspace_channels));

-- Channels: only admins can create/modify
CREATE POLICY "Admins can manage channels" ON workspace_channels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Messages: users can see messages in accessible channels
CREATE POLICY "Users can view messages in accessible channels" ON workspace_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_channels c
      WHERE c.id = workspace_messages.channel_id
      AND can_access_channel(c)
    )
  );

-- Messages: users can post to accessible channels
CREATE POLICY "Users can post to accessible channels" ON workspace_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_channels c
      WHERE c.id = workspace_messages.channel_id
      AND can_access_channel(c)
    )
  );

-- Messages: users can update their own messages, admins can update any
CREATE POLICY "Users can update own messages" ON workspace_messages
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Subscriptions: users manage their own
CREATE POLICY "Users manage own subscriptions" ON workspace_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Admins can view all subscriptions (for sending notifications)
CREATE POLICY "Admins can view all subscriptions" ON workspace_subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Updated_at trigger for messages
CREATE OR REPLACE FUNCTION update_workspace_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_message_updated_at
  BEFORE UPDATE ON workspace_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_message_updated_at();

-- Auto-create subscriptions when channel is created
CREATE OR REPLACE FUNCTION auto_subscribe_to_channel()
RETURNS TRIGGER AS $$
BEGIN
  -- Subscribe all users who have access to the channel
  INSERT INTO workspace_subscriptions (channel_id, user_id, notify_email)
  SELECT NEW.id, up.id, false
  FROM user_profiles up
  WHERE
    -- Admins get all channels
    up.role = 'admin'
    -- Common channels for everyone
    OR NEW.channel_type = 'common'
    -- Unit channels for that unit
    OR (NEW.channel_type = 'unit' AND up.unit_id = NEW.unit_id)
    -- Events channel for events role
    OR (NEW.channel_type = 'events' AND up.role = 'events')
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_subscribe_channel
  AFTER INSERT ON workspace_channels
  FOR EACH ROW
  EXECUTE FUNCTION auto_subscribe_to_channel();

-- Insert default channels
INSERT INTO workspace_channels (name, slug, description, channel_type) VALUES
  ('Közös', 'kozos', 'Mindenki számára elérhető közös csatorna', 'common'),
  ('Vezetőség', 'vezetoseg', 'Vezetői megbeszélések és döntések', 'leadership')
ON CONFLICT (slug) DO NOTHING;

-- Insert unit-specific channels for each restaurant
INSERT INTO workspace_channels (name, slug, description, channel_type, unit_id)
SELECT
  u.name,
  LOWER(REPLACE(u.name, ' ', '-')),
  u.name || ' egység belső csatornája',
  'unit',
  u.id
FROM units u
WHERE u.type = 'restaurant' AND u.is_active = true
ON CONFLICT (slug) DO NOTHING;

-- Insert events channel
INSERT INTO workspace_channels (name, slug, description, channel_type, unit_id)
SELECT
  'Rendezvény',
  'rendezvenyek',
  'Rendezvény csapat belső csatornája',
  'events',
  u.id
FROM units u
WHERE u.type = 'events' AND u.is_active = true
LIMIT 1
ON CONFLICT (slug) DO NOTHING;

-- Audit trigger
DROP TRIGGER IF EXISTS audit_workspace_messages ON workspace_messages;
CREATE TRIGGER audit_workspace_messages
  AFTER INSERT OR UPDATE OR DELETE ON workspace_messages
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Comments
COMMENT ON TABLE workspace_channels IS 'Munkatér csatornák - belső kommunikáció';
COMMENT ON TABLE workspace_messages IS 'Munkatér üzenetek - szöveg, link vagy feladat';
COMMENT ON TABLE workspace_subscriptions IS 'Felhasználói feliratkozások csatornákra';
