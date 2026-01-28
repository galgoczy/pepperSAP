-- Teszt admin felhasználó létrehozása
-- Ez a script email/jelszó alapú bejelentkezést tesz lehetővé O365 nélkül

-- 1. Először hozd létre a felhasználót a Supabase Dashboard-on:
--    Authentication → Users → Add user → Create new user
--    Email: admin@test.local
--    Password: TestAdmin123!
--    Email confirmed: ON (pipáld be!)
--
--    FONTOS: Jegyezd fel a létrehozott user UUID-ját!

-- 2. Majd futtasd ezt a scriptet a user_profiles táblához
--    (cseréld ki a 'PASTE_USER_UUID_HERE' részt a valódi UUID-ra)

-- Ha már tudod az UUID-t:
/*
INSERT INTO user_profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    'PASTE_USER_UUID_HERE'::uuid,  -- <- IDE írd be a Supabase-ből kapott UUID-t
    'admin@test.local',
    'Teszt Admin',
    'admin',
    true,
    NOW(),
    NOW()
);
*/

-- ALTERNATÍV MEGOLDÁS: Ha van már admin user, egyszerűen adj hozzá egy újat
-- a meglévő auth rendszeren keresztül

-- Ellenőrzés - listázd a meglévő adminokat:
SELECT id, email, full_name, role, is_active
FROM user_profiles
WHERE role = 'admin';
