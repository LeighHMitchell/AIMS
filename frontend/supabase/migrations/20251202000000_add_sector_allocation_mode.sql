-- Add sector_allocation_mode column to activities table
-- This determines whether sector breakdown is managed at activity level (default) or transaction level

-- Add the column with default 'activity'
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS sector_allocation_mode TEXT NOT NULL DEFAULT 'activity';

-- Add check constraint for valid values (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_sector_allocation_mode'
    AND table_name = 'activities'
  ) THEN
    ALTER TABLE activities 
    ADD CONSTRAINT check_sector_allocation_mode 
    CHECK (sector_allocation_mode IN ('activity', 'transaction'));
  END IF;
END $$;

-- Add comment explaining the column
COMMENT ON COLUMN activities.sector_allocation_mode IS 
  'Determines whether sector breakdown is managed at activity level (default) or transaction level. When ''activity'', all transactions inherit the activity sector breakdown. When ''transaction'', sectors are edited per-transaction.';

-- Create index for potential filtering
CREATE INDEX IF NOT EXISTS idx_activities_sector_allocation_mode ON activities(sector_allocation_mode);

-- Set mode based on existing data (only if transaction_sector_lines table exists):
-- If activity has transaction_sector_lines data, set to 'transaction'
-- Otherwise keep as 'activity' (default)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'transaction_sector_lines'
  ) THEN
    UPDATE activities a
    SET sector_allocation_mode = 'transaction'
    WHERE EXISTS (
      SELECT 1 
      FROM transactions t
      JOIN transaction_sector_lines tsl ON t.uuid = tsl.transaction_id
      WHERE t.activity_id = a.id 
      AND tsl.deleted_at IS NULL
    );
  END IF;
END $$;


