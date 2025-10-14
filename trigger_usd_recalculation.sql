-- ================================================================
-- TRIGGER USD RECALCULATION FOR EXISTING RECORDS
-- ================================================================
-- This script sets usd_value/usd_amount to NULL to force recalculation
-- The frontend will then recalculate and save USD values when records are accessed
-- ================================================================

-- OPTION 1: Simple approach - Set all USD values to NULL
-- The frontend will recalculate when each activity is viewed

-- For budgets
UPDATE activity_budgets 
SET usd_value = NULL 
WHERE usd_value IS NULL OR usd_value = 0;

-- For planned disbursements  
UPDATE planned_disbursements 
SET usd_amount = NULL
WHERE usd_amount IS NULL OR usd_amount = 0;

-- ================================================================
-- OPTION 2: Manual conversion for EUR records (SIMPLE FALLBACK)
-- ================================================================
-- If you want immediate results, manually set EUR conversions
-- Update the exchange rate below to current EUR->USD rate

-- IMPORTANT: Update this exchange rate to current rate
DO $$
DECLARE
  eur_to_usd_rate NUMERIC := 1.0888; -- Update this to current rate!
BEGIN
  -- Update EUR budgets (using approximate rate)
  UPDATE activity_budgets 
  SET usd_value = ROUND(value * eur_to_usd_rate, 2)
  WHERE currency = 'EUR' 
    AND (usd_value IS NULL OR usd_value = 0)
    AND value > 0;
  
  RAISE NOTICE 'Updated EUR budgets using rate: %', eur_to_usd_rate;
  
  -- Update EUR planned disbursements
  UPDATE planned_disbursements 
  SET usd_amount = ROUND(amount * eur_to_usd_rate, 2)
  WHERE currency = 'EUR' 
    AND (usd_amount IS NULL OR usd_amount = 0)
    AND amount > 0;
    
  RAISE NOTICE 'Updated EUR disbursements using rate: %', eur_to_usd_rate;
END $$;

-- USD records (1:1 conversion)
UPDATE activity_budgets 
SET usd_value = value 
WHERE currency = 'USD' AND (usd_value IS NULL OR usd_value = 0);

UPDATE planned_disbursements 
SET usd_amount = amount 
WHERE currency = 'USD' AND (usd_amount IS NULL OR usd_amount = 0);

-- Verify results
SELECT 
  'BUDGETS' as type,
  currency,
  COUNT(*) as total,
  COUNT(usd_value) as with_usd,
  ROUND(AVG(usd_value), 2) as avg_usd_value
FROM activity_budgets
GROUP BY currency;

SELECT 
  'PLANNED DISBURSEMENTS' as type,
  currency,
  COUNT(*) as total,
  COUNT(usd_amount) as with_usd,
  ROUND(AVG(usd_amount), 2) as avg_usd_amount
FROM planned_disbursements
GROUP BY currency;

