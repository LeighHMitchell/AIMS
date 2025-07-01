-- Add activity_iati_ref column to transactions table
-- This stores the original IATI activity reference for traceability
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS activity_iati_ref TEXT;

-- Make activity_id nullable to allow transactions without resolved activities
ALTER TABLE transactions
ALTER COLUMN activity_id DROP NOT NULL;

-- Add an index on activity_iati_ref for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_activity_iati_ref 
ON transactions(activity_iati_ref);

-- Add a comment explaining the columns
COMMENT ON COLUMN transactions.activity_id IS 'Internal UUID reference to activities table - nullable for unresolved activities';
COMMENT ON COLUMN transactions.activity_iati_ref IS 'Original IATI activity identifier from XML - stored for traceability and future resolution'; 