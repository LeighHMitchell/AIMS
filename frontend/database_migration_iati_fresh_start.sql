-- IATI Transaction Migration - Fresh Start
-- Use this if you're starting fresh or if the transactions table already has the new structure

-- First, check the current state
DO $$
DECLARE
    v_has_uuid_column boolean;
    v_has_old_structure boolean;
    v_table_is_empty boolean;
BEGIN
    -- Check if transactions table exists and what structure it has
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions'
    ) THEN
        -- Check for uuid column (new structure)
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' 
            AND column_name = 'uuid'
            AND table_schema = 'public'
        ) INTO v_has_uuid_column;
        
        -- Check for id column (old structure)
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' 
            AND column_name = 'id'
            AND table_schema = 'public'
        ) INTO v_has_old_structure;
        
        -- Check if table is empty
        SELECT NOT EXISTS (
            SELECT 1 FROM transactions LIMIT 1
        ) INTO v_table_is_empty;
        
        -- Handle different scenarios
        IF v_has_uuid_column THEN
            RAISE NOTICE 'Transactions table already has IATI structure. Skipping table creation.';
        ELSIF v_has_old_structure AND NOT v_table_is_empty THEN
            RAISE NOTICE 'Found old transactions table with data. Creating backup...';
            -- Only create backup if it doesn't exist
            IF NOT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'transactions_backup'
            ) THEN
                ALTER TABLE transactions RENAME TO transactions_backup;
                RAISE NOTICE 'Created transactions_backup table.';
            ELSE
                RAISE NOTICE 'Backup already exists. Dropping current transactions table...';
                DROP TABLE transactions;
            END IF;
        ELSE
            -- Old structure but empty, just drop it
            RAISE NOTICE 'Found empty transactions table. Dropping it...';
            DROP TABLE transactions;
        END IF;
    END IF;
    
    -- Check if transactions_iati exists (from partial migration)
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions_iati'
    ) THEN
        RAISE NOTICE 'Found transactions_iati table from partial migration. Renaming to transactions...';
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'transactions'
        ) THEN
            DROP TABLE transactions;
        END IF;
        ALTER TABLE transactions_iati RENAME TO transactions;
    END IF;
END $$;

-- Create the IATI-compliant transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS transactions (
    -- Primary key
    uuid UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Activity relationship
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    
    -- Core transaction fields
    transaction_type transaction_type_enum NOT NULL,
    transaction_date DATE NOT NULL,
    value NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL, -- ISO 4217
    status transaction_status_enum DEFAULT 'draft',
    
    -- Optional core fields
    transaction_reference TEXT,
    value_date DATE,
    description TEXT,
    
    -- Provider organization
    provider_org_id UUID REFERENCES organizations(id),
    provider_org_type organization_type_enum,
    provider_org_ref TEXT,
    provider_org_name TEXT,
    
    -- Receiver organization
    receiver_org_id UUID REFERENCES organizations(id),
    receiver_org_type organization_type_enum,
    receiver_org_ref TEXT,
    receiver_org_name TEXT,
    
    -- Disbursement channel
    disbursement_channel disbursement_channel_enum,
    
    -- Sector information
    sector_code TEXT,
    sector_vocabulary TEXT, -- "1" = DAC 5 Digit, "2" = DAC 3 Digit
    
    -- Location information
    recipient_country_code TEXT, -- ISO 3166-1 alpha-2
    recipient_region_code TEXT,
    recipient_region_vocab TEXT, -- "1" = UN M49, "2" = OECD DAC
    
    -- Additional classifications
    flow_type flow_type_enum,
    finance_type finance_type_enum,
    aid_type aid_type_enum,
    aid_type_vocabulary TEXT,
    tied_status tied_status_enum,
    is_humanitarian BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicates based on reference + activity
    CONSTRAINT unique_transaction_ref UNIQUE (transaction_reference, activity_id)
);

