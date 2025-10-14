-- ================================================================
-- ADD USD CONVERSION COLUMNS TO BUDGETS AND PLANNED DISBURSEMENTS
-- ================================================================
-- This migration adds USD conversion columns to activity_budgets
-- and planned_disbursements tables so hero cards show USD values
-- Safe to run multiple times (uses IF NOT EXISTS patterns)
-- ================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'USD CONVERSION COLUMNS MIGRATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- ================================================================
  -- 1. ADD USD_VALUE TO ACTIVITY_BUDGETS
  -- ================================================================
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_budgets' AND column_name = 'usd_value'
  ) THEN
    ALTER TABLE activity_budgets 
    ADD COLUMN usd_value NUMERIC(20, 2);
    RAISE NOTICE '✅ Added column: activity_budgets.usd_value';
  ELSE
    RAISE NOTICE 'ℹ️  Column activity_budgets.usd_value already exists';
  END IF;

  -- ================================================================
  -- 2. ADD USD_AMOUNT TO PLANNED_DISBURSEMENTS
  -- ================================================================
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planned_disbursements' AND column_name = 'usd_amount'
  ) THEN
    ALTER TABLE planned_disbursements 
    ADD COLUMN usd_amount NUMERIC(15, 2);
    RAISE NOTICE '✅ Added column: planned_disbursements.usd_amount';
  ELSE
    RAISE NOTICE 'ℹ️  Column planned_disbursements.usd_amount already exists';
  END IF;

  -- ================================================================
  -- 3. ADD INDEXES FOR PERFORMANCE
  -- ================================================================
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_budgets_usd_value') THEN
    CREATE INDEX idx_activity_budgets_usd_value ON activity_budgets(usd_value) WHERE usd_value IS NOT NULL;
    RAISE NOTICE '✅ Created index: idx_activity_budgets_usd_value';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_activity_budgets_usd_value already exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_planned_disbursements_usd_amount') THEN
    CREATE INDEX idx_planned_disbursements_usd_amount ON planned_disbursements(usd_amount) WHERE usd_amount IS NOT NULL;
    RAISE NOTICE '✅ Created index: idx_planned_disbursements_usd_amount';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_planned_disbursements_usd_amount already exists';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- 4. ADD COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON COLUMN activity_budgets.usd_value IS 
  'USD-converted value of the budget at the value_date exchange rate';

COMMENT ON COLUMN planned_disbursements.usd_amount IS 
  'USD-converted amount of the planned disbursement at the value_date exchange rate';

-- ================================================================
-- 5. VERIFICATION QUERIES
-- ================================================================

-- Check that columns were added
SELECT 
  'activity_budgets' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_budgets' AND column_name = 'usd_value';

SELECT 
  'planned_disbursements' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'planned_disbursements' AND column_name = 'usd_amount';

-- Show sample data (if any exists)
SELECT 
  'activity_budgets' as table_name,
  COUNT(*) as total_rows,
  COUNT(usd_value) as rows_with_usd_value,
  SUM(CASE WHEN usd_value IS NULL THEN 1 ELSE 0 END) as rows_without_usd_value
FROM activity_budgets;

SELECT 
  'planned_disbursements' as table_name,
  COUNT(*) as total_rows,
  COUNT(usd_amount) as rows_with_usd_amount,
  SUM(CASE WHEN usd_amount IS NULL THEN 1 ELSE 0 END) as rows_without_usd_amount
FROM planned_disbursements;
