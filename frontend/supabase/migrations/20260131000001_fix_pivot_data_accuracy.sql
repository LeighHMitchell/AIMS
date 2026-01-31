-- Migration: Fix Pivot Report Data Accuracy Issues
--
-- This migration addresses several critical data accuracy issues:
-- 1. SECTOR ALLOCATION: Activities appear under ALL their sectors (intentional row multiplication)
--    - Use weighted_amount_usd for accurate sector totals (applies sector_percentage)
--    - Use amount_usd only when NOT grouping by sector
-- 2. WEIGHTED AMOUNTS: Adds weighted_amount_usd = amount × sector_percentage / 100
-- 3. CURRENCY FLAG: Adds is_original_currency flag to indicate when amounts aren't converted to USD
-- 4. AMOUNT SEPARATION: Clarifies that different amount types should not be summed together
--
-- IMPORTANT: Users should filter by record_type to avoid mixing transactions/budgets/forecasts

-- Drop and recreate the view with fixes
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

    -- Combined amount field (USE WITH CAUTION - only valid when filtering by single record_type)
    -- WARNING: Do not sum this across different record_types!
    COALESCE(transaction_value_usd, 0) + COALESCE(planned_disbursement_value_usd, 0) + COALESCE(budget_value_usd, 0) AS amount_usd,

    -- NEW: Weighted amount that applies sector_percentage
    -- Use this for accurate sector-level analysis
    ROUND(
        (COALESCE(transaction_value_usd, 0) + COALESCE(planned_disbursement_value_usd, 0) + COALESCE(budget_value_usd, 0))
        * COALESCE(sector_percentage, 100) / 100.0,
        2
    ) AS weighted_amount_usd,

    -- NEW: Flag indicating if the amount is in original currency (not converted to USD)
    -- TRUE means the value might not be accurate USD
    is_original_currency,

    transaction_value_original,
    transaction_currency,
    effective_date,

    -- Calendar-based time fields (for backward compatibility with existing reports)
    fiscal_year,  -- Calendar year (legacy name)
    fiscal_quarter,
    fiscal_month,

    -- Sector classification (now uses primary sector only to avoid duplication)
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
        -- Flag: true if value_usd is NULL and we're using original value
        (t.value_usd IS NULL AND t.value IS NOT NULL) AS is_original_currency,
        t.value AS transaction_value_original,
        t.currency AS transaction_currency,
        t.transaction_date AS effective_date,

        -- Calendar-based time fields
        EXTRACT(YEAR FROM t.transaction_date)::TEXT AS fiscal_year,
        CONCAT('Q', EXTRACT(QUARTER FROM t.transaction_date)::INTEGER) AS fiscal_quarter,
        TO_CHAR(t.transaction_date, 'Mon') AS fiscal_month,

        -- Sector classification - FIX: Use LATERAL with LIMIT 1 to avoid row multiplication
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
            ELSE COALESCE(a.default_aid_type, 'Unspecified')
        END AS aid_type,
        a.default_aid_type AS aid_type_code,

        -- Finance Type (simplified)
        CASE a.default_finance_type
            WHEN '110' THEN 'Standard grant'
            WHEN '410' THEN 'Aid loan excluding debt reorganisation'
            WHEN '421' THEN 'Standard loan'
            WHEN '510' THEN 'Common equity'
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

    -- Join ALL sectors - use weighted_amount_usd for accurate sector-level totals
    -- Row multiplication is intentional: activity appears under each sector it belongs to
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
      AND t.uuid IS NOT NULL  -- Only include activities that have transactions

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
        NULL AS transaction_type,  -- Not a transaction, so no transaction type
        NULL AS transaction_type_code,

        -- Amount columns
        NULL::NUMERIC AS transaction_value_usd,
        -- Use amount directly (currency conversion should happen at data entry)
        COALESCE(pd.amount, 0) AS planned_disbursement_value_usd,
        NULL::NUMERIC AS budget_value_usd,
        -- Flag when currency is not USD (user should be aware the value may need conversion)
        (pd.currency IS NOT NULL AND pd.currency != 'USD') AS is_original_currency,
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

        -- Sub-national location (NULL for planned disbursements)
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
    -- Join ALL sectors for accurate weighted analysis
    LEFT JOIN activity_sectors s ON s.activity_id = a.id

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
        NULL AS transaction_type,  -- Not a transaction, so no transaction type
        NULL AS transaction_type_code,

        -- Amount columns
        NULL::NUMERIC AS transaction_value_usd,
        NULL::NUMERIC AS planned_disbursement_value_usd,
        -- Use value directly (currency conversion should happen at data entry)
        COALESCE(ab.value, 0) AS budget_value_usd,
        -- Flag when currency is not USD (user should be aware the value may need conversion)
        (ab.currency IS NOT NULL AND ab.currency != 'USD') AS is_original_currency,
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

        -- Sub-national location (NULL for budgets)
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
    -- Join ALL sectors for accurate weighted analysis
    LEFT JOIN activity_sectors s ON s.activity_id = a.id

    WHERE a.publication_status = 'published'

) combined;

-- Add comment for documentation
COMMENT ON VIEW pivot_report_data IS 'Denormalized view for pivot table reports.

IMPORTANT DATA ACCURACY NOTES:
1. RECORD TYPES: Filter by record_type to avoid mixing incompatible data:
   - "Transaction" = Actual financial transactions
   - "Planned Disbursement" = Forward-looking forecasts
   - "Budget" = Budget allocations
   DO NOT sum amount_usd across different record types!

2. SECTOR ANALYSIS: Activities appear under ALL their sectors.
   - Use weighted_amount_usd when grouping by sector (accurate proportional totals)
   - Use amount_usd only when NOT grouping by sector (to avoid double-counting)

3. CURRENCY FLAG: Check is_original_currency - if TRUE, the USD amount
   may not be accurately converted and is in original currency.

Fields:
- transaction_value_usd: Actual transaction amounts
- planned_disbursement_value_usd: Planned/forecast amounts
- budget_value_usd: Budget allocations
- amount_usd: Combined (USE ONLY when filtering by single record_type AND not grouping by sector)
- weighted_amount_usd: Amount * sector_percentage / 100 (USE for sector analysis)
- is_original_currency: TRUE if USD conversion not available';

-- Grant access to authenticated users
GRANT SELECT ON pivot_report_data TO authenticated;
