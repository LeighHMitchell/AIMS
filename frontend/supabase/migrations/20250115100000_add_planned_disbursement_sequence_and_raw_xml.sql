-- ================================================================
-- PLANNED DISBURSEMENTS: ADD SEQUENCE AND RAW XML
-- ================================================================
-- This migration adds sequence_index and raw_xml columns to preserve
-- the order and exact XML fragment for each planned disbursement
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PLANNED DISBURSEMENTS SEQUENCE & RAW XML';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Add sequence_index column
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'planned_disbursements' AND column_name = 'sequence_index'
    ) THEN
      ALTER TABLE planned_disbursements
      ADD COLUMN sequence_index INTEGER;
      RAISE NOTICE '✅ Added column: sequence_index';
    ELSE
      RAISE NOTICE 'ℹ️  Column sequence_index already exists';
    END IF;
  END;

  -- Add raw_xml column to store the exact XML fragment
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'planned_disbursements' AND column_name = 'raw_xml'
    ) THEN
      ALTER TABLE planned_disbursements
      ADD COLUMN raw_xml TEXT;
      RAISE NOTICE '✅ Added column: raw_xml';
    ELSE
      RAISE NOTICE 'ℹ️  Column raw_xml already exists';
    END IF;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Columns added successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Add index for sequence ordering
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_planned_disbursements_sequence') THEN
    CREATE INDEX idx_planned_disbursements_sequence ON planned_disbursements(activity_id, sequence_index);
    RAISE NOTICE '✅ Created index: idx_planned_disbursements_sequence';
  END IF;
END $$;

-- Add documentation comments
COMMENT ON COLUMN planned_disbursements.sequence_index IS
  'Sequence order from XML import to preserve original ordering (0-based index)';

COMMENT ON COLUMN planned_disbursements.raw_xml IS
  'Exact XML fragment for this specific planned disbursement element';
