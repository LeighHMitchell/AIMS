-- ================================================================
-- PLANNED DISBURSEMENTS: ADD ACTIVITY LINKING
-- ================================================================
-- This migration adds foreign key columns to link planned disbursements
-- to actual activities in the system, enabling rich UI display and
-- better data relationships while maintaining IATI text fields
-- ================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PLANNED DISBURSEMENTS ACTIVITY LINKING';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Add provider_activity_uuid column
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'planned_disbursements' AND column_name = 'provider_activity_uuid'
    ) THEN
      ALTER TABLE planned_disbursements 
      ADD COLUMN provider_activity_uuid UUID REFERENCES activities(id) ON DELETE SET NULL;
      RAISE NOTICE '✅ Added column: provider_activity_uuid';
    ELSE
      RAISE NOTICE 'ℹ️  Column provider_activity_uuid already exists';
    END IF;
  END;

  -- Add receiver_activity_uuid column
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'planned_disbursements' AND column_name = 'receiver_activity_uuid'
    ) THEN
      ALTER TABLE planned_disbursements 
      ADD COLUMN receiver_activity_uuid UUID REFERENCES activities(id) ON DELETE SET NULL;
      RAISE NOTICE '✅ Added column: receiver_activity_uuid';
    ELSE
      RAISE NOTICE 'ℹ️  Column receiver_activity_uuid already exists';
    END IF;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Columns added successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Add indexes for performance
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_planned_disbursements_provider_activity') THEN
    CREATE INDEX idx_planned_disbursements_provider_activity ON planned_disbursements(provider_activity_uuid);
    RAISE NOTICE '✅ Created index: idx_planned_disbursements_provider_activity';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_planned_disbursements_provider_activity already exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_planned_disbursements_receiver_activity') THEN
    CREATE INDEX idx_planned_disbursements_receiver_activity ON planned_disbursements(receiver_activity_uuid);
    RAISE NOTICE '✅ Created index: idx_planned_disbursements_receiver_activity';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_planned_disbursements_receiver_activity already exists';
  END IF;
END $$;

-- Backfill existing records by matching IATI identifiers
DO $$
DECLARE
  provider_updated INTEGER;
  receiver_updated INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BACKFILLING EXISTING RECORDS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Update provider activities
  UPDATE planned_disbursements pd
  SET provider_activity_uuid = a.id
  FROM activities a
  WHERE pd.provider_activity_id IS NOT NULL
    AND pd.provider_activity_id != ''
    AND a.iati_identifier = pd.provider_activity_id
    AND pd.provider_activity_uuid IS NULL;
  
  GET DIAGNOSTICS provider_updated = ROW_COUNT;
  RAISE NOTICE '✅ Linked % planned disbursements to provider activities', provider_updated;

  -- Update receiver activities
  UPDATE planned_disbursements pd
  SET receiver_activity_uuid = a.id
  FROM activities a
  WHERE pd.receiver_activity_id IS NOT NULL
    AND pd.receiver_activity_id != ''
    AND a.iati_identifier = pd.receiver_activity_id
    AND pd.receiver_activity_uuid IS NULL;
  
  GET DIAGNOSTICS receiver_updated = ROW_COUNT;
  RAISE NOTICE '✅ Linked % planned disbursements to receiver activities', receiver_updated;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Backfill complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Add documentation comments
COMMENT ON COLUMN planned_disbursements.provider_activity_uuid IS 
  'Foreign key to activities table - links to the provider activity record';

COMMENT ON COLUMN planned_disbursements.receiver_activity_uuid IS 
  'Foreign key to activities table - links to the receiver activity record';

COMMENT ON COLUMN planned_disbursements.provider_activity_id IS 
  'IATI identifier of the provider activity (text field for IATI compliance)';

COMMENT ON COLUMN planned_disbursements.receiver_activity_id IS 
  'IATI identifier of the receiver activity (text field for IATI compliance)';

-- Verification Query
SELECT 
  'Planned Disbursements with Activity Links' as summary,
  COUNT(*) as total_disbursements,
  COUNT(provider_activity_uuid) as with_provider_link,
  COUNT(receiver_activity_uuid) as with_receiver_link,
  COUNT(provider_activity_id) as with_provider_iati_id,
  COUNT(receiver_activity_id) as with_receiver_iati_id
FROM planned_disbursements;

