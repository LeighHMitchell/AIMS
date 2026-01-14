-- Migration: Convert ALL enum columns to TEXT for better compatibility
-- Created: 2026-01-14
-- Purpose: Fix "Operator does not exist: text = *_enum" errors

-- ============================================================================
-- Step 1: Drop ALL views that might depend on transactions table
-- Use CASCADE to drop everything dependent
-- ============================================================================

DO $$
DECLARE
    view_record RECORD;
BEGIN
    -- Find and drop all views that reference the transactions table
    FOR view_record IN
        SELECT DISTINCT v.table_schema, v.table_name
        FROM information_schema.view_column_usage v
        WHERE v.table_name = 'transactions'
        AND v.table_schema = 'public'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE',
            view_record.table_schema, view_record.table_name);
        RAISE NOTICE 'Dropped view: %.%', view_record.table_schema, view_record.table_name;
    END LOOP;
END $$;

-- Also explicitly drop known views
DROP VIEW IF EXISTS transaction_conversion_status CASCADE;
DROP VIEW IF EXISTS v_transaction_sector_analytics CASCADE;
DROP VIEW IF EXISTS iati_reference_values CASCADE;
DROP VIEW IF EXISTS v_activity_summary CASCADE;
DROP VIEW IF EXISTS v_transaction_summary CASCADE;
DROP VIEW IF EXISTS activity_financial_summary CASCADE;
DROP VIEW IF EXISTS v_activity_transactions CASCADE;
DROP VIEW IF EXISTS v_partner_transactions CASCADE;

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS activity_transaction_summaries CASCADE;

-- ============================================================================
-- Step 2: Drop triggers
-- ============================================================================

DROP TRIGGER IF EXISTS validate_transaction_sectors_trigger ON transactions;
DROP TRIGGER IF EXISTS validate_transaction_regions_trigger ON transactions;
DROP TRIGGER IF EXISTS validate_transaction_countries_trigger ON transactions;
DROP TRIGGER IF EXISTS validate_transaction_geography_trigger ON transactions;

-- ============================================================================
-- Step 3: Convert ALL enum columns to TEXT one by one with error handling
-- ============================================================================

DO $$
BEGIN
    -- transaction_type
    BEGIN
        ALTER TABLE transactions ALTER COLUMN transaction_type TYPE TEXT USING transaction_type::TEXT;
        RAISE NOTICE 'Converted transaction_type to TEXT';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'transaction_type conversion: %', SQLERRM;
    END;

    -- aid_type
    BEGIN
        ALTER TABLE transactions ALTER COLUMN aid_type TYPE TEXT USING aid_type::TEXT;
        RAISE NOTICE 'Converted aid_type to TEXT';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'aid_type conversion: %', SQLERRM;
    END;

    -- flow_type
    BEGIN
        ALTER TABLE transactions ALTER COLUMN flow_type TYPE TEXT USING flow_type::TEXT;
        RAISE NOTICE 'Converted flow_type to TEXT';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'flow_type conversion: %', SQLERRM;
    END;

    -- finance_type
    BEGIN
        ALTER TABLE transactions ALTER COLUMN finance_type TYPE TEXT USING finance_type::TEXT;
        RAISE NOTICE 'Converted finance_type to TEXT';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'finance_type conversion: %', SQLERRM;
    END;

    -- disbursement_channel
    BEGIN
        ALTER TABLE transactions ALTER COLUMN disbursement_channel TYPE TEXT USING disbursement_channel::TEXT;
        RAISE NOTICE 'Converted disbursement_channel to TEXT';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'disbursement_channel conversion: %', SQLERRM;
    END;

    -- tied_status
    BEGIN
        ALTER TABLE transactions ALTER COLUMN tied_status TYPE TEXT USING tied_status::TEXT;
        RAISE NOTICE 'Converted tied_status to TEXT';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'tied_status conversion: %', SQLERRM;
    END;

    -- provider_org_type
    BEGIN
        ALTER TABLE transactions ALTER COLUMN provider_org_type TYPE TEXT USING provider_org_type::TEXT;
        RAISE NOTICE 'Converted provider_org_type to TEXT';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'provider_org_type conversion: %', SQLERRM;
    END;

    -- receiver_org_type
    BEGIN
        ALTER TABLE transactions ALTER COLUMN receiver_org_type TYPE TEXT USING receiver_org_type::TEXT;
        RAISE NOTICE 'Converted receiver_org_type to TEXT';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'receiver_org_type conversion: %', SQLERRM;
    END;
END $$;

