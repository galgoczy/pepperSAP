-- Új egységek hozzáadása
-- Futtatandó a Supabase SQL Editor-ban

INSERT INTO units (name, type, is_active) VALUES
  ('Knorr 86', 'restaurant', true),
  ('Knorr 69', 'restaurant', true),
  ('KTI', 'restaurant', true),
  ('Államkincstár', 'restaurant', true)
ON CONFLICT (name) DO NOTHING;