-- Migrate data from backup if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions_backup'
    ) THEN
        RAISE NOTICE 'Migrating data from transactions_backup...';
        
        INSERT INTO transactions (
            uuid,
            activity_id,
            transaction_type,
            transaction_date,
            value,
            currency,
            description,
            provider_org_name,
            receiver_org_name,
            aid_type,
            tied_status,
            flow_type,
            created_at,
            updated_at
        )
        SELECT 
            CASE 
                WHEN id IS NULL THEN gen_random_uuid()
                ELSE id::uuid
            END,
            activity_id,
            CASE transaction_type
                WHEN 'IF' THEN '12'::transaction_type_enum  -- Incoming Funds
                WHEN 'C' THEN '2'::transaction_type_enum   -- Commitment
                WHEN 'D' THEN '3'::transaction_type_enum   -- Disbursement
                WHEN 'E' THEN '4'::transaction_type_enum   -- Expenditure
                WHEN 'IR' THEN '5'::transaction_type_enum  -- Interest Repayment
                WHEN 'LR' THEN '6'::transaction_type_enum  -- Loan Repayment
                WHEN 'R' THEN '7'::transaction_type_enum   -- Reimbursement
                WHEN 'PE' THEN '8'::transaction_type_enum  -- Purchase of Equity
                WHEN 'SE' THEN '9'::transaction_type_enum  -- Sale of Equity
                WHEN 'G' THEN '11'::transaction_type_enum  -- Credit Guarantee
                WHEN 'IC' THEN '1'::transaction_type_enum  -- Incoming Commitment
                -- Handle numeric types from legacy data
                WHEN '1' THEN '12'::transaction_type_enum  -- Incoming Funds
                WHEN '2' THEN '2'::transaction_type_enum   -- Outgoing Commitment
                WHEN '3' THEN '3'::transaction_type_enum   -- Disbursement
                WHEN '4' THEN '4'::transaction_type_enum   -- Expenditure
                WHEN '5' THEN '5'::transaction_type_enum   -- Interest Repayment
                WHEN '6' THEN '6'::transaction_type_enum   -- Loan Repayment
                WHEN '7' THEN '7'::transaction_type_enum   -- Reimbursement
                WHEN '8' THEN '8'::transaction_type_enum   -- Purchase of Equity
                WHEN '9' THEN '9'::transaction_type_enum   -- Sale of Equity
                WHEN '11' THEN '1'::transaction_type_enum  -- Incoming Commitment
                ELSE '3'::transaction_type_enum  -- Default to Disbursement
            END,
            transaction_date,
            value,
            COALESCE(currency, 'USD'),
            description,
            provider_org,
            receiver_org,
            CASE 
                WHEN aid_type IS NOT NULL AND aid_type IN ('A01','A02','B01','B02','B03','B04','C01','D01','D02','E01','E02','F01','G01','H01','H02')
                THEN aid_type::aid_type_enum
                ELSE NULL
            END,
            CASE 
                WHEN tied_status = '1' THEN '4'::tied_status_enum  -- Map "Tied" from old to new
                WHEN tied_status = '2' THEN '5'::tied_status_enum  -- Map "Partially tied"
                WHEN tied_status = '3' THEN '3'::tied_status_enum  -- Map "Untied"
                WHEN tied_status = '4' THEN '3'::tied_status_enum  -- Map "Unknown" to "Untied"
                ELSE NULL
            END,
            CASE
                WHEN flow_type IN ('10', '20', '21', '22', '30', '35', '36', '37', '40', '50') 
                THEN flow_type::flow_type_enum
                ELSE NULL
            END,
            created_at,
            updated_at
        FROM transactions_backup
        ON CONFLICT (uuid) DO NOTHING;  -- Skip if already migrated
        
        RAISE NOTICE 'Data migration completed.';
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_activity_id ON transactions(activity_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_org_id ON transactions(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_org_id ON transactions(receiver_org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_sector_code ON transactions(sector_code);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient_country ON transactions(recipient_country_code);

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE
    ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE transactions IS 'IATI-compliant financial transactions for activities';
COMMENT ON COLUMN transactions.transaction_type IS 'IATI transaction type code';
COMMENT ON COLUMN transactions.status IS 'Transaction status: draft or actual';
COMMENT ON COLUMN transactions.disbursement_channel IS 'IATI disbursement channel code';
COMMENT ON COLUMN transactions.sector_vocabulary IS '1=DAC 5 Digit, 2=DAC 3 Digit';
COMMENT ON COLUMN transactions.recipient_region_vocab IS '1=UN M49, 2=OECD DAC';
COMMENT ON COLUMN transactions.is_humanitarian IS 'Flag for humanitarian transactions';

-- Final status report
DO $$
DECLARE
    v_record_count integer;
BEGIN
    SELECT COUNT(*) INTO v_record_count FROM transactions;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'IATI Transaction Migration Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Transactions table has been created/updated with IATI structure';
    RAISE NOTICE 'Total records in transactions table: %', v_record_count;
    
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions_backup'
    ) THEN
        RAISE NOTICE 'Original data preserved in: transactions_backup';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Verify the application works with the new structure';
    RAISE NOTICE '2. Once confirmed, you can drop transactions_backup table';
    RAISE NOTICE '========================================';
END $$; 