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
        -- Indicators / Macroeconomic Stats
        '1',    -- GNI: Gross National Income
        '2',    -- ODA % GNI
        '3',    -- Total Flows % GNI
        '4',    -- Population
        
        -- Grants & Subsidies
        '110',  -- Standard grant
        '111',  -- Subsidies to national private investors (withdrawn)
        '210',  -- Interest subsidy
        '211',  -- Interest subsidy to national private exporters (withdrawn)
        '310',  -- Capital subscription on deposit basis
        '311',  -- Capital subscription on encashment basis
        
        -- Withdrawn Loans & Legacy Instruments
        '410',  -- Aid loan excluding debt reorganisation (withdrawn)
        '411',  -- Investment-related loan to developing countries (withdrawn)
        '412',  -- Loan in a joint venture with the recipient (withdrawn)
        '413',  -- Loan to national private investor (withdrawn)
        '414',  -- Loan to national private exporter (withdrawn)
        '451',  -- Non-banks guaranteed export credits (withdrawn)
        '452',  -- Non-banks non-guaranteed portions of guaranteed export credits (withdrawn)
        '453',  -- Bank export credits (withdrawn)
        
        -- Loans & Debt Instruments
        '421',  -- Standard loan
        '422',  -- Reimbursable grant
        '423',  -- Bonds
        '424',  -- Asset-backed securities
        '425',  -- Other debt securities
        
        -- Subordinated & Hybrid Instruments
        '431',  -- Subordinated loan
        '432',  -- Preferred equity
        '433',  -- Other hybrid instruments
        
        -- Equity & Investment Vehicles
        '510',  -- Common equity
        '511',  -- Acquisition of equity not part of joint venture (withdrawn)
        '512',  -- Other acquisition of equity (withdrawn)
        '520',  -- Shares in collective investment vehicles
        '530',  -- Reinvested earnings
        
        -- Debt Forgiveness & Restructuring
        '610',  -- Debt forgiveness: ODA claims (P)
        '611',  -- Debt forgiveness: ODA claims (I)
        '612',  -- Debt forgiveness: OOF claims (P)
        '613',  -- Debt forgiveness: OOF claims (I)
        '614',  -- Debt forgiveness: Private claims (P)
        '615',  -- Debt forgiveness: Private claims (I)
        '616',  -- Debt forgiveness: OOF claims (DSR)
        '617',  -- Debt forgiveness: Private claims (DSR)
        '618',  -- Debt forgiveness: Other
        '620',  -- Debt rescheduling: ODA claims (P)
        '621',  -- Debt rescheduling: ODA claims (I)
        '622',  -- Debt rescheduling: OOF claims (P)
        '623',  -- Debt rescheduling: OOF claims (I)
        '624',  -- Debt rescheduling: Private claims (P)
        '625',  -- Debt rescheduling: Private claims (I)
        '626',  -- Debt rescheduling: OOF claims (DSR)
        '627',  -- Debt rescheduling: Private claims (DSR)
        '630',  -- Debt rescheduling: OOF claim (DSR – original loan principal)
        '631',  -- Debt rescheduling: OOF claim (DSR – original loan interest)
        '632',  -- Debt rescheduling: Private claim (DSR – original loan principal)
        '633',  -- Debt forgiveness/conversion: export credit claims (P)
        '634',  -- Debt forgiveness/conversion: export credit claims (I)
        '635',  -- Debt forgiveness: export credit claims (DSR)
        '636',  -- Debt rescheduling: export credit claims (P)
        '637',  -- Debt rescheduling: export credit claims (I)
        '638',  -- Debt rescheduling: export credit claims (DSR)
        '639',  -- Debt rescheduling: export credit claim (DSR – original loan principal)
        
        -- Foreign Direct Investment (Withdrawn)
        '710',  -- Foreign direct investment, new capital outflow (withdrawn)
        '711',  -- Other foreign direct investment (withdrawn)
        '712',  -- Foreign direct investment, reinvested earnings (withdrawn)
        
        -- Market Securities (Withdrawn)
        '810',  -- Bank bonds (withdrawn)
        '811',  -- Non-bank bonds (withdrawn)
        
        -- Other Securities (Withdrawn)
        '910',  -- Other bank securities/claims (withdrawn)
        '911',  -- Other non-bank securities/claims (withdrawn)
        '912',  -- Purchase of securities from issuing agencies (withdrawn)
        '913',  -- Securities and other instruments originally issued by multilateral agencies (withdrawn)
        
        -- Guarantees & Insurance
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
