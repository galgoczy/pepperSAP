-- =============================================================================
-- user_profiles: minden bejelentkezett felhasználó láthassa a profilokat
-- Készült: 2026-06-05
--
-- A Pepper Placc (workspace) üzeneteinél a szerző neve a user_profiles-ből jön.
-- Eddig egy nem-admin felhasználó csak a SAJÁT profilját láthatta (RLS), ezért
-- mások üzeneteinél "Ismeretlen" jelent meg. Ez a policy engedélyezi minden
-- bejelentkezett felhasználónak az összes profil olvasását (név/megjelenítés,
-- @említések, hozzárendelések). A meglévő admin/own policy-k megmaradnak
-- (a SELECT policy-k OR kapcsolatban állnak).
-- Idempotens.
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated can view all profiles" ON user_profiles;
CREATE POLICY "Authenticated can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);