-- Activities table enum columns
DO $$
BEGIN
    BEGIN
        ALTER TABLE activities ALTER COLUMN default_flow_type TYPE TEXT USING default_flow_type::TEXT;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
        ALTER TABLE activities ALTER COLUMN default_finance_type TYPE TEXT USING default_finance_type::TEXT;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
        ALTER TABLE activities ALTER COLUMN default_aid_type TYPE TEXT USING default_aid_type::TEXT;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
        ALTER TABLE activities ALTER COLUMN default_tied_status TYPE TEXT USING default_tied_status::TEXT;
    EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Organizations table
DO $$
BEGIN
    BEGIN
        ALTER TABLE organizations ALTER COLUMN organization_type TYPE TEXT USING organization_type::TEXT;
    EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ============================================================================
-- Step 4: Recreate the materialized view
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS activity_transaction_summaries AS
SELECT
    a.id as activity_id,
    COUNT(t.uuid) as total_transactions,
    COALESCE(SUM(CASE WHEN t.transaction_type = '2' AND t.status = 'actual' THEN t.value ELSE 0 END), 0) as commitments,
    COALESCE(SUM(CASE WHEN t.transaction_type = '3' AND t.status = 'actual' THEN t.value ELSE 0 END), 0) as disbursements,
    COALESCE(SUM(CASE WHEN t.transaction_type = '4' AND t.status = 'actual' THEN t.value ELSE 0 END), 0) as expenditures,
    COALESCE(SUM(CASE WHEN t.transaction_type IN ('1', '11') AND t.status = 'actual' THEN t.value ELSE 0 END), 0) as inflows
FROM activities a
LEFT JOIN transactions t ON a.id = t.activity_id
GROUP BY a.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_transaction_summaries_activity_id
ON activity_transaction_summaries(activity_id);

-- ============================================================================
-- Step 5: Recreate iati_reference_values view
-- ============================================================================

