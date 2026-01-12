-- Add banner_position and logo_scale columns to organizations table
-- These enable repositioning and zooming of organization banner images and logos

-- Banner position: Y position percentage (0-100) for banner image cropping
-- 0=top, 50=center (default), 100=bottom
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS banner_position INTEGER DEFAULT 50;

-- Logo scale: Scale percentage (50-150) for logo zoom
-- 100=original size (default), <100=zoom out, >100=zoom in
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_scale INTEGER DEFAULT 100;

-- Add comments for documentation
COMMENT ON COLUMN organizations.banner_position IS 'Y position percentage (0-100) for banner image cropping. 0=top, 50=center, 100=bottom';
COMMENT ON COLUMN organizations.logo_scale IS 'Scale percentage (50-150) for logo zoom. 100=original size, <100=zoom out, >100=zoom in';
