-- Migration: Add fields required for Data Clinic feature
-- This migration adds IATI compliance fields to activities, transactions, and organizations tables

-- 1. Activities table - add missing IATI fields
DO $$
BEGIN
    -- Add iati_identifier if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' AND column_name = 'iati_identifier'
    ) THEN
        ALTER TABLE activities ADD COLUMN iati_identifier VARCHAR(255);
        COMMENT ON COLUMN activities.iati_identifier IS 'IATI Activity Identifier';
    END IF;

    -- Add default_aid_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' AND column_name = 'default_aid_type'
    ) THEN
        ALTER TABLE activities ADD COLUMN default_aid_type VARCHAR(10);
        COMMENT ON COLUMN activities.default_aid_type IS 'IATI Aid Type code (e.g., C01 for Project-type interventions)';
    END IF;

    -- Add default_finance_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' AND column_name = 'default_finance_type'
    ) THEN
        ALTER TABLE activities ADD COLUMN default_finance_type VARCHAR(10);
        COMMENT ON COLUMN activities.default_finance_type IS 'IATI Finance Type code (e.g., 110 for Standard grant)';
    END IF;

    -- Add flow_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' AND column_name = 'flow_type'
    ) THEN
        ALTER TABLE activities ADD COLUMN flow_type VARCHAR(10);
        COMMENT ON COLUMN activities.flow_type IS 'IATI Flow Type code (e.g., 10 for ODA)';
    END IF;

    -- Add tied_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' AND column_name = 'tied_status'
    ) THEN
        ALTER TABLE activities ADD COLUMN tied_status VARCHAR(10);
        COMMENT ON COLUMN activities.tied_status IS 'IATI Tied Status code (1=Tied, 2=Partially tied, 3=Untied, 4=Not reported)';
    END IF;
END $$;

-- 2. Transactions table - add missing IATI fields
DO $$
BEGIN
    -- Add finance_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'finance_type'
    ) THEN
        ALTER TABLE transactions ADD COLUMN finance_type VARCHAR(10);
        COMMENT ON COLUMN transactions.finance_type IS 'IATI Finance Type code for this transaction';
    END IF;

    -- Add aid_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'aid_type'
    ) THEN
        ALTER TABLE transactions ADD COLUMN aid_type VARCHAR(10);
        COMMENT ON COLUMN transactions.aid_type IS 'IATI Aid Type code for this transaction';
    END IF;

    -- Add flow_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'flow_type'
    ) THEN
        ALTER TABLE transactions ADD COLUMN flow_type VARCHAR(10);
        COMMENT ON COLUMN transactions.flow_type IS 'IATI Flow Type code for this transaction';
    END IF;
END $$;

-- 3. Organizations table - add missing fields
DO $$
BEGIN
    -- Note: iati_org_id should already exist in the database
    -- If it doesn't exist, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'iati_org_id'
    ) THEN
        ALTER TABLE organizations ADD COLUMN iati_org_id VARCHAR(100);
        COMMENT ON COLUMN organizations.iati_org_id IS 'IATI Organization Identifier (format: XX-123456)';
    END IF;

    -- Note: acronym column should already exist in the database
    -- The Data Clinic will use the existing acronym column

    -- Add default_currency if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'default_currency'
    ) THEN
        ALTER TABLE organizations ADD COLUMN default_currency VARCHAR(3);
        COMMENT ON COLUMN organizations.default_currency IS 'Default currency code (ISO 4217)';
    END IF;

    -- Add total_budget if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'total_budget'
    ) THEN
        ALTER TABLE organizations ADD COLUMN total_budget NUMERIC(15,2);
        COMMENT ON COLUMN organizations.total_budget IS 'Total organizational budget';
    END IF;

    -- Add recipient_org_budget if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'recipient_org_budget'
    ) THEN
        ALTER TABLE organizations ADD COLUMN recipient_org_budget NUMERIC(15,2);
        COMMENT ON COLUMN organizations.recipient_org_budget IS 'Budget as recipient organization';
    END IF;
END $$;

-- 4. Create the change_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('activity', 'transaction', 'organization')),
  entity_id UUID NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for change_log
CREATE INDEX IF NOT EXISTS idx_change_log_entity ON change_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_change_log_user ON change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_change_log_timestamp ON change_log(timestamp DESC);

-- Grant permissions
GRANT SELECT, INSERT ON change_log TO authenticated;
GRANT SELECT ON change_log TO anon;

-- 5. Output summary
DO $$
DECLARE
    v_activities_columns TEXT[];
    v_transactions_columns TEXT[];
    v_organizations_columns TEXT[];
BEGIN
    -- Check what columns exist in activities
    SELECT array_agg(column_name ORDER BY column_name)
    INTO v_activities_columns
    FROM information_schema.columns
    WHERE table_name = 'activities'
    AND column_name IN ('iati_identifier', 'default_aid_type', 'default_finance_type', 'flow_type', 'tied_status');
    
    -- Check what columns exist in transactions
    SELECT array_agg(column_name ORDER BY column_name)
    INTO v_transactions_columns
    FROM information_schema.columns
    WHERE table_name = 'transactions'
    AND column_name IN ('finance_type', 'aid_type', 'flow_type');
    
    -- Check what columns exist in organizations
    SELECT array_agg(column_name ORDER BY column_name)
    INTO v_organizations_columns
    FROM information_schema.columns
    WHERE table_name = 'organizations'
    AND column_name IN ('iati_org_id', 'acronym', 'default_currency', 'total_budget', 'recipient_org_budget');
    
    RAISE NOTICE 'Data Clinic fields status:';
    RAISE NOTICE 'Activities table has: %', v_activities_columns;
    RAISE NOTICE 'Transactions table has: %', v_transactions_columns;
    RAISE NOTICE 'Organizations table has: %', v_organizations_columns;
END $$; 