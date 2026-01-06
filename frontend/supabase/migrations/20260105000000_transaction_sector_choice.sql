-- Migration: Add per-transaction sector choice
-- Created: 2026-01-05
-- Purpose: 
--   1. Add use_activity_sectors flag to transactions table
--   2. Add sector_export_level setting to activities table
--   3. Migrate existing transactions with sectors to use custom (non-inherited) mode
--
-- IATI Standard: Sectors can be published at activity OR transaction level

-- ============================================================================
-- Step 1: Add use_activity_sectors flag to transactions table
-- ============================================================================
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS use_activity_sectors BOOLEAN DEFAULT true;

COMMENT ON COLUMN transactions.use_activity_sectors IS 'If true, transaction inherits sectors from activity level. If false, transaction has its own custom sector allocations.';

-- ============================================================================
-- Step 2: Add sector_export_level setting to activities table
-- ============================================================================
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS sector_export_level TEXT DEFAULT 'activity';

-- Add check constraint for valid values (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_sector_export_level'
  ) THEN
    ALTER TABLE activities
    ADD CONSTRAINT chk_sector_export_level 
    CHECK (sector_export_level IN ('activity', 'transaction'));
  END IF;
END $$;

COMMENT ON COLUMN activities.sector_export_level IS 'Specifies where sector data is exported in IATI XML: "activity" (sectors as activity-level elements) or "transaction" (sectors inside each transaction element). IATI requires consistency - must choose one or the other.';

-- ============================================================================
-- Step 3: Migrate existing transactions with custom sectors
-- ============================================================================
-- Set existing transactions that have sectors defined to use_activity_sectors = false
-- This preserves their custom allocations

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Check if sectors column exists and has data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'sectors'
  ) THEN
    UPDATE transactions 
    SET use_activity_sectors = false 
    WHERE sectors IS NOT NULL 
      AND sectors != '[]'::jsonb
      AND jsonb_array_length(sectors) > 0;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % existing transactions with custom sectors to use_activity_sectors = false', updated_count;
  ELSE
    RAISE NOTICE 'sectors column does not exist - skipping migration of existing data';
  END IF;
END $$;

-- ============================================================================
-- Step 4: Create index for common query patterns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_use_activity_sectors 
ON transactions(use_activity_sectors) 
WHERE use_activity_sectors = false;

-- ============================================================================
-- Log completion
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Per-transaction sector choice';
  RAISE NOTICE '- Added use_activity_sectors flag to transactions table';
  RAISE NOTICE '- Added sector_export_level setting to activities table';
  RAISE NOTICE '- Migrated existing transactions with custom sectors';
END $$;
