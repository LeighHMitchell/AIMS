-- ============================================================================
-- SEED DATA: SDG Profile Test Data
-- ============================================================================
-- Creates 25 activities across all 17 SDGs with transactions, locations,
-- contributors, and SDG mappings to populate the SDG profile pages with
-- enough data to evaluate all tabs (Overview, Targets, Financials,
-- Activities, Donors, Organizations, Geography).
-- ============================================================================

DO $$
DECLARE
    -- Organization IDs (reuse existing orgs)
    org_jica_id UUID;
    org_dfat_id UUID;
    org_usaid_id UUID;
    org_undp_id UUID;
    org_unicef_id UUID;
    org_wfp_id UUID;
    org_unhcr_id UUID;
    org_wb_id UUID;
    org_adb_id UUID;
    org_eu_id UUID;
    org_mopfi_id UUID;
    org_mohs_id UUID;
    org_moe_id UUID;
    org_moali_id UUID;
    org_local_ngo_id UUID;
    -- Additional orgs for diversity
    org_giz_id UUID;
    org_sida_id UUID;
    org_koica_id UUID;
    org_unfpa_id UUID;
    org_fao_id UUID;
    org_ilo_id UUID;
    org_who_id UUID;
    org_unhabitat_id UUID;
BEGIN

    -- ================================================================
    -- RESOLVE EXISTING ORGANIZATIONS
    -- ================================================================
    SELECT id INTO org_jica_id FROM organizations WHERE acronym = 'JICA' LIMIT 1;
    SELECT id INTO org_dfat_id FROM organizations WHERE acronym = 'DFAT' LIMIT 1;
    SELECT id INTO org_usaid_id FROM organizations WHERE acronym = 'USAID' LIMIT 1;
    SELECT id INTO org_undp_id FROM organizations WHERE acronym = 'UNDP' LIMIT 1;
    SELECT id INTO org_unicef_id FROM organizations WHERE acronym = 'UNICEF' LIMIT 1;
    SELECT id INTO org_wfp_id FROM organizations WHERE acronym = 'WFP' LIMIT 1;
    SELECT id INTO org_unhcr_id FROM organizations WHERE acronym = 'UNHCR' LIMIT 1;
    SELECT id INTO org_wb_id FROM organizations WHERE acronym = 'WB' LIMIT 1;
    SELECT id INTO org_adb_id FROM organizations WHERE acronym = 'ADB' LIMIT 1;
    SELECT id INTO org_eu_id FROM organizations WHERE acronym = 'EU' LIMIT 1;
    SELECT id INTO org_mopfi_id FROM organizations WHERE acronym = 'MOPFI' LIMIT 1;
    SELECT id INTO org_mohs_id FROM organizations WHERE acronym = 'MOHS' LIMIT 1;
    SELECT id INTO org_moe_id FROM organizations WHERE acronym = 'MOE' LIMIT 1;
    SELECT id INTO org_moali_id FROM organizations WHERE acronym = 'MOALI' LIMIT 1;
    SELECT id INTO org_local_ngo_id FROM organizations WHERE acronym = 'MDF' LIMIT 1;

    -- ================================================================
    -- INSERT ADDITIONAL ORGANIZATIONS
    -- ================================================================

    -- GIZ
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Deutsche Gesellschaft für Internationale Zusammenarbeit', 'GIZ', '10', 'XM-DAC-5-7', 'Germany',
           'German development agency for international cooperation'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'GIZ')
    RETURNING id INTO org_giz_id;
    IF org_giz_id IS NULL THEN SELECT id INTO org_giz_id FROM organizations WHERE acronym = 'GIZ'; END IF;

    -- Sida
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Swedish International Development Cooperation Agency', 'Sida', '10', 'XM-DAC-7', 'Sweden',
           'Swedish government development cooperation agency'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'Sida')
    RETURNING id INTO org_sida_id;
    IF org_sida_id IS NULL THEN SELECT id INTO org_sida_id FROM organizations WHERE acronym = 'Sida'; END IF;

    -- KOICA
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Korea International Cooperation Agency', 'KOICA', '10', 'XM-DAC-742', 'Republic of Korea',
           'Korean government agency for international development'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'KOICA')
    RETURNING id INTO org_koica_id;
    IF org_koica_id IS NULL THEN SELECT id INTO org_koica_id FROM organizations WHERE acronym = 'KOICA'; END IF;

    -- UNFPA
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'United Nations Population Fund', 'UNFPA', '40', 'XM-DAC-41119', 'International',
           'UN agency for reproductive health and population'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'UNFPA')
    RETURNING id INTO org_unfpa_id;
    IF org_unfpa_id IS NULL THEN SELECT id INTO org_unfpa_id FROM organizations WHERE acronym = 'UNFPA'; END IF;

    -- FAO
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Food and Agriculture Organization', 'FAO', '40', 'XM-DAC-41301', 'International',
           'UN agency for food and agriculture'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'FAO')
    RETURNING id INTO org_fao_id;
    IF org_fao_id IS NULL THEN SELECT id INTO org_fao_id FROM organizations WHERE acronym = 'FAO'; END IF;

    -- ILO
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'International Labour Organization', 'ILO', '40', 'XM-DAC-41302', 'International',
           'UN agency for labour standards and decent work'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'ILO')
    RETURNING id INTO org_ilo_id;
    IF org_ilo_id IS NULL THEN SELECT id INTO org_ilo_id FROM organizations WHERE acronym = 'ILO'; END IF;

    -- WHO
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'World Health Organization', 'WHO', '40', 'XM-DAC-41307', 'International',
           'UN agency for international public health'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'WHO')
    RETURNING id INTO org_who_id;
    IF org_who_id IS NULL THEN SELECT id INTO org_who_id FROM organizations WHERE acronym = 'WHO'; END IF;

    -- UN-Habitat
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'United Nations Human Settlements Programme', 'UN-Habitat', '40', 'XM-DAC-41120', 'International',
           'UN agency for sustainable urbanization'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'UN-Habitat')
    RETURNING id INTO org_unhabitat_id;
    IF org_unhabitat_id IS NULL THEN SELECT id INTO org_unhabitat_id FROM organizations WHERE acronym = 'UN-Habitat'; END IF;


    -- ================================================================
    -- ACTIVITY S01: Social Safety Net Cash Transfer Programme (SDG 1)
    -- Status: Implementation | Donor: WB | Total: $45M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000001'::UUID,
        'XM-DAC-44000-MM-SP-2022-001',
        'Social Safety Net Cash Transfer Programme for Ultra-Poor Households',
        'SSNCT',
        'A nationwide cash transfer programme targeting ultra-poor households with monthly stipends, vocational training, and financial literacy support. Covers 200,000 households across all states and regions.',
        '2', 'published', '2022-06-01', '2027-05-31', '2022-08-01',
        org_wb_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    -- SDG mappings for S01
    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000001', 1, '1.1', 40, 'Eradicating extreme poverty through cash transfers'),
    ('b2000001-0001-4000-8000-000000000001', 1, '1.2', 30, 'Reducing poverty in all dimensions'),
    ('b2000001-0001-4000-8000-000000000001', 1, '1.3', 30, 'Social protection systems for the poor')
    ON CONFLICT DO NOTHING;

    -- Transactions for S01
    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000001', '2', 45000000, 'USD', '2022-06-01', 'World Bank - IDA', 'MOPFI', 'Total commitment: Social Safety Net Programme', 'actual'),
    ('b2000001-0001-4000-8000-000000000001', '3', 4500000, 'USD', '2022-10-15', 'World Bank - IDA', 'MOPFI', 'Q1: Programme setup and beneficiary registration', 'actual'),
    ('b2000001-0001-4000-8000-000000000001', '3', 5200000, 'USD', '2023-01-15', 'World Bank - IDA', 'MOPFI', 'Q2: First round cash transfers', 'actual'),
    ('b2000001-0001-4000-8000-000000000001', '3', 5800000, 'USD', '2023-04-15', 'World Bank - IDA', 'MOPFI', 'Q3: Cash transfers + vocational training', 'actual'),
    ('b2000001-0001-4000-8000-000000000001', '3', 5500000, 'USD', '2023-07-15', 'World Bank - IDA', 'MOPFI', 'Q4: Expanded coverage to Chin State', 'actual'),
    ('b2000001-0001-4000-8000-000000000001', '3', 6000000, 'USD', '2024-01-15', 'World Bank - IDA', 'MOPFI', '2024 Q1: Scale-up phase', 'actual'),
    ('b2000001-0001-4000-8000-000000000001', '3', 5800000, 'USD', '2024-07-15', 'World Bank - IDA', 'MOPFI', '2024 Q2: Financial literacy modules', 'actual'),
    ('b2000001-0001-4000-8000-000000000001', '3', 3200000, 'USD', '2025-01-15', 'World Bank - IDA', 'MOPFI', '2025 Q1: Ongoing transfers', 'actual'),
    ('b2000001-0001-4000-8000-000000000001', '4', 28000000, 'USD', '2024-12-31', 'MOPFI', 'Various', 'Cumulative expenditure through 2024', 'actual');

    -- Locations for S01
    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000001', 'coverage', 'Chin State', 'MM', 'Chin', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000001', 'coverage', 'Rakhine State', 'MM', 'Rakhine', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000001', 'coverage', 'Shan State', 'MM', 'Shan', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000001', 'coverage', 'Ayeyarwady Region', 'MM', 'Ayeyarwady', 'subnational', 25, 'manual', '2', '2', '1');

    -- Contributors for S01
    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000001', org_wb_id, 'World Bank', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000001', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S02: Microfinance Access for Rural Women (SDG 1)
    -- Status: Implementation | Donor: DFAT | Total: $18M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000002'::UUID,
        'XM-DAC-801-MM-FIN-2023-001',
        'Microfinance Access and Financial Inclusion for Rural Women',
        'MAFIR',
        'Expanding microfinance services to 150,000 rural women through mobile banking, savings groups, and business development training in underserved areas.',
        '2', 'published', '2023-01-01', '2026-12-31', '2023-03-01',
        org_dfat_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000002', 1, '1.4', 50, 'Equal rights to economic resources and financial services'),
    ('b2000001-0001-4000-8000-000000000002', 5, '5.a', 30, 'Women equal access to economic resources'),
    ('b2000001-0001-4000-8000-000000000002', 8, '8.3', 20, 'Promote development-oriented policies supporting entrepreneurship')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000002', '2', 18000000, 'USD', '2023-01-01', 'DFAT Australia', 'UNDP Myanmar', 'Total commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000002', '3', 3000000, 'USD', '2023-04-15', 'DFAT Australia', 'UNDP Myanmar', 'Year 1 H1: Savings group formation', 'actual'),
    ('b2000001-0001-4000-8000-000000000002', '3', 3200000, 'USD', '2023-10-15', 'DFAT Australia', 'UNDP Myanmar', 'Year 1 H2: Mobile banking rollout', 'actual'),
    ('b2000001-0001-4000-8000-000000000002', '3', 3500000, 'USD', '2024-04-15', 'DFAT Australia', 'UNDP Myanmar', 'Year 2 H1: Business development training', 'actual'),
    ('b2000001-0001-4000-8000-000000000002', '3', 3300000, 'USD', '2024-10-15', 'DFAT Australia', 'UNDP Myanmar', 'Year 2 H2: Loan disbursement scaling', 'actual'),
    ('b2000001-0001-4000-8000-000000000002', '4', 11500000, 'USD', '2024-12-31', 'UNDP Myanmar', 'Various', 'Expenditure through 2024', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000002', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 35, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000002', 'coverage', 'Sagaing Region', 'MM', 'Sagaing', 'subnational', 35, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000002', 'coverage', 'Magway Region', 'MM', 'Magway', 'subnational', 30, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000002', org_dfat_id, 'DFAT', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000002', org_undp_id, 'UNDP', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S03: Disaster Risk Reduction and Resilience (SDG 1)
    -- Status: Closed | Donor: JICA | Total: $12M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, reporting_org_id, default_aid_type,
        default_finance_type, default_flow_type, default_tied_status, default_currency,
        humanitarian, activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000003'::UUID,
        'XM-DAC-701-MM-DRR-2021-001',
        'Community-Based Disaster Risk Reduction and Resilience Building',
        'CBDRR',
        'Strengthening community resilience to natural disasters in flood-prone and cyclone-affected areas through early warning systems, infrastructure hardening, and livelihood diversification.',
        '4', 'published', '2021-04-01', '2024-03-31', '2021-06-01', '2024-03-31',
        org_jica_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000003', 1, '1.5', 50, 'Building resilience of the poor to climate shocks'),
    ('b2000001-0001-4000-8000-000000000003', 13, '13.1', 50, 'Strengthening resilience to climate-related hazards')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000003', '2', 12000000, 'USD', '2021-04-01', 'JICA', 'MOPFI', 'Full commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000003', '3', 3000000, 'USD', '2021-10-15', 'JICA', 'MOPFI', 'Year 1: Early warning systems', 'actual'),
    ('b2000001-0001-4000-8000-000000000003', '3', 4000000, 'USD', '2022-10-15', 'JICA', 'MOPFI', 'Year 2: Infrastructure hardening', 'actual'),
    ('b2000001-0001-4000-8000-000000000003', '3', 4500000, 'USD', '2023-10-15', 'JICA', 'MOPFI', 'Year 3: Livelihood diversification + closeout', 'actual'),
    ('b2000001-0001-4000-8000-000000000003', '4', 11200000, 'USD', '2024-03-31', 'MOPFI', 'Various', 'Total expenditure at project close', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000003', 'coverage', 'Ayeyarwady Region', 'MM', 'Ayeyarwady', 'subnational', 50, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000003', 'coverage', 'Bago Region', 'MM', 'Bago', 'subnational', 50, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000003', org_jica_id, 'JICA', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000003', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S04: National Food Security and Nutrition Programme (SDG 2)
    -- Status: Implementation | Donor: WFP + EU | Total: $65M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000004'::UUID,
        'XM-DAC-41140-MM-NUT-2022-001',
        'National Food Security and Nutrition Resilience Programme',
        'NFSNRP',
        'Comprehensive food security programme addressing malnutrition in children under 5 through supplementary feeding, school meals, and agricultural extension services in food-insecure regions.',
        '2', 'published', '2022-01-01', '2027-12-31', '2022-04-01',
        org_wfp_id, 'C01', '110', '10', '5', 'USD', true, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000004', 2, '2.1', 40, 'End hunger and ensure food access'),
    ('b2000001-0001-4000-8000-000000000004', 2, '2.2', 35, 'End all forms of malnutrition'),
    ('b2000001-0001-4000-8000-000000000004', 2, '2.3', 25, 'Double smallholder productivity')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000004', '2', 40000000, 'USD', '2022-01-01', 'WFP', 'WFP Myanmar', 'WFP core commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000004', '11', 25000000, 'EUR', '2022-03-01', 'European Union', 'WFP Myanmar', 'EU co-financing commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000004', '1', 20000000, 'USD', '2022-04-01', 'WFP HQ', 'WFP Myanmar', 'Year 1 incoming funds', 'actual'),
    ('b2000001-0001-4000-8000-000000000004', '3', 8000000, 'USD', '2022-10-15', 'WFP Myanmar', 'Various', 'Year 1: Emergency feeding + school meals', 'actual'),
    ('b2000001-0001-4000-8000-000000000004', '3', 12000000, 'USD', '2023-06-15', 'WFP Myanmar', 'Various', 'Year 2 H1: Expanded coverage', 'actual'),
    ('b2000001-0001-4000-8000-000000000004', '3', 11000000, 'USD', '2023-12-15', 'WFP Myanmar', 'Various', 'Year 2 H2: Nutrition supplements', 'actual'),
    ('b2000001-0001-4000-8000-000000000004', '3', 10000000, 'USD', '2024-06-15', 'WFP Myanmar', 'Various', 'Year 3 H1: Agricultural extension', 'actual'),
    ('b2000001-0001-4000-8000-000000000004', '3', 9500000, 'USD', '2024-12-15', 'WFP Myanmar', 'Various', 'Year 3 H2: Ongoing operations', 'actual'),
    ('b2000001-0001-4000-8000-000000000004', '4', 42000000, 'USD', '2024-12-31', 'WFP Myanmar', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000004', 'coverage', 'Rakhine State', 'MM', 'Rakhine', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000004', 'coverage', 'Chin State', 'MM', 'Chin', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000004', 'coverage', 'Kachin State', 'MM', 'Kachin', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000004', 'coverage', 'Shan State', 'MM', 'Shan', 'subnational', 20, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000004', org_wfp_id, 'WFP', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000004', org_eu_id, 'EU', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000004', org_fao_id, 'FAO', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S05: Smallholder Irrigation Modernization (SDG 2)
    -- Status: Pipeline | Donor: ADB | Total: $35M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000005'::UUID,
        'XM-DAC-46004-MM-AGR-2025-001',
        'Smallholder Irrigation Modernization and Water Management Project',
        'SIMWM',
        'Modernizing irrigation infrastructure for 50,000 smallholder farms with solar-powered pumps, drip irrigation, and water harvesting systems in the Dry Zone.',
        '1', 'published', '2025-07-01', '2030-06-30',
        org_adb_id, 'C01', '410', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000005', 2, '2.4', 50, 'Sustainable food production through efficient irrigation'),
    ('b2000001-0001-4000-8000-000000000005', 6, '6.4', 30, 'Substantially increase water-use efficiency'),
    ('b2000001-0001-4000-8000-000000000005', 7, '7.2', 20, 'Increase share of renewable energy - solar pumps')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000005', '2', 35000000, 'USD', '2025-04-01', 'Asian Development Bank', 'MOALI', 'Approved loan commitment', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000005', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 40, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000005', 'coverage', 'Magway Region', 'MM', 'Magway', 'subnational', 35, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000005', 'coverage', 'Sagaing Region', 'MM', 'Sagaing', 'subnational', 25, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000005', org_adb_id, 'ADB', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000005', org_moali_id, 'MOALI', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S06: Universal Health Coverage Expansion (SDG 3)
    -- Status: Implementation | Donor: WHO + Sida | Total: $28M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000006'::UUID,
        'XM-DAC-41307-MM-HLT-2023-001',
        'Universal Health Coverage Expansion and Primary Healthcare Strengthening',
        'UHCPHS',
        'Strengthening primary healthcare delivery across 300 township health departments with essential medicines, diagnostic equipment, health worker training, and referral systems.',
        '2', 'published', '2023-01-01', '2027-12-31', '2023-04-01',
        org_who_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000006', 3, '3.8', 60, 'Achieve universal health coverage'),
    ('b2000001-0001-4000-8000-000000000006', 3, '3.c', 40, 'Increase health financing and health workforce')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000006', '2', 18000000, 'USD', '2023-01-01', 'WHO', 'MOHS', 'WHO commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000006', '11', 10000000, 'USD', '2023-03-01', 'Sida', 'WHO Myanmar', 'Sida co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000006', '3', 4500000, 'USD', '2023-06-15', 'WHO Myanmar', 'MOHS', 'Year 1: Equipment + training', 'actual'),
    ('b2000001-0001-4000-8000-000000000006', '3', 5000000, 'USD', '2024-01-15', 'WHO Myanmar', 'MOHS', 'Year 1 H2: Essential medicines', 'actual'),
    ('b2000001-0001-4000-8000-000000000006', '3', 5500000, 'USD', '2024-06-15', 'WHO Myanmar', 'MOHS', 'Year 2 H1: Referral systems', 'actual'),
    ('b2000001-0001-4000-8000-000000000006', '3', 4000000, 'USD', '2025-01-15', 'WHO Myanmar', 'MOHS', 'Year 2 H2: Diagnostics rollout', 'actual'),
    ('b2000001-0001-4000-8000-000000000006', '4', 16000000, 'USD', '2024-12-31', 'MOHS', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000006', 'coverage', 'Yangon Region', 'MM', 'Yangon', 'subnational', 20, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000006', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 20, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000006', 'coverage', 'Sagaing Region', 'MM', 'Sagaing', 'subnational', 20, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000006', 'coverage', 'Bago Region', 'MM', 'Bago', 'subnational', 20, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000006', 'coverage', 'Magway Region', 'MM', 'Magway', 'subnational', 20, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000006', org_who_id, 'WHO', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000006', org_sida_id, 'Sida', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000006', org_mohs_id, 'MOHS', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S07: Reproductive Health and Family Planning (SDG 3 + SDG 5)
    -- Status: Implementation | Donor: UNFPA | Total: $15M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000007'::UUID,
        'XM-DAC-41119-MM-RH-2023-001',
        'Integrated Reproductive Health and Family Planning Services',
        'IRHFP',
        'Expanding access to reproductive health services, contraceptives, and adolescent-friendly health information in rural and peri-urban areas.',
        '2', 'published', '2023-06-01', '2026-05-31', '2023-08-01',
        org_unfpa_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000007', 3, '3.7', 50, 'Universal access to reproductive health services'),
    ('b2000001-0001-4000-8000-000000000007', 5, '5.6', 50, 'Universal access to reproductive rights')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000007', '2', 15000000, 'USD', '2023-06-01', 'UNFPA', 'UNFPA Myanmar', 'Total commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000007', '3', 3000000, 'USD', '2023-10-15', 'UNFPA', 'MOHS', 'Year 1 H1: Service delivery setup', 'actual'),
    ('b2000001-0001-4000-8000-000000000007', '3', 3500000, 'USD', '2024-04-15', 'UNFPA', 'MOHS', 'Year 1 H2: Contraceptive supplies', 'actual'),
    ('b2000001-0001-4000-8000-000000000007', '3', 3200000, 'USD', '2024-10-15', 'UNFPA', 'MOHS', 'Year 2 H1: Adolescent programs', 'actual'),
    ('b2000001-0001-4000-8000-000000000007', '4', 8500000, 'USD', '2024-12-31', 'MOHS', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000007', 'coverage', 'Kayah State', 'MM', 'Kayah', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000007', 'coverage', 'Kayin State', 'MM', 'Kayin', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000007', 'coverage', 'Mon State', 'MM', 'Mon', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000007', 'coverage', 'Tanintharyi Region', 'MM', 'Tanintharyi', 'subnational', 25, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000007', org_unfpa_id, 'UNFPA', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000007', org_mohs_id, 'MOHS', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S08: Technical and Vocational Education (SDG 4)
    -- Status: Implementation | Donor: KOICA + GIZ | Total: $22M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000008'::UUID,
        'XM-DAC-742-MM-EDU-2023-001',
        'Technical and Vocational Education and Training Modernization',
        'TVETM',
        'Upgrading 40 TVET centres with modern equipment, developing industry-aligned curricula, and creating apprenticeship pathways for youth in manufacturing, ICT, and construction trades.',
        '2', 'published', '2023-04-01', '2028-03-31', '2023-07-01',
        org_koica_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000008', 4, '4.3', 40, 'Equal access to affordable technical and vocational education'),
    ('b2000001-0001-4000-8000-000000000008', 4, '4.4', 30, 'Increase youth with relevant skills for employment'),
    ('b2000001-0001-4000-8000-000000000008', 8, '8.6', 30, 'Reduce proportion of youth not in employment or training')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000008', '2', 14000000, 'USD', '2023-04-01', 'KOICA', 'MOE', 'KOICA commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000008', '11', 8000000, 'EUR', '2023-05-01', 'GIZ', 'MOE', 'GIZ co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000008', '3', 3000000, 'USD', '2023-10-15', 'KOICA', 'MOE', 'Year 1: Equipment procurement', 'actual'),
    ('b2000001-0001-4000-8000-000000000008', '3', 3500000, 'USD', '2024-04-15', 'KOICA', 'MOE', 'Year 2 H1: Curriculum development', 'actual'),
    ('b2000001-0001-4000-8000-000000000008', '3', 3800000, 'USD', '2024-10-15', 'KOICA', 'MOE', 'Year 2 H2: Centre upgrades', 'actual'),
    ('b2000001-0001-4000-8000-000000000008', '3', 2000000, 'USD', '2025-03-15', 'GIZ', 'MOE', '2025 Q1: Apprenticeship programs', 'actual'),
    ('b2000001-0001-4000-8000-000000000008', '4', 10500000, 'USD', '2024-12-31', 'MOE', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000008', 'coverage', 'Yangon Region', 'MM', 'Yangon', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000008', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000008', 'coverage', 'Bago Region', 'MM', 'Bago', 'subnational', 20, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000008', 'coverage', 'Mon State', 'MM', 'Mon', 'subnational', 20, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000008', org_koica_id, 'KOICA', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000008', org_giz_id, 'GIZ', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000008', org_moe_id, 'MOE', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S09: Gender-Based Violence Prevention (SDG 5)
    -- Status: Implementation | Donor: Sida + UNFPA | Total: $12M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000009'::UUID,
        'XM-DAC-7-MM-GEN-2023-001',
        'Multi-Sectoral Gender-Based Violence Prevention and Response Programme',
        'GBVPR',
        'Establishing GBV prevention services, safe houses, psychosocial support, and legal aid in conflict-affected and underserved areas. Training 2,000 frontline workers in survivor-centred approaches.',
        '2', 'published', '2023-01-01', '2026-12-31', '2023-03-01',
        org_sida_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000009', 5, '5.2', 60, 'Eliminate violence against women and girls'),
    ('b2000001-0001-4000-8000-000000000009', 5, '5.1', 20, 'End discrimination against women'),
    ('b2000001-0001-4000-8000-000000000009', 16, '16.1', 20, 'Reduce all forms of violence')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000009', '2', 8000000, 'USD', '2023-01-01', 'Sida', 'UNFPA Myanmar', 'Sida commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000009', '11', 4000000, 'USD', '2023-02-01', 'UNFPA', 'UNFPA Myanmar', 'UNFPA co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000009', '3', 2500000, 'USD', '2023-06-15', 'UNFPA Myanmar', 'Various', 'Year 1: Safe houses + training', 'actual'),
    ('b2000001-0001-4000-8000-000000000009', '3', 3000000, 'USD', '2024-01-15', 'UNFPA Myanmar', 'Various', 'Year 2 H1: Psychosocial support', 'actual'),
    ('b2000001-0001-4000-8000-000000000009', '3', 2800000, 'USD', '2024-07-15', 'UNFPA Myanmar', 'Various', 'Year 2 H2: Legal aid expansion', 'actual'),
    ('b2000001-0001-4000-8000-000000000009', '4', 7200000, 'USD', '2024-12-31', 'UNFPA Myanmar', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000009', 'coverage', 'Kachin State', 'MM', 'Kachin', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000009', 'coverage', 'Shan State', 'MM', 'Shan', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000009', 'coverage', 'Rakhine State', 'MM', 'Rakhine', 'subnational', 40, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000009', org_sida_id, 'Sida', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000009', org_unfpa_id, 'UNFPA', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000009', org_local_ngo_id, 'MDF', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S10: Rural Solar Electrification (SDG 7)
    -- Status: Implementation | Donor: JICA | Total: $38M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000010'::UUID,
        'XM-DAC-701-MM-ENR-2022-001',
        'Off-Grid Solar Electrification for Rural Communities',
        'OGSRC',
        'Installing 100,000 solar home systems and 500 community mini-grids in off-grid villages. Includes training local technicians and establishing microfinance payment plans for households.',
        '2', 'published', '2022-04-01', '2027-03-31', '2022-07-01',
        org_jica_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000010', 7, '7.1', 50, 'Universal access to affordable energy'),
    ('b2000001-0001-4000-8000-000000000010', 7, '7.2', 30, 'Increase share of renewable energy'),
    ('b2000001-0001-4000-8000-000000000010', 7, '7.b', 20, 'Expand infrastructure for clean energy in developing countries')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000010', '2', 38000000, 'USD', '2022-04-01', 'JICA', 'MOPFI', 'Total grant commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000010', '3', 5000000, 'USD', '2022-10-15', 'JICA', 'MOPFI', 'Year 1: Equipment procurement + pilot villages', 'actual'),
    ('b2000001-0001-4000-8000-000000000010', '3', 7000000, 'USD', '2023-04-15', 'JICA', 'MOPFI', 'Year 2 H1: Scale-up Shan State', 'actual'),
    ('b2000001-0001-4000-8000-000000000010', '3', 6500000, 'USD', '2023-10-15', 'JICA', 'MOPFI', 'Year 2 H2: Mini-grid installations', 'actual'),
    ('b2000001-0001-4000-8000-000000000010', '3', 7500000, 'USD', '2024-04-15', 'JICA', 'MOPFI', 'Year 3 H1: Chin + Kayah expansion', 'actual'),
    ('b2000001-0001-4000-8000-000000000010', '3', 5000000, 'USD', '2024-10-15', 'JICA', 'MOPFI', 'Year 3 H2: Technician training', 'actual'),
    ('b2000001-0001-4000-8000-000000000010', '4', 26000000, 'USD', '2024-12-31', 'MOPFI', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000010', 'coverage', 'Shan State', 'MM', 'Shan', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000010', 'coverage', 'Chin State', 'MM', 'Chin', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000010', 'coverage', 'Kayah State', 'MM', 'Kayah', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000010', 'coverage', 'Kachin State', 'MM', 'Kachin', 'subnational', 20, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000010', org_jica_id, 'JICA', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000010', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S11: Youth Employment and Skills (SDG 8)
    -- Status: Implementation | Donor: ILO + EU | Total: $20M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000011'::UUID,
        'XM-DAC-41302-MM-EMP-2023-001',
        'Decent Work and Youth Employment Initiative',
        'DWYEI',
        'Promoting decent work for 50,000 young people through skills training, job matching, enterprise development, and labour rights awareness in industrial zones and peri-urban areas.',
        '2', 'published', '2023-07-01', '2027-06-30', '2023-09-01',
        org_ilo_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000011', 8, '8.5', 40, 'Full and productive employment for all young people'),
    ('b2000001-0001-4000-8000-000000000011', 8, '8.6', 30, 'Reduce proportion of youth NEET'),
    ('b2000001-0001-4000-8000-000000000011', 8, '8.8', 30, 'Protect labour rights and promote safe working environments')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000011', '2', 12000000, 'USD', '2023-07-01', 'ILO', 'ILO Myanmar', 'ILO commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000011', '11', 8000000, 'EUR', '2023-08-01', 'European Union', 'ILO Myanmar', 'EU co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000011', '3', 3000000, 'USD', '2024-01-15', 'ILO Myanmar', 'Various', 'Year 1: Training centres + curriculum', 'actual'),
    ('b2000001-0001-4000-8000-000000000011', '3', 3500000, 'USD', '2024-07-15', 'ILO Myanmar', 'Various', 'Year 1 H2: Job matching + enterprises', 'actual'),
    ('b2000001-0001-4000-8000-000000000011', '3', 3200000, 'USD', '2025-01-15', 'ILO Myanmar', 'Various', 'Year 2 H1: Scale-up', 'actual'),
    ('b2000001-0001-4000-8000-000000000011', '4', 8000000, 'USD', '2024-12-31', 'ILO Myanmar', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000011', 'coverage', 'Yangon Region', 'MM', 'Yangon', 'subnational', 40, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000011', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000011', 'coverage', 'Bago Region', 'MM', 'Bago', 'subnational', 30, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000011', org_ilo_id, 'ILO', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000011', org_eu_id, 'EU', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000011', org_local_ngo_id, 'MDF', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S12: Urban Transport and Smart Cities (SDG 9 + SDG 11)
    -- Status: Implementation | Donor: ADB | Total: $85M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000012'::UUID,
        'XM-DAC-46004-MM-URB-2022-001',
        'Yangon Urban Transport Improvement and Smart City Infrastructure',
        'YUTSC',
        'Modernizing Yangon''s public transport system with BRT corridors, smart traffic management, pedestrian infrastructure, and urban planning capacity building. Includes 3 BRT lines covering 45km.',
        '2', 'published', '2022-01-01', '2028-12-31', '2022-06-01',
        org_adb_id, 'C01', '410', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000012', 11, '11.2', 50, 'Affordable and sustainable transport systems'),
    ('b2000001-0001-4000-8000-000000000012', 9, '9.1', 30, 'Quality resilient infrastructure'),
    ('b2000001-0001-4000-8000-000000000012', 11, '11.6', 20, 'Reduce environmental impact of cities')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000012', '2', 85000000, 'USD', '2022-01-01', 'Asian Development Bank', 'MOPFI', 'Loan commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000012', '1', 30000000, 'USD', '2022-06-01', 'ADB', 'MOPFI', 'First tranche drawdown', 'actual'),
    ('b2000001-0001-4000-8000-000000000012', '3', 8000000, 'USD', '2022-12-15', 'MOPFI', 'Yangon City', 'Year 1: Planning + design', 'actual'),
    ('b2000001-0001-4000-8000-000000000012', '3', 12000000, 'USD', '2023-06-15', 'MOPFI', 'Yangon City', 'Year 2 H1: BRT Line 1 construction', 'actual'),
    ('b2000001-0001-4000-8000-000000000012', '3', 15000000, 'USD', '2023-12-15', 'MOPFI', 'Yangon City', 'Year 2 H2: Infrastructure works', 'actual'),
    ('b2000001-0001-4000-8000-000000000012', '1', 25000000, 'USD', '2024-01-01', 'ADB', 'MOPFI', 'Second tranche drawdown', 'actual'),
    ('b2000001-0001-4000-8000-000000000012', '3', 14000000, 'USD', '2024-06-15', 'MOPFI', 'Yangon City', 'Year 3 H1: BRT Line 2 + signals', 'actual'),
    ('b2000001-0001-4000-8000-000000000012', '3', 10000000, 'USD', '2024-12-15', 'MOPFI', 'Yangon City', 'Year 3 H2: Pedestrian infrastructure', 'actual'),
    ('b2000001-0001-4000-8000-000000000012', '4', 50000000, 'USD', '2024-12-31', 'Yangon City', 'Contractors', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000012', 'coverage', 'Yangon Region', 'MM', 'Yangon', 'subnational', 100, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000012', org_adb_id, 'ADB', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000012', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S13: Income Inequality Reduction (SDG 10)
    -- Status: Implementation | Donor: UNDP + Sida | Total: $16M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000013'::UUID,
        'XM-DAC-41114-MM-SOC-2023-001',
        'Inclusive Growth and Reduced Inequalities Programme',
        'IGRIP',
        'Addressing income inequality through progressive tax policy reform, social protection floor strengthening, and targeted support for ethnic minority livelihoods in border areas.',
        '2', 'published', '2023-01-01', '2027-12-31', '2023-04-01',
        org_undp_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000013', 10, '10.1', 40, 'Progressively achieve income growth for bottom 40%'),
    ('b2000001-0001-4000-8000-000000000013', 10, '10.2', 30, 'Promote social and economic inclusion'),
    ('b2000001-0001-4000-8000-000000000013', 10, '10.4', 30, 'Adopt fiscal and social policies for greater equality')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000013', '2', 10000000, 'USD', '2023-01-01', 'UNDP', 'UNDP Myanmar', 'UNDP commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000013', '11', 6000000, 'USD', '2023-03-01', 'Sida', 'UNDP Myanmar', 'Sida co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000013', '3', 3000000, 'USD', '2023-07-15', 'UNDP Myanmar', 'MOPFI', 'Year 1: Policy reform support', 'actual'),
    ('b2000001-0001-4000-8000-000000000013', '3', 3500000, 'USD', '2024-01-15', 'UNDP Myanmar', 'MOPFI', 'Year 1 H2: Social protection floor', 'actual'),
    ('b2000001-0001-4000-8000-000000000013', '3', 3200000, 'USD', '2024-07-15', 'UNDP Myanmar', 'MOPFI', 'Year 2: Ethnic livelihood support', 'actual'),
    ('b2000001-0001-4000-8000-000000000013', '4', 8500000, 'USD', '2024-12-31', 'MOPFI', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000013', 'coverage', 'Chin State', 'MM', 'Chin', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000013', 'coverage', 'Shan State', 'MM', 'Shan', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000013', 'coverage', 'Kachin State', 'MM', 'Kachin', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000013', 'coverage', 'Kayah State', 'MM', 'Kayah', 'subnational', 25, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000013', org_undp_id, 'UNDP', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000013', org_sida_id, 'Sida', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000013', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S14: Affordable Housing and Slum Upgrading (SDG 11)
    -- Status: Implementation | Donor: UN-Habitat + JICA | Total: $30M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000014'::UUID,
        'XM-DAC-41120-MM-HSG-2022-001',
        'Affordable Housing and Urban Slum Upgrading Programme',
        'AHSUP',
        'Building 5,000 affordable housing units and upgrading 50 informal settlements in Yangon and Mandalay with improved water, sanitation, drainage, and community facilities.',
        '2', 'published', '2022-07-01', '2027-06-30', '2022-10-01',
        org_unhabitat_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000014', 11, '11.1', 60, 'Access to adequate safe affordable housing'),
    ('b2000001-0001-4000-8000-000000000014', 11, '11.3', 20, 'Inclusive sustainable urbanization'),
    ('b2000001-0001-4000-8000-000000000014', 6, '6.2', 20, 'Adequate sanitation in settlements')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000014', '2', 18000000, 'USD', '2022-07-01', 'UN-Habitat', 'UN-Habitat Myanmar', 'UN-Habitat commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000014', '11', 12000000, 'USD', '2022-09-01', 'JICA', 'UN-Habitat Myanmar', 'JICA co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000014', '3', 5000000, 'USD', '2023-01-15', 'UN-Habitat Myanmar', 'Various', 'Year 1: Planning + initial construction', 'actual'),
    ('b2000001-0001-4000-8000-000000000014', '3', 7000000, 'USD', '2023-07-15', 'UN-Habitat Myanmar', 'Various', 'Year 2 H1: Housing construction', 'actual'),
    ('b2000001-0001-4000-8000-000000000014', '3', 6500000, 'USD', '2024-01-15', 'UN-Habitat Myanmar', 'Various', 'Year 2 H2: Slum upgrading works', 'actual'),
    ('b2000001-0001-4000-8000-000000000014', '3', 5500000, 'USD', '2024-07-15', 'UN-Habitat Myanmar', 'Various', 'Year 3 H1: Infrastructure + community', 'actual'),
    ('b2000001-0001-4000-8000-000000000014', '4', 20000000, 'USD', '2024-12-31', 'Various', 'Contractors', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000014', 'coverage', 'Yangon Region', 'MM', 'Yangon', 'subnational', 60, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000014', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 40, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000014', org_unhabitat_id, 'UN-Habitat', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000014', org_jica_id, 'JICA', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000014', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S15: Plastic Waste and Circular Economy (SDG 12)
    -- Status: Implementation | Donor: EU + GIZ | Total: $8M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000015'::UUID,
        'XM-DAC-918-MM-ENV-2024-001',
        'Circular Economy and Plastic Waste Reduction Initiative',
        'CEPWR',
        'Establishing waste sorting, recycling infrastructure, and plastic alternatives in 20 townships. Includes awareness campaigns and support for waste-to-energy micro-enterprises.',
        '2', 'published', '2024-01-01', '2027-12-31', '2024-04-01',
        org_eu_id, 'C01', '110', '10', '5', 'EUR', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000015', 12, '12.5', 50, 'Substantially reduce waste generation through recycling'),
    ('b2000001-0001-4000-8000-000000000015', 12, '12.8', 20, 'Ensure awareness for sustainable development'),
    ('b2000001-0001-4000-8000-000000000015', 14, '14.1', 30, 'Prevent marine pollution from land-based activities')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000015', '2', 5000000, 'EUR', '2024-01-01', 'European Union', 'GIZ Myanmar', 'EU commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000015', '11', 3000000, 'EUR', '2024-02-01', 'GIZ', 'GIZ Myanmar', 'GIZ co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000015', '3', 1500000, 'EUR', '2024-06-15', 'GIZ Myanmar', 'Various', 'Year 1 H1: Waste sorting infrastructure', 'actual'),
    ('b2000001-0001-4000-8000-000000000015', '3', 1800000, 'EUR', '2024-12-15', 'GIZ Myanmar', 'Various', 'Year 1 H2: Recycling centres', 'actual'),
    ('b2000001-0001-4000-8000-000000000015', '3', 1200000, 'EUR', '2025-03-15', 'GIZ Myanmar', 'Various', '2025 Q1: Awareness campaigns', 'actual'),
    ('b2000001-0001-4000-8000-000000000015', '4', 3800000, 'EUR', '2024-12-31', 'GIZ Myanmar', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000015', 'coverage', 'Yangon Region', 'MM', 'Yangon', 'subnational', 40, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000015', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000015', 'coverage', 'Mon State', 'MM', 'Mon', 'subnational', 30, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000015', org_eu_id, 'EU', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000015', org_giz_id, 'GIZ', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000015', org_local_ngo_id, 'MDF', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S16: Climate Adaptation National Action Plan (SDG 13)
    -- Status: Implementation | Donor: UNDP + GIZ | Total: $25M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000016'::UUID,
        'XM-DAC-41114-MM-CLI-2022-001',
        'National Climate Change Adaptation Action Plan Implementation',
        'NCCAAP',
        'Supporting implementation of Myanmar''s National Adaptation Programme of Action through climate-resilient agriculture, flood early warning, and community adaptation plans in 100 vulnerable townships.',
        '2', 'published', '2022-07-01', '2027-06-30', '2022-10-01',
        org_undp_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000016', 13, '13.1', 40, 'Strengthen resilience to climate hazards'),
    ('b2000001-0001-4000-8000-000000000016', 13, '13.2', 35, 'Integrate climate measures into policies'),
    ('b2000001-0001-4000-8000-000000000016', 13, '13.3', 25, 'Improve climate change education and awareness')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000016', '2', 16000000, 'USD', '2022-07-01', 'UNDP', 'UNDP Myanmar', 'UNDP commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000016', '11', 9000000, 'EUR', '2022-09-01', 'GIZ', 'UNDP Myanmar', 'GIZ co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000016', '3', 4000000, 'USD', '2023-01-15', 'UNDP Myanmar', 'MOPFI', 'Year 1: Early warning systems', 'actual'),
    ('b2000001-0001-4000-8000-000000000016', '3', 5000000, 'USD', '2023-07-15', 'UNDP Myanmar', 'MOPFI', 'Year 2 H1: Climate-resilient agriculture', 'actual'),
    ('b2000001-0001-4000-8000-000000000016', '3', 4500000, 'USD', '2024-01-15', 'UNDP Myanmar', 'MOPFI', 'Year 2 H2: Community adaptation plans', 'actual'),
    ('b2000001-0001-4000-8000-000000000016', '3', 4000000, 'USD', '2024-07-15', 'UNDP Myanmar', 'MOPFI', 'Year 3: Township-level rollout', 'actual'),
    ('b2000001-0001-4000-8000-000000000016', '4', 15000000, 'USD', '2024-12-31', 'MOPFI', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000016', 'coverage', 'Ayeyarwady Region', 'MM', 'Ayeyarwady', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000016', 'coverage', 'Rakhine State', 'MM', 'Rakhine', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000016', 'coverage', 'Bago Region', 'MM', 'Bago', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000016', 'coverage', 'Tanintharyi Region', 'MM', 'Tanintharyi', 'subnational', 20, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000016', org_undp_id, 'UNDP', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000016', org_giz_id, 'GIZ', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000016', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S17: Marine Conservation and Fisheries (SDG 14)
    -- Status: Implementation | Donor: DFAT + EU | Total: $14M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000017'::UUID,
        'XM-DAC-801-MM-MAR-2023-001',
        'Sustainable Marine Fisheries and Coastal Conservation Programme',
        'SMFCC',
        'Protecting 500km of coastline through marine protected areas, sustainable fishing practices, mangrove restoration, and alternative livelihood programmes for coastal communities.',
        '2', 'published', '2023-04-01', '2027-03-31', '2023-07-01',
        org_dfat_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000017', 14, '14.2', 35, 'Sustainably manage and protect marine ecosystems'),
    ('b2000001-0001-4000-8000-000000000017', 14, '14.4', 35, 'Regulate harvesting and end overfishing'),
    ('b2000001-0001-4000-8000-000000000017', 14, '14.b', 30, 'Provide access for small-scale artisanal fishers')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000017', '2', 9000000, 'USD', '2023-04-01', 'DFAT Australia', 'FAO Myanmar', 'DFAT commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000017', '11', 5000000, 'EUR', '2023-05-01', 'European Union', 'FAO Myanmar', 'EU co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000017', '3', 2500000, 'USD', '2023-10-15', 'FAO Myanmar', 'Various', 'Year 1: MPA designation + baseline', 'actual'),
    ('b2000001-0001-4000-8000-000000000017', '3', 3000000, 'USD', '2024-04-15', 'FAO Myanmar', 'Various', 'Year 2 H1: Mangrove restoration', 'actual'),
    ('b2000001-0001-4000-8000-000000000017', '3', 2800000, 'USD', '2024-10-15', 'FAO Myanmar', 'Various', 'Year 2 H2: Sustainable fishing training', 'actual'),
    ('b2000001-0001-4000-8000-000000000017', '4', 7200000, 'USD', '2024-12-31', 'FAO Myanmar', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000017', 'coverage', 'Tanintharyi Region', 'MM', 'Tanintharyi', 'subnational', 40, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000017', 'coverage', 'Rakhine State', 'MM', 'Rakhine', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000017', 'coverage', 'Ayeyarwady Region', 'MM', 'Ayeyarwady', 'subnational', 30, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000017', org_dfat_id, 'DFAT', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000017', org_eu_id, 'EU', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000017', org_fao_id, 'FAO', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S18: Forest Landscape Restoration (SDG 15)
    -- Status: Implementation | Donor: USAID + JICA | Total: $32M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000018'::UUID,
        'XM-DAC-302-MM-FOR-2022-001',
        'National Forest Landscape Restoration and Biodiversity Conservation',
        'NFLRBC',
        'Restoring 200,000 hectares of degraded forest through community forestry, reforestation, and protected area management. Includes REDD+ readiness and biodiversity monitoring.',
        '2', 'published', '2022-01-01', '2027-12-31', '2022-05-01',
        org_usaid_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000018', 15, '15.1', 30, 'Conservation of terrestrial ecosystems'),
    ('b2000001-0001-4000-8000-000000000018', 15, '15.2', 30, 'Sustainable management of forests'),
    ('b2000001-0001-4000-8000-000000000018', 15, '15.5', 20, 'Reduce degradation of natural habitats'),
    ('b2000001-0001-4000-8000-000000000018', 13, '13.2', 20, 'Integrate climate measures into policy via REDD+')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000018', '2', 20000000, 'USD', '2022-01-01', 'USAID', 'MOALI', 'USAID commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000018', '11', 12000000, 'USD', '2022-03-01', 'JICA', 'MOALI', 'JICA co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000018', '3', 4000000, 'USD', '2022-07-15', 'USAID', 'MOALI', 'Year 1: Community forestry setup', 'actual'),
    ('b2000001-0001-4000-8000-000000000018', '3', 5500000, 'USD', '2023-01-15', 'USAID', 'MOALI', 'Year 1 H2: Reforestation + nurseries', 'actual'),
    ('b2000001-0001-4000-8000-000000000018', '3', 6000000, 'USD', '2023-07-15', 'USAID', 'MOALI', 'Year 2 H1: Protected area management', 'actual'),
    ('b2000001-0001-4000-8000-000000000018', '3', 5000000, 'USD', '2024-01-15', 'USAID', 'MOALI', 'Year 2 H2: REDD+ readiness', 'actual'),
    ('b2000001-0001-4000-8000-000000000018', '3', 4500000, 'USD', '2024-07-15', 'JICA', 'MOALI', 'Year 3 H1: Biodiversity monitoring', 'actual'),
    ('b2000001-0001-4000-8000-000000000018', '4', 22000000, 'USD', '2024-12-31', 'MOALI', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000018', 'coverage', 'Bago Region', 'MM', 'Bago', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000018', 'coverage', 'Sagaing Region', 'MM', 'Sagaing', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000018', 'coverage', 'Kachin State', 'MM', 'Kachin', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000018', 'coverage', 'Tanintharyi Region', 'MM', 'Tanintharyi', 'subnational', 20, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000018', org_usaid_id, 'USAID', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000018', org_jica_id, 'JICA', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000018', org_moali_id, 'MOALI', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S19: Access to Justice and Rule of Law (SDG 16)
    -- Status: Implementation | Donor: UNDP + EU | Total: $18M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000019'::UUID,
        'XM-DAC-41114-MM-GOV-2023-001',
        'Access to Justice and Rule of Law Strengthening Programme',
        'AJRL',
        'Strengthening judicial institutions, legal aid services, and community mediation mechanisms. Training 500 paralegals and establishing 50 township-level legal aid centres.',
        '2', 'published', '2023-01-01', '2027-12-31', '2023-04-01',
        org_undp_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000019', 16, '16.3', 40, 'Promote rule of law and equal access to justice'),
    ('b2000001-0001-4000-8000-000000000019', 16, '16.6', 30, 'Effective accountable institutions'),
    ('b2000001-0001-4000-8000-000000000019', 16, '16.a', 30, 'Strengthen institutions to prevent violence')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000019', '2', 12000000, 'USD', '2023-01-01', 'UNDP', 'UNDP Myanmar', 'UNDP commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000019', '11', 6000000, 'EUR', '2023-03-01', 'European Union', 'UNDP Myanmar', 'EU co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000019', '3', 3000000, 'USD', '2023-07-15', 'UNDP Myanmar', 'Various', 'Year 1: Legal aid centres', 'actual'),
    ('b2000001-0001-4000-8000-000000000019', '3', 3500000, 'USD', '2024-01-15', 'UNDP Myanmar', 'Various', 'Year 1 H2: Paralegal training', 'actual'),
    ('b2000001-0001-4000-8000-000000000019', '3', 3000000, 'USD', '2024-07-15', 'UNDP Myanmar', 'Various', 'Year 2: Community mediation', 'actual'),
    ('b2000001-0001-4000-8000-000000000019', '3', 2500000, 'USD', '2025-01-15', 'UNDP Myanmar', 'Various', 'Year 2 H2: Judicial training', 'actual'),
    ('b2000001-0001-4000-8000-000000000019', '4', 10000000, 'USD', '2024-12-31', 'Various', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000019', 'coverage', 'Yangon Region', 'MM', 'Yangon', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000019', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000019', 'coverage', 'Shan State', 'MM', 'Shan', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000019', 'coverage', 'Rakhine State', 'MM', 'Rakhine', 'subnational', 25, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000019', org_undp_id, 'UNDP', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000019', org_eu_id, 'EU', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000019', org_local_ngo_id, 'MDF', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S20: Aid Coordination and Data Systems (SDG 17)
    -- Status: Implementation | Donor: USAID + DFAT | Total: $10M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000020'::UUID,
        'XM-DAC-302-MM-AID-2023-001',
        'Development Cooperation Data Systems and Aid Effectiveness',
        'DCDSA',
        'Strengthening Myanmar''s aid information management system, improving donor coordination mechanisms, and building statistical capacity for SDG monitoring and reporting.',
        '2', 'published', '2023-01-01', '2026-12-31', '2023-04-01',
        org_usaid_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000020', 17, '17.15', 30, 'Respect country leadership and policy space'),
    ('b2000001-0001-4000-8000-000000000020', 17, '17.16', 35, 'Enhance global partnership for sustainable development'),
    ('b2000001-0001-4000-8000-000000000020', 17, '17.18', 35, 'Enhance capacity-building for quality data')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000020', '2', 6000000, 'USD', '2023-01-01', 'USAID', 'MOPFI', 'USAID commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000020', '11', 4000000, 'USD', '2023-02-01', 'DFAT Australia', 'MOPFI', 'DFAT co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000020', '3', 2000000, 'USD', '2023-07-15', 'USAID', 'MOPFI', 'Year 1: System design + data migration', 'actual'),
    ('b2000001-0001-4000-8000-000000000020', '3', 2500000, 'USD', '2024-01-15', 'USAID', 'MOPFI', 'Year 1 H2: AIMS deployment', 'actual'),
    ('b2000001-0001-4000-8000-000000000020', '3', 2000000, 'USD', '2024-07-15', 'DFAT Australia', 'MOPFI', 'Year 2: Capacity building', 'actual'),
    ('b2000001-0001-4000-8000-000000000020', '3', 1500000, 'USD', '2025-01-15', 'USAID', 'MOPFI', 'Year 2 H2: SDG monitoring', 'actual'),
    ('b2000001-0001-4000-8000-000000000020', '4', 7000000, 'USD', '2024-12-31', 'MOPFI', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000020', 'coverage', 'Nay Pyi Taw', 'MM', 'Nay Pyi Taw', 'subnational', 60, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000020', 'coverage', 'Yangon Region', 'MM', 'Yangon', 'subnational', 40, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000020', org_usaid_id, 'USAID', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000020', org_dfat_id, 'DFAT', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000020', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S21: Emergency IDP Camp Healthcare (SDG 3 - Humanitarian)
    -- Status: Implementation | Donor: UNHCR + USAID | Total: $22M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000021'::UUID,
        'XM-DAC-41121-MM-HUM-2023-001',
        'Emergency Healthcare Services for Internally Displaced Populations',
        'EHSIDP',
        'Providing mobile health clinics, mental health support, and disease surveillance in IDP camps across Kachin, Shan, and Rakhine states. Serving approximately 300,000 displaced persons.',
        '2', 'published', '2023-01-01', '2025-12-31', '2023-02-01',
        org_unhcr_id, 'C01', '110', '10', '5', 'USD', true, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000021', 3, '3.8', 40, 'Universal health coverage for displaced populations'),
    ('b2000001-0001-4000-8000-000000000021', 3, '3.d', 30, 'Early warning for disease management'),
    ('b2000001-0001-4000-8000-000000000021', 1, '1.5', 30, 'Build resilience of vulnerable displaced populations')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000021', '2', 14000000, 'USD', '2023-01-01', 'UNHCR', 'UNHCR Myanmar', 'UNHCR commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000021', '11', 8000000, 'USD', '2023-02-01', 'USAID', 'UNHCR Myanmar', 'USAID humanitarian co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000021', '3', 5000000, 'USD', '2023-06-15', 'UNHCR Myanmar', 'Various', 'Year 1 H1: Mobile clinics deployment', 'actual'),
    ('b2000001-0001-4000-8000-000000000021', '3', 5500000, 'USD', '2023-12-15', 'UNHCR Myanmar', 'Various', 'Year 1 H2: Mental health + surveillance', 'actual'),
    ('b2000001-0001-4000-8000-000000000021', '3', 4500000, 'USD', '2024-06-15', 'UNHCR Myanmar', 'Various', 'Year 2 H1: Expanded coverage', 'actual'),
    ('b2000001-0001-4000-8000-000000000021', '3', 4000000, 'USD', '2024-12-15', 'UNHCR Myanmar', 'Various', 'Year 2 H2: Ongoing services', 'actual'),
    ('b2000001-0001-4000-8000-000000000021', '4', 16000000, 'USD', '2024-12-31', 'UNHCR Myanmar', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000021', 'coverage', 'Kachin State', 'MM', 'Kachin', 'subnational', 35, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000021', 'coverage', 'Shan State', 'MM', 'Shan', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000021', 'coverage', 'Rakhine State', 'MM', 'Rakhine', 'subnational', 35, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000021', org_unhcr_id, 'UNHCR', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000021', org_usaid_id, 'USAID', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000021', org_who_id, 'WHO', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S22: Clean Water for Schools (SDG 6 + SDG 4)
    -- Status: Suspended | Donor: UNICEF | Total: $9M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000022'::UUID,
        'XM-DAC-41122-MM-WSH-2022-001',
        'WASH in Schools: Clean Water and Hygiene for Learning',
        'WISCWHL',
        'Installing water purification systems, latrines, and handwashing stations in 500 primary schools. Includes hygiene education curriculum and menstrual health management support.',
        '6', 'published', '2022-07-01', '2025-06-30', '2022-09-01',
        org_unicef_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000022', 6, '6.1', 35, 'Safe and affordable drinking water for schools'),
    ('b2000001-0001-4000-8000-000000000022', 6, '6.2', 35, 'Adequate sanitation and hygiene for all'),
    ('b2000001-0001-4000-8000-000000000022', 4, '4.a', 30, 'Build safe inclusive learning environments')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000022', '2', 9000000, 'USD', '2022-07-01', 'UNICEF', 'UNICEF Myanmar', 'Total commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000022', '3', 2500000, 'USD', '2022-12-15', 'UNICEF Myanmar', 'MOE', 'Year 1: Water systems + latrines phase 1', 'actual'),
    ('b2000001-0001-4000-8000-000000000022', '3', 2000000, 'USD', '2023-06-15', 'UNICEF Myanmar', 'MOE', 'Year 2 H1: Hygiene education rollout', 'actual'),
    ('b2000001-0001-4000-8000-000000000022', '4', 4000000, 'USD', '2023-09-30', 'MOE', 'Various', 'Expenditure before suspension', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000022', 'coverage', 'Sagaing Region', 'MM', 'Sagaing', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000022', 'coverage', 'Magway Region', 'MM', 'Magway', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000022', 'coverage', 'Chin State', 'MM', 'Chin', 'subnational', 40, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000022', org_unicef_id, 'UNICEF', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000022', org_moe_id, 'MOE', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S23: Digital Economy and E-Government (SDG 9 + SDG 17)
    -- Status: Pipeline | Donor: KOICA + WB | Total: $25M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000023'::UUID,
        'XM-DAC-742-MM-ICT-2025-001',
        'Digital Economy Foundations and E-Government Transformation',
        'DEFT',
        'Building digital infrastructure for government services, establishing cybersecurity frameworks, and supporting digital literacy for 100,000 citizens and 10,000 SMEs.',
        '1', 'published', '2025-10-01', '2030-09-30',
        org_koica_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000023', 9, '9.c', 40, 'Significantly increase access to ICT'),
    ('b2000001-0001-4000-8000-000000000023', 17, '17.8', 30, 'Enhance use of enabling technology - ICT'),
    ('b2000001-0001-4000-8000-000000000023', 16, '16.6', 30, 'Effective transparent institutions via e-government')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000023', '2', 15000000, 'USD', '2025-06-01', 'KOICA', 'MOPFI', 'KOICA commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000023', '11', 10000000, 'USD', '2025-07-01', 'World Bank', 'MOPFI', 'World Bank co-financing', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000023', 'coverage', 'Nay Pyi Taw', 'MM', 'Nay Pyi Taw', 'subnational', 40, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000023', 'coverage', 'Yangon Region', 'MM', 'Yangon', 'subnational', 35, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000023', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 25, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000023', org_koica_id, 'KOICA', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000023', org_wb_id, 'World Bank', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000023', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S24: Early Childhood Education (SDG 4)
    -- Status: Closed | Donor: UNICEF + DFAT | Total: $16M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, reporting_org_id, default_aid_type,
        default_finance_type, default_flow_type, default_tied_status, default_currency,
        humanitarian, activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000024'::UUID,
        'XM-DAC-41122-MM-ECE-2020-001',
        'Inclusive Early Childhood Care and Education Programme',
        'IECCE',
        'Establishing 300 community-based early childhood centres, training 1,000 caregivers, and developing mother-tongue based pre-primary curriculum for ethnic minority children.',
        '4', 'published', '2020-01-01', '2024-12-31', '2020-04-01', '2024-12-31',
        org_unicef_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000024', 4, '4.2', 60, 'Early childhood development and pre-primary education'),
    ('b2000001-0001-4000-8000-000000000024', 4, '4.5', 40, 'Eliminate gender disparities and ensure equal access for vulnerable')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000024', '2', 10000000, 'USD', '2020-01-01', 'UNICEF', 'UNICEF Myanmar', 'UNICEF commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000024', '11', 6000000, 'USD', '2020-03-01', 'DFAT Australia', 'UNICEF Myanmar', 'DFAT co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000024', '3', 2500000, 'USD', '2020-07-15', 'UNICEF Myanmar', 'MOE', 'Year 1: Centre establishment', 'actual'),
    ('b2000001-0001-4000-8000-000000000024', '3', 3000000, 'USD', '2021-07-15', 'UNICEF Myanmar', 'MOE', 'Year 2: Curriculum + caregiver training', 'actual'),
    ('b2000001-0001-4000-8000-000000000024', '3', 3500000, 'USD', '2022-07-15', 'UNICEF Myanmar', 'MOE', 'Year 3: Expansion to 200 centres', 'actual'),
    ('b2000001-0001-4000-8000-000000000024', '3', 3000000, 'USD', '2023-07-15', 'UNICEF Myanmar', 'MOE', 'Year 4: Full 300 centres + quality', 'actual'),
    ('b2000001-0001-4000-8000-000000000024', '3', 2500000, 'USD', '2024-07-15', 'UNICEF Myanmar', 'MOE', 'Year 5: Handover + sustainability', 'actual'),
    ('b2000001-0001-4000-8000-000000000024', '4', 14000000, 'USD', '2024-12-31', 'MOE', 'Various', 'Final expenditure at project close', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000024', 'coverage', 'Shan State', 'MM', 'Shan', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000024', 'coverage', 'Chin State', 'MM', 'Chin', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000024', 'coverage', 'Kayah State', 'MM', 'Kayah', 'subnational', 25, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000024', 'coverage', 'Kachin State', 'MM', 'Kachin', 'subnational', 20, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000024', org_unicef_id, 'UNICEF', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000024', org_dfat_id, 'DFAT', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000024', org_moe_id, 'MOE', 'implementer', 'accepted');
    


    -- ================================================================
    -- ACTIVITY S25: Tax Reform and Domestic Revenue (SDG 17 + SDG 10)
    -- Status: Implementation | Donor: WB + USAID | Total: $12M
    -- ================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        'b2000001-0001-4000-8000-000000000025'::UUID,
        'XM-DAC-44000-MM-TAX-2023-001',
        'Progressive Tax Reform and Domestic Revenue Mobilization',
        'PTDRM',
        'Modernizing tax administration, broadening the tax base, implementing progressive taxation policies, and building capacity of the Internal Revenue Department.',
        '2', 'published', '2023-07-01', '2027-06-30', '2023-10-01',
        org_wb_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('b2000001-0001-4000-8000-000000000025', 17, '17.1', 50, 'Strengthen domestic resource mobilization through taxation'),
    ('b2000001-0001-4000-8000-000000000025', 10, '10.4', 30, 'Adopt fiscal policies that achieve greater equality'),
    ('b2000001-0001-4000-8000-000000000025', 16, '16.6', 20, 'Effective transparent institutions')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('b2000001-0001-4000-8000-000000000025', '2', 8000000, 'USD', '2023-07-01', 'World Bank', 'MOPFI', 'WB commitment', 'actual'),
    ('b2000001-0001-4000-8000-000000000025', '11', 4000000, 'USD', '2023-08-01', 'USAID', 'MOPFI', 'USAID co-financing', 'actual'),
    ('b2000001-0001-4000-8000-000000000025', '3', 2000000, 'USD', '2024-01-15', 'World Bank', 'MOPFI', 'Year 1: IT systems + policy analysis', 'actual'),
    ('b2000001-0001-4000-8000-000000000025', '3', 2500000, 'USD', '2024-07-15', 'World Bank', 'MOPFI', 'Year 1 H2: Tax admin modernization', 'actual'),
    ('b2000001-0001-4000-8000-000000000025', '3', 2000000, 'USD', '2025-01-15', 'USAID', 'MOPFI', 'Year 2: Capacity building', 'actual'),
    ('b2000001-0001-4000-8000-000000000025', '4', 5500000, 'USD', '2024-12-31', 'MOPFI', 'Various', 'Cumulative expenditure', 'actual');

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('b2000001-0001-4000-8000-000000000025', 'coverage', 'Nay Pyi Taw', 'MM', 'Nay Pyi Taw', 'subnational', 50, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000025', 'coverage', 'Yangon Region', 'MM', 'Yangon', 'subnational', 30, 'manual', '2', '2', '1'),
    ('b2000001-0001-4000-8000-000000000025', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 20, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('b2000001-0001-4000-8000-000000000025', org_wb_id, 'World Bank', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000025', org_usaid_id, 'USAID', 'funder', 'accepted'),
    ('b2000001-0001-4000-8000-000000000025', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    


    -- ================================================================
    -- BACKFILL: Add activity_contributors for the original 10 activities
    -- Only inserts if the activity exists in the database.
    -- ================================================================

    IF EXISTS (SELECT 1 FROM activities WHERE id = 'a1000001-0001-4000-8000-000000000001') THEN
      INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
      ('a1000001-0001-4000-8000-000000000001', org_jica_id, 'JICA', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000001', org_moe_id, 'MOE', 'implementer', 'accepted');
    END IF;

    IF EXISTS (SELECT 1 FROM activities WHERE id = 'a1000001-0001-4000-8000-000000000002') THEN
      INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
      ('a1000001-0001-4000-8000-000000000002', org_unicef_id, 'UNICEF', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000002', org_mohs_id, 'MOHS', 'implementer', 'accepted');
    END IF;

    IF EXISTS (SELECT 1 FROM activities WHERE id = 'a1000001-0001-4000-8000-000000000003') THEN
      INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
      ('a1000001-0001-4000-8000-000000000003', org_adb_id, 'ADB', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000003', org_moali_id, 'MOALI', 'implementer', 'accepted');
    END IF;

    IF EXISTS (SELECT 1 FROM activities WHERE id = 'a1000001-0001-4000-8000-000000000004') THEN
      INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
      ('a1000001-0001-4000-8000-000000000004', org_dfat_id, 'DFAT', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000004', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    END IF;

    IF EXISTS (SELECT 1 FROM activities WHERE id = 'a1000001-0001-4000-8000-000000000005') THEN
      INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
      ('a1000001-0001-4000-8000-000000000005', org_wb_id, 'World Bank', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000005', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    END IF;

    IF EXISTS (SELECT 1 FROM activities WHERE id = 'a1000001-0001-4000-8000-000000000006') THEN
      INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
      ('a1000001-0001-4000-8000-000000000006', org_unhcr_id, 'UNHCR', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000006', org_usaid_id, 'USAID', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000006', org_local_ngo_id, 'MDF', 'implementer', 'accepted');
    END IF;

    IF EXISTS (SELECT 1 FROM activities WHERE id = 'a1000001-0001-4000-8000-000000000007') THEN
      INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
      ('a1000001-0001-4000-8000-000000000007', org_undp_id, 'UNDP', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000007', org_eu_id, 'EU', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000007', org_mopfi_id, 'MOPFI', 'implementer', 'accepted');
    END IF;

    IF EXISTS (SELECT 1 FROM activities WHERE id = 'a1000001-0001-4000-8000-000000000008') THEN
      INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
      ('a1000001-0001-4000-8000-000000000008', org_dfat_id, 'DFAT', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000008', org_undp_id, 'UNDP', 'implementer', 'accepted');
    END IF;

    IF EXISTS (SELECT 1 FROM activities WHERE id = 'a1000001-0001-4000-8000-000000000009') THEN
      INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
      ('a1000001-0001-4000-8000-000000000009', org_eu_id, 'EU', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000009', org_local_ngo_id, 'MDF', 'implementer', 'accepted');
    END IF;

    IF EXISTS (SELECT 1 FROM activities WHERE id = 'a1000001-0001-4000-8000-000000000010') THEN
      INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
      ('a1000001-0001-4000-8000-000000000010', org_wfp_id, 'WFP', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000010', org_unicef_id, 'UNICEF', 'funder', 'accepted'),
      ('a1000001-0001-4000-8000-000000000010', org_mohs_id, 'MOHS', 'implementer', 'accepted');
    END IF;

    RAISE NOTICE 'Successfully seeded 25 SDG profile test activities + backfilled contributors for existing activities.';

END $$;
