-- Allow super users to customise SDG / Sector / Location profile pages.
-- These entities are fixed standards (no editable base table), so per-profile
-- overrides live alongside the existing banner in profile_banners. Name & code
-- stay fixed; description/color/icon override the standard defaults when set.

ALTER TABLE profile_banners ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE profile_banners ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE profile_banners ADD COLUMN IF NOT EXISTS icon TEXT;

COMMENT ON COLUMN profile_banners.description IS 'Optional super-user description override for this profile (falls back to the standard default when null).';
COMMENT ON COLUMN profile_banners.color IS 'Optional theme color override (hex). Falls back to the standard/palette color when null.';
COMMENT ON COLUMN profile_banners.icon IS 'Optional lucide-react icon key override. Falls back to the standard icon when null.';
