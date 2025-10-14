-- ================================================================
-- BACKFILL USD VALUES FOR EXISTING BUDGETS AND PLANNED DISBURSEMENTS
-- ================================================================
-- This script recalculates and populates USD values for existing records
-- Run AFTER adding the usd_value and usd_amount columns
-- ================================================================

DO $$ 
DECLARE
  budget_record RECORD;
  disbursement_record RECORD;
  updated_budgets INTEGER := 0;
  updated_disbursements INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BACKFILLING USD VALUES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- ================================================================
  -- 1. BACKFILL BUDGETS
  -- ================================================================
  RAISE NOTICE 'Processing activity_budgets...';
  
  -- For USD budgets, copy value to usd_value
  UPDATE activity_budgets 
  SET usd_value = value 
  WHERE currency = 'USD' AND (usd_value IS NULL OR usd_value = 0);
  
  GET DIAGNOSTICS updated_budgets = ROW_COUNT;
  RAISE NOTICE '✅ Updated % USD budgets', updated_budgets;
  
  -- For non-USD budgets, we'll need to use currency conversion
  -- This requires the exchange rate at value_date
  -- Since we don't have a currency conversion table in SQL, 
  -- we'll mark these for frontend recalculation
  
  -- Count how many need conversion
  SELECT COUNT(*) INTO updated_budgets
  FROM activity_budgets 
  WHERE currency != 'USD' AND (usd_value IS NULL OR usd_value = 0);
  
  RAISE NOTICE 'ℹ️  %s non-USD budgets need conversion (will be done when edited)', updated_budgets;

  -- ================================================================
  -- 2. BACKFILL PLANNED DISBURSEMENTS
  -- ================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'Processing planned_disbursements...';
  
  -- For USD disbursements, copy amount to usd_amount
  UPDATE planned_disbursements 
  SET usd_amount = amount 
  WHERE currency = 'USD' AND (usd_amount IS NULL OR usd_amount = 0);
  
  GET DIAGNOSTICS updated_disbursements = ROW_COUNT;
  RAISE NOTICE '✅ Updated % USD disbursements', updated_disbursements;
  
  -- Count how many need conversion
  SELECT COUNT(*) INTO updated_disbursements
  FROM planned_disbursements 
  WHERE currency != 'USD' AND (usd_amount IS NULL OR usd_amount = 0);
  
  RAISE NOTICE 'ℹ️  % non-USD disbursements need conversion (will be done when edited)', updated_disbursements;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Backfill completed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Non-USD records will auto-convert when you edit and save them';
  RAISE NOTICE '2. Or use the frontend batch conversion tool (if available)';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- 3. VERIFICATION QUERIES
-- ================================================================

-- Show summary of budgets
SELECT 
  'BUDGETS' as table_name,
  currency,
  COUNT(*) as total_records,
  COUNT(usd_value) as with_usd_value,
  SUM(CASE WHEN usd_value IS NULL OR usd_value = 0 THEN 1 ELSE 0 END) as needs_conversion
FROM activity_budgets
GROUP BY currency
ORDER BY currency;

-- Show summary of planned disbursements
SELECT 
  'PLANNED DISBURSEMENTS' as table_name,
  currency,
  COUNT(*) as total_records,
  COUNT(usd_amount) as with_usd_amount,
  SUM(CASE WHEN usd_amount IS NULL OR usd_amount = 0 THEN 1 ELSE 0 END) as needs_conversion
FROM planned_disbursements
GROUP BY currency
ORDER BY currency;

