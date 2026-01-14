-- Migration: Add financing_classification column to transactions table
-- Created: 2026-01-14
-- Purpose: Store the computed/manual financing classification for each transaction
-- This field is used to categorize transactions by their financing purpose

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS financing_classification TEXT;

COMMENT ON COLUMN transactions.financing_classification IS 'Financing classification for the transaction (e.g., ODA, OOF, Private). Can be computed or manually overridden.';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added financing_classification column to transactions table';
END $$;
