-- PEPPER HOUSE - Szín mező hozzáadása

-- Szín mező a daily_revenue táblához (megjelölés)
ALTER TABLE daily_revenue ADD COLUMN IF NOT EXISTS mark_color TEXT DEFAULT NULL;

-- Szín mező a house_cash táblához
ALTER TABLE house_cash ADD COLUMN IF NOT EXISTS mark_color TEXT DEFAULT NULL;

-- Szín mező az expenses táblához
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS mark_color TEXT DEFAULT NULL;

-- Engedélyezett színek: 'red', 'yellow', 'green', 'blue', 'purple', NULL (nincs szín)
