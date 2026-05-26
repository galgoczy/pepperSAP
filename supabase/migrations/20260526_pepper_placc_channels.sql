-- Add sürgős! and hiány! channels to Pepper Placc (workspace)
-- These channels are visible to everyone (channel_type = 'common')

INSERT INTO workspace_channels (name, slug, description, channel_type)
VALUES
  ('sürgős!', 'surgos', 'Sürgős közlemények és értesítések', 'common'),
  ('hiány!', 'hiany', 'Hiányzó termékek és készlet jelzések', 'common')
ON CONFLICT (slug) DO NOTHING;
