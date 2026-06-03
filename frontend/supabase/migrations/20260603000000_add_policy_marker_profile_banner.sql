-- Allow policy marker profile pages to have banner images.
-- Extends the profile_banners.profile_type CHECK constraint to include 'policy_marker'.

ALTER TABLE profile_banners DROP CONSTRAINT IF EXISTS profile_banners_profile_type_check;

ALTER TABLE profile_banners
  ADD CONSTRAINT profile_banners_profile_type_check
  CHECK (profile_type IN ('sdg', 'sector', 'location', 'policy_marker'));

COMMENT ON COLUMN profile_banners.profile_type IS 'Type of profile: sdg, sector, location, or policy_marker';
COMMENT ON COLUMN profile_banners.profile_id IS 'Profile identifier: SDG number, sector code, location pcode, or policy marker id';
