-- Migration: Update pivot_report_data view for multi-year types and financial data
-- This migration:
-- 1. UNIONs transactions, planned_disbursements, and activity_budgets
-- 2. Adds separate amount columns for each data type
-- 3. Adds dynamic year columns for each fiscal year type
-- 4. Adds record_type column for filtering

-- Drop and recreate the view
DROP VIEW IF EXISTS pivot_report_data;

CREATE OR REPLACE VIEW pivot_report_data AS
SELECT 
    -- Activity identifiers
    activity_id,
    iati_identifier,
    title,
    
    -- Activity status
    activity_status,
    activity_status_code,
    
    -- Activity dates
    start_date,
    end_date,
    planned_start_date,
    planned_end_date,
    actual_start_date,
    actual_end_date,
    
    -- Reporting organization (multiple display options)
    reporting_org_name,
    reporting_org_acronym,
    reporting_org_full,
    reporting_org_type,
    reporting_org_id,
    
    -- Transaction/record details
    record_id,
    record_type,  -- 'Transaction', 'Planned Disbursement', 'Budget'
    transaction_type,
    transaction_type_code,
    
    -- Amount columns - only one will be non-zero per row
    transaction_value_usd,
    planned_disbursement_value_usd,
    budget_value_usd,
    
    -- Legacy amount field (sum of all types for backward compatibility)
    COALESCE(transaction_value_usd, 0) + COALESCE(planned_disbursement_value_usd, 0) + COALESCE(budget_value_usd, 0) AS amount_usd,
    
    transaction_value_original,
    transaction_currency,
    effective_date,
    
    -- Calendar-based time fields (for backward compatibility)
    fiscal_year,  -- Calendar year (legacy name)
    fiscal_quarter,
    fiscal_month,
    
    -- Fiscal Year columns - one for each year type
    -- Calendar Year (Jan-Dec)
    EXTRACT(YEAR FROM effective_date)::TEXT AS calendar_year,
    -- US Fiscal Year (Oct-Sep, labeled by end year)
    get_fiscal_year(effective_date, 10, 1)::TEXT AS us_fiscal_year,
    -- Australian Fiscal Year (Jul-Jun, labeled by end year)
    get_fiscal_year(effective_date, 7, 1)::TEXT AS australian_fiscal_year,
    -- UK Fiscal Year (Apr 6 - Apr 5, labeled by end year)
    get_fiscal_year(effective_date, 4, 6)::TEXT AS uk_fiscal_year,
    -- UK Financial Year (Apr 1 - Mar 31, labeled by end year)
    get_fiscal_year(effective_date, 4, 1)::TEXT AS uk_financial_year,
    
    -- Sector classification
    sector_code,
    sector_name,
    sector_category_code,
    sector_category,
    sector_percentage,
    
    -- Aid Type
    aid_type,
    aid_type_code,
    
    -- Finance Type
    finance_type,
    finance_type_code,
    
    -- Flow Type
    flow_type,
    flow_type_code,
    
    -- Tied Status
    tied_status,
    tied_status_code,
    
    -- Activity scope
    activity_scope,
    
    -- Collaboration type
    collaboration_type,
    
    -- Sub-national location
    subnational_region,
    subnational_percentage,
    is_nationwide,
    
    -- Implementing Partner
    implementing_partners,
    
    -- Funding Organization
    funding_organizations,
    
    -- Policy Markers
    policy_markers_list,
    
    -- Humanitarian
    is_humanitarian,
    humanitarian_scope_type,
    humanitarian_scope_code,
    
    -- Timestamps
    activity_created_at,
    activity_updated_at,
    record_created_at

