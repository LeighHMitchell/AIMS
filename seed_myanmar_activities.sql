-- ============================================================================
-- SEED DATA: 10 Myanmar Development Activities
-- ============================================================================
-- This script creates 10 realistic development activities implemented in Myanmar
-- covering various sectors including education, health, agriculture, WASH,
-- infrastructure, humanitarian, governance, livelihoods, environment, and social protection.
-- ============================================================================

-- First, ensure we have some sample organizations to reference
-- These represent typical development partners working in Myanmar

DO $$
DECLARE
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
    org_mopfi_id UUID;  -- Ministry of Planning, Finance and Industry
    org_mohs_id UUID;   -- Ministry of Health and Sports
    org_moe_id UUID;    -- Ministry of Education
    org_moali_id UUID;  -- Ministry of Agriculture
    org_local_ngo_id UUID;
BEGIN
    -- Insert organizations if they don't exist

    -- JICA
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Japan International Cooperation Agency', 'JICA', '10', 'XM-DAC-701', 'Japan',
           'Japan''s governmental agency for international development assistance'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'JICA')
    RETURNING id INTO org_jica_id;
    IF org_jica_id IS NULL THEN
        SELECT id INTO org_jica_id FROM organizations WHERE acronym = 'JICA';
    END IF;

    -- DFAT Australia
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Department of Foreign Affairs and Trade', 'DFAT', '10', 'XM-DAC-801', 'Australia',
           'Australian Government development assistance program'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'DFAT')
    RETURNING id INTO org_dfat_id;
    IF org_dfat_id IS NULL THEN
        SELECT id INTO org_dfat_id FROM organizations WHERE acronym = 'DFAT';
    END IF;

    -- USAID
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'United States Agency for International Development', 'USAID', '10', 'XM-DAC-302', 'United States',
           'US Government agency providing civilian foreign aid'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'USAID')
    RETURNING id INTO org_usaid_id;
    IF org_usaid_id IS NULL THEN
        SELECT id INTO org_usaid_id FROM organizations WHERE acronym = 'USAID';
    END IF;

    -- UNDP
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'United Nations Development Programme', 'UNDP', '40', 'XM-DAC-41114', 'International',
           'UN global development network'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'UNDP')
    RETURNING id INTO org_undp_id;
    IF org_undp_id IS NULL THEN
        SELECT id INTO org_undp_id FROM organizations WHERE acronym = 'UNDP';
    END IF;

    -- UNICEF
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'United Nations Children''s Fund', 'UNICEF', '40', 'XM-DAC-41122', 'International',
           'UN agency for children''s rights and development'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'UNICEF')
    RETURNING id INTO org_unicef_id;
    IF org_unicef_id IS NULL THEN
        SELECT id INTO org_unicef_id FROM organizations WHERE acronym = 'UNICEF';
    END IF;

    -- WFP
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'World Food Programme', 'WFP', '40', 'XM-DAC-41140', 'International',
           'UN agency for food assistance'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'WFP')
    RETURNING id INTO org_wfp_id;
    IF org_wfp_id IS NULL THEN
        SELECT id INTO org_wfp_id FROM organizations WHERE acronym = 'WFP';
    END IF;

    -- UNHCR
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'United Nations High Commissioner for Refugees', 'UNHCR', '40', 'XM-DAC-41121', 'International',
           'UN agency for refugee protection'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'UNHCR')
    RETURNING id INTO org_unhcr_id;
    IF org_unhcr_id IS NULL THEN
        SELECT id INTO org_unhcr_id FROM organizations WHERE acronym = 'UNHCR';
    END IF;

    -- World Bank
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'World Bank', 'WB', '40', 'XM-DAC-44000', 'International',
           'International financial institution for development'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'WB')
    RETURNING id INTO org_wb_id;
    IF org_wb_id IS NULL THEN
        SELECT id INTO org_wb_id FROM organizations WHERE acronym = 'WB';
    END IF;

    -- Asian Development Bank
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Asian Development Bank', 'ADB', '40', 'XM-DAC-46004', 'International',
           'Regional development bank for Asia and the Pacific'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'ADB')
    RETURNING id INTO org_adb_id;
    IF org_adb_id IS NULL THEN
        SELECT id INTO org_adb_id FROM organizations WHERE acronym = 'ADB';
    END IF;

    -- European Union
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'European Union', 'EU', '40', 'XM-DAC-918', 'European Union',
           'Regional organization providing development assistance'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'EU')
    RETURNING id INTO org_eu_id;
    IF org_eu_id IS NULL THEN
        SELECT id INTO org_eu_id FROM organizations WHERE acronym = 'EU';
    END IF;

    -- Myanmar Government - MOPFI
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Ministry of Planning, Finance and Industry', 'MOPFI', '10', 'MM-GOV-MOPFI', 'Myanmar',
           'Myanmar Government ministry responsible for economic planning and finance'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'MOPFI')
    RETURNING id INTO org_mopfi_id;
    IF org_mopfi_id IS NULL THEN
        SELECT id INTO org_mopfi_id FROM organizations WHERE acronym = 'MOPFI';
    END IF;

    -- Myanmar Government - MOHS
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Ministry of Health and Sports', 'MOHS', '10', 'MM-GOV-MOHS', 'Myanmar',
           'Myanmar Government ministry responsible for health services'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'MOHS')
    RETURNING id INTO org_mohs_id;
    IF org_mohs_id IS NULL THEN
        SELECT id INTO org_mohs_id FROM organizations WHERE acronym = 'MOHS';
    END IF;

    -- Myanmar Government - MOE
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Ministry of Education', 'MOE', '10', 'MM-GOV-MOE', 'Myanmar',
           'Myanmar Government ministry responsible for education'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'MOE')
    RETURNING id INTO org_moe_id;
    IF org_moe_id IS NULL THEN
        SELECT id INTO org_moe_id FROM organizations WHERE acronym = 'MOE';
    END IF;

    -- Myanmar Government - MOALI
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Ministry of Agriculture, Livestock and Irrigation', 'MOALI', '10', 'MM-GOV-MOALI', 'Myanmar',
           'Myanmar Government ministry responsible for agriculture'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'MOALI')
    RETURNING id INTO org_moali_id;
    IF org_moali_id IS NULL THEN
        SELECT id INTO org_moali_id FROM organizations WHERE acronym = 'MOALI';
    END IF;

    -- Local NGO
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Myanmar Development Foundation', 'MDF', '22', 'MM-NGO-MDF', 'Myanmar',
           'Local non-governmental organization focused on community development'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'MDF')
    RETURNING id INTO org_local_ngo_id;
    IF org_local_ngo_id IS NULL THEN
        SELECT id INTO org_local_ngo_id FROM organizations WHERE acronym = 'MDF';
    END IF;

    -- ========================================================================
    -- ACTIVITY 1: Rural Primary School Construction Program
    -- ========================================================================
    INSERT INTO activities (
        id,
        iati_identifier,
        title_narrative,
        acronym,
        description_narrative,
        description_objectives,
        description_target_groups,
        activity_status,
        publication_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        reporting_org_id,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status,
        default_currency,
        humanitarian,
        activity_scope,
        language,
        created_via,
        general_info
    ) VALUES (
        'a1000001-0001-4000-8000-000000000001'::UUID,
        'XM-DAC-701-MM-EDU-2023-001',
        'Rural Primary School Construction and Teacher Training Program',
        'RPSCTP',
        'This program aims to improve access to quality primary education in rural Myanmar by constructing 50 new primary schools and providing training to 500 teachers across Shan, Kayah, and Kayin States. The project addresses the critical shortage of educational infrastructure in remote areas where children often walk more than 5 kilometers to reach the nearest school.',
        'To construct 50 earthquake-resistant primary schools with proper sanitation facilities; To train 500 primary school teachers in modern pedagogical methods; To establish 50 parent-teacher associations for school governance',
        'Children aged 5-11 in rural communities; Primary school teachers; Parents and community members',
        '2',  -- Implementation
        'published',
        '2023-04-01',
        '2027-03-31',
        '2023-06-15',
        org_jica_id,
        'C01',  -- Project-type interventions
        '110',  -- Standard grant
        '10',   -- ODA
        '5',    -- Untied
        'USD',
        false,
        '4',    -- National
        'en',
        'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar", "locations": ["Shan State", "Kayah State", "Kayin State"]}'::JSONB
    );

    -- Activity 1 Sectors
    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, type)
    VALUES
        ('a1000001-0001-4000-8000-000000000001'::UUID, '11220', 'Primary education', 70, 'primary'),
        ('a1000001-0001-4000-8000-000000000001'::UUID, '11130', 'Teacher training', 20, 'secondary'),
        ('a1000001-0001-4000-8000-000000000001'::UUID, '14032', 'Basic sanitation', 10, 'secondary');

    -- Activity 1 Participating Organizations
    INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, display_order)
    VALUES
        ('a1000001-0001-4000-8000-000000000001'::UUID, org_jica_id, 'extending', 1),
        ('a1000001-0001-4000-8000-000000000001'::UUID, org_moe_id, 'government', 2),
        ('a1000001-0001-4000-8000-000000000001'::UUID, org_local_ngo_id, 'implementing', 3);

    -- ========================================================================
    -- ACTIVITY 2: Maternal and Child Health Improvement Program
    -- ========================================================================
    INSERT INTO activities (
        id,
        iati_identifier,
        title_narrative,
        acronym,
        description_narrative,
        description_objectives,
        description_target_groups,
        activity_status,
        publication_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        reporting_org_id,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status,
        default_currency,
        humanitarian,
        activity_scope,
        language,
        created_via,
        general_info
    ) VALUES (
        'a1000001-0001-4000-8000-000000000002'::UUID,
        'XM-DAC-41122-MM-HLT-2022-001',
        'Maternal and Child Health Improvement Program - Ayeyarwady Region',
        'MCHIP-AYR',
        'This comprehensive health program focuses on reducing maternal and infant mortality rates in the Ayeyarwady Region through improved healthcare services, training of midwives, and community health education. The program supports 120 rural health centers and trains 300 auxiliary midwives to provide essential maternal care services.',
        'To reduce maternal mortality ratio by 30% in target townships; To increase skilled birth attendance from 60% to 85%; To establish functioning emergency obstetric care referral system in 15 townships',
        'Pregnant women and new mothers; Infants and children under 5; Rural health workers and midwives',
        '2',  -- Implementation
        'published',
        '2022-01-01',
        '2026-12-31',
        '2022-03-01',
        org_unicef_id,
        'C01',  -- Project-type interventions
        '110',  -- Standard grant
        '10',   -- ODA
        '5',    -- Untied
        'USD',
        false,
        '4',    -- National
        'en',
        'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar", "locations": ["Ayeyarwady Region"]}'::JSONB
    );

    -- Activity 2 Sectors
    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, type)
    VALUES
        ('a1000001-0001-4000-8000-000000000002'::UUID, '12240', 'Basic nutrition', 25, 'secondary'),
        ('a1000001-0001-4000-8000-000000000002'::UUID, '12261', 'Health education', 15, 'secondary'),
        ('a1000001-0001-4000-8000-000000000002'::UUID, '13020', 'Reproductive health care', 60, 'primary');

    -- Activity 2 Participating Organizations
    INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, display_order)
    VALUES
        ('a1000001-0001-4000-8000-000000000002'::UUID, org_unicef_id, 'extending', 1),
        ('a1000001-0001-4000-8000-000000000002'::UUID, org_mohs_id, 'government', 2);

    -- ========================================================================
    -- ACTIVITY 3: Climate-Smart Rice Value Chain Development
    -- ========================================================================
    INSERT INTO activities (
        id,
        iati_identifier,
        title_narrative,
        acronym,
        description_narrative,
        description_objectives,
        description_target_groups,
        activity_status,
        publication_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        reporting_org_id,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status,
        default_currency,
        humanitarian,
        activity_scope,
        language,
        created_via,
        general_info
    ) VALUES (
        'a1000001-0001-4000-8000-000000000003'::UUID,
        'XM-DAC-46004-MM-AGR-2023-001',
        'Climate-Smart Rice Value Chain Development Project',
        'CSRVC',
        'This agricultural development project supports smallholder rice farmers in the Bago and Sagaing Regions to adopt climate-resilient farming practices, improve post-harvest handling, and access better markets. The project introduces drought-tolerant rice varieties, efficient irrigation systems, and establishes farmer cooperatives for collective marketing.',
        'To increase rice yields by 25% through climate-smart practices; To reduce post-harvest losses from 15% to 5%; To establish 100 farmer cooperatives with market linkages; To train 10,000 farmers in sustainable agriculture',
        'Smallholder rice farmers (less than 5 acres); Women farmers; Youth in agriculture; Agricultural extension workers',
        '2',  -- Implementation
        'published',
        '2023-07-01',
        '2028-06-30',
        '2023-09-01',
        org_adb_id,
        'B03',  -- Contributions to specific programs
        '421',  -- Standard loan
        '10',   -- ODA
        '5',    -- Untied
        'USD',
        false,
        '4',    -- National
        'en',
        'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar", "locations": ["Bago Region", "Sagaing Region"]}'::JSONB
    );

    -- Activity 3 Sectors
    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, type)
    VALUES
        ('a1000001-0001-4000-8000-000000000003'::UUID, '31161', 'Food crop production', 50, 'primary'),
        ('a1000001-0001-4000-8000-000000000003'::UUID, '31120', 'Agricultural development', 25, 'secondary'),
        ('a1000001-0001-4000-8000-000000000003'::UUID, '31194', 'Agricultural cooperatives', 15, 'secondary'),
        ('a1000001-0001-4000-8000-000000000003'::UUID, '41010', 'Environmental policy', 10, 'secondary');

    -- Activity 3 Participating Organizations
    INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, display_order)
    VALUES
        ('a1000001-0001-4000-8000-000000000003'::UUID, org_adb_id, 'extending', 1),
        ('a1000001-0001-4000-8000-000000000003'::UUID, org_moali_id, 'government', 2),
        ('a1000001-0001-4000-8000-000000000003'::UUID, org_mopfi_id, 'government', 3);

    -- ========================================================================
    -- ACTIVITY 4: Rural Water Supply and Sanitation Program
    -- ========================================================================
    INSERT INTO activities (
        id,
        iati_identifier,
        title_narrative,
        acronym,
        description_narrative,
        description_objectives,
        description_target_groups,
        activity_status,
        publication_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        reporting_org_id,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status,
        default_currency,
        humanitarian,
        activity_scope,
        language,
        created_via,
        general_info
    ) VALUES (
        'a1000001-0001-4000-8000-000000000004'::UUID,
        'XM-DAC-801-MM-WSH-2024-001',
        'Rural Water Supply and Sanitation Improvement Program',
        'RWSSIP',
        'This WASH program aims to provide clean drinking water and improved sanitation facilities to 200 villages in Chin State and Magway Region. The project constructs community water systems, household latrines, and implements behavior change communication programs to improve hygiene practices. Special attention is given to ensuring water points are accessible to persons with disabilities.',
        'To provide access to safe drinking water for 100,000 rural residents; To construct 15,000 household latrines achieving open defecation free status; To establish 200 village WASH committees for sustainable management',
        'Rural households without access to clean water; School children; Women and girls; Persons with disabilities',
        '2',  -- Implementation
        'published',
        '2024-01-01',
        '2028-12-31',
        '2024-03-15',
        org_dfat_id,
        'C01',  -- Project-type interventions
        '110',  -- Standard grant
        '10',   -- ODA
        '5',    -- Untied
        'AUD',
        false,
        '4',    -- National
        'en',
        'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar", "locations": ["Chin State", "Magway Region"]}'::JSONB
    );

    -- Activity 4 Sectors
    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, type)
    VALUES
        ('a1000001-0001-4000-8000-000000000004'::UUID, '14031', 'Basic drinking water supply', 50, 'primary'),
        ('a1000001-0001-4000-8000-000000000004'::UUID, '14032', 'Basic sanitation', 35, 'secondary'),
        ('a1000001-0001-4000-8000-000000000004'::UUID, '14050', 'Waste management/disposal', 15, 'secondary');

    -- Activity 4 Participating Organizations
    INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, display_order)
    VALUES
        ('a1000001-0001-4000-8000-000000000004'::UUID, org_dfat_id, 'extending', 1),
        ('a1000001-0001-4000-8000-000000000004'::UUID, org_mopfi_id, 'government', 2),
        ('a1000001-0001-4000-8000-000000000004'::UUID, org_local_ngo_id, 'implementing', 3);

    -- ========================================================================
    -- ACTIVITY 5: Rural Roads Connectivity Project
    -- ========================================================================
    INSERT INTO activities (
        id,
        iati_identifier,
        title_narrative,
        acronym,
        description_narrative,
        description_objectives,
        description_target_groups,
        activity_status,
        publication_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        reporting_org_id,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status,
        default_currency,
        humanitarian,
        activity_scope,
        language,
        created_via,
        general_info
    ) VALUES (
        'a1000001-0001-4000-8000-000000000005'::UUID,
        'XM-DAC-44000-MM-INF-2022-001',
        'Rural Roads Connectivity and Market Access Project',
        'RRCMAP',
        'This infrastructure project constructs and rehabilitates 500 kilometers of rural roads connecting remote villages to township centers and markets in Mon State and Tanintharyi Region. The project employs labor-intensive methods to maximize local employment and includes road maintenance training for community groups.',
        'To construct 300 km of new all-weather rural roads; To rehabilitate 200 km of existing rural roads; To reduce average travel time to markets by 50%; To create 50,000 person-days of local employment',
        'Rural communities without road access; Farmers needing market access; Local construction workers; Women entrepreneurs',
        '2',  -- Implementation
        'published',
        '2022-06-01',
        '2027-05-31',
        '2022-09-01',
        org_wb_id,
        'B03',  -- Contributions to specific programs
        '421',  -- Standard loan
        '10',   -- ODA
        '5',    -- Untied
        'USD',
        false,
        '4',    -- National
        'en',
        'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar", "locations": ["Mon State", "Tanintharyi Region"]}'::JSONB
    );

    -- Activity 5 Sectors
    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, type)
    VALUES
        ('a1000001-0001-4000-8000-000000000005'::UUID, '21020', 'Road transport', 80, 'primary'),
        ('a1000001-0001-4000-8000-000000000005'::UUID, '16020', 'Employment creation', 15, 'secondary'),
        ('a1000001-0001-4000-8000-000000000005'::UUID, '25010', 'Business support services', 5, 'secondary');

    -- Activity 5 Participating Organizations
    INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, display_order)
    VALUES
        ('a1000001-0001-4000-8000-000000000005'::UUID, org_wb_id, 'extending', 1),
        ('a1000001-0001-4000-8000-000000000005'::UUID, org_mopfi_id, 'government', 2);

    -- ========================================================================
    -- ACTIVITY 6: Emergency Humanitarian Assistance - Rakhine
    -- ========================================================================
    INSERT INTO activities (
        id,
        iati_identifier,
        title_narrative,
        acronym,
        description_narrative,
        description_objectives,
        description_target_groups,
        activity_status,
        publication_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        reporting_org_id,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status,
        default_currency,
        humanitarian,
        activity_scope,
        language,
        created_via,
        general_info
    ) VALUES (
        'a1000001-0001-4000-8000-000000000006'::UUID,
        'XM-DAC-41121-MM-HUM-2024-001',
        'Emergency Humanitarian Assistance for Displaced Populations in Rakhine',
        'EHADP-RKN',
        'This humanitarian response program provides life-saving assistance to internally displaced persons and conflict-affected communities in Rakhine State. The program delivers emergency shelter, food assistance, protection services, and essential household items to approximately 50,000 displaced persons in camps and host communities.',
        'To provide emergency shelter for 10,000 households; To deliver monthly food assistance to 50,000 persons; To establish protection monitoring in 30 displacement sites; To support voluntary return and reintegration where conditions permit',
        'Internally displaced persons; Host communities; Women and children at risk; Persons with specific needs',
        '2',  -- Implementation
        'published',
        '2024-01-01',
        '2025-12-31',
        '2024-01-15',
        org_unhcr_id,
        'A02',  -- Sector budget support
        '110',  -- Standard grant
        '10',   -- ODA
        '5',    -- Untied
        'USD',
        true,   -- Humanitarian
        '4',    -- National
        'en',
        'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar", "locations": ["Rakhine State"], "humanitarian_scope": "conflict"}'::JSONB
    );

    -- Activity 6 Sectors
    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, type)
    VALUES
        ('a1000001-0001-4000-8000-000000000006'::UUID, '72010', 'Material relief assistance and services', 40, 'primary'),
        ('a1000001-0001-4000-8000-000000000006'::UUID, '72040', 'Emergency food assistance', 35, 'secondary'),
        ('a1000001-0001-4000-8000-000000000006'::UUID, '15180', 'Ending violence against women and girls', 15, 'secondary'),
        ('a1000001-0001-4000-8000-000000000006'::UUID, '93010', 'Refugees/Asylum seekers in donor countries', 10, 'secondary');

    -- Activity 6 Participating Organizations
    INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, display_order)
    VALUES
        ('a1000001-0001-4000-8000-000000000006'::UUID, org_unhcr_id, 'extending', 1),
        ('a1000001-0001-4000-8000-000000000006'::UUID, org_wfp_id, 'implementing', 2),
        ('a1000001-0001-4000-8000-000000000006'::UUID, org_local_ngo_id, 'implementing', 3);

    -- ========================================================================
    -- ACTIVITY 7: Local Governance Capacity Building Program
    -- ========================================================================
    INSERT INTO activities (
        id,
        iati_identifier,
        title_narrative,
        acronym,
        description_narrative,
        description_objectives,
        description_target_groups,
        activity_status,
        publication_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        reporting_org_id,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status,
        default_currency,
        humanitarian,
        activity_scope,
        language,
        created_via,
        general_info
    ) VALUES (
        'a1000001-0001-4000-8000-000000000007'::UUID,
        'XM-DAC-41114-MM-GOV-2023-001',
        'Local Governance and Public Administration Strengthening Program',
        'LGPASP',
        'This governance program strengthens the capacity of local government institutions in Mandalay and Yangon Regions to deliver public services effectively and transparently. The program provides training to civil servants, supports digital transformation of government services, and promotes citizen participation in local decision-making through ward and village tract development committees.',
        'To train 2,000 local government officials in public administration; To digitize 50 essential public services; To establish citizen feedback mechanisms in 100 townships; To increase public satisfaction with local services by 25%',
        'Local government officials; Township administrators; Ward and village tract leaders; Civil society organizations; Citizens',
        '2',  -- Implementation
        'published',
        '2023-01-01',
        '2027-12-31',
        '2023-04-01',
        org_undp_id,
        'C01',  -- Project-type interventions
        '110',  -- Standard grant
        '10',   -- ODA
        '5',    -- Untied
        'USD',
        false,
        '4',    -- National
        'en',
        'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar", "locations": ["Mandalay Region", "Yangon Region"]}'::JSONB
    );

    -- Activity 7 Sectors
    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, type)
    VALUES
        ('a1000001-0001-4000-8000-000000000007'::UUID, '15110', 'Public sector policy and administrative management', 50, 'primary'),
        ('a1000001-0001-4000-8000-000000000007'::UUID, '15112', 'Decentralisation and support to subnational government', 30, 'secondary'),
        ('a1000001-0001-4000-8000-000000000007'::UUID, '15150', 'Democratic participation and civil society', 20, 'secondary');

    -- Activity 7 Participating Organizations
    INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, display_order)
    VALUES
        ('a1000001-0001-4000-8000-000000000007'::UUID, org_undp_id, 'extending', 1),
        ('a1000001-0001-4000-8000-000000000007'::UUID, org_eu_id, 'extending', 2),
        ('a1000001-0001-4000-8000-000000000007'::UUID, org_mopfi_id, 'government', 3);

    -- ========================================================================
    -- ACTIVITY 8: Women's Economic Empowerment and Microfinance
    -- ========================================================================
    INSERT INTO activities (
        id,
        iati_identifier,
        title_narrative,
        acronym,
        description_narrative,
        description_objectives,
        description_target_groups,
        activity_status,
        publication_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        reporting_org_id,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status,
        default_currency,
        humanitarian,
        activity_scope,
        language,
        created_via,
        general_info
    ) VALUES (
        'a1000001-0001-4000-8000-000000000008'::UUID,
        'XM-DAC-302-MM-WEE-2023-001',
        'Women''s Economic Empowerment through Microfinance and Skills Training',
        'WEEMST',
        'This livelihoods program promotes women''s economic empowerment in Kachin State and northern Shan State through access to microfinance, business skills training, and market linkages. The program establishes village savings and loan associations, provides vocational training in handicrafts and food processing, and supports women''s cooperatives to access larger markets.',
        'To establish 500 village savings and loan associations; To provide microloans to 15,000 women entrepreneurs; To train 5,000 women in business management and vocational skills; To increase average household income by 40%',
        'Women-headed households; Women entrepreneurs; Young women aged 18-35; Women''s self-help groups',
        '2',  -- Implementation
        'published',
        '2023-10-01',
        '2028-09-30',
        '2024-01-15',
        org_usaid_id,
        'C01',  -- Project-type interventions
        '110',  -- Standard grant
        '10',   -- ODA
        '5',    -- Untied
        'USD',
        false,
        '4',    -- National
        'en',
        'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar", "locations": ["Kachin State", "Shan State (North)"]}'::JSONB
    );

    -- Activity 8 Sectors
    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, type)
    VALUES
        ('a1000001-0001-4000-8000-000000000008'::UUID, '24030', 'Formal sector financial intermediaries', 35, 'primary'),
        ('a1000001-0001-4000-8000-000000000008'::UUID, '15170', 'Women''s rights organisations and movements, and government institutions', 25, 'secondary'),
        ('a1000001-0001-4000-8000-000000000008'::UUID, '11330', 'Vocational training', 25, 'secondary'),
        ('a1000001-0001-4000-8000-000000000008'::UUID, '25010', 'Business support services', 15, 'secondary');

    -- Activity 8 Participating Organizations
    INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, display_order)
    VALUES
        ('a1000001-0001-4000-8000-000000000008'::UUID, org_usaid_id, 'extending', 1),
        ('a1000001-0001-4000-8000-000000000008'::UUID, org_local_ngo_id, 'implementing', 2),
        ('a1000001-0001-4000-8000-000000000008'::UUID, org_mopfi_id, 'government', 3);

    -- ========================================================================
    -- ACTIVITY 9: Coastal Mangrove Restoration and Climate Resilience
    -- ========================================================================
    INSERT INTO activities (
        id,
        iati_identifier,
        title_narrative,
        acronym,
        description_narrative,
        description_objectives,
        description_target_groups,
        activity_status,
        publication_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        reporting_org_id,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status,
        default_currency,
        humanitarian,
        activity_scope,
        language,
        created_via,
        general_info
    ) VALUES (
        'a1000001-0001-4000-8000-000000000009'::UUID,
        'XM-DAC-918-MM-ENV-2024-001',
        'Coastal Mangrove Restoration and Community Climate Resilience Program',
        'CMRCCR',
        'This environmental program restores degraded mangrove ecosystems along Myanmar''s coast in Ayeyarwady and Tanintharyi Regions while building community resilience to climate change impacts. The program combines large-scale mangrove planting with community-based natural resource management, alternative livelihood development, and early warning systems for cyclones and flooding.',
        'To restore 5,000 hectares of degraded mangrove forests; To establish 50 community forest management groups; To develop climate-resilient livelihoods for 20,000 coastal households; To install 100 community early warning systems',
        'Coastal fishing communities; Mangrove-dependent households; Women''s groups engaged in aquaculture; Youth environmental volunteers',
        '2',  -- Implementation
        'published',
        '2024-04-01',
        '2029-03-31',
        '2024-06-01',
        org_eu_id,
        'C01',  -- Project-type interventions
        '110',  -- Standard grant
        '10',   -- ODA
        '5',    -- Untied
        'EUR',
        false,
        '4',    -- National
        'en',
        'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar", "locations": ["Ayeyarwady Region", "Tanintharyi Region"]}'::JSONB
    );

    -- Activity 9 Sectors
    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, type)
    VALUES
        ('a1000001-0001-4000-8000-000000000009'::UUID, '41030', 'Biodiversity', 40, 'primary'),
        ('a1000001-0001-4000-8000-000000000009'::UUID, '41010', 'Environmental policy and administrative management', 25, 'secondary'),
        ('a1000001-0001-4000-8000-000000000009'::UUID, '74010', 'Disaster prevention and preparedness', 20, 'secondary'),
        ('a1000001-0001-4000-8000-000000000009'::UUID, '31310', 'Fishing policy and administrative management', 15, 'secondary');

    -- Activity 9 Participating Organizations
    INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, display_order)
    VALUES
        ('a1000001-0001-4000-8000-000000000009'::UUID, org_eu_id, 'extending', 1),
        ('a1000001-0001-4000-8000-000000000009'::UUID, org_undp_id, 'implementing', 2),
        ('a1000001-0001-4000-8000-000000000009'::UUID, org_local_ngo_id, 'implementing', 3);

    -- ========================================================================
    -- ACTIVITY 10: Social Protection Cash Transfer Program
    -- ========================================================================
    INSERT INTO activities (
        id,
        iati_identifier,
        title_narrative,
        acronym,
        description_narrative,
        description_objectives,
        description_target_groups,
        activity_status,
        publication_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        reporting_org_id,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status,
        default_currency,
        humanitarian,
        activity_scope,
        language,
        created_via,
        general_info
    ) VALUES (
        'a1000001-0001-4000-8000-000000000010'::UUID,
        'XM-DAC-41140-MM-SPR-2023-001',
        'Maternal and Child Cash Transfer Program for Nutrition Security',
        'MCCT-NS',
        'This social protection program provides regular cash transfers to pregnant women and mothers of children under two years in food-insecure areas of Chin State and Rakhine State. The transfers are conditional on attendance at health check-ups and nutrition counseling sessions. The program aims to reduce stunting and improve maternal nutrition outcomes while strengthening the national social protection system.',
        'To provide monthly cash transfers to 30,000 pregnant women and mothers; To reduce stunting prevalence by 15% in target areas; To achieve 90% attendance at growth monitoring sessions; To establish digital payment systems for efficient transfer delivery',
        'Pregnant women; Mothers of children under 2 years; Children under 2 years in food-insecure households; Elderly caregivers',
        '2',  -- Implementation
        'published',
        '2023-07-01',
        '2027-06-30',
        '2023-10-01',
        org_wfp_id,
        'C01',  -- Project-type interventions
        '110',  -- Standard grant
        '10',   -- ODA
        '5',    -- Untied
        'USD',
        false,
        '4',    -- National
        'en',
        'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar", "locations": ["Chin State", "Rakhine State"]}'::JSONB
    );

    -- Activity 10 Sectors
    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, type)
    VALUES
        ('a1000001-0001-4000-8000-000000000010'::UUID, '16010', 'Social protection', 50, 'primary'),
        ('a1000001-0001-4000-8000-000000000010'::UUID, '12240', 'Basic nutrition', 35, 'secondary'),
        ('a1000001-0001-4000-8000-000000000010'::UUID, '13020', 'Reproductive health care', 15, 'secondary');

    -- Activity 10 Participating Organizations
    INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, display_order)
    VALUES
        ('a1000001-0001-4000-8000-000000000010'::UUID, org_wfp_id, 'extending', 1),
        ('a1000001-0001-4000-8000-000000000010'::UUID, org_unicef_id, 'implementing', 2),
        ('a1000001-0001-4000-8000-000000000010'::UUID, org_mohs_id, 'government', 3);

    RAISE NOTICE 'Successfully created 10 Myanmar development activities with sectors and participating organizations';

END $$;

-- ============================================================================
-- SUMMARY OF CREATED ACTIVITIES
-- ============================================================================
-- 1. Rural Primary School Construction Program (RPSCTP) - Education - JICA
-- 2. Maternal and Child Health Improvement Program (MCHIP-AYR) - Health - UNICEF
-- 3. Climate-Smart Rice Value Chain Development (CSRVC) - Agriculture - ADB
-- 4. Rural Water Supply and Sanitation Program (RWSSIP) - WASH - DFAT
-- 5. Rural Roads Connectivity Project (RRCMAP) - Infrastructure - World Bank
-- 6. Emergency Humanitarian Assistance - Rakhine (EHADP-RKN) - Humanitarian - UNHCR
-- 7. Local Governance Capacity Building Program (LGPASP) - Governance - UNDP
-- 8. Women's Economic Empowerment and Microfinance (WEEMST) - Livelihoods - USAID
-- 9. Coastal Mangrove Restoration Program (CMRCCR) - Environment - EU
-- 10. Maternal and Child Cash Transfer Program (MCCT-NS) - Social Protection - WFP
-- ============================================================================
