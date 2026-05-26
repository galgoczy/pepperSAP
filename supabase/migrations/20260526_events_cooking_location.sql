-- Add cooking location to events
-- cooking_location_id references a restaurant unit where the event's food is prepared

-- First ensure Szentkirályi exists as a unit
INSERT INTO units (name, type, is_active) VALUES
  ('Szentkirályi', 'restaurant', true)
ON CONFLICT (name) DO NOTHING;

-- Add the cooking_location_id column
ALTER TABLE events
ADD COLUMN IF NOT EXISTS cooking_location_id uuid REFERENCES units(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_cooking_location ON events(cooking_location_id);

-- Comment for documentation
COMMENT ON COLUMN events.cooking_location_id IS 'The restaurant unit where food is prepared for this event (Főzés helye)';