FROM (
    -- =========================================
    -- TRANSACTIONS
    -- =========================================
    SELECT 
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
        COALESCE(o.name, a.created_by_org_name) AS reporting_org_name,
        COALESCE(o.acronym, o.name, a.created_by_org_name) AS reporting_org_acronym,
        CASE 
            WHEN o.acronym IS NOT NULL AND o.acronym != '' 
            THEN CONCAT(COALESCE(o.name, a.created_by_org_name), ' (', o.acronym, ')')
            ELSE COALESCE(o.name, a.created_by_org_name)
        END AS reporting_org_full,
        COALESCE(o."Organisation_Type_Name", o.type) AS reporting_org_type,
        a.reporting_org_id,
        
        -- Record details
        t.uuid::TEXT AS record_id,
        'Transaction' AS record_type,
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
        
        -- Amount columns
        COALESCE(t.value_usd, 0) AS transaction_value_usd,
        NULL::NUMERIC AS planned_disbursement_value_usd,
        NULL::NUMERIC AS budget_value_usd,
        t.value AS transaction_value_original,
        t.currency AS transaction_currency,
        t.transaction_date AS effective_date,
        
        -- Calendar-based time fields
        EXTRACT(YEAR FROM t.transaction_date)::TEXT AS fiscal_year,
        CONCAT('Q', EXTRACT(QUARTER FROM t.transaction_date)::INTEGER) AS fiscal_quarter,
        TO_CHAR(t.transaction_date, 'Mon') AS fiscal_month,
        
        -- Sector classification
        s.sector_code,
        s.sector_name,
        s.category_code AS sector_category_code,
        s.category_name AS sector_category,
        COALESCE(s.percentage, 100) AS sector_percentage,
        
        -- Aid Type (complete IATI codelist)
        CASE a.default_aid_type
            WHEN 'A01' THEN 'General budget support'
            WHEN 'A02' THEN 'Sector budget support'
            WHEN 'B01' THEN 'Core support to NGOs, other private bodies, PPPs and research institutes'
            WHEN 'B02' THEN 'Core contributions to multilateral institutions and global funds'
            WHEN 'B021' THEN 'Core contributions to multilateral institutions'
            WHEN 'B022' THEN 'Core contributions to global funds'
            WHEN 'B03' THEN 'Contributions to specific-purpose programmes and funds managed by implementing partners'
            WHEN 'B031' THEN 'Contributions to multi-donor/multi-entity funding mechanisms'
            WHEN 'B032' THEN 'Contributions to multi-donor/single-entity funding mechanisms'
            WHEN 'B033' THEN 'Contributions to single-donor funding mechanisms'
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
            WHEN 'H03' THEN 'Asylum-seekers ultimately accepted'
            WHEN 'H04' THEN 'Asylum-seekers ultimately rejected'
            WHEN 'H05' THEN 'Recognised refugees'
            WHEN 'H06' THEN 'Refugees and asylum seekers in other provider countries'
            ELSE COALESCE(a.default_aid_type, 'Unspecified')
        END AS aid_type,
        a.default_aid_type AS aid_type_code,
        
        -- Finance Type
        CASE a.default_finance_type
            WHEN '1' THEN 'GNI: Gross National Income'
            WHEN '2' THEN 'ODA % GNI'
            WHEN '3' THEN 'Total Flows % GNI'
            WHEN '4' THEN 'Population'
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
            WHEN '511' THEN 'Acquisition of equity not part of joint venture'
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
            WHEN '630' THEN 'Debt rescheduling: OOF claim (DSR - Loss)'
            WHEN '631' THEN 'Debt rescheduling: Private claim (DSR - Loss)'
            WHEN '632' THEN 'Debt forgiveness/conversion: export credit claims (P)'
            WHEN '633' THEN 'Debt forgiveness/conversion: export credit claims (I)'
            WHEN '634' THEN 'Debt forgiveness/conversion: export credit claims (DSR)'
            WHEN '635' THEN 'Debt forgiveness: export credit claims (DSR - Loss)'
            WHEN '636' THEN 'Debt rescheduling: export credit claims (P)'
            WHEN '637' THEN 'Debt rescheduling: export credit claims (I)'
            WHEN '638' THEN 'Debt rescheduling: export credit claims (DSR)'
            WHEN '639' THEN 'Debt rescheduling: export credit claims (DSR - Loss)'
            WHEN '710' THEN 'Foreign direct investment, new capital outflow'
            WHEN '711' THEN 'FDI - Reinvested earnings'
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
        
        -- Flow Type
        CASE a.default_flow_type
            WHEN '10' THEN 'ODA'
            WHEN '20' THEN 'OOF'
            WHEN '21' THEN 'Non-export credit OOF'
            WHEN '22' THEN 'Officially supported export credits'
            WHEN '30' THEN 'Private Development Finance'
            WHEN '35' THEN 'Private market'
            WHEN '36' THEN 'Private Foreign Direct Investment'
            WHEN '37' THEN 'Other Private flows at market terms'
            WHEN '40' THEN 'Non flow'
            WHEN '50' THEN 'Other flows'
            ELSE COALESCE(a.default_flow_type, 'Unspecified')
        END AS flow_type,
        a.default_flow_type AS flow_type_code,
        
        -- Tied Status
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
        
        -- Sub-national location
        sb.region_name AS subnational_region,
        sb.percentage AS subnational_percentage,
        COALESCE(sb.is_nationwide, false) AS is_nationwide,
        
        -- Implementing Partner
        impl.implementing_partners,
        
        -- Funding Organization
        ext.funding_organizations,
        
        -- Policy Markers
        pm.policy_markers_list,
        
        -- Humanitarian
        COALESCE(a.humanitarian, false) AS is_humanitarian,
        hs.humanitarian_scope_type,
        hs.humanitarian_scope_code,
        
        -- Timestamps
        a.created_at AS activity_created_at,
        a.updated_at AS activity_updated_at,
        t.created_at AS record_created_at

    FROM activities a
    LEFT JOIN organizations o ON a.reporting_org_id = o.id
    LEFT JOIN transactions t ON t.activity_id = a.id
    LEFT JOIN activity_sectors s ON s.activity_id = a.id
    
    -- Sub-national breakdowns (aggregate to avoid row multiplication)
    LEFT JOIN LATERAL (
        SELECT 
            sb_inner.activity_id,
            STRING_AGG(DISTINCT sb_inner.region_name, ', ' ORDER BY sb_inner.region_name) AS region_name,
            BOOL_OR(sb_inner.is_nationwide) AS is_nationwide,
            SUM(sb_inner.percentage) AS percentage
        FROM subnational_breakdowns sb_inner
        WHERE sb_inner.activity_id = a.id
        GROUP BY sb_inner.activity_id
    ) sb ON true
    
    -- Implementing partners (aggregated)
    LEFT JOIN LATERAL (
        SELECT 
            apo.activity_id,
            STRING_AGG(DISTINCT COALESCE(org.acronym, org.name), ', ' ORDER BY COALESCE(org.acronym, org.name)) AS implementing_partners
        FROM activity_participating_organizations apo
        JOIN organizations org ON org.id = apo.organization_id
        WHERE apo.activity_id = a.id AND apo.role_type = 'implementing'
        GROUP BY apo.activity_id
    ) impl ON true
    
    -- Funding/Extending organizations (aggregated)
    LEFT JOIN LATERAL (
        SELECT 
            apo.activity_id,
            STRING_AGG(DISTINCT COALESCE(org.acronym, org.name), ', ' ORDER BY COALESCE(org.acronym, org.name)) AS funding_organizations
        FROM activity_participating_organizations apo
        JOIN organizations org ON org.id = apo.organization_id
        WHERE apo.activity_id = a.id AND apo.role_type = 'extending'
        GROUP BY apo.activity_id
    ) ext ON true
    
    -- Policy markers (aggregated with significance)
    LEFT JOIN LATERAL (
        SELECT 
            apm.activity_id,
            STRING_AGG(
                DISTINCT pm_inner.name || 
                CASE apm.significance 
                    WHEN 0 THEN ' (Not targeted)'
                    WHEN 1 THEN ' (Significant)'
                    WHEN 2 THEN ' (Principal)'
                    WHEN 3 THEN ' (Principal+)'
                    WHEN 4 THEN ' (Primary)'
                    ELSE ''
                END,
                ', ' ORDER BY pm_inner.name || 
                CASE apm.significance 
                    WHEN 0 THEN ' (Not targeted)'
                    WHEN 1 THEN ' (Significant)'
                    WHEN 2 THEN ' (Principal)'
                    WHEN 3 THEN ' (Principal+)'
                    WHEN 4 THEN ' (Primary)'
                    ELSE ''
                END
            ) AS policy_markers_list
        FROM activity_policy_markers apm
        JOIN policy_markers pm_inner ON pm_inner.uuid = apm.policy_marker_id
        WHERE apm.activity_id = a.id AND apm.significance > 0
        GROUP BY apm.activity_id
    ) pm ON true
    
    -- Humanitarian scope (first entry if multiple)
    LEFT JOIN LATERAL (
        SELECT 
            hs_inner.activity_id,
            CASE hs_inner.type
                WHEN '1' THEN 'Emergency'
                WHEN '2' THEN 'Appeal'
                ELSE hs_inner.type
            END AS humanitarian_scope_type,
            hs_inner.code AS humanitarian_scope_code
        FROM humanitarian_scope hs_inner
        WHERE hs_inner.activity_id = a.id
        ORDER BY hs_inner.created_at
        LIMIT 1
    ) hs ON true
    
    WHERE a.publication_status = 'published'
    
    UNION ALL
    
    -- =========================================
    -- PLANNED DISBURSEMENTS
    -- =========================================
    SELECT 
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
        COALESCE(o.name, a.created_by_org_name) AS reporting_org_name,
        COALESCE(o.acronym, o.name, a.created_by_org_name) AS reporting_org_acronym,
        CASE 
            WHEN o.acronym IS NOT NULL AND o.acronym != '' 
            THEN CONCAT(COALESCE(o.name, a.created_by_org_name), ' (', o.acronym, ')')
            ELSE COALESCE(o.name, a.created_by_org_name)
        END AS reporting_org_full,
        COALESCE(o."Organisation_Type_Name", o.type) AS reporting_org_type,
        a.reporting_org_id,
        
        -- Record details
        pd.id::TEXT AS record_id,
        'Planned Disbursement' AS record_type,
        'Planned Disbursement' AS transaction_type,  -- Display-friendly type
        NULL AS transaction_type_code,
        
        -- Amount columns
        NULL::NUMERIC AS transaction_value_usd,
        -- Convert from original currency if USD field not available
        CASE 
            WHEN pd.currency = 'USD' THEN COALESCE(pd.amount, 0)
            ELSE COALESCE(pd.amount, 0)  -- TODO: Use exchange rate conversion if available
        END AS planned_disbursement_value_usd,
        NULL::NUMERIC AS budget_value_usd,
        pd.amount AS transaction_value_original,
        pd.currency AS transaction_currency,
        pd.period_start AS effective_date,
        
        -- Calendar-based time fields
        EXTRACT(YEAR FROM pd.period_start)::TEXT AS fiscal_year,
        CONCAT('Q', EXTRACT(QUARTER FROM pd.period_start)::INTEGER) AS fiscal_quarter,
        TO_CHAR(pd.period_start, 'Mon') AS fiscal_month,
        
        -- Sector classification (use activity's first sector)
        s.sector_code,
        s.sector_name,
        s.category_code AS sector_category_code,
        s.category_name AS sector_category,
        COALESCE(s.percentage, 100) AS sector_percentage,
        
        -- Aid Type (same as activity)
        CASE a.default_aid_type
            WHEN 'A01' THEN 'General budget support'
            WHEN 'A02' THEN 'Sector budget support'
            WHEN 'B01' THEN 'Core support to NGOs, other private bodies, PPPs and research institutes'
            WHEN 'B02' THEN 'Core contributions to multilateral institutions and global funds'
            WHEN 'C01' THEN 'Project-type interventions'
            WHEN 'D01' THEN 'Donor country personnel'
            WHEN 'D02' THEN 'Other technical assistance'
            ELSE COALESCE(a.default_aid_type, 'Unspecified')
        END AS aid_type,
        a.default_aid_type AS aid_type_code,
        
        -- Finance Type
        CASE a.default_finance_type
            WHEN '110' THEN 'Standard grant'
            WHEN '410' THEN 'Aid loan excluding debt reorganisation'
            WHEN '421' THEN 'Standard loan'
            ELSE COALESCE(a.default_finance_type, 'Unspecified')
        END AS finance_type,
        a.default_finance_type AS finance_type_code,
        
        -- Flow Type
        CASE a.default_flow_type
            WHEN '10' THEN 'ODA'
            WHEN '20' THEN 'OOF'
            WHEN '30' THEN 'Private Development Finance'
            ELSE COALESCE(a.default_flow_type, 'Unspecified')
        END AS flow_type,
        a.default_flow_type AS flow_type_code,
        
        -- Tied Status
        CASE a.default_tied_status
            WHEN '1' THEN 'Untied'
            WHEN '2' THEN 'Partially tied'
            WHEN '3' THEN 'Tied'
            ELSE COALESCE(a.default_tied_status, 'Unspecified')
        END AS tied_status,
        a.default_tied_status AS tied_status_code,
        
        -- Activity scope
        CASE a.activity_scope
            WHEN '1' THEN 'Global'
            WHEN '4' THEN 'National'
            ELSE COALESCE(a.activity_scope, 'Unspecified')
        END AS activity_scope,
        
        -- Collaboration type
        CASE a.collaboration_type
            WHEN '1' THEN 'Bilateral'
            WHEN '2' THEN 'Multilateral (inflows)'
            ELSE COALESCE(a.collaboration_type, 'Unspecified')
        END AS collaboration_type,
        
        -- Sub-national location
        NULL AS subnational_region,
        NULL::NUMERIC AS subnational_percentage,
        false AS is_nationwide,
        
        -- Implementing Partner
        NULL AS implementing_partners,
        
        -- Funding Organization
        NULL AS funding_organizations,
        
        -- Policy Markers
        NULL AS policy_markers_list,
        
        -- Humanitarian
        COALESCE(a.humanitarian, false) AS is_humanitarian,
        NULL AS humanitarian_scope_type,
        NULL AS humanitarian_scope_code,
        
        -- Timestamps
        a.created_at AS activity_created_at,
        a.updated_at AS activity_updated_at,
        pd.created_at AS record_created_at

    FROM activities a
    LEFT JOIN organizations o ON a.reporting_org_id = o.id
    JOIN planned_disbursements pd ON pd.activity_id = a.id
    LEFT JOIN LATERAL (
        SELECT * FROM activity_sectors 
        WHERE activity_id = a.id 
        ORDER BY percentage DESC NULLS LAST 
        LIMIT 1
    ) s ON true
    
    WHERE a.publication_status = 'published'
    
    UNION ALL
    
    -- =========================================
    -- ACTIVITY BUDGETS
    -- =========================================
    SELECT 
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
        COALESCE(o.name, a.created_by_org_name) AS reporting_org_name,
        COALESCE(o.acronym, o.name, a.created_by_org_name) AS reporting_org_acronym,
        CASE 
            WHEN o.acronym IS NOT NULL AND o.acronym != '' 
            THEN CONCAT(COALESCE(o.name, a.created_by_org_name), ' (', o.acronym, ')')
            ELSE COALESCE(o.name, a.created_by_org_name)
        END AS reporting_org_full,
        COALESCE(o."Organisation_Type_Name", o.type) AS reporting_org_type,
        a.reporting_org_id,
        
        -- Record details
        ab.id::TEXT AS record_id,
        'Budget' AS record_type,
        CASE ab.type
            WHEN 1 THEN 'Original Budget'
            WHEN 2 THEN 'Revised Budget'
            ELSE 'Budget'
        END AS transaction_type,  -- Display-friendly budget type
        ab.type::TEXT AS transaction_type_code,
        
        -- Amount columns
        NULL::NUMERIC AS transaction_value_usd,
        NULL::NUMERIC AS planned_disbursement_value_usd,
        COALESCE(ab.usd_value, ab.value) AS budget_value_usd,  -- Use USD value if available
        ab.value AS transaction_value_original,
        ab.currency AS transaction_currency,
        ab.period_start AS effective_date,
        
        -- Calendar-based time fields
        EXTRACT(YEAR FROM ab.period_start)::TEXT AS fiscal_year,
        CONCAT('Q', EXTRACT(QUARTER FROM ab.period_start)::INTEGER) AS fiscal_quarter,
        TO_CHAR(ab.period_start, 'Mon') AS fiscal_month,
        
        -- Sector classification (use activity's first sector)
        s.sector_code,
        s.sector_name,
        s.category_code AS sector_category_code,
        s.category_name AS sector_category,
        COALESCE(s.percentage, 100) AS sector_percentage,
        
        -- Aid Type (same as activity)
        CASE a.default_aid_type
            WHEN 'A01' THEN 'General budget support'
            WHEN 'A02' THEN 'Sector budget support'
            WHEN 'B01' THEN 'Core support to NGOs, other private bodies, PPPs and research institutes'
            WHEN 'B02' THEN 'Core contributions to multilateral institutions and global funds'
            WHEN 'C01' THEN 'Project-type interventions'
            WHEN 'D01' THEN 'Donor country personnel'
            WHEN 'D02' THEN 'Other technical assistance'
            ELSE COALESCE(a.default_aid_type, 'Unspecified')
        END AS aid_type,
        a.default_aid_type AS aid_type_code,
        
        -- Finance Type
        CASE a.default_finance_type
            WHEN '110' THEN 'Standard grant'
            WHEN '410' THEN 'Aid loan excluding debt reorganisation'
            WHEN '421' THEN 'Standard loan'
            ELSE COALESCE(a.default_finance_type, 'Unspecified')
        END AS finance_type,
        a.default_finance_type AS finance_type_code,
        
        -- Flow Type
        CASE a.default_flow_type
            WHEN '10' THEN 'ODA'
            WHEN '20' THEN 'OOF'
            WHEN '30' THEN 'Private Development Finance'
            ELSE COALESCE(a.default_flow_type, 'Unspecified')
        END AS flow_type,
        a.default_flow_type AS flow_type_code,
        
        -- Tied Status
        CASE a.default_tied_status
            WHEN '1' THEN 'Untied'
            WHEN '2' THEN 'Partially tied'
            WHEN '3' THEN 'Tied'
            ELSE COALESCE(a.default_tied_status, 'Unspecified')
        END AS tied_status,
        a.default_tied_status AS tied_status_code,
        
        -- Activity scope
        CASE a.activity_scope
            WHEN '1' THEN 'Global'
            WHEN '4' THEN 'National'
            ELSE COALESCE(a.activity_scope, 'Unspecified')
        END AS activity_scope,
        
        -- Collaboration type
        CASE a.collaboration_type
            WHEN '1' THEN 'Bilateral'
            WHEN '2' THEN 'Multilateral (inflows)'
            ELSE COALESCE(a.collaboration_type, 'Unspecified')
        END AS collaboration_type,
        
        -- Sub-national location
        NULL AS subnational_region,
        NULL::NUMERIC AS subnational_percentage,
        false AS is_nationwide,
        
        -- Implementing Partner
        NULL AS implementing_partners,
        
        -- Funding Organization
        NULL AS funding_organizations,
        
        -- Policy Markers
        NULL AS policy_markers_list,
        
        -- Humanitarian
        COALESCE(a.humanitarian, false) AS is_humanitarian,
        NULL AS humanitarian_scope_type,
        NULL AS humanitarian_scope_code,
        
        -- Timestamps
        a.created_at AS activity_created_at,
        a.updated_at AS activity_updated_at,
        ab.created_at AS record_created_at

    FROM activities a
    LEFT JOIN organizations o ON a.reporting_org_id = o.id
    JOIN activity_budgets ab ON ab.activity_id = a.id
    LEFT JOIN LATERAL (
        SELECT * FROM activity_sectors 
        WHERE activity_id = a.id 
        ORDER BY percentage DESC NULLS LAST 
        LIMIT 1
    ) s ON true
    
    WHERE a.publication_status = 'published'
    
) combined;

-- Add comment for documentation
COMMENT ON VIEW pivot_report_data IS 'Denormalized view for pivot table reports. Includes:
- Actual transactions (from transactions table)
- Planned disbursements (from planned_disbursements table)
- Activity budgets (from activity_budgets table)
Each record type has its own amount column (transaction_value_usd, planned_disbursement_value_usd, budget_value_usd).
Multiple fiscal year columns available: calendar_year, us_fiscal_year, australian_fiscal_year, uk_fiscal_year, uk_financial_year.
Filter by record_type to show specific data types.';

-- Grant access to authenticated users
GRANT SELECT ON pivot_report_data TO authenticated;
