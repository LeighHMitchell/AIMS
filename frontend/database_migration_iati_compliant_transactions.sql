-- IATI-Compliant Transaction System Migration
-- This migration updates the transactions table to be fully IATI-compliant

-- Step 1: Create ENUMs for IATI code lists
-- Check and create transaction_type_enum
DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM (
        '1',  -- Incoming Commitment
        '2',  -- Outgoing Commitment
        '3',  -- Disbursement
        '4',  -- Expenditure
        '5',  -- Interest Repayment
        '6',  -- Loan Repayment
        '7',  -- Reimbursement
        '8',  -- Purchase of Equity
        '9',  -- Sale of Equity
        '11', -- Credit Guarantee
        '12', -- Incoming Funds
        '13'  -- Commitment Cancellation
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check and create transaction_status_enum
DO $$ BEGIN
    CREATE TYPE transaction_status_enum AS ENUM ('draft', 'actual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check and create organization_type_enum
DO $$ BEGIN
    CREATE TYPE organization_type_enum AS ENUM (
        '10', -- Government
        '11', -- Local Government
        '15', -- Other Public Sector
        '21', -- International NGO
        '22', -- National NGO
        '23', -- Regional NGO
        '24', -- Partner Country based NGO
        '30', -- Public Private Partnership
        '40', -- Multilateral
        '60', -- Foundation
        '70', -- Private Sector
        '71', -- Private Sector in Provider Country
        '72', -- Private Sector in Recipient Country
        '73', -- Private Sector in Third Country
        '80', -- Academic / Research
        '90'  -- Other
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check and create disbursement_channel_enum
DO $$ BEGIN
    CREATE TYPE disbursement_channel_enum AS ENUM (
        '1', -- Bilateral
        '2', -- Multilateral
        '3', -- NGO
        '4', -- Public Sector
        '5', -- Private Sector
        '6', -- PPP
        '7'  -- Other
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check and create flow_type_enum
DO $$ BEGIN
    CREATE TYPE flow_type_enum AS ENUM (
        '10', -- ODA
        '11', -- OOF (non-export credit)
        '12', -- OOF (export credit)
        '13', -- Private grants
        '14', -- Private market
        '20', -- Non flow
        '21', -- Private Development Finance
        '22', -- Mobilised private finance
        '30', -- Bilateral, ex-post claims on multilateral institutions
        '35', -- Private foreign direct investment
        '36', -- Private export credit
        '37', -- Other private flows at face value
        '40', -- Non flow (GNI deduction)
        '50'  -- Other flows
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check and create finance_type_enum  
DO $$ BEGIN
    CREATE TYPE finance_type_enum AS ENUM (
        '100', -- Grant
        '110', -- Standard grant
        '111', -- Subsidies to national private investors
        '200', -- Interest subsidy
        '210', -- Interest subsidy to national private exporters
        '211', -- Interest subsidy to national private investors
        '300', -- Capital subscription on deposit basis
        '310', -- Capital subscription on encashment basis
        '400', -- Loan
        '410', -- Aid loan excluding debt reorganisation
        '411', -- Investment-related loan to developing country
        '412', -- Loan in a joint venture with the recipient
        '413', -- Loan to national private investor
        '414', -- Loan to national private exporter
        '420', -- Standard loan
        '421', -- Reimbursable grant
        '422', -- Bonds
        '423', -- Asset-backed securities
        '424', -- Other debt securities
        '425', -- Subordinated loan
        '430', -- Guarantees/insurance
        '431', -- Guarantees on exports
        '432', -- Guarantees on private investment
        '433', -- Guarantees on other credits
        '440', -- Non-banks guaranteed export credits
        '450', -- Non-banks non-guaranteed portions of guaranteed export credits
        '451', -- Direct investment in new or existing company
        '452', -- Other acquisition of equity
        '453', -- Participating loan
        '500', -- Debt relief
        '510', -- Debt forgiveness: ODA claims
        '511', -- Debt forgiveness: ODA claims (HIPCs)
        '512', -- Debt forgiveness: ODA claims (MDRI)
        '513', -- Debt forgiveness: OOF claims
        '514', -- Debt forgiveness: Private claims
        '515', -- Debt forgiveness: Other
        '520', -- Debt rescheduling: ODA claims
        '521', -- Debt rescheduling: OOF claims
        '522', -- Debt rescheduling: Private claims
        '523', -- Debt rescheduling: OOF claims (developmental food aid)
        '530', -- Debt buy-back: ODA claims
        '531', -- Debt buy-back: OOF claims
        '532', -- Debt buy-back: Private claims
        '600', -- Equity
        '610', -- Common equity
        '611', -- Preferred equity
        '612', -- Preferred shares
        '613', -- Other hybrid instruments
        '620', -- Shares in collective investment vehicles
        '621', -- Investment funds
        '622', -- Specific-purpose vehicles
        '623', -- Mezzanine finance instruments
        '630', -- Debt instruments
        '631', -- Senior debt
        '632', -- Subordinated debt
        '700', -- Securities and other financial instruments
        '710', -- Securities of multilateral agencies
        '711', -- Securities of non-resident entities denominated in local currency
        '800', -- Other financial instruments
        '810', -- Derivatives
        '811', -- Structured finance
        '820'  -- Other undefined
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check and create aid_type_enum
DO $$ BEGIN
    CREATE TYPE aid_type_enum AS ENUM (
        'A01', -- General budget support
        'A02', -- Sector budget support
        'B01', -- Core support to NGOs and other private bodies
        'B02', -- Core contributions to multilateral institutions
        'B03', -- Contributions to specific-purpose programmes
        'B04', -- Basket funds/pooled funding
        'C01', -- Project-type interventions
        'D01', -- Donor country personnel
        'D02', -- Other technical assistance
        'E01', -- Scholarships/training in donor country
        'E02', -- Imputed student costs
        'F01', -- Debt relief
        'G01', -- Administrative costs not included elsewhere
        'H01', -- Development awareness
        'H02'  -- Refugees/asylum seekers in donor countries
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check and create tied_status_enum
DO $$ BEGIN
    CREATE TYPE tied_status_enum AS ENUM (
        '3', -- Untied
        '4', -- Tied
        '5'  -- Partially tied
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Drop existing table if needed (careful with this in production!)
-- You may want to backup data first
-- DROP TABLE IF EXISTS transactions CASCADE;

-- Step 3: Create new IATI-compliant transactions table
CREATE TABLE IF NOT EXISTS transactions_iati (
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

-- Step 4: Migrate existing data if transactions table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        -- Insert data from old table to new table
        INSERT INTO transactions_iati (
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
                WHEN aid_type IS NOT NULL THEN aid_type::aid_type_enum
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
                WHEN flow_type IN ('10', '20', '30', '35', '36', '37', '40', '50') 
                THEN flow_type::flow_type_enum
                ELSE NULL
            END,
            created_at,
            updated_at
        FROM transactions;
        
        -- Rename old table as backup
        ALTER TABLE transactions RENAME TO transactions_backup;
        
        -- Rename new table to transactions
        ALTER TABLE transactions_iati RENAME TO transactions;
    ELSE
        -- If no existing table, just rename the new one
        ALTER TABLE transactions_iati RENAME TO transactions;
    END IF;
END $$;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_activity_id ON transactions(activity_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_org_id ON transactions(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_org_id ON transactions(receiver_org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_sector_code ON transactions(sector_code);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient_country ON transactions(recipient_country_code);

-- Step 6: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE
    ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Add comments for documentation
COMMENT ON TABLE transactions IS 'IATI-compliant financial transactions for activities';
COMMENT ON COLUMN transactions.transaction_type IS 'IATI transaction type code';
COMMENT ON COLUMN transactions.status IS 'Transaction status: draft or actual';
COMMENT ON COLUMN transactions.disbursement_channel IS 'IATI disbursement channel code';
COMMENT ON COLUMN transactions.sector_vocabulary IS '1=DAC 5 Digit, 2=DAC 3 Digit';
COMMENT ON COLUMN transactions.recipient_region_vocab IS '1=UN M49, 2=OECD DAC';
COMMENT ON COLUMN transactions.is_humanitarian IS 'Flag for humanitarian transactions'; 