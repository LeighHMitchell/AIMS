-- Migration: Add default_finance_type to activities table
-- This field allows activities to specify a default financial instrument (grant, loan, etc.)
-- that will be used as a default for new transactions

-- 1. Check if column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'default_finance_type'
    ) THEN
        -- 2. Add the column
        ALTER TABLE activities 
        ADD COLUMN default_finance_type VARCHAR(4);
        
        -- 3. Add comment for documentation
        COMMENT ON COLUMN activities.default_finance_type IS 
        'IATI Finance Type code (e.g., 110 for Standard grant, 410 for Aid loan). Used as default for new transactions.';
        
        RAISE NOTICE 'Successfully added default_finance_type column to activities table';
    ELSE
        RAISE NOTICE 'Column default_finance_type already exists in activities table';
    END IF;
END $$;

-- 4. Create a check constraint for valid IATI finance type codes (optional)
-- This ensures only valid IATI finance type codes are stored
ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_valid_finance_type;
ALTER TABLE activities ADD CONSTRAINT check_valid_finance_type 
CHECK (
    default_finance_type IS NULL OR 
    default_finance_type IN (
        -- Grants
        '1',    -- GNI: Gross National Income
        '110',  -- Standard grant
        '111',  -- Subsidies to national private investors
        
        -- Interest subsidies
        '210',  -- Interest subsidy
        '211',  -- Interest subsidy to national private exporters
        
        -- Deposit-based instruments
        '310',  -- Deposit basis
        '311',  -- Encashment basis
        
        -- Loans
        '410',  -- Aid loan excluding debt reorganisation
        '411',  -- Investment-related loan to developing countries
        '412',  -- Loan in a joint venture with the recipient
        '413',  -- Loan to national private investor
        '414',  -- Loan to national private exporter
        '421',  -- Reimbursable grant
        
        -- Export credits
        '451',  -- Non-banks guaranteed export credits
        '452',  -- Non-banks non-guaranteed portions of guaranteed export credits
        '453',  -- Bank export credits
        
        -- Debt relief
        '510',  -- Debt forgiveness: ODA claims
        '511',  -- Debt forgiveness: ODA claims (DSR)
        '512',  -- Debt forgiveness: ODA claims (HIPC)
        '513',  -- Debt forgiveness: ODA claims (MDRI)
        '520',  -- Debt forgiveness: OOF claims
        '530',  -- Debt forgiveness: Private claims
        
        -- Debt rescheduling
        '600',  -- Debt rescheduling: ODA claims
        '601',  -- Debt rescheduling: ODA claims (DSR)
        '602',  -- Debt rescheduling: ODA claims (HIPC)
        '603',  -- Debt rescheduling: ODA claims (MDRI)
        '610',  -- Debt rescheduling: OOF claims
        '620',  -- Debt rescheduling: Private claims
        '621',  -- Debt rescheduling: Private claims (DSR)
        '622',  -- Debt rescheduling: Private claims (HIPC)
        '623',  -- Debt rescheduling: Private claims (MDRI)
        '630',  -- Debt rescheduling: OOF claims (DSR)
        '631',  -- Debt rescheduling: OOF claims (HIPC)
        '632',  -- Debt rescheduling: OOF claims (MDRI)
        
        -- Other instruments
        '700',  -- Foreign direct investment
        '810',  -- Bonds
        '910',  -- Other securities/claims
        '1100'  -- Guarantees/insurance
    )
);

-- 5. Create index for performance (if we'll be filtering by this field)
CREATE INDEX IF NOT EXISTS idx_activities_default_finance_type 
ON activities(default_finance_type) 
WHERE default_finance_type IS NOT NULL;

-- 6. Display current table structure for verification
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'activities'
AND column_name = 'default_finance_type'
ORDER BY ordinal_position; 