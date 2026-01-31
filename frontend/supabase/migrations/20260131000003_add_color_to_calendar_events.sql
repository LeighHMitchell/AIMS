-- Add color column to calendar_events table for custom event colors
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#4c5568';

-- Add comment for documentation
COMMENT ON COLUMN calendar_events.color IS 'Custom hex color for the event (e.g., #dc2625)';
