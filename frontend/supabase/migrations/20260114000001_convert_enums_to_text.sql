-- Migration: Convert enum columns to TEXT for better compatibility
-- Created: 2026-01-14
-- Purpose: Fix "Operator does not exist: text = transaction_type_enum" errors
--
-- PostgreSQL enums cause type comparison issues when comparing with text values.
-- Converting to TEXT simplifies queries and avoids casting problems.

-- ============================================================================
-- Step 1: Drop all dependent views and materialized views
-- ============================================================================

-- Drop views that depend on transaction_type column
DROP VIEW IF EXISTS transaction_conversion_status CASCADE;
DROP VIEW IF EXISTS v_transaction_sector_analytics CASCADE;
DROP VIEW IF EXISTS iati_reference_values CASCADE;
DROP MATERIALIZED VIEW IF EXISTS activity_transaction_summaries CASCADE;

-- ============================================================================
-- Step 2: Drop triggers that might reference the column
-- ============================================================================

DROP TRIGGER IF EXISTS validate_transaction_sectors_trigger ON transactions;
DROP TRIGGER IF EXISTS validate_transaction_regions_trigger ON transactions;
DROP TRIGGER IF EXISTS validate_transaction_countries_trigger ON transactions;
DROP TRIGGER IF EXISTS validate_transaction_geography_trigger ON transactions;

-- ============================================================================
-- Step 3: Convert transaction_type column from enum to TEXT
-- ============================================================================

ALTER TABLE transactions
  ALTER COLUMN transaction_type TYPE TEXT USING transaction_type::TEXT;

