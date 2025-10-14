-- Migration: Add missing IATI transaction fields
-- Created: 2025-01-07
-- Purpose: Add provider/receiver activity IDs and vocabulary fields for full IATI compliance

-- Add missing IATI fields to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS provider_org_activity_id TEXT,
ADD COLUMN IF NOT EXISTS receiver_org_activity_id TEXT,
ADD COLUMN IF NOT EXISTS aid_type_vocabulary TEXT DEFAULT '1',
ADD COLUMN IF NOT EXISTS flow_type_vocabulary TEXT DEFAULT '1',
ADD COLUMN IF NOT EXISTS finance_type_vocabulary TEXT DEFAULT '1',
ADD COLUMN IF NOT EXISTS tied_status_vocabulary TEXT DEFAULT '1',
ADD COLUMN IF NOT EXISTS disbursement_channel_vocabulary TEXT DEFAULT '1';

-- Add comments for documentation
COMMENT ON COLUMN transactions.provider_org_activity_id IS 'IATI activity identifier of the provider organization (provider-org/@provider-activity-id)';
COMMENT ON COLUMN transactions.receiver_org_activity_id IS 'IATI activity identifier of the receiver organization (receiver-org/@receiver-activity-id)';
COMMENT ON COLUMN transactions.aid_type_vocabulary IS 'Vocabulary code for aid type (default: 1 = OECD DAC)';
COMMENT ON COLUMN transactions.flow_type_vocabulary IS 'Vocabulary code for flow type (default: 1 = OECD DAC)';
COMMENT ON COLUMN transactions.finance_type_vocabulary IS 'Vocabulary code for finance type (default: 1 = OECD DAC)';
COMMENT ON COLUMN transactions.tied_status_vocabulary IS 'Vocabulary code for tied status (default: 1 = OECD DAC)';
COMMENT ON COLUMN transactions.disbursement_channel_vocabulary IS 'Vocabulary code for disbursement channel (default: 1 = OECD DAC)';

-- Create indexes for activity ID lookups
CREATE INDEX IF NOT EXISTS idx_transactions_provider_activity_id ON transactions(provider_org_activity_id) WHERE provider_org_activity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_activity_id ON transactions(receiver_org_activity_id) WHERE receiver_org_activity_id IS NOT NULL;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added IATI transaction fields (activity IDs and vocabularies)';
END $$;
