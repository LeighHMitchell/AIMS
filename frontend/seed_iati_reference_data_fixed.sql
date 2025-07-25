-- IATI Reference Data Seed Script (Fixed Version)
-- This script populates reference data for IATI-compliant transaction fields
-- Uses proper CTE structure to avoid set-returning function issues
-- Version: IATI 2.03

-- Create helper function to get ENUM values for validation
CREATE OR REPLACE FUNCTION get_enum_values(enum_type text)
RETURNS text[] AS $$
DECLARE
    result text[];
BEGIN
    EXECUTE format('SELECT enum_range(NULL::%s)', enum_type) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a view to easily access all valid ENUM values for frontend dropdowns
CREATE OR REPLACE VIEW iati_reference_values AS
WITH transaction_type_values AS (
    SELECT 
        'transaction_type' as field_name,
        code,
        CASE code
            WHEN '1' THEN 'Incoming Commitment'
            WHEN '2' THEN 'Outgoing Commitment'
            WHEN '3' THEN 'Disbursement'
            WHEN '4' THEN 'Expenditure'
            WHEN '5' THEN 'Interest Repayment'
            WHEN '6' THEN 'Loan Repayment'
            WHEN '7' THEN 'Reimbursement'
            WHEN '8' THEN 'Purchase of Equity'
            WHEN '9' THEN 'Sale of Equity'
            WHEN '11' THEN 'Credit Guarantee'
            WHEN '12' THEN 'Incoming Funds'
            WHEN '13' THEN 'Commitment Cancellation'
        END as name
    FROM unnest(get_enum_values('transaction_type_enum')) as code
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
    FROM unnest(get_enum_values('aid_type_enum')) as code
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
    FROM unnest(get_enum_values('flow_type_enum')) as code
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
    FROM unnest(get_enum_values('finance_type_enum')) as code
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
    FROM unnest(get_enum_values('disbursement_channel_enum')) as code
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
    FROM unnest(get_enum_values('tied_status_enum')) as code
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
    FROM unnest(get_enum_values('organization_type_enum')) as code
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

-- Grant permissions to authenticated users
GRANT SELECT ON iati_reference_values TO authenticated;

-- Note: Cannot create indexes on views, but performance should be fine for reference data

-- Create a function to validate transaction values before insert/update
CREATE OR REPLACE FUNCTION validate_transaction_values()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate transaction_type
    IF NEW.transaction_type IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM iati_reference_values WHERE field_name = 'transaction_type' AND code = NEW.transaction_type) THEN
            RAISE EXCEPTION 'Invalid transaction_type: %. Valid values are: %', 
                NEW.transaction_type, 
                (SELECT string_agg(code || ' (' || name || ')', ', ') FROM iati_reference_values WHERE field_name = 'transaction_type');
        END IF;
    END IF;

    -- Validate aid_type
    IF NEW.aid_type IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM iati_reference_values WHERE field_name = 'aid_type' AND code = NEW.aid_type) THEN
            RAISE EXCEPTION 'Invalid aid_type: %. Valid values include: A01, A02, B01, B02, B03, B04, C01, D01, D02, E01, E02, F01, G01, H01, H02', NEW.aid_type;
        END IF;
    END IF;

    -- Validate flow_type
    IF NEW.flow_type IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM iati_reference_values WHERE field_name = 'flow_type' AND code = NEW.flow_type) THEN
            RAISE EXCEPTION 'Invalid flow_type: %. Valid values are: %', 
                NEW.flow_type,
                (SELECT string_agg(code || ' (' || name || ')', ', ') FROM iati_reference_values WHERE field_name = 'flow_type');
        END IF;
    END IF;

    -- Validate finance_type
    IF NEW.finance_type IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM iati_reference_values WHERE field_name = 'finance_type' AND code = NEW.finance_type) THEN
            RAISE EXCEPTION 'Invalid finance_type: %. Common values include: 100 (Grant), 110 (Standard grant), 400 (Loan), 410 (Aid loan)', NEW.finance_type;
        END IF;
    END IF;

    -- Validate disbursement_channel
    IF NEW.disbursement_channel IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM iati_reference_values WHERE field_name = 'disbursement_channel' AND code = NEW.disbursement_channel) THEN
            RAISE EXCEPTION 'Invalid disbursement_channel: %. Valid values are: %', 
                NEW.disbursement_channel,
                (SELECT string_agg(code || ' (' || name || ')', ', ') FROM iati_reference_values WHERE field_name = 'disbursement_channel');
        END IF;
    END IF;

    -- Validate tied_status
    IF NEW.tied_status IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM iati_reference_values WHERE field_name = 'tied_status' AND code = NEW.tied_status) THEN
            RAISE EXCEPTION 'Invalid tied_status: %. Valid values are: %', 
                NEW.tied_status,
                (SELECT string_agg(code || ' (' || name || ')', ', ') FROM iati_reference_values WHERE field_name = 'tied_status');
        END IF;
    END IF;

    -- Validate provider_org_type
    IF NEW.provider_org_type IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM iati_reference_values WHERE field_name = 'organization_type' AND code = NEW.provider_org_type) THEN
            RAISE EXCEPTION 'Invalid provider_org_type: %. Common values include: 10 (Government), 21 (International NGO), 40 (Multilateral), 70 (Private Sector)', NEW.provider_org_type;
        END IF;
    END IF;

    -- Validate receiver_org_type
    IF NEW.receiver_org_type IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM iati_reference_values WHERE field_name = 'organization_type' AND code = NEW.receiver_org_type) THEN
            RAISE EXCEPTION 'Invalid receiver_org_type: %. Common values include: 10 (Government), 21 (International NGO), 40 (Multilateral), 70 (Private Sector)', NEW.receiver_org_type;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate transaction values
DROP TRIGGER IF EXISTS validate_transaction_values_trigger ON transactions;
CREATE TRIGGER validate_transaction_values_trigger
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_transaction_values();

-- Create API endpoint function to get reference values
CREATE OR REPLACE FUNCTION get_iati_reference_values(p_field_name text DEFAULT NULL)
RETURNS TABLE(field_name text, code text, name text) AS $$
BEGIN
    IF p_field_name IS NULL THEN
        RETURN QUERY SELECT * FROM iati_reference_values ORDER BY iati_reference_values.field_name, iati_reference_values.code;
    ELSE
        RETURN QUERY SELECT * FROM iati_reference_values WHERE iati_reference_values.field_name = p_field_name ORDER BY iati_reference_values.code;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_iati_reference_values(text) TO authenticated;

-- Add helpful comments
COMMENT ON VIEW iati_reference_values IS 'IATI reference values for transaction fields based on IATI Standard 2.03';
COMMENT ON FUNCTION get_iati_reference_values IS 'Get IATI reference values for dropdown fields. Pass field name to filter, or NULL for all fields.';
COMMENT ON FUNCTION validate_transaction_values IS 'Validates transaction field values against IATI reference values before insert/update';

-- Test the view works
SELECT 'Setup completed successfully!' as status;
SELECT field_name, count(*) as value_count 
FROM iati_reference_values 
GROUP BY field_name 
ORDER BY field_name;