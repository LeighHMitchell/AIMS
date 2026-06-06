-- Allow tag profile pages to have banner images + appearance overrides.
-- Extends the profile_banners.profile_type CHECK constraint to include 'tag'.
-- Tag color/icon/description overrides reuse the existing profile_banners
-- description/color/icon columns (added in 20260603000004), keyed by
-- profile_type='tag', profile_id=<tags.id UUID>. The tags table itself is
-- unchanged. Idempotent: safe to re-run.

ALTER TABLE profile_banners DROP CONSTRAINT IF EXISTS profile_banners_profile_type_check;

ALTER TABLE profile_banners
  ADD CONSTRAINT profile_banners_profile_type_check
  CHECK (profile_type IN ('sdg', 'sector', 'location', 'policy_marker', 'tag'));

COMMENT ON COLUMN profile_banners.profile_type IS 'Type of profile: sdg, sector, location, policy_marker, or tag';
COMMENT ON COLUMN profile_banners.profile_id IS 'Profile identifier: SDG number, sector code, location pcode, policy marker id, or tag id';
