-- Migration: Backfill default_finance_type and default_flow_type on activities
-- Purpose: Allow transactions to inherit finance type and flow type from their parent activity
-- This enables older transactions to appear in the Finance Type Flow Chart

-- First, let's see what we're working with (commented out for reference)
-- SELECT
--   COUNT(*) as total_activities,
--   COUNT(default_finance_type) as has_finance_type,
--   COUNT(default_flow_type) as has_flow_type
-- FROM activities;

-- ============================================================================
-- STEP 1: Set default_flow_type for activities that don't have one
-- ============================================================================
-- Flow Type 10 = ODA (Official Development Assistance) - most common for aid activities
-- Flow Type 20 = OOF (Other Official Flows)
-- Flow Type 30 = Private grants
-- Flow Type 35 = Private market

-- Set ODA (10) as default for activities without a flow type
UPDATE activities
SET default_flow_type = '10'
WHERE default_flow_type IS NULL;

-- ============================================================================
-- STEP 2: Set default_finance_type based on activity characteristics
-- ============================================================================
-- Finance Types:
-- 110 = Standard grant (Aid grant excluding debt reorganisation)
-- 421 = Standard loan (Aid loan)
-- 310 = Loan excluding debt reorganisation
-- 410 = Aid loan excluding debt reorganisation

-- Strategy: Look at existing transactions to infer the finance type,
-- or default to Standard grant (110) for ODA activities

-- 2a. For activities that have transactions with finance_type set,
--     use the most common finance_type from their transactions
WITH activity_finance_types AS (
  SELECT
    activity_id,
    finance_type,
    COUNT(*) as tx_count,
    ROW_NUMBER() OVER (PARTITION BY activity_id ORDER BY COUNT(*) DESC) as rn
  FROM transactions
  WHERE finance_type IS NOT NULL
  GROUP BY activity_id, finance_type
)
UPDATE activities a
SET default_finance_type = aft.finance_type
FROM activity_finance_types aft
WHERE a.id = aft.activity_id
  AND aft.rn = 1
  AND a.default_finance_type IS NULL;

-- 2b. For remaining activities without default_finance_type,
--     check if they have loan-related keywords in title/description
UPDATE activities
SET default_finance_type = '421'  -- Aid loan
WHERE default_finance_type IS NULL
  AND (
    LOWER(COALESCE(title_narrative, '')) LIKE '%loan%'
    OR LOWER(COALESCE(description_narrative, '')) LIKE '%loan%'
    OR LOWER(COALESCE(title_narrative, '')) LIKE '%credit%'
    OR LOWER(COALESCE(description_narrative, '')) LIKE '%credit line%'
  );

-- 2c. For all remaining activities (likely grants), set to Standard grant
UPDATE activities
SET default_finance_type = '110'  -- Standard grant
WHERE default_finance_type IS NULL;

-- ============================================================================
-- STEP 3: Verify the results
-- ============================================================================
-- Check the distribution of defaults we just set
DO $$
DECLARE
  total_count INTEGER;
  flow_10_count INTEGER;
  finance_110_count INTEGER;
  finance_421_count INTEGER;
  other_finance_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM activities;
  SELECT COUNT(*) INTO flow_10_count FROM activities WHERE default_flow_type = '10';
  SELECT COUNT(*) INTO finance_110_count FROM activities WHERE default_finance_type = '110';
  SELECT COUNT(*) INTO finance_421_count FROM activities WHERE default_finance_type = '421';
  SELECT COUNT(*) INTO other_finance_count FROM activities
    WHERE default_finance_type NOT IN ('110', '421') AND default_finance_type IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Activity Finance/Flow Type Backfill Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total activities: %', total_count;
  RAISE NOTICE 'With flow_type ODA (10): %', flow_10_count;
  RAISE NOTICE 'With finance_type Standard grant (110): %', finance_110_count;
  RAISE NOTICE 'With finance_type Aid loan (421): %', finance_421_count;
  RAISE NOTICE 'With other finance_type: %', other_finance_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- Optional: Create an index to speed up the join in the API
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_activities_default_finance_type
  ON activities(default_finance_type)
  WHERE default_finance_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_default_flow_type
  ON activities(default_flow_type)
  WHERE default_flow_type IS NOT NULL;
