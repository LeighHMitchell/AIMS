-- Budget Tables Setup and Verification Script
-- Run this in your PostgreSQL database to check status and create tables if needed

-- ===========================
-- STEP 1: Check Current Status
-- ===========================

DO $$
DECLARE
  budgets_exists BOOLEAN;
  exceptions_exists BOOLEAN;
BEGIN
  -- Check if activity_budgets exists
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'activity_budgets'
  ) INTO budgets_exists;
  
  -- Check if activity_budget_exceptions exists
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'activity_budget_exceptions'
  ) INTO exceptions_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== BUDGET TABLES STATUS ===';
  RAISE NOTICE 'activity_budgets: %', CASE WHEN budgets_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'activity_budget_exceptions: %', CASE WHEN exceptions_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '===========================';
  RAISE NOTICE '';
  
  IF budgets_exists AND exceptions_exists THEN
    RAISE NOTICE '✅ All budget tables exist! Ready to import budgets.';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Apply code fixes from BUDGET_FIXES_TO_APPLY.md';
    RAISE NOTICE '2. Test with test_budget_import.xml';
  ELSE
    RAISE NOTICE '⚠️  Budget tables are missing!';
    RAISE NOTICE '';
    RAISE NOTICE 'To create them, run:';
    RAISE NOTICE '  psql $DATABASE_URL -f frontend/sql/create_activity_budgets_tables_safe.sql';
    RAISE NOTICE '';
    RAISE NOTICE 'Or copy the contents of that file and run it in Supabase SQL Editor.';
  END IF;
  
END $$;

-- ===========================
-- STEP 2: Show Sample Schema
-- ===========================

-- If tables exist, show their structure
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_budgets') THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== ACTIVITY_BUDGETS SCHEMA ===';
  END IF;
END $$;

-- Show columns if table exists
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'activity_budgets'
ORDER BY ordinal_position;

-- ===========================
-- STEP 3: Test Insert
-- ===========================

-- Test if we can insert a sample budget
DO $$
DECLARE
  test_activity_id UUID;
  budgets_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'activity_budgets'
  ) INTO budgets_exists;
  
  IF budgets_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== TESTING INSERT ===';
    
    -- Get a real activity ID to test with (if any exist)
    SELECT id INTO test_activity_id 
    FROM activities 
    LIMIT 1;
    
    IF test_activity_id IS NOT NULL THEN
      BEGIN
        -- Try inserting a test budget
        INSERT INTO activity_budgets (
          activity_id, type, status, 
          period_start, period_end, 
          value, currency, value_date
        ) VALUES (
          test_activity_id,
          1, -- Original
          1, -- Indicative  
          '2024-01-01', 
          '2024-12-31',
          100000.00,
          'USD',
          '2024-01-01'
        );
        
        RAISE NOTICE '✅ Test insert succeeded!';
        RAISE NOTICE 'Budget tables are working correctly.';
        
        -- Clean up test data
        DELETE FROM activity_budgets 
        WHERE activity_id = test_activity_id 
        AND value = 100000.00 
        AND period_start = '2024-01-01';
        
        RAISE NOTICE '✅ Test data cleaned up.';
        
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
        RAISE NOTICE 'This might indicate a constraint issue.';
      END;
    ELSE
      RAISE NOTICE 'ℹ️  No activities found to test with. Skipping insert test.';
    END IF;
  END IF;
END $$;

-- ===========================
-- STEP 4: Show Indexes
-- ===========================

SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'activity_budgets';

-- ===========================
-- STEP 5: Show Constraints
-- ===========================

SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'activity_budgets'::regclass;

-- ===========================
-- FINAL SUMMARY
-- ===========================

DO $$
DECLARE
  tables_count INTEGER;
  indexes_count INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO tables_count 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('activity_budgets', 'activity_budget_exceptions');
  
  -- Count indexes
  SELECT COUNT(*) INTO indexes_count 
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND tablename = 'activity_budgets';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== FINAL SUMMARY ===';
  RAISE NOTICE 'Tables: % / 2', tables_count;
  RAISE NOTICE 'Indexes: %', indexes_count;
  
  IF tables_count = 2 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ DATABASE IS READY FOR BUDGET IMPORTS!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Apply code fixes from BUDGET_FIXES_TO_APPLY.md';
    RAISE NOTICE '2. Restart your dev server';
    RAISE NOTICE '3. Upload test_budget_import.xml';
    RAISE NOTICE '4. Import budgets and verify in Budget tab';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ DATABASE SETUP INCOMPLETE';
    RAISE NOTICE 'Please run: frontend/sql/create_activity_budgets_tables_safe.sql';
  END IF;
  RAISE NOTICE '=====================';
  
END $$;
