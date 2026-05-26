-- Add sürgős! and hiány! channels to Pepper Placc (workspace)
-- These channels are visible to everyone (channel_type = 'common')

INSERT INTO workspace_channels (name, description, channel_type)
VALUES
  ('sürgős!', 'Sürgős közlemények és értesítések', 'common'),
  ('hiány!', 'Hiányzó termékek és készlet jelzések', 'common')
ON CONFLICT DO NOTHING;
