-- ================================================================
-- PLANNED DISBURSEMENTS: ADD IATI TEXT REFERENCE FIELDS
-- ================================================================
-- This migration adds IATI text reference fields for organizations
-- to maintain full IATI compliance while keeping FK relationships
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PLANNED DISBURSEMENTS IATI REFERENCE FIELDS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Add type column (IATI @type attribute: 1=Original, 2=Revised)
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'planned_disbursements' AND column_name = 'type'
    ) THEN
      ALTER TABLE planned_disbursements
      ADD COLUMN type VARCHAR(2) DEFAULT '1';
      RAISE NOTICE '✅ Added column: type';
    ELSE
      RAISE NOTICE 'ℹ️  Column type already exists';
    END IF;
  END;

  -- Add provider_org_ref column (IATI organization identifier)
  BEGIN
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
  END;

  -- Add provider_org_type column (IATI organization type code)
  BEGIN
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
  END;

  -- Add provider_org_activity_id column (IATI provider-activity-id attribute)
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'planned_disbursements' AND column_name = 'provider_org_activity_id'
    ) THEN
      ALTER TABLE planned_disbursements
      ADD COLUMN provider_org_activity_id VARCHAR(255);
      RAISE NOTICE '✅ Added column: provider_org_activity_id';
    ELSE
      RAISE NOTICE 'ℹ️  Column provider_org_activity_id already exists';
    END IF;
  END;

  -- Add receiver_org_ref column (IATI organization identifier)
  BEGIN
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
  END;

  -- Add receiver_org_type column (IATI organization type code)
  BEGIN
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
  END;

  -- Add receiver_org_activity_id column (IATI receiver-activity-id attribute)
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'planned_disbursements' AND column_name = 'receiver_org_activity_id'
    ) THEN
      ALTER TABLE planned_disbursements
      ADD COLUMN receiver_org_activity_id VARCHAR(255);
      RAISE NOTICE '✅ Added column: receiver_org_activity_id';
    ELSE
      RAISE NOTICE 'ℹ️  Column receiver_org_activity_id already exists';
    END IF;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ All columns added successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Add indexes for performance
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_planned_disbursements_provider_org_ref') THEN
    CREATE INDEX idx_planned_disbursements_provider_org_ref ON planned_disbursements(provider_org_ref);
    RAISE NOTICE '✅ Created index: idx_planned_disbursements_provider_org_ref';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_planned_disbursements_receiver_org_ref') THEN
    CREATE INDEX idx_planned_disbursements_receiver_org_ref ON planned_disbursements(receiver_org_ref);
    RAISE NOTICE '✅ Created index: idx_planned_disbursements_receiver_org_ref';
  END IF;
END $$;

-- Add documentation comments
COMMENT ON COLUMN planned_disbursements.type IS
  'IATI @type attribute: 1=Original, 2=Revised';

COMMENT ON COLUMN planned_disbursements.provider_org_ref IS
  'IATI organization identifier for the provider organization (e.g., AA-AAA-123456789)';

COMMENT ON COLUMN planned_disbursements.provider_org_type IS
  'IATI organization type code for the provider (e.g., 10=Government, 21=NGO, etc.)';

COMMENT ON COLUMN planned_disbursements.provider_org_activity_id IS
  'IATI @provider-activity-id attribute - links to a specific activity of the provider organization';

COMMENT ON COLUMN planned_disbursements.receiver_org_ref IS
  'IATI organization identifier for the receiver organization (e.g., BB-BBB-123456789)';

COMMENT ON COLUMN planned_disbursements.receiver_org_type IS
  'IATI organization type code for the receiver (e.g., 23=Private Sector, 10=Government, etc.)';

COMMENT ON COLUMN planned_disbursements.receiver_org_activity_id IS
  'IATI @receiver-activity-id attribute - links to a specific activity of the receiver organization';

-- Verification Query
SELECT
  'Planned Disbursements Schema Check' as summary,
  COUNT(*) as total_disbursements,
  COUNT(type) as with_type,
  COUNT(provider_org_ref) as with_provider_ref,
  COUNT(provider_org_type) as with_provider_type,
  COUNT(provider_org_activity_id) as with_provider_activity,
  COUNT(receiver_org_ref) as with_receiver_ref,
  COUNT(receiver_org_type) as with_receiver_type,
  COUNT(receiver_org_activity_id) as with_receiver_activity
FROM planned_disbursements;
