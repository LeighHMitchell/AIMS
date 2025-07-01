-- Add missing organization columns to transactions table
-- This migration adds support for provider and receiver organizations

-- Add provider organization columns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS provider_org_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS provider_org_ref TEXT,
  ADD COLUMN IF NOT EXISTS provider_org_name TEXT;

-- Add receiver organization columns  
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS receiver_org_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS receiver_org_ref TEXT,
  ADD COLUMN IF NOT EXISTS receiver_org_name TEXT;

-- Add activity IATI reference for traceability
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS activity_iati_ref TEXT;

-- Remove the incorrect columns if they exist
ALTER TABLE transactions
  DROP COLUMN IF EXISTS provider_org,
  DROP COLUMN IF EXISTS receiver_org;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_provider_org_id ON transactions(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_org_id ON transactions(receiver_org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_activity_iati_ref ON transactions(activity_iati_ref);

-- Add comments for documentation
COMMENT ON COLUMN transactions.provider_org_id IS 'UUID reference to the provider organization';
COMMENT ON COLUMN transactions.provider_org_ref IS 'IATI organization reference/identifier for provider';
COMMENT ON COLUMN transactions.provider_org_name IS 'Name of the provider organization from IATI data';
COMMENT ON COLUMN transactions.receiver_org_id IS 'UUID reference to the receiver organization';
COMMENT ON COLUMN transactions.receiver_org_ref IS 'IATI organization reference/identifier for receiver';
COMMENT ON COLUMN transactions.receiver_org_name IS 'Name of the receiver organization from IATI data';
COMMENT ON COLUMN transactions.activity_iati_ref IS 'IATI activity identifier this transaction belongs to'; 