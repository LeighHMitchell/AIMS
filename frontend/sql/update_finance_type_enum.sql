-- Update finance_type_enum to include all IATI standard finance types
-- This script adds missing finance type codes to the enum

-- First, let's check if the enum exists and what values it has
DO $$
BEGIN
    -- Check if finance_type_enum exists
    IF EXISTS (
        SELECT 1 
        FROM pg_type 
        WHERE typname = 'finance_type_enum'
    ) THEN
        -- Alter the enum to add missing values
        -- Note: We need to add each value that doesn't exist
        
        -- Standard grants and subsidies
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '111' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '111'; -- Subsidies to national private investors
        END IF;
        
        -- Interest subsidies
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '210' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '210'; -- Interest subsidy
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '211' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '211'; -- Interest subsidy to national private exporters
        END IF;
        
        -- Deposit/Encashment
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '310' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '310'; -- Deposit basis
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '311' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '311'; -- Encashment basis
        END IF;
        
        -- Loans
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '410' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '410'; -- Aid loan excluding debt reorganization
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '411' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '411'; -- Investment-related loan to developing countries
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '412' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '412'; -- Loan in a joint venture with third party
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '413' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '413'; -- Loan to national private investor
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '414' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '414'; -- Loan to national private exporter
        END IF;
        
        -- Additional loan types found in Myanmar data
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '421' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '421';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '422' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '422';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '423' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '423';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '424' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '424';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '425' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '425';
        END IF;
        
        -- Export credits
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '451' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '451'; -- Non-banks guaranteed export credits
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '452' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '452'; -- Non-banks non-guaranteed portions
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '453' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '453'; -- Bank export credits
        END IF;
        
        -- Guarantees
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '510' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '510'; -- Guarantees/insurance
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '511' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '511';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '512' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '512';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '520' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '520';
        END IF;
        
        -- Debt instruments
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '610' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '610'; -- Debt swap - Conversion of ODA claims
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '611' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '611'; -- Debt swap - Paris Club
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '612' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '612'; -- Debt swap - Other
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '613' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '613'; -- Debt buy-back - Concessional
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '614' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '614'; -- Debt buy-back - Non-concessional
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '615' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '615'; -- Other debt
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '616' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '616';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '617' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '617';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '618' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '618';
        END IF;
        
        -- Debt forgiveness
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '620' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '620'; -- Debt forgiveness: export credit
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '621' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '621'; -- Debt forgiveness: ODA
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '622' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '622'; -- Debt forgiveness: OOF
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '623' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '623'; -- Debt forgiveness: private
        END IF;
        
        -- Debt rescheduling (including the problematic 624)
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '624' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '624'; -- Debt rescheduling: ODA claims
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '625' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '625'; -- Debt rescheduling: OOF
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '626' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '626'; -- Debt rescheduling: private
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '627' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '627'; -- Debt rescheduling: export credit
        END IF;
        
        -- Additional debt types
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '630' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '630';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '631' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '631';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '632' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '632';
        END IF;
        
        -- Foreign direct investment
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '710' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '710'; -- Foreign direct investment
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '711' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '711'; -- Other FDI
        END IF;
        
        -- Bonds
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '810' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '810'; -- Bank bonds
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '811' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '811'; -- Non-bank bonds
        END IF;
        
        -- Other
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '910' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '910'; -- Other securities/claims
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '1100' AND enumtypid = 'finance_type_enum'::regtype) THEN
            ALTER TYPE finance_type_enum ADD VALUE '1100'; -- Guarantees for private investors
        END IF;
        
        RAISE NOTICE 'finance_type_enum has been updated with all standard IATI finance types';
    ELSE
        RAISE NOTICE 'finance_type_enum does not exist';
    END IF;
END $$;

-- Display the final enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'finance_type_enum'::regtype 
ORDER BY enumsortorder; 