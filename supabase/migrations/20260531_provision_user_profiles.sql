-- =============================================================================
-- Felhasználói profilok kiépítése a fehérlista alapján (MS OAuth-barát).
-- Készült: 2026-05-31
--
-- Háttér: a self-service profil-létrehozást a guard_profile_privileges trigger
-- privilegizált (admin/accountant) szerepnél tiltja, ezért az admin/accountant
-- userek MS-belépés után "Nincs hozzáférésed" hibát kapnak. Ez a migráció
-- adminként (a trigger admin-ágán átmenve, mert a SQL editor a táblatulajdonos
-- jogával fut és a get_my_role() itt nem 'admin', ezért IDEIGLENESEN kikapcsoljuk
-- a triggert a beszúrás idejére) hozza létre / állítja be a profilokat.
--
-- FONTOS: minden érintett user ELŐBB lépjen be egyszer Microsofttal, hogy
-- létrejöjjön az auth.users sora. Akinek nincs auth.users sora, azt a script
-- NOTICE-szal kihagyja - utána (belépés után) újra lefuttatható (idempotens).
-- =============================================================================

ALTER TABLE user_profiles DISABLE TRIGGER guard_profile_privileges;

DO $$
DECLARE
  rec RECORD;
  auth_id UUID;
  resolved_unit UUID;
  -- (email, role, unit_name) - a kód EMAIL_ROLE_MAP-jával egyezően.
  whitelist JSONB := '[
    {"email":"gergo@pepperhouse.hu","role":"admin","unit":null},
    {"email":"info@pepperhouse.hu","role":"admin","unit":null},
    {"email":"hr@pepperhouse.hu","role":"admin","unit":null},
    {"email":"iroda@pepperhouse.hu","role":"admin","unit":null},
    {"email":"penzugy@pepperhouse.hu","role":"admin","unit":null},
    {"email":"events@pepperhouse.hu","role":"events","unit":"Rendezvény Egység"},
    {"email":"rendezveny@pepperhouse.hu","role":"events","unit":"Rendezvény Egység"},
    {"email":"unit@pepperhouse.hu","role":"unit","unit":"Szentkirályi"},
    {"email":"szentkiralyi@pepperhouse.hu","role":"unit","unit":"Szentkirályi"},
    {"email":"knorr105@pepperhouse.hu","role":"unit","unit":"Knorr 105"},
    {"email":"knorr69@pepperhouse.hu","role":"unit","unit":"Knorr 69"},
    {"email":"knorr86@pepperhouse.hu","role":"unit","unit":"Knorr 86"},
    {"email":"kti@pepperhouse.hu","role":"unit","unit":"KTI"},
    {"email":"allamkincstar@pepperhouse.hu","role":"unit","unit":"Államkincstár"},
    {"email":"rsr@pepperhouse.hu","role":"unit","unit":"RSR"},
    {"email":"konyveles@pepperhouse.hu","role":"accountant","unit":null}
  ]'::jsonb;
BEGIN
  FOR rec IN
    SELECT * FROM jsonb_to_recordset(whitelist) AS x(email text, role text, unit text)
  LOOP
    SELECT id INTO auth_id FROM auth.users WHERE lower(email) = lower(rec.email);

    IF auth_id IS NULL THEN
      RAISE NOTICE 'KIHAGYVA: % - nincs auth.users sora (előbb lépjen be MS-sel).', rec.email;
      CONTINUE;
    END IF;

    resolved_unit := NULL;
    IF rec.unit IS NOT NULL THEN
      SELECT id INTO resolved_unit FROM units WHERE name = rec.unit;
      IF resolved_unit IS NULL THEN
        RAISE NOTICE 'FIGYELEM: % egység nem található (%), unit_id NULL marad.', rec.email, rec.unit;
      END IF;
    END IF;

    INSERT INTO user_profiles (id, full_name, role, unit_id)
    VALUES (auth_id, split_part(rec.email, '@', 1), rec.role, resolved_unit)
    ON CONFLICT (id) DO UPDATE
      SET role = EXCLUDED.role,
          unit_id = EXCLUDED.unit_id;

    RAISE NOTICE 'OK: % -> % (%).', rec.email, rec.role, COALESCE(rec.unit, '-');
  END LOOP;
END $$;

ALTER TABLE user_profiles ENABLE TRIGGER guard_profile_privileges;
