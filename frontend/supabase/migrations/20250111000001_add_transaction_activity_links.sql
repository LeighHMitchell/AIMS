-- ================================================================
-- TRANSACTIONS: ADD ACTIVITY LINKING
-- ================================================================
-- This migration adds foreign key columns to link transactions
-- to actual activities in the system, enabling rich UI display and
-- better data relationships while maintaining IATI text fields
-- ================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TRANSACTIONS ACTIVITY LINKING';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Add provider_activity_uuid column
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'provider_activity_uuid'
    ) THEN
      ALTER TABLE transactions 
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
      WHERE table_name = 'transactions' AND column_name = 'receiver_activity_uuid'
    ) THEN
      ALTER TABLE transactions 
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
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_provider_activity') THEN
    CREATE INDEX idx_transactions_provider_activity ON transactions(provider_activity_uuid);
    RAISE NOTICE '✅ Created index: idx_transactions_provider_activity';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_transactions_provider_activity already exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_receiver_activity') THEN
    CREATE INDEX idx_transactions_receiver_activity ON transactions(receiver_activity_uuid);
    RAISE NOTICE '✅ Created index: idx_transactions_receiver_activity';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_transactions_receiver_activity already exists';
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
  UPDATE transactions t
  SET provider_activity_uuid = a.id
  FROM activities a
  WHERE t.provider_org_activity_id IS NOT NULL
    AND t.provider_org_activity_id != ''
    AND a.iati_identifier = t.provider_org_activity_id
    AND t.provider_activity_uuid IS NULL;
  
  GET DIAGNOSTICS provider_updated = ROW_COUNT;
  RAISE NOTICE '✅ Linked % transactions to provider activities', provider_updated;

  -- Update receiver activities
  UPDATE transactions t
  SET receiver_activity_uuid = a.id
  FROM activities a
  WHERE t.receiver_org_activity_id IS NOT NULL
    AND t.receiver_org_activity_id != ''
    AND a.iati_identifier = t.receiver_org_activity_id
    AND t.receiver_activity_uuid IS NULL;
  
  GET DIAGNOSTICS receiver_updated = ROW_COUNT;
  RAISE NOTICE '✅ Linked % transactions to receiver activities', receiver_updated;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Backfill complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Add documentation comments
COMMENT ON COLUMN transactions.provider_activity_uuid IS 
  'Foreign key to activities table - links to the provider activity record';

COMMENT ON COLUMN transactions.receiver_activity_uuid IS 
  'Foreign key to activities table - links to the receiver activity record';

-- Display summary statistics
DO $$
DECLARE
  total_transactions INTEGER;
  with_provider_link INTEGER;
  with_receiver_link INTEGER;
BEGIN
  SELECT 
    COUNT(*) as total,
    COUNT(provider_activity_uuid) as with_provider,
    COUNT(receiver_activity_uuid) as with_receiver
  INTO total_transactions, with_provider_link, with_receiver_link
  FROM transactions;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUMMARY STATISTICS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total transactions: %', total_transactions;
  RAISE NOTICE 'With provider activity link: %', with_provider_link;
  RAISE NOTICE 'With receiver activity link: %', with_receiver_link;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

