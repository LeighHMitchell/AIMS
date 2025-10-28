-- ============================================
-- FIX FOR FINANCE TYPE CONSTRAINT ISSUE
-- ============================================
-- This script updates the check_valid_finance_type constraint
-- to include all valid IATI finance type codes from the UI

BEGIN;

-- Step 1: Check current activity that's failing
SELECT 'Current activity state:' AS info;
SELECT 
    id, 
    title_narrative, 
    default_finance_type,
    default_aid_type
FROM activities 
WHERE id = '6590cc6d-7842-4d88-ab83-09eb22001f57';

-- Step 2: Drop the old restrictive constraint
ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_valid_finance_type;

-- Step 3: Add the updated constraint with all valid IATI codes
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

SELECT 'Constraint updated successfully!' AS result;

-- Step 4: Verify the fix
SELECT 'Verifying constraint...' AS info;
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'check_valid_finance_type';

COMMIT;

SELECT 'Fix completed! You can now publish your activity.' AS final_message;

