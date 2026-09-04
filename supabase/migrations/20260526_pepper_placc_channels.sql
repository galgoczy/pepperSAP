-- Add sürgős! and hiány! channels to Pepper Placc (workspace)
-- These channels are visible to everyone (channel_type = 'common')
--
-- NOTE: This migration is written defensively to tolerate schema drift across
-- deployments of workspace_channels:
--   * Some deployments predate the `slug` column.
--   * The `channel_type` column may be a TEXT column (per the original
--     migration) OR a dedicated enum type named `channel_type`.
-- It is also idempotent so it can be re-run after earlier versions of this
-- migration. Untyped string literals are used in the SELECT lists so Postgres
-- coerces them to the target column's actual type (text or enum) on insert.

-- 1. Ensure the slug column exists (older deployments were created without it).
ALTER TABLE workspace_channels ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Insert each channel only if it is not already present (matched by name,
--    since a UNIQUE constraint on slug may not exist on older deployments).
INSERT INTO workspace_channels (name, slug, description, channel_type)
SELECT 'sürgős!', 'surgos', 'Sürgős közlemények és értesítések', 'common'
WHERE NOT EXISTS (SELECT 1 FROM workspace_channels c WHERE c.name = 'sürgős!');

INSERT INTO workspace_channels (name, slug, description, channel_type)
SELECT 'hiány!', 'hiany', 'Hiányzó termékek és készlet jelzések', 'common'
WHERE NOT EXISTS (SELECT 1 FROM workspace_channels c WHERE c.name = 'hiány!');

-- 3. Backfill the slug for rows that may have been inserted earlier without one
--    (e.g. by a previous slug-less version of this migration).
UPDATE workspace_channels SET slug = 'surgos' WHERE name = 'sürgős!' AND (slug IS NULL OR slug = '');
UPDATE workspace_channels SET slug = 'hiany'  WHERE name = 'hiány!'  AND (slug IS NULL OR slug = '');
