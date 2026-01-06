-- Add banner_position column to activities table
-- This stores the Y position (0-100%) for banner image cropping

ALTER TABLE activities
ADD COLUMN IF NOT EXISTS banner_position INTEGER DEFAULT 50;

-- Add comment for documentation
COMMENT ON COLUMN activities.banner_position IS 'Y position percentage (0-100) for banner image cropping. 0=top, 50=center, 100=bottom';