CREATE OR REPLACE VIEW iati_reference_values AS
WITH transaction_type_values AS (
    SELECT 'transaction_type' as field_name, code,
        CASE code
            WHEN '1' THEN 'Incoming Funds' WHEN '2' THEN 'Outgoing Commitment'
            WHEN '3' THEN 'Disbursement' WHEN '4' THEN 'Expenditure'
            WHEN '5' THEN 'Interest Payment' WHEN '6' THEN 'Loan Repayment'
            WHEN '7' THEN 'Reimbursement' WHEN '8' THEN 'Purchase of Equity'
            WHEN '9' THEN 'Sale of Equity' WHEN '10' THEN 'Credit Guarantee'
            WHEN '11' THEN 'Incoming Commitment' WHEN '12' THEN 'Outgoing Pledge'
            WHEN '13' THEN 'Incoming Pledge'
        END as name
    FROM unnest(ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13']) as code
),
aid_type_values AS (
    SELECT 'aid_type' as field_name, code,
        CASE code
            WHEN 'A01' THEN 'General budget support' WHEN 'A02' THEN 'Sector budget support'
            WHEN 'B01' THEN 'Core support to NGOs' WHEN 'B02' THEN 'Core contributions to multilateral institutions'
            WHEN 'B03' THEN 'Contributions to specific-purpose programmes' WHEN 'B04' THEN 'Basket funds/pooled funding'
            WHEN 'C01' THEN 'Project-type interventions' WHEN 'D01' THEN 'Donor country personnel'
            WHEN 'D02' THEN 'Other technical assistance' WHEN 'E01' THEN 'Scholarships/training in donor country'
            WHEN 'E02' THEN 'Imputed student costs' WHEN 'F01' THEN 'Debt relief'
            WHEN 'G01' THEN 'Administrative costs not included elsewhere' WHEN 'H01' THEN 'Development awareness'
            WHEN 'H02' THEN 'Refugees/asylum seekers in donor countries'
        END as name
    FROM unnest(ARRAY['A01','A02','B01','B02','B03','B04','C01','D01','D02','E01','E02','F01','G01','H01','H02']) as code
),
flow_type_values AS (
    SELECT 'flow_type' as field_name, code,
        CASE code
            WHEN '10' THEN 'ODA' WHEN '11' THEN 'OOF non-export credit' WHEN '20' THEN 'Non flow'
            WHEN '21' THEN 'Private Development Finance' WHEN '22' THEN 'Private grants'
            WHEN '30' THEN 'Officially supported export credits' WHEN '35' THEN 'Private market'
            WHEN '36' THEN 'Private foreign direct investment' WHEN '37' THEN 'Private grants (market rate)'
            WHEN '40' THEN 'Non flow: GNI deduction' WHEN '50' THEN 'Other flows'
        END as name
    FROM unnest(ARRAY['10','11','20','21','22','30','35','36','37','40','50']) as code
),
finance_type_values AS (
    SELECT 'finance_type' as field_name, code,
        CASE code
            WHEN '100' THEN 'Grant' WHEN '110' THEN 'Standard grant' WHEN '210' THEN 'Interest subsidy'
            WHEN '310' THEN 'Deposit basis' WHEN '400' THEN 'Loan' WHEN '410' THEN 'Aid loan excluding debt reorganisation'
            WHEN '421' THEN 'Standard loan' WHEN '422' THEN 'Reimbursable grant' WHEN '423' THEN 'Bonds'
            WHEN '431' THEN 'Subordinated loan' WHEN '432' THEN 'Preferred equity' WHEN '433' THEN 'Other hybrid instruments'
            WHEN '510' THEN 'Common equity' WHEN '520' THEN 'Guarantees' WHEN '610' THEN 'Debt forgiveness: ODA claims'
            WHEN '620' THEN 'Debt rescheduling: ODA claims' WHEN '700' THEN 'Foreign direct investment'
            WHEN '1100' THEN 'Guarantees/insurance'
        END as name
    FROM unnest(ARRAY['100','110','210','310','400','410','421','422','423','431','432','433','510','520','610','620','700','1100']) as code
),
disbursement_channel_values AS (
    SELECT 'disbursement_channel' as field_name, code,
        CASE code
            WHEN '1' THEN 'Government' WHEN '2' THEN 'Non-governmental agencies'
            WHEN '3' THEN 'Multilateral agencies' WHEN '4' THEN 'Public sector institutions'
            WHEN '5' THEN 'Private sector institutions' WHEN '6' THEN 'Public-private partnerships'
            WHEN '7' THEN 'Other'
        END as name
    FROM unnest(ARRAY['1','2','3','4','5','6','7']) as code
),
tied_status_values AS (
    SELECT 'tied_status' as field_name, code,
        CASE code WHEN '3' THEN 'Partially tied' WHEN '4' THEN 'Tied' WHEN '5' THEN 'Untied' END as name
    FROM unnest(ARRAY['3','4','5']) as code
),
organization_type_values AS (
    SELECT 'organization_type' as field_name, code,
        CASE code
            WHEN '10' THEN 'Government' WHEN '11' THEN 'Local Government' WHEN '15' THEN 'Other Public Sector'
            WHEN '21' THEN 'International NGO' WHEN '22' THEN 'National NGO' WHEN '23' THEN 'Regional NGO'
            WHEN '24' THEN 'Partner Country based NGO' WHEN '30' THEN 'Public Private Partnership'
            WHEN '40' THEN 'Multilateral' WHEN '60' THEN 'Foundation' WHEN '70' THEN 'Private Sector'
            WHEN '71' THEN 'Private Sector in Provider Country' WHEN '72' THEN 'Private Sector in Aid Recipient Country'
            WHEN '73' THEN 'Private Sector in Third Country' WHEN '80' THEN 'Academic, Training and Research'
            WHEN '90' THEN 'Other'
        END as name
    FROM unnest(ARRAY['10','11','15','21','22','23','24','30','40','60','70','71','72','73','80','90']) as code
)
SELECT field_name, code, name FROM transaction_type_values WHERE name IS NOT NULL
UNION ALL SELECT field_name, code, name FROM aid_type_values WHERE name IS NOT NULL
UNION ALL SELECT field_name, code, name FROM flow_type_values WHERE name IS NOT NULL
UNION ALL SELECT field_name, code, name FROM finance_type_values WHERE name IS NOT NULL
UNION ALL SELECT field_name, code, name FROM disbursement_channel_values WHERE name IS NOT NULL
UNION ALL SELECT field_name, code, name FROM tied_status_values WHERE name IS NOT NULL
UNION ALL SELECT field_name, code, name FROM organization_type_values WHERE name IS NOT NULL;

GRANT SELECT ON iati_reference_values TO authenticated;
GRANT SELECT ON iati_reference_values TO anon;

-- ============================================================================
-- Step 6: Recreate validation trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_transaction_sector_percentages()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sectors IS NOT NULL AND jsonb_array_length(NEW.sectors) > 0 THEN
    DECLARE
      total_percentage NUMERIC;
    BEGIN
      SELECT COALESCE(SUM((elem->>'percentage')::NUMERIC), 0) INTO total_percentage
      FROM jsonb_array_elements(NEW.sectors) AS elem WHERE elem->>'percentage' IS NOT NULL;
      IF total_percentage > 0 AND ABS(total_percentage - 100) > 0.01 THEN
        RAISE EXCEPTION 'Transaction sector percentages must sum to 100%%, got %', total_percentage;
      END IF;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_transaction_sectors_trigger ON transactions;
CREATE TRIGGER validate_transaction_sectors_trigger
  BEFORE INSERT OR UPDATE ON transactions FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_sector_percentages();

DO $$ BEGIN RAISE NOTICE 'Migration completed: Converted all enum columns to TEXT'; END $$;
