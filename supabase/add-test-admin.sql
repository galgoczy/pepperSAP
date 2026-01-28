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

-- Ha már tudod az UUID-t (HELYES STRUKTÚRA):
INSERT INTO user_profiles (
    id,
    full_name,
    role,
    unit_id,
    created_at,
    updated_at
) VALUES (
    'd6be58a1-a0cb-49c6-b7ce-05d85fe3e2dd'::uuid,
    'Teszt Admin',
    'admin',
    NULL,
    NOW(),
    NOW()
);

-- ALTERNATÍV MEGOLDÁS: Ha van már admin user, egyszerűen adj hozzá egy újat
-- a meglévő auth rendszeren keresztül

-- Ellenőrzés - listázd a meglévő adminokat:
SELECT id, email, full_name, role, is_active
FROM user_profiles
WHERE role = 'admin';
