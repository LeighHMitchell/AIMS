-- Add latitude/longitude columns to working_group_meetings for map-based location pinning
ALTER TABLE working_group_meetings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE working_group_meetings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Index for spatial queries if needed later
CREATE INDEX IF NOT EXISTS idx_wg_meetings_coords ON working_group_meetings(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
