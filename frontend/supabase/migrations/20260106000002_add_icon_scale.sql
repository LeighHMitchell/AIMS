-- Add icon_scale column to activities table
-- This stores the zoom/scale level (50-150%) for icon/logo display

ALTER TABLE activities
ADD COLUMN IF NOT EXISTS icon_scale INTEGER DEFAULT 100;

-- Add comment for documentation
COMMENT ON COLUMN activities.icon_scale IS 'Scale percentage (50-150) for icon/logo zoom. 100=original size, <100=zoom out, >100=zoom in';
