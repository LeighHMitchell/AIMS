-- Migration: Create pivot_report_data view for custom report builder
-- This denormalized view joins activities, transactions, sectors, and organizations
-- to provide a flat structure suitable for pivot table analysis

-- Drop the view if it exists (for safe re-creation)
DROP VIEW IF EXISTS pivot_report_data;

-- Create the denormalized view for pivot reports
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
    
    -- Reporting organization
    COALESCE(o.acronym, o.name, a.created_by_org_name) AS reporting_org_name,
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
    
    -- Fiscal year/quarter derived from transaction date
    EXTRACT(YEAR FROM t.transaction_date)::INTEGER AS fiscal_year,
    CONCAT('Q', EXTRACT(QUARTER FROM t.transaction_date)::INTEGER) AS fiscal_quarter,
    EXTRACT(MONTH FROM t.transaction_date)::INTEGER AS fiscal_month,
    
    -- Sector classification
    s.sector_code,
    s.sector_name,
    s.category_code AS sector_category_code,
    s.category_name AS sector_category,
    COALESCE(s.percentage, 100) AS sector_percentage,
    
    -- Default classifications from activity
    a.default_aid_type AS aid_type,
    a.default_finance_type AS finance_type,
    a.default_flow_type AS flow_type,
    a.default_tied_status AS tied_status,
    
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
COMMENT ON VIEW pivot_report_data IS 'Denormalized view for pivot table reports. Joins activities, transactions, sectors, and organizations. Only includes published activities.';

-- Grant access to authenticated users (view inherits RLS from underlying tables)
GRANT SELECT ON pivot_report_data TO authenticated;
