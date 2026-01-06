-- =============================================================================
-- Random Capital Spend Allocation Script
-- =============================================================================
-- Purpose: Populate all activities with realistic random capital spend percentages
-- Distribution: Bell-curve (normal-like) centered around 50%
-- Target Column: activities.capital_spend_percentage (DECIMAL(5,2), range 0-100)
-- =============================================================================

-- Step 1: Update all activities with random capital spend percentages
-- Uses sum of 4 uniform random values to approximate normal distribution
-- Result: ~68% of values between 35-65%, ~95% between 20-80%
UPDATE activities
SET capital_spend_percentage = ROUND(
  LEAST(100, GREATEST(0, 
    (RANDOM() * 25 + RANDOM() * 25 + RANDOM() * 25 + RANDOM() * 25)::numeric
  )), 2
);

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Step 2: Summary statistics
SELECT 
  COUNT(*) as total_activities,
  COUNT(capital_spend_percentage) as with_capital_spend,
  ROUND(AVG(capital_spend_percentage)::numeric, 2) as avg_percentage,
  ROUND(STDDEV(capital_spend_percentage)::numeric, 2) as std_dev,
  MIN(capital_spend_percentage) as min_percentage,
  MAX(capital_spend_percentage) as max_percentage,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY capital_spend_percentage) as median
FROM activities;

-- Step 3: Distribution breakdown by range
SELECT 
  CASE 
    WHEN capital_spend_percentage < 10 THEN '0-10%'
    WHEN capital_spend_percentage < 20 THEN '10-20%'
    WHEN capital_spend_percentage < 30 THEN '20-30%'
    WHEN capital_spend_percentage < 40 THEN '30-40%'
    WHEN capital_spend_percentage < 50 THEN '40-50%'
    WHEN capital_spend_percentage < 60 THEN '50-60%'
    WHEN capital_spend_percentage < 70 THEN '60-70%'
    WHEN capital_spend_percentage < 80 THEN '70-80%'
    WHEN capital_spend_percentage < 90 THEN '80-90%'
    ELSE '90-100%'
  END as range,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM activities
WHERE capital_spend_percentage IS NOT NULL
GROUP BY 1
ORDER BY 1;

-- Step 4: Sample of updated records
SELECT id, title_narrative, capital_spend_percentage 
FROM activities 
WHERE capital_spend_percentage IS NOT NULL
ORDER BY RANDOM() 
LIMIT 10;
