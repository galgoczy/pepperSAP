-- Add sürgős! and hiány! channels to Pepper Placc (workspace)
-- These channels are visible to everyone (channel_type = 'common')
--
-- NOTE: The live workspace_channels table predates the `slug` column in some
-- deployments (the original 20260209_workspace migration was applied before
-- `slug` was introduced). This migration is therefore written defensively so
-- it succeeds whether or not the column already exists, and is idempotent so
-- it can be re-run safely after earlier slug-less versions of this migration.

-- 1. Ensure the slug column exists (older deployments were created without it).
ALTER TABLE workspace_channels ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Insert the channels only if they are not already present (matched by name,
--    since a UNIQUE constraint on slug may not exist on older deployments).
INSERT INTO workspace_channels (name, slug, description, channel_type)
SELECT v.name, v.slug, v.description, v.channel_type
FROM (VALUES
  ('sürgős!', 'surgos', 'Sürgős közlemények és értesítések', 'common'),
  ('hiány!', 'hiany', 'Hiányzó termékek és készlet jelzések', 'common')
) AS v(name, slug, description, channel_type)
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_channels c WHERE c.name = v.name
);

-- 3. Backfill the slug for rows that may have been inserted earlier without one
--    (e.g. by a previous slug-less version of this migration).
UPDATE workspace_channels SET slug = 'surgos' WHERE name = 'sürgős!' AND (slug IS NULL OR slug = '');
UPDATE workspace_channels SET slug = 'hiany'  WHERE name = 'hiány!'  AND (slug IS NULL OR slug = '');
