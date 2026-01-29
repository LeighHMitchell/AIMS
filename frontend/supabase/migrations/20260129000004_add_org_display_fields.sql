-- Migration: Add organization display field options to pivot_report_data view
-- Adds three separate organization fields:
-- 1. reporting_org_name - Just the organization name
-- 2. reporting_org_acronym - Just the acronym (fallback to name if no acronym)
-- 3. reporting_org_full - Combined "Name (Acronym)" format

-- Drop and recreate the view with new organization fields
DROP VIEW IF EXISTS pivot_report_data;

CREATE OR REPLACE VIEW pivot_report_data AS
SELECT 
    -- Activity identifiers
    a.id AS activity_id,
    a.iati_identifier,
    a.title_narrative AS title,
    
    -- Activity status
    CASE a.activity_status
        WHEN '1' THEN 'Pipeline/Identification'
        WHEN '2' THEN 'Implementation'
        WHEN '3' THEN 'Finalisation'
        WHEN '4' THEN 'Closed'
        WHEN '5' THEN 'Cancelled'
        WHEN '6' THEN 'Suspended'
        ELSE COALESCE(a.activity_status, 'Unknown')
    END AS activity_status,
    a.activity_status AS activity_status_code,
    
    -- Activity dates
    COALESCE(a.actual_start_date, a.planned_start_date) AS start_date,
    COALESCE(a.actual_end_date, a.planned_end_date) AS end_date,
    a.planned_start_date,
    a.planned_end_date,
    a.actual_start_date,
    a.actual_end_date,
    
    -- Reporting organization - THREE OPTIONS for pivot table flexibility
    -- Option 1: Just the organization name
    COALESCE(o.name, a.created_by_org_name) AS reporting_org_name,
    -- Option 2: Just the acronym (fallback to name if no acronym)
    COALESCE(o.acronym, o.name, a.created_by_org_name) AS reporting_org_acronym,
    -- Option 3: Combined "Name (Acronym)" format
    CASE 
        WHEN o.acronym IS NOT NULL AND o.acronym != '' 
        THEN CONCAT(COALESCE(o.name, a.created_by_org_name), ' (', o.acronym, ')')
        ELSE COALESCE(o.name, a.created_by_org_name)
    END AS reporting_org_full,
    -- Organization type
    COALESCE(o."Organisation_Type_Name", o.type) AS reporting_org_type,
    a.reporting_org_id,
    
    -- Transaction details
    t.uuid AS transaction_id,
    CASE t.transaction_type::TEXT
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
        ELSE COALESCE(t.transaction_type::TEXT, 'Unknown')
    END AS transaction_type,
    t.transaction_type::TEXT AS transaction_type_code,
    COALESCE(t.value_usd, 0) AS transaction_value_usd,
    t.value AS transaction_value_original,
    t.currency AS transaction_currency,
    t.transaction_date,
    
    -- Fiscal year/quarter derived from transaction date (cast to TEXT for consistent handling)
    EXTRACT(YEAR FROM t.transaction_date)::TEXT AS fiscal_year,
    CONCAT('Q', EXTRACT(QUARTER FROM t.transaction_date)::INTEGER) AS fiscal_quarter,
    EXTRACT(MONTH FROM t.transaction_date)::INTEGER AS fiscal_month,
    
    -- Sector classification
    s.sector_code,
    s.sector_name,
    s.category_code AS sector_category_code,
    s.category_name AS sector_category,
    COALESCE(s.percentage, 100) AS sector_percentage,
    
    -- Aid Type with human-readable names
    CASE a.default_aid_type
        WHEN 'A01' THEN 'General budget support'
        WHEN 'A02' THEN 'Sector budget support'
        WHEN 'B01' THEN 'Core support to NGOs'
        WHEN 'B02' THEN 'Core contributions to multilateral institutions'
        WHEN 'B03' THEN 'Contributions to pooled programmes and funds'
        WHEN 'B04' THEN 'Basket funds/pooled funding'
        WHEN 'C01' THEN 'Project-type interventions'
        WHEN 'D01' THEN 'Donor country personnel'
        WHEN 'D02' THEN 'Other technical assistance'
        WHEN 'E01' THEN 'Scholarships/training in donor country'
        WHEN 'E02' THEN 'Imputed student costs'
        WHEN 'F01' THEN 'Debt relief'
        WHEN 'G01' THEN 'Administrative costs not included elsewhere'
        WHEN 'H01' THEN 'Development awareness'
        WHEN 'H02' THEN 'Refugees in donor countries'
        ELSE COALESCE(a.default_aid_type, 'Unspecified')
    END AS aid_type,
    a.default_aid_type AS aid_type_code,
    
    -- Finance Type with human-readable names
    CASE a.default_finance_type
        WHEN '110' THEN 'Standard grant'
        WHEN '111' THEN 'Subsidies to national private investors'
        WHEN '210' THEN 'Interest subsidy'
        WHEN '211' THEN 'Interest subsidy to national private exporters'
        WHEN '310' THEN 'Capital subscription on deposit basis'
        WHEN '311' THEN 'Capital subscription on encashment basis'
        WHEN '410' THEN 'Aid loan excluding debt reorganisation'
        WHEN '411' THEN 'Investment-related loan to developing countries'
        WHEN '412' THEN 'Loan in a joint venture with the recipient'
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
        WHEN '511' THEN 'Acquisition of equity not part of joint venture in developing countries'
        WHEN '512' THEN 'Other acquisition of equity'
        WHEN '520' THEN 'Shares in collective investment vehicles'
        WHEN '530' THEN 'Reinvested earnings'
        WHEN '610' THEN 'Debt forgiveness: ODA claims (P)'
        WHEN '611' THEN 'Debt forgiveness: ODA claims (I)'
        WHEN '612' THEN 'Debt forgiveness: OOF claims (P)'
        WHEN '613' THEN 'Debt forgiveness: OOF claims (I)'
        WHEN '614' THEN 'Debt forgiveness: Private claims (P)'
        WHEN '615' THEN 'Debt forgiveness: Private claims (I)'
        WHEN '616' THEN 'Debt forgiveness: OOF claims (DSR)'
        WHEN '617' THEN 'Debt forgiveness: Private claims (DSR)'
        WHEN '618' THEN 'Debt forgiveness: Other'
        WHEN '620' THEN 'Debt rescheduling: ODA claims (P)'
        WHEN '621' THEN 'Debt rescheduling: ODA claims (I)'
        WHEN '622' THEN 'Debt rescheduling: OOF claims (P)'
        WHEN '623' THEN 'Debt rescheduling: OOF claims (I)'
        WHEN '624' THEN 'Debt rescheduling: Private claims (P)'
        WHEN '625' THEN 'Debt rescheduling: Private claims (I)'
        WHEN '626' THEN 'Debt rescheduling: OOF claims (DSR)'
        WHEN '627' THEN 'Debt rescheduling: Private claims (DSR)'
        WHEN '630' THEN 'Debt rescheduling: OOF claim (DSR – Loss)'
        WHEN '631' THEN 'Debt rescheduling: Private claim (DSR – Loss)'
        WHEN '632' THEN 'Debt forgiveness/conversion: export credit claims (P)'
        WHEN '633' THEN 'Debt forgiveness/conversion: export credit claims (I)'
        WHEN '634' THEN 'Debt forgiveness/conversion: export credit claims (DSR)'
        WHEN '635' THEN 'Debt forgiveness: export credit claims (DSR - Loss)'
        WHEN '636' THEN 'Debt rescheduling: export credit claims (P)'
        WHEN '637' THEN 'Debt rescheduling: export credit claims (I)'
        WHEN '638' THEN 'Debt rescheduling: export credit claims (DSR)'
        WHEN '639' THEN 'Debt rescheduling: export credit claims (DSR - Loss)'
        WHEN '710' THEN 'Foreign direct investment, new capital outflow'
        WHEN '711' THEN 'FDI – Reinvested earnings'
        WHEN '712' THEN 'Foreign direct investment, capital outflow - Debt instruments'
        WHEN '810' THEN 'Bank bonds'
        WHEN '811' THEN 'Non-bank bonds'
        WHEN '910' THEN 'Other bank securities/claims'
        WHEN '911' THEN 'Other non-bank securities/claims'
        WHEN '912' THEN 'Other bank claims'
        WHEN '913' THEN 'Other non-bank claims'
        WHEN '1100' THEN 'Guarantees/insurance'
        ELSE COALESCE(a.default_finance_type, 'Unspecified')
    END AS finance_type,
    a.default_finance_type AS finance_type_code,
    
    -- Flow Type with human-readable names
    CASE a.default_flow_type
        WHEN '10' THEN 'ODA'
        WHEN '20' THEN 'OOF'
        WHEN '21' THEN 'Non-export credit OOF'
        WHEN '22' THEN 'Officially supported export credits'
        WHEN '30' THEN 'Private grants'
        WHEN '35' THEN 'Private market'
        WHEN '36' THEN 'Private Foreign Direct Investment'
        WHEN '37' THEN 'Other Private flows at market terms'
        WHEN '40' THEN 'Non flow'
        WHEN '50' THEN 'Other flows'
        ELSE COALESCE(a.default_flow_type, 'Unspecified')
    END AS flow_type,
    a.default_flow_type AS flow_type_code,
    
    -- Tied Status with human-readable names
    CASE a.default_tied_status
        WHEN '1' THEN 'Untied'
        WHEN '2' THEN 'Partially tied'
        WHEN '3' THEN 'Tied'
        WHEN '4' THEN 'Untied (Recipient)'
        WHEN '5' THEN 'Free-standing TC'
        ELSE COALESCE(a.default_tied_status, 'Unspecified')
    END AS tied_status,
    a.default_tied_status AS tied_status_code,
    
    -- Activity scope
    CASE a.activity_scope
        WHEN '1' THEN 'Global'
        WHEN '2' THEN 'Regional'
        WHEN '3' THEN 'Multi-national'
        WHEN '4' THEN 'National'
        WHEN '5' THEN 'Sub-national: Multi-first-level administrative areas'
        WHEN '6' THEN 'Sub-national: Single first-level administrative area'
        WHEN '7' THEN 'Sub-national: Single second-level administrative area'
        WHEN '8' THEN 'Single location'
        ELSE COALESCE(a.activity_scope, 'Unspecified')
    END AS activity_scope,
    
    -- Collaboration type
    CASE a.collaboration_type
        WHEN '1' THEN 'Bilateral'
        WHEN '2' THEN 'Multilateral (inflows)'
        WHEN '3' THEN 'Bilateral, core contributions'
        WHEN '4' THEN 'Multilateral outflows'
        WHEN '5' THEN 'Private sector outflows'
        WHEN '6' THEN 'Bilateral, ex-post reporting on NGOs'
        WHEN '7' THEN 'Bilateral, triangular co-operation'
        WHEN '8' THEN 'Bilateral, ex-post reporting on institutional'
        ELSE COALESCE(a.collaboration_type, 'Unspecified')
    END AS collaboration_type,
    
    -- Timestamps
    a.created_at AS activity_created_at,
    a.updated_at AS activity_updated_at,
    t.created_at AS transaction_created_at

FROM activities a
-- Only include published activities for reporting
LEFT JOIN organizations o ON a.reporting_org_id = o.id
LEFT JOIN transactions t ON t.activity_id = a.id
LEFT JOIN activity_sectors s ON s.activity_id = a.id
WHERE a.publication_status = 'published';

-- Add comment for documentation
COMMENT ON VIEW pivot_report_data IS 'Denormalized view for pivot table reports. Includes three organization display options: reporting_org_name (name only), reporting_org_acronym (acronym or name), reporting_org_full (Name + Acronym combined).';

-- Grant access to authenticated users
GRANT SELECT ON pivot_report_data TO authenticated;
