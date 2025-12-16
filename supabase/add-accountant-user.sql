-- Create accountant user
-- Note: You need to first create the user in Supabase Auth, then run this migration

-- Get the user ID from auth.users after creating the user
-- The user should be created with email: konyveles@pepperhouse.hu

-- Example: After creating the user in Supabase Auth, run:
-- INSERT INTO user_profiles (id, email, role)
-- VALUES (
--   '<user_id_from_auth>',
--   'konyveles@pepperhouse.hu',
--   'accountant'
-- );

-- If the user already exists in auth.users, you can insert directly:
DO $$
DECLARE
  accountant_user_id UUID;
BEGIN
  -- Check if user exists in auth.users
  SELECT id INTO accountant_user_id
  FROM auth.users
  WHERE email = 'konyveles@pepperhouse.hu';

  IF accountant_user_id IS NOT NULL THEN
    -- Insert or update user profile
    INSERT INTO user_profiles (id, email, role)
    VALUES (accountant_user_id, 'konyveles@pepperhouse.hu', 'accountant')
    ON CONFLICT (id) DO UPDATE
    SET role = 'accountant';

    RAISE NOTICE 'Accountant user profile created/updated for konyveles@pepperhouse.hu';
  ELSE
    RAISE NOTICE 'User konyveles@pepperhouse.hu not found in auth.users. Please create the user first in Supabase Auth.';
  END IF;
END $$;

-- Add comment documenting the accountant role
COMMENT ON COLUMN user_profiles.role IS 'User role: admin (full access), unit (daily entries), events (event management), accountant (read-only cash register reports)';
