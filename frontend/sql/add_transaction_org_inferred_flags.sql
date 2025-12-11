-- Migration: Add provider/receiver org inferred flags to transactions table
-- Purpose: Track whether provider_org and receiver_org were inferred by system or explicitly set by user
-- When inferred=true, UI displays org name in gray; when false (user explicitly saved), displays in black

-- Add the columns with default TRUE (most existing transactions have inferred values)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS provider_org_inferred BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS receiver_org_inferred BOOLEAN DEFAULT TRUE;

-- Add comments explaining the columns
COMMENT ON COLUMN transactions.provider_org_inferred IS 'True if provider_org was inferred by system, false if explicitly set by user';
COMMENT ON COLUMN transactions.receiver_org_inferred IS 'True if receiver_org was inferred by system, false if explicitly set by user';

-- For existing transactions that have explicit org IDs set, mark them as NOT inferred
-- This assumes if org_id is set, it was likely explicitly provided
UPDATE transactions 
SET provider_org_inferred = FALSE 
WHERE provider_org_id IS NOT NULL 
  AND provider_org_inferred IS NULL;

UPDATE transactions 
SET receiver_org_inferred = FALSE 
WHERE receiver_org_id IS NOT NULL 
  AND receiver_org_inferred IS NULL;
