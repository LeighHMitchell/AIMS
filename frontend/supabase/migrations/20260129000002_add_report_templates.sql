-- Migration: Add additional report templates for pivot table
-- Adds 12 new pre-configured report templates

INSERT INTO saved_pivot_reports (name, description, config, is_template, is_public) VALUES
(
    'Aid Type Distribution by Partner',
    'Shows how different partners allocate funding across aid types (grants, loans, technical assistance, etc.)',
    '{
        "rows": ["aid_type"],
        "cols": ["reporting_org_name"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Regional Funding Distribution',
    'Geographic breakdown of funding by state/region over time',
    '{
        "rows": ["subnational_region"],
        "cols": ["fiscal_year"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Sector Trends Over Time',
    'Shows how sector funding priorities have changed year over year',
    '{
        "rows": ["sector_category"],
        "cols": ["fiscal_year"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table Heatmap"
    }'::jsonb,
    true,
    true
),
(
    'Implementing Partner Analysis',
    'Shows which implementing partners work in which sectors',
    '{
        "rows": ["implementing_partners"],
        "cols": ["sector_category"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Finance Type Breakdown',
    'Compares grant vs loan funding by development partner',
    '{
        "rows": ["finance_type"],
        "cols": ["reporting_org_name"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Humanitarian vs Development',
    'Tracks humanitarian vs development funding trends over time',
    '{
        "rows": ["is_humanitarian"],
        "cols": ["fiscal_year"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Activity Pipeline by Status',
    'Shows funding in pipeline, implementation, and closed activities by year',
    '{
        "rows": ["activity_status"],
        "cols": ["fiscal_year"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Monthly Disbursement Trends',
    'Detailed monthly view of disbursements and commitments',
    '{
        "rows": ["fiscal_year", "fiscal_month"],
        "cols": ["transaction_type"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Organization Type Comparison',
    'Compares funding by organization type (bilateral, multilateral, NGO) across sectors',
    '{
        "rows": ["reporting_org_type"],
        "cols": ["sector_category"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Tied Status Analysis',
    'Shows tied vs untied aid by development partner',
    '{
        "rows": ["tied_status"],
        "cols": ["reporting_org_name"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Policy Marker Coverage',
    'Tracks funding aligned with policy markers (gender, environment, climate, etc.)',
    '{
        "rows": ["policy_markers_list"],
        "cols": ["fiscal_year"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Activity Count by Partner and Sector',
    'Shows number of activities per development partner by sector',
    '{
        "rows": ["sector_category"],
        "cols": ["reporting_org_name"],
        "vals": [],
        "aggregatorName": "Count",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
);
