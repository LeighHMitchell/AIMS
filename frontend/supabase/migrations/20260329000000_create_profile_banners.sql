-- Profile banners for SDG, Sector, and Location profile pages
CREATE TABLE IF NOT EXISTS profile_banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_type text NOT NULL CHECK (profile_type IN ('sdg', 'sector', 'location')),
  profile_id text NOT NULL,
  banner text,
  banner_position integer DEFAULT 50,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_type, profile_id)
);

COMMENT ON TABLE profile_banners IS 'Banner images for SDG, Sector, and Location profile pages';
COMMENT ON COLUMN profile_banners.profile_type IS 'Type of profile: sdg, sector, or location';
COMMENT ON COLUMN profile_banners.profile_id IS 'Profile identifier: SDG number, sector code, or location pcode';
COMMENT ON COLUMN profile_banners.banner IS 'Base64-encoded banner image';
COMMENT ON COLUMN profile_banners.banner_position IS 'Y position percentage (0-100) for banner image cropping';

ALTER TABLE profile_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON profile_banners
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON profile_banners
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON profile_banners
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
finacnial ab