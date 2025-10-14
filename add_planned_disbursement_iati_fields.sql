-- ================================================================
-- PLANNED DISBURSEMENTS: ADD IATI-COMPLIANT FIELDS
-- ================================================================
-- This migration adds missing IATI fields to the planned_disbursements table
-- Safe to run multiple times (uses IF NOT EXISTS patterns)
-- Run this in Supabase SQL Editor or via psql
-- ================================================================

-- Add missing IATI columns
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PLANNED DISBURSEMENTS IATI MIGRATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Add type column (IATI @type attribute: 1=Original, 2=Revised)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planned_disbursements' AND column_name = 'type'
  ) THEN
    ALTER TABLE planned_disbursements 
    ADD COLUMN type VARCHAR(1) CHECK (type IN ('1', '2'));
    RAISE NOTICE '✅ Added column: type';
  ELSE
    RAISE NOTICE 'ℹ️  Column type already exists';
  END IF;

  -- Add provider organization IATI fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planned_disbursements' AND column_name = 'provider_org_ref'
  ) THEN
    ALTER TABLE planned_disbursements 
    ADD COLUMN provider_org_ref VARCHAR(255);
    RAISE NOTICE '✅ Added column: provider_org_ref';
  ELSE
    RAISE NOTICE 'ℹ️  Column provider_org_ref already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planned_disbursements' AND column_name = 'provider_org_type'
  ) THEN
    ALTER TABLE planned_disbursements 
    ADD COLUMN provider_org_type VARCHAR(10);
    RAISE NOTICE '✅ Added column: provider_org_type';
  ELSE
    RAISE NOTICE 'ℹ️  Column provider_org_type already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planned_disbursements' AND column_name = 'provider_activity_id'
  ) THEN
    ALTER TABLE planned_disbursements 
    ADD COLUMN provider_activity_id VARCHAR(255);
    RAISE NOTICE '✅ Added column: provider_activity_id';
  ELSE
    RAISE NOTICE 'ℹ️  Column provider_activity_id already exists';
  END IF;

  -- Add receiver organization IATI fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planned_disbursements' AND column_name = 'receiver_org_ref'
  ) THEN
    ALTER TABLE planned_disbursements 
    ADD COLUMN receiver_org_ref VARCHAR(255);
    RAISE NOTICE '✅ Added column: receiver_org_ref';
  ELSE
    RAISE NOTICE 'ℹ️  Column receiver_org_ref already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planned_disbursements' AND column_name = 'receiver_org_type'
  ) THEN
    ALTER TABLE planned_disbursements 
    ADD COLUMN receiver_org_type VARCHAR(10);
    RAISE NOTICE '✅ Added column: receiver_org_type';
  ELSE
    RAISE NOTICE 'ℹ️  Column receiver_org_type already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planned_disbursements' AND column_name = 'receiver_activity_id'
  ) THEN
    ALTER TABLE planned_disbursements 
    ADD COLUMN receiver_activity_id VARCHAR(255);
    RAISE NOTICE '✅ Added column: receiver_activity_id';
  ELSE
    RAISE NOTICE 'ℹ️  Column receiver_activity_id already exists';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Add indexes for performance
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_planned_disbursements_type') THEN
    CREATE INDEX idx_planned_disbursements_type ON planned_disbursements(type);
    RAISE NOTICE '✅ Created index: idx_planned_disbursements_type';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_planned_disbursements_type already exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_planned_disbursements_provider_org_ref') THEN
    CREATE INDEX idx_planned_disbursements_provider_org_ref ON planned_disbursements(provider_org_ref);
    RAISE NOTICE '✅ Created index: idx_planned_disbursements_provider_org_ref';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_planned_disbursements_provider_org_ref already exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_planned_disbursements_receiver_org_ref') THEN
    CREATE INDEX idx_planned_disbursements_receiver_org_ref ON planned_disbursements(receiver_org_ref);
    RAISE NOTICE '✅ Created index: idx_planned_disbursements_receiver_org_ref';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_planned_disbursements_receiver_org_ref already exists';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN planned_disbursements.type IS 
  'IATI BudgetType codelist: 1=Original, 2=Revised';

COMMENT ON COLUMN planned_disbursements.provider_org_ref IS 
  'IATI provider-org @ref attribute (organization identifier, e.g., IATI Org ID)';

COMMENT ON COLUMN planned_disbursements.provider_org_type IS 
  'IATI provider-org @type attribute (OrganisationType codelist, e.g., 10=Government)';

COMMENT ON COLUMN planned_disbursements.provider_activity_id IS 
  'IATI provider-org @provider-activity-id attribute (IATI identifier of providers activity)';

COMMENT ON COLUMN planned_disbursements.receiver_org_ref IS 
  'IATI receiver-org @ref attribute (organization identifier)';

COMMENT ON COLUMN planned_disbursements.receiver_org_type IS 
  'IATI receiver-org @type attribute (OrganisationType codelist)';

COMMENT ON COLUMN planned_disbursements.receiver_activity_id IS 
  'IATI receiver-org @receiver-activity-id attribute (IATI identifier of receivers activity)';

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Run the following queries to verify:';
  RAISE NOTICE '1. Check column count';
  RAISE NOTICE '2. Review updated schema';
END $$;

-- Verification Query 1: Check that all new columns were added
SELECT 
  'planned_disbursements' as table_name,
  COUNT(*) as total_columns,
  COUNT(*) FILTER (WHERE column_name IN ('type', 'provider_org_ref', 'provider_org_type', 'provider_activity_id', 'receiver_org_ref', 'receiver_org_type', 'receiver_activity_id')) as iati_columns_count
FROM information_schema.columns
WHERE table_name = 'planned_disbursements'
GROUP BY table_name;

-- Verification Query 2: Show the updated schema
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'planned_disbursements'
ORDER BY ordinal_position;
