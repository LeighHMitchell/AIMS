-- ================================================================
-- CURRENCY CONVERSION SYSTEM UPGRADE
-- ================================================================
-- This migration adds columns to support:
-- 1. Manual exchange rate override in edit modals
-- 2. Consistent USD conversion tracking across all financial tables
-- 3. Retry mechanism for failed conversions
-- ================================================================

-- ================================================================
-- 1. TRANSACTIONS TABLE - Add manual override flag
-- (Already has value_usd, exchange_rate_used, usd_conversion_date, usd_convertible)
-- ================================================================

ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS exchange_rate_manual BOOLEAN DEFAULT false;

COMMENT ON COLUMN transactions.exchange_rate_manual IS 'True if exchange rate was manually entered by user, false if fetched from API';

-- ================================================================
-- 2. ACTIVITY BUDGETS TABLE - Add full USD conversion tracking
-- (Already has usd_value from previous migration)
-- ================================================================

ALTER TABLE activity_budgets 
  ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(20,6);

ALTER TABLE activity_budgets 
  ADD COLUMN IF NOT EXISTS usd_conversion_date TIMESTAMPTZ;

ALTER TABLE activity_budgets 
  ADD COLUMN IF NOT EXISTS usd_convertible BOOLEAN DEFAULT true;

ALTER TABLE activity_budgets 
  ADD COLUMN IF NOT EXISTS exchange_rate_manual BOOLEAN DEFAULT false;

COMMENT ON COLUMN activity_budgets.exchange_rate_used IS 'Exchange rate used for USD conversion (1 [currency] = X USD)';
COMMENT ON COLUMN activity_budgets.usd_conversion_date IS 'Timestamp when USD conversion was performed';
COMMENT ON COLUMN activity_budgets.usd_convertible IS 'False if currency conversion failed and needs retry';
COMMENT ON COLUMN activity_budgets.exchange_rate_manual IS 'True if exchange rate was manually entered by user';

-- ================================================================
-- 3. PLANNED DISBURSEMENTS TABLE - Add full USD conversion tracking
-- (Already has usd_amount from previous migration)
-- ================================================================

ALTER TABLE planned_disbursements 
  ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(20,6);

ALTER TABLE planned_disbursements 
  ADD COLUMN IF NOT EXISTS usd_conversion_date TIMESTAMPTZ;

ALTER TABLE planned_disbursements 
  ADD COLUMN IF NOT EXISTS usd_convertible BOOLEAN DEFAULT true;

ALTER TABLE planned_disbursements 
  ADD COLUMN IF NOT EXISTS exchange_rate_manual BOOLEAN DEFAULT false;

COMMENT ON COLUMN planned_disbursements.exchange_rate_used IS 'Exchange rate used for USD conversion (1 [currency] = X USD)';
COMMENT ON COLUMN planned_disbursements.usd_conversion_date IS 'Timestamp when USD conversion was performed';
COMMENT ON COLUMN planned_disbursements.usd_convertible IS 'False if currency conversion failed and needs retry';
COMMENT ON COLUMN planned_disbursements.exchange_rate_manual IS 'True if exchange rate was manually entered by user';

-- ================================================================
-- 4. INDEXES FOR RETRY QUERIES
-- ================================================================

-- Index to efficiently find records needing conversion retry
CREATE INDEX IF NOT EXISTS idx_transactions_needs_retry 
  ON transactions(usd_convertible) 
  WHERE usd_convertible = false;

CREATE INDEX IF NOT EXISTS idx_budgets_needs_retry 
  ON activity_budgets(usd_convertible) 
  WHERE usd_convertible = false;

CREATE INDEX IF NOT EXISTS idx_disbursements_needs_retry 
  ON planned_disbursements(usd_convertible) 
  WHERE usd_convertible = false;

-- Index for manual rate lookups
CREATE INDEX IF NOT EXISTS idx_transactions_manual_rate 
  ON transactions(exchange_rate_manual) 
  WHERE exchange_rate_manual = true;

CREATE INDEX IF NOT EXISTS idx_budgets_manual_rate 
  ON activity_budgets(exchange_rate_manual) 
  WHERE exchange_rate_manual = true;

CREATE INDEX IF NOT EXISTS idx_disbursements_manual_rate 
  ON planned_disbursements(exchange_rate_manual) 
  WHERE exchange_rate_manual = true;

-- ================================================================
-- 5. BACKFILL EXISTING RECORDS
-- Set exchange_rate_manual = false for all existing records
-- (They were converted via API, not manually)
-- ================================================================

UPDATE transactions 
SET exchange_rate_manual = false 
WHERE exchange_rate_manual IS NULL;

UPDATE activity_budgets 
SET exchange_rate_manual = false 
WHERE exchange_rate_manual IS NULL;

UPDATE planned_disbursements 
SET exchange_rate_manual = false 
WHERE exchange_rate_manual IS NULL;

-- Set usd_convertible = true for records that have USD values
UPDATE activity_budgets 
SET usd_convertible = true 
WHERE usd_value IS NOT NULL AND usd_convertible IS NULL;

UPDATE planned_disbursements 
SET usd_convertible = true 
WHERE usd_amount IS NOT NULL AND usd_convertible IS NULL;

-- Set usd_convertible = false for records without USD values (need retry)
UPDATE activity_budgets 
SET usd_convertible = false 
WHERE usd_value IS NULL AND currency != 'USD' AND usd_convertible IS NULL;

UPDATE planned_disbursements 
SET usd_convertible = false 
WHERE usd_amount IS NULL AND currency != 'USD' AND usd_convertible IS NULL;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CURRENCY CONVERSION UPGRADE COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Added to transactions:';
  RAISE NOTICE '  - exchange_rate_manual (boolean)';
  RAISE NOTICE '';
  RAISE NOTICE 'Added to activity_budgets:';
  RAISE NOTICE '  - exchange_rate_used (decimal)';
  RAISE NOTICE '  - usd_conversion_date (timestamp)';
  RAISE NOTICE '  - usd_convertible (boolean)';
  RAISE NOTICE '  - exchange_rate_manual (boolean)';
  RAISE NOTICE '';
  RAISE NOTICE 'Added to planned_disbursements:';
  RAISE NOTICE '  - exchange_rate_used (decimal)';
  RAISE NOTICE '  - usd_conversion_date (timestamp)';
  RAISE NOTICE '  - usd_convertible (boolean)';
  RAISE NOTICE '  - exchange_rate_manual (boolean)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created indexes for retry queries and manual rate lookups.';
  RAISE NOTICE '';
END $$;



