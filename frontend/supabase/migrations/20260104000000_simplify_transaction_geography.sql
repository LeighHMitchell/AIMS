-- Migration: Simplify transaction-level geography to be IATI compliant
-- Created: 2026-01-04
-- Purpose: 
--   1. Add geography_level setting to activities table
--   2. Migrate data from JSONB arrays to single-value fields
--   3. Remove JSONB columns for recipient_countries and recipient_regions
--   4. Clean up related triggers and functions
--
-- IATI Standard: At transaction level, only ONE recipient-country OR ONE recipient-region is allowed

-- ============================================================================
-- Step 1: Add geography_level setting to activities table
-- ============================================================================
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS geography_level TEXT DEFAULT 'activity';

-- Add check constraint for valid values (idempotent - only add if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_geography_level'
  ) THEN
    ALTER TABLE activities
    ADD CONSTRAINT chk_geography_level 
    CHECK (geography_level IN ('activity', 'transaction'));
  END IF;
END $$;

COMMENT ON COLUMN activities.geography_level IS 'Specifies where geographic data is published: "activity" (countries/regions at activity level) or "transaction" (each transaction specifies its country/region). IATI requires consistency - if transaction-level, all transactions must have geography.';

-- ============================================================================
-- Step 2: Migrate existing transaction data from JSONB arrays to single fields
-- (Only runs if the JSONB columns still exist)
-- ============================================================================

DO $$
DECLARE
  countries_col_exists BOOLEAN;
  regions_col_exists BOOLEAN;
  countries_migrated INTEGER;
  regions_migrated INTEGER;
BEGIN
  -- Check if recipient_countries column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'recipient_countries'
  ) INTO countries_col_exists;
  
  -- Check if recipient_regions column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'recipient_regions'
  ) INTO regions_col_exists;
  
  -- Migrate countries if column exists
  IF countries_col_exists THEN
    EXECUTE '
      UPDATE transactions 
      SET recipient_country_code = (recipient_countries->0->>''code'')
      WHERE recipient_country_code IS NULL 
        AND recipient_countries IS NOT NULL 
        AND jsonb_array_length(recipient_countries) > 0
    ';
    RAISE NOTICE 'Migrated data from recipient_countries JSONB column';
  ELSE
    RAISE NOTICE 'recipient_countries column does not exist - skipping migration';
  END IF;
  
  -- Migrate regions if column exists
  IF regions_col_exists THEN
    EXECUTE '
      UPDATE transactions 
      SET 
        recipient_region_code = (recipient_regions->0->>''code''),
        recipient_region_vocab = COALESCE((recipient_regions->0->>''vocabulary''), ''1'')
      WHERE recipient_region_code IS NULL 
        AND recipient_regions IS NOT NULL 
        AND jsonb_array_length(recipient_regions) > 0
    ';
    RAISE NOTICE 'Migrated data from recipient_regions JSONB column';
  ELSE
    RAISE NOTICE 'recipient_regions column does not exist - skipping migration';
  END IF;
  
  -- Log current counts
  SELECT COUNT(*) INTO countries_migrated 
  FROM transactions 
  WHERE recipient_country_code IS NOT NULL;
  
  SELECT COUNT(*) INTO regions_migrated 
  FROM transactions 
  WHERE recipient_region_code IS NOT NULL;
  
  RAISE NOTICE 'Current state: % transactions with country codes, % with region codes', 
    countries_migrated, regions_migrated;
END $$;

-- ============================================================================
-- Step 3: Drop triggers that reference the JSONB columns
-- ============================================================================

DROP TRIGGER IF EXISTS validate_transaction_countries_trigger ON transactions;
DROP TRIGGER IF EXISTS validate_transaction_regions_trigger ON transactions;
DROP TRIGGER IF EXISTS validate_transaction_geography_trigger ON transactions;

-- ============================================================================
-- Step 4: Drop functions that were used by those triggers
-- ============================================================================

DROP FUNCTION IF EXISTS validate_transaction_country_percentages();
DROP FUNCTION IF EXISTS validate_transaction_region_percentages();
DROP FUNCTION IF EXISTS validate_transaction_geography();

-- ============================================================================
-- Step 5: Drop GIN indexes on the JSONB columns
-- ============================================================================

DROP INDEX IF EXISTS idx_transactions_countries_gin;
DROP INDEX IF EXISTS idx_transactions_regions_gin;

-- ============================================================================
-- Step 6: Drop the JSONB columns
-- ============================================================================

ALTER TABLE transactions 
DROP COLUMN IF EXISTS recipient_countries,
DROP COLUMN IF EXISTS recipient_regions;

-- ============================================================================
-- Step 7: Create new simplified validation function
-- ============================================================================

-- Validate that transaction has either country OR region, not both
CREATE OR REPLACE FUNCTION validate_transaction_geography_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if both country and region are specified (not allowed per IATI)
  IF NEW.recipient_country_code IS NOT NULL 
     AND NEW.recipient_country_code != ''
     AND NEW.recipient_region_code IS NOT NULL 
     AND NEW.recipient_region_code != '' THEN
    RAISE EXCEPTION 'Transaction cannot have both recipient_country_code and recipient_region_code. IATI Standard requires one OR the other.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the simplified trigger
DROP TRIGGER IF EXISTS validate_transaction_geography_simple_trigger ON transactions;
CREATE TRIGGER validate_transaction_geography_simple_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_geography_simple();

COMMENT ON FUNCTION validate_transaction_geography_simple() IS 'Ensures IATI compliance: transaction can have one country OR one region, not both';

-- ============================================================================
-- Step 8: Add index for common query patterns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_recipient_country ON transactions(recipient_country_code) 
WHERE recipient_country_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_recipient_region ON transactions(recipient_region_code) 
WHERE recipient_region_code IS NOT NULL;

-- ============================================================================
-- Log completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Simplified transaction geography to IATI-compliant single-value fields';
  RAISE NOTICE '- Added geography_level column to activities table';
  RAISE NOTICE '- Migrated data from JSONB arrays to single-value fields';
  RAISE NOTICE '- Removed recipient_countries and recipient_regions JSONB columns';
  RAISE NOTICE '- Updated validation to enforce one country OR one region per transaction';
END $$;