-- ============================================================================
-- Step 4: Add CHECK constraint to maintain valid values
-- ============================================================================

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transaction_type_valid;
ALTER TABLE transactions ADD CONSTRAINT chk_transaction_type_valid
  CHECK (transaction_type IS NULL OR transaction_type IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'));

-- ============================================================================
-- Step 5: Recreate the materialized view
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
-- Step 6: Recreate iati_reference_values view (now using TEXT values)
-- ============================================================================

CREATE OR REPLACE VIEW iati_reference_values AS
WITH transaction_type_values AS (
    SELECT
        'transaction_type' as field_name,
        code,
        CASE code
            WHEN '1' THEN 'Incoming Funds'
            WHEN '2' THEN 'Outgoing Commitment'
            WHEN '3' THEN 'Disbursement'
            WHEN '4' THEN 'Expenditure'
            WHEN '5' THEN 'Interest Payment'
            WHEN '6' THEN 'Loan Repayment'
            WHEN '7' THEN 'Reimbursement'
            WHEN '8' THEN 'Purchase of Equity'
            WHEN '9' THEN 'Sale of Equity'
            WHEN '10' THEN 'Credit Guarantee'
            WHEN '11' THEN 'Incoming Commitment'
            WHEN '12' THEN 'Outgoing Pledge'
            WHEN '13' THEN 'Incoming Pledge'
        END as name
    FROM unnest(ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13']) as code
),
aid_type_values AS (
    SELECT
        'aid_type' as field_name,
        code,
        CASE code
            WHEN 'A01' THEN 'General budget support'
            WHEN 'A02' THEN 'Sector budget support'
            WHEN 'B01' THEN 'Core support to NGOs, other private bodies, PPPs and research institutes'
            WHEN 'B02' THEN 'Core contributions to multilateral institutions'
            WHEN 'B03' THEN 'Contributions to specific-purpose programmes and funds managed by international organisations'
            WHEN 'B04' THEN 'Basket funds/pooled funding'
            WHEN 'C01' THEN 'Project-type interventions'
            WHEN 'D01' THEN 'Donor country personnel'
            WHEN 'D02' THEN 'Other technical assistance'
            WHEN 'E01' THEN 'Scholarships/training in donor country'
            WHEN 'E02' THEN 'Imputed student costs'
            WHEN 'F01' THEN 'Debt relief'
            WHEN 'G01' THEN 'Administrative costs not included elsewhere'
            WHEN 'H01' THEN 'Development awareness'
            WHEN 'H02' THEN 'Refugees/asylum seekers in donor countries'
        END as name
    FROM unnest(ARRAY['A01','A02','B01','B02','B03','B04','C01','D01','D02','E01','E02','F01','G01','H01','H02']) as code
),
flow_type_values AS (
    SELECT
        'flow_type' as field_name,
        code,
        CASE code
            WHEN '10' THEN 'ODA'
            WHEN '11' THEN 'OOF non-export credit'
            WHEN '20' THEN 'Non flow'
            WHEN '21' THEN 'Private Development Finance'
            WHEN '22' THEN 'Private grants'
            WHEN '30' THEN 'Non ODA other flows: Officially supported export credits'
            WHEN '35' THEN 'Private market'
            WHEN '36' THEN 'Private foreign direct investment'
            WHEN '37' THEN 'Private grants (market rate)'
            WHEN '40' THEN 'Non flow: GNI deduction'
            WHEN '50' THEN 'Other flows'
        END as name
    FROM unnest(ARRAY['10','11','20','21','22','30','35','36','37','40','50']) as code
),
finance_type_values AS (
    SELECT
        'finance_type' as field_name,
        code,
        CASE code
            WHEN '100' THEN 'Grant'
            WHEN '110' THEN 'Standard grant'
            WHEN '111' THEN 'Subsidies to national private investors'
            WHEN '210' THEN 'Interest subsidy'
            WHEN '211' THEN 'Interest subsidy to national private exporters'
            WHEN '310' THEN 'Deposit basis'
            WHEN '311' THEN 'Deposit basis (deposit in recipient central bank)'
            WHEN '400' THEN 'Loan'
            WHEN '410' THEN 'Aid loan excluding debt reorganisation'
            WHEN '411' THEN 'Investment-related loan to developing country'
            WHEN '412' THEN 'Loan in a joint venture with recipient'
            WHEN '413' THEN 'Loan to national private investor'
            WHEN '414' THEN 'Loan to national private exporter'
            WHEN '421' THEN 'Standard loan'
            WHEN '422' THEN 'Reimbursable grant'
            WHEN '423' THEN 'Bonds'
            WHEN '424' THEN 'Asset-backed securities'
            WHEN '425' THEN 'Other debt securities'
            WHEN '431' THEN 'Subordinated loan'
            WHEN '432' THEN 'Preferred equity'
            WHEN '433' THEN 'Other hybrid instruments'
            WHEN '451' THEN 'Non-banks guaranteed export credits'
            WHEN '452' THEN 'Non-banks non-guaranteed portions of guaranteed export credits'
            WHEN '453' THEN 'Bank export credits'
            WHEN '510' THEN 'Common equity'
            WHEN '511' THEN 'Shares in collective investment vehicles'
            WHEN '512' THEN 'Corporate bonds'
            WHEN '520' THEN 'Guarantees and other unfunded contingent liabilities'
            WHEN '610' THEN 'Debt forgiveness: ODA claims'
            WHEN '611' THEN 'Debt forgiveness: ODA claims (P)'
            WHEN '612' THEN 'Debt forgiveness: ODA claims (I)'
            WHEN '613' THEN 'Debt forgiveness: OOF claims'
            WHEN '614' THEN 'Debt forgiveness: Private claims'
            WHEN '615' THEN 'Debt forgiveness: Private claims (including mixed credits)'
            WHEN '616' THEN 'Debt forgiveness: OOF claims (including non-banks)'
            WHEN '617' THEN 'Debt forgiveness: Private export credits'
            WHEN '618' THEN 'Debt forgiveness: Other private claims'
            WHEN '620' THEN 'Debt rescheduling: ODA claims'
            WHEN '621' THEN 'Debt rescheduling: ODA claims (P)'
            WHEN '622' THEN 'Debt rescheduling: ODA claims (I)'
            WHEN '623' THEN 'Debt rescheduling: OOF claims'
            WHEN '624' THEN 'Debt rescheduling: Private claims'
            WHEN '625' THEN 'Debt rescheduling: Private claims (including mixed credits)'
            WHEN '626' THEN 'Debt rescheduling: OOF claims (including non-banks)'
            WHEN '627' THEN 'Debt rescheduling: Private export credits'
            WHEN '630' THEN 'Debt forgiveness and conversion: export credit claims (P)'
            WHEN '631' THEN 'Debt forgiveness: export credit claims (I)'
            WHEN '632' THEN 'Debt forgiveness: export credit claims (DSR)'
            WHEN '700' THEN 'Foreign direct investment'
            WHEN '710' THEN 'Foreign direct investment, new capital outflow'
            WHEN '711' THEN 'Foreign direct investment, reinvested earnings'
            WHEN '810' THEN 'Bank bonds'
            WHEN '910' THEN 'Other bank securities/claims'
            WHEN '1100' THEN 'Guarantees/insurance'
        END as name
    FROM unnest(ARRAY['100','110','111','210','211','310','311','400','410','411','412','413','414','421','422','423','424','425','431','432','433','451','452','453','510','511','512','520','610','611','612','613','614','615','616','617','618','620','621','622','623','624','625','626','627','630','631','632','700','710','711','810','910','1100']) as code
),
disbursement_channel_values AS (
    SELECT
        'disbursement_channel' as field_name,
        code,
        CASE code
            WHEN '1' THEN 'Government'
            WHEN '2' THEN 'Non-governmental agencies'
            WHEN '3' THEN 'Multilateral agencies'
            WHEN '4' THEN 'Public sector institutions'
            WHEN '5' THEN 'Private sector institutions'
            WHEN '6' THEN 'Public-private partnerships'
            WHEN '7' THEN 'Other'
        END as name
    FROM unnest(ARRAY['1','2','3','4','5','6','7']) as code
),
tied_status_values AS (
    SELECT
        'tied_status' as field_name,
        code,
        CASE code
            WHEN '3' THEN 'Partially tied'
            WHEN '4' THEN 'Tied'
            WHEN '5' THEN 'Untied'
        END as name
    FROM unnest(ARRAY['3','4','5']) as code
),
organization_type_values AS (
    SELECT
        'organization_type' as field_name,
        code,
        CASE code
            WHEN '10' THEN 'Government'
            WHEN '11' THEN 'Local Government'
            WHEN '15' THEN 'Other Public Sector'
            WHEN '21' THEN 'International NGO'
            WHEN '22' THEN 'National NGO'
            WHEN '23' THEN 'Regional NGO'
            WHEN '24' THEN 'Partner Country based NGO'
            WHEN '30' THEN 'Public Private Partnership'
            WHEN '40' THEN 'Multilateral'
            WHEN '60' THEN 'Foundation'
            WHEN '70' THEN 'Private Sector'
            WHEN '71' THEN 'Private Sector in Provider Country'
            WHEN '72' THEN 'Private Sector in Aid Recipient Country'
            WHEN '73' THEN 'Private Sector in Third Country'
            WHEN '80' THEN 'Academic, Training and Research'
            WHEN '90' THEN 'Other'
        END as name
    FROM unnest(ARRAY['10','11','15','21','22','23','24','30','40','60','70','71','72','73','80','90']) as code
)
SELECT field_name, code, name FROM transaction_type_values WHERE name IS NOT NULL
UNION ALL
SELECT field_name, code, name FROM aid_type_values WHERE name IS NOT NULL
UNION ALL
SELECT field_name, code, name FROM flow_type_values WHERE name IS NOT NULL
UNION ALL
SELECT field_name, code, name FROM finance_type_values WHERE name IS NOT NULL
UNION ALL
SELECT field_name, code, name FROM disbursement_channel_values WHERE name IS NOT NULL
UNION ALL
SELECT field_name, code, name FROM tied_status_values WHERE name IS NOT NULL
UNION ALL
SELECT field_name, code, name FROM organization_type_values WHERE name IS NOT NULL;

-- Ensure permissions are maintained
GRANT SELECT ON iati_reference_values TO authenticated;
GRANT SELECT ON iati_reference_values TO anon;

-- ============================================================================
-- Step 7: Recreate validation triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_transaction_sector_percentages()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage NUMERIC := 0;
  has_percentages BOOLEAN := FALSE;
BEGIN
  IF NEW.sectors IS NOT NULL AND jsonb_array_length(NEW.sectors) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.sectors) AS elem
      WHERE elem->>'percentage' IS NOT NULL
    ) INTO has_percentages;

    IF has_percentages THEN
      SELECT COALESCE(SUM((elem->>'percentage')::NUMERIC), 0)
      INTO total_percentage
      FROM jsonb_array_elements(NEW.sectors) AS elem
      WHERE elem->>'percentage' IS NOT NULL;

      IF ABS(total_percentage - 100) > 0.01 THEN
        RAISE EXCEPTION 'Transaction sector percentages must sum to 100%%, got %', total_percentage;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_transaction_sectors_trigger ON transactions;
CREATE TRIGGER validate_transaction_sectors_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_sector_percentages();

-- ============================================================================
-- Log completion
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Converted transaction_type enum to TEXT';
  RAISE NOTICE '- Dropped dependent views and recreated them';
  RAISE NOTICE '- transaction_type column is now TEXT with CHECK constraint';
  RAISE NOTICE '- Recreated activity_transaction_summaries materialized view';
  RAISE NOTICE '- Recreated iati_reference_values view';
  RAISE NOTICE '- Recreated validation triggers';
END $$;
