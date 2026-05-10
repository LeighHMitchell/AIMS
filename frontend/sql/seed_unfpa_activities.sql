-- ============================================================================
-- SEED DATA: 10 UNFPA Myanmar Activities
-- ============================================================================
-- Mirrors the structure of seed_sdg_profile_data.sql (S07) and populates
-- the full set of related child tables for end-to-end profile/analytics
-- coverage:
--   activities, activity_sectors, activity_sdg_mappings, transactions,
--   planned_disbursements, activity_locations, activity_contributors,
--   activity_policy_markers, activity_tags (+ tags), activity_contacts.
--
-- All 10 activities are reported by UNFPA (XM-DAC-41119), are in Myanmar,
-- and focus on UNFPA's core mandate: reproductive health, family planning,
-- maternal/newborn health, midwifery, GBV, HIV, census, and humanitarian SRH.
--
-- Status mix: 7 Implementation ('2'), 2 Pipeline ('1'), 1 Closed ('4').
--
-- IDs use the prefix 41119000-0001-4000-8000-... (hex-valid; "41119" = UNFPA
-- DAC code) so this seed's rows are easy to find / clean up.
-- Idempotent: ON CONFLICT DO NOTHING / WHERE NOT EXISTS throughout.
-- ============================================================================

DO $$
DECLARE
    org_unfpa_id   UUID;
    org_mohs_id    UUID;
    org_mopfi_id   UUID;
    org_mdf_id     UUID;
    org_moswrr_id  UUID;
    org_dop_id     UUID;
BEGIN

    -- ------------------------------------------------------------------------
    -- 1. Resolve / create organisations
    -- ------------------------------------------------------------------------

    -- UNFPA (insert if missing — same pattern as seed_sdg_profile_data.sql)
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'United Nations Population Fund', 'UNFPA', '40', 'XM-DAC-41119', 'International',
           'UN agency for reproductive health and population'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'UNFPA');
    SELECT id INTO org_unfpa_id FROM organizations WHERE acronym = 'UNFPA' LIMIT 1;

    SELECT id INTO org_mohs_id  FROM organizations WHERE acronym = 'MOHS'  LIMIT 1;
    SELECT id INTO org_mopfi_id FROM organizations WHERE acronym = 'MOPFI' LIMIT 1;
    SELECT id INTO org_mdf_id   FROM organizations WHERE acronym = 'MDF'   LIMIT 1;

    -- Ministry of Social Welfare, Relief and Resettlement
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Ministry of Social Welfare, Relief and Resettlement', 'MOSWRR', '10', 'MM-GOV-MOSWRR', 'Myanmar',
           'Government ministry responsible for social welfare and disaster response'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'MOSWRR');
    SELECT id INTO org_moswrr_id FROM organizations WHERE acronym = 'MOSWRR' LIMIT 1;

    -- Department of Population
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Department of Population', 'DOP', '10', 'MM-GOV-DOP', 'Myanmar',
           'Government department responsible for population data and census'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'DOP');
    SELECT id INTO org_dop_id FROM organizations WHERE acronym = 'DOP' LIMIT 1;


    -- ========================================================================
    -- ACTIVITY U01: Maternal & Newborn Health in Conflict-Affected Areas
    -- Status: Implementation | Donor: UNFPA | Total: $18M
    -- ========================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        '41119000-0001-4000-8000-000000000001'::UUID,
        'XM-DAC-41119-MM-MNH-2023-001',
        'Strengthening Maternal & Newborn Health Services in Conflict-Affected Areas',
        'SMNHS',
        'Restoring and strengthening maternal and newborn health services in conflict-affected townships through emergency obstetric care, mobile clinics, and skilled birth attendance for displaced and host communities.',
        '2', 'published', '2023-01-01', '2026-12-31', '2023-03-01',
        org_unfpa_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, sector_vocabulary) VALUES
    ('41119000-0001-4000-8000-000000000001', '13020', 'Reproductive health care', 70, 'sector', '130', 'Population policies/programmes & reproductive health', 'primary',   '1'),
    ('41119000-0001-4000-8000-000000000001', '13030', 'Family planning',          30, 'sector', '130', 'Population policies/programmes & reproductive health', 'secondary', '1')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('41119000-0001-4000-8000-000000000001', 3, '3.1', 40, 'Reduce maternal mortality'),
    ('41119000-0001-4000-8000-000000000001', 3, '3.2', 30, 'End preventable newborn deaths'),
    ('41119000-0001-4000-8000-000000000001', 3, '3.7', 20, 'Universal access to reproductive health services'),
    ('41119000-0001-4000-8000-000000000001', 5, '5.6', 10, 'Reproductive rights')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('41119000-0001-4000-8000-000000000001', '2', 18000000, 'USD', '2023-01-15', 'UNFPA', 'UNFPA Myanmar', 'Total commitment: maternal & newborn health programme', 'actual'),
    ('41119000-0001-4000-8000-000000000001', '3',  3500000, 'USD', '2023-04-15', 'UNFPA', 'MOHS',          'Year 1 H1: Mobile clinic deployment & EmOC kits',         'actual'),
    ('41119000-0001-4000-8000-000000000001', '3',  3800000, 'USD', '2023-10-15', 'UNFPA', 'MOHS',          'Year 1 H2: Skilled birth attendance training',            'actual'),
    ('41119000-0001-4000-8000-000000000001', '3',  4200000, 'USD', '2024-04-15', 'UNFPA', 'MOHS',          'Year 2 H1: Referral systems & maternal waiting homes',    'actual'),
    ('41119000-0001-4000-8000-000000000001', '3',  3900000, 'USD', '2024-10-15', 'UNFPA', 'MOHS',          'Year 2 H2: Newborn care equipment',                       'actual'),
    ('41119000-0001-4000-8000-000000000001', '4',  9800000, 'USD', '2024-12-31', 'MOHS',  'Various',       'Cumulative expenditure',                                  'actual')
    ON CONFLICT DO NOTHING;

    INSERT INTO planned_disbursements (activity_id, amount, currency, period_start, period_end, provider_org_id, provider_org_name, receiver_org_id, receiver_org_name, status) VALUES
    ('41119000-0001-4000-8000-000000000001', 2300000, 'USD', '2025-04-01', '2025-09-30', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original'),
    ('41119000-0001-4000-8000-000000000001', 2300000, 'USD', '2025-10-01', '2026-03-31', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original'),
    ('41119000-0001-4000-8000-000000000001', 2000000, 'USD', '2026-04-01', '2026-12-31', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('41119000-0001-4000-8000-000000000001', 'coverage', 'Kachin State',  'MM', 'Kachin',  'subnational', 25, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000001', 'coverage', 'Shan State',    'MM', 'Shan',    'subnational', 25, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000001', 'coverage', 'Rakhine State', 'MM', 'Rakhine', 'subnational', 25, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000001', 'coverage', 'Chin State',    'MM', 'Chin',    'subnational', 25, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('41119000-0001-4000-8000-000000000001', org_unfpa_id, 'UNFPA', 'funder',     'accepted'),
    ('41119000-0001-4000-8000-000000000001', org_mohs_id,  'MOHS',  'implementer','accepted')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    SELECT '41119000-0001-4000-8000-000000000001'::UUID, pm.uuid, s.significance, s.rationale FROM (VALUES
        ('gender_equality', 2, 'Programme has gender equality and women''s empowerment as its principal objective'),
        ('human_rights',    1, 'Reproductive rights and access to care for marginalised populations'),
        ('peacebuilding',   1, 'Service delivery in conflict-affected areas with conflict-sensitive approach')
    ) AS s(code, significance, rationale)
    JOIN policy_markers pm ON pm.code = s.code
    ON CONFLICT (activity_id, policy_marker_id) DO NOTHING;


    -- ========================================================================
    -- ACTIVITY U02: Adolescent-Friendly SRH Programme
    -- Status: Implementation | Donor: UNFPA | Total: $9M
    -- ========================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        '41119000-0001-4000-8000-000000000002'::UUID,
        'XM-DAC-41119-MM-ASR-2024-001',
        'Adolescent-Friendly Sexual & Reproductive Health Programme',
        'AFSRH',
        'Establishing adolescent-friendly health services and comprehensive sexuality education in 60 townships, with peer-educator networks and youth-led advocacy on reproductive health, gender, and consent.',
        '2', 'published', '2024-01-15', '2027-01-14', '2024-04-01',
        org_unfpa_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, sector_vocabulary) VALUES
    ('41119000-0001-4000-8000-000000000002', '13020', 'Reproductive health care', 50, 'sector', '130', 'Population policies/programmes & reproductive health', 'primary',   '1'),
    ('41119000-0001-4000-8000-000000000002', '13030', 'Family planning',          50, 'sector', '130', 'Population policies/programmes & reproductive health', 'secondary', '1')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('41119000-0001-4000-8000-000000000002', 3, '3.7', 50, 'Universal access to reproductive health for adolescents'),
    ('41119000-0001-4000-8000-000000000002', 5, '5.6', 30, 'Reproductive rights'),
    ('41119000-0001-4000-8000-000000000002', 4, '4.7', 20, 'Comprehensive sexuality education')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('41119000-0001-4000-8000-000000000002', '2', 9000000, 'USD', '2024-02-01', 'UNFPA', 'UNFPA Myanmar', 'Total commitment',                                  'actual'),
    ('41119000-0001-4000-8000-000000000002', '3', 1500000, 'USD', '2024-05-15', 'UNFPA', 'MOHS',          'Y1 Q2: Curriculum + peer educator training',        'actual'),
    ('41119000-0001-4000-8000-000000000002', '3', 1800000, 'USD', '2024-09-15', 'UNFPA', 'MOHS',          'Y1 Q3: AFHS centre setup',                          'actual'),
    ('41119000-0001-4000-8000-000000000002', '3', 1700000, 'USD', '2025-02-15', 'UNFPA', 'MOHS',          'Y2 Q1: Youth-led advocacy grants',                  'actual'),
    ('41119000-0001-4000-8000-000000000002', '4', 4500000, 'USD', '2025-03-31', 'MOHS',  'Various',       'Cumulative expenditure',                            'actual')
    ON CONFLICT DO NOTHING;

    INSERT INTO planned_disbursements (activity_id, amount, currency, period_start, period_end, provider_org_id, provider_org_name, receiver_org_id, receiver_org_name, status) VALUES
    ('41119000-0001-4000-8000-000000000002', 1500000, 'USD', '2025-04-01', '2025-09-30', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original'),
    ('41119000-0001-4000-8000-000000000002', 1500000, 'USD', '2025-10-01', '2026-03-31', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original'),
    ('41119000-0001-4000-8000-000000000002', 1000000, 'USD', '2026-04-01', '2027-01-14', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('41119000-0001-4000-8000-000000000002', 'coverage', 'Yangon Region',   'MM', 'Yangon',   'subnational', 40, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000002', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 30, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000002', 'coverage', 'Bago Region',     'MM', 'Bago',     'subnational', 15, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000002', 'coverage', 'Sagaing Region',  'MM', 'Sagaing',  'subnational', 15, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('41119000-0001-4000-8000-000000000002', org_unfpa_id, 'UNFPA', 'funder',     'accepted'),
    ('41119000-0001-4000-8000-000000000002', org_mohs_id,  'MOHS',  'implementer','accepted')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    SELECT '41119000-0001-4000-8000-000000000002'::UUID, pm.uuid, s.significance, s.rationale FROM (VALUES
        ('gender_equality',  2, 'Adolescent SRH explicitly addresses gender equality and women''s empowerment'),
        ('participatory_dev',1, 'Youth-led design, peer-educator networks, and youth advisory boards')
    ) AS s(code, significance, rationale)
    JOIN policy_markers pm ON pm.code = s.code
    ON CONFLICT (activity_id, policy_marker_id) DO NOTHING;


    -- ========================================================================
    -- ACTIVITY U03: Last-Mile Family Planning & Contraceptive Supply Chain
    -- Status: Implementation | Donor: UNFPA | Total: $11M
    -- ========================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        '41119000-0001-4000-8000-000000000003'::UUID,
        'XM-DAC-41119-MM-FP-2023-002',
        'Last-Mile Family Planning & Contraceptive Supply Chain',
        'LMFPSC',
        'Closing the last-mile contraceptive supply gap by procuring and pre-positioning long-acting reversible contraceptives and emergency contraception, modernising LMIS, and training community health workers.',
        '2', 'published', '2023-07-01', '2025-06-30', '2023-09-01',
        org_unfpa_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, sector_vocabulary) VALUES
    ('41119000-0001-4000-8000-000000000003', '13030', 'Family planning',          80, 'sector', '130', 'Population policies/programmes & reproductive health', 'primary',   '1'),
    ('41119000-0001-4000-8000-000000000003', '13020', 'Reproductive health care', 20, 'sector', '130', 'Population policies/programmes & reproductive health', 'secondary', '1')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('41119000-0001-4000-8000-000000000003', 3, '3.7', 60, 'Universal access to family planning'),
    ('41119000-0001-4000-8000-000000000003', 5, '5.6', 40, 'Reproductive rights')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('41119000-0001-4000-8000-000000000003', '2', 11000000, 'USD', '2023-07-01', 'UNFPA', 'UNFPA Myanmar', 'Total commitment',                            'actual'),
    ('41119000-0001-4000-8000-000000000003', '3',  3000000, 'USD', '2023-10-15', 'UNFPA', 'MOHS',          'Initial procurement: LARC + EC',              'actual'),
    ('41119000-0001-4000-8000-000000000003', '3',  2800000, 'USD', '2024-04-15', 'UNFPA', 'MOHS',          'LMIS modernisation + CHW training',           'actual'),
    ('41119000-0001-4000-8000-000000000003', '3',  2500000, 'USD', '2024-10-15', 'UNFPA', 'MOHS',          'Restock + last-mile distribution',            'actual'),
    ('41119000-0001-4000-8000-000000000003', '4',  7800000, 'USD', '2024-12-31', 'MOHS',  'Various',       'Cumulative expenditure',                      'actual')
    ON CONFLICT DO NOTHING;

    INSERT INTO planned_disbursements (activity_id, amount, currency, period_start, period_end, provider_org_id, provider_org_name, receiver_org_id, receiver_org_name, status) VALUES
    ('41119000-0001-4000-8000-000000000003', 1400000, 'USD', '2025-01-01', '2025-06-30', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original'),
    ('41119000-0001-4000-8000-000000000003', 1300000, 'USD', '2025-04-01', '2025-06-30', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('41119000-0001-4000-8000-000000000003', 'coverage', 'Ayeyarwady Region',  'MM', 'Ayeyarwady',  'subnational', 30, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000003', 'coverage', 'Magway Region',      'MM', 'Magway',      'subnational', 25, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000003', 'coverage', 'Sagaing Region',     'MM', 'Sagaing',     'subnational', 25, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000003', 'coverage', 'Tanintharyi Region', 'MM', 'Tanintharyi', 'subnational', 20, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('41119000-0001-4000-8000-000000000003', org_unfpa_id, 'UNFPA', 'funder',     'accepted'),
    ('41119000-0001-4000-8000-000000000003', org_mohs_id,  'MOHS',  'implementer','accepted')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    SELECT '41119000-0001-4000-8000-000000000003'::UUID, pm.uuid, s.significance, s.rationale FROM (VALUES
        ('gender_equality', 2, 'Family planning access central to women''s autonomy and empowerment')
    ) AS s(code, significance, rationale)
    JOIN policy_markers pm ON pm.code = s.code
    ON CONFLICT (activity_id, policy_marker_id) DO NOTHING;


    -- ========================================================================
    -- ACTIVITY U04: Midwifery Workforce Strengthening
    -- Status: Implementation | Donor: UNFPA | Total: $14M
    -- ========================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        '41119000-0001-4000-8000-000000000004'::UUID,
        'XM-DAC-41119-MM-WF-2022-001',
        'Midwifery Workforce Strengthening & Pre-Service Training',
        'MWST',
        'Strengthening the midwifery workforce through pre-service curriculum reform, regulatory framework support, mentorship for newly-deployed midwives, and continuing professional development across nine regional midwifery training centres.',
        '2', 'published', '2022-04-01', '2026-03-31', '2022-06-01',
        org_unfpa_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, sector_vocabulary) VALUES
    ('41119000-0001-4000-8000-000000000004', '13081', 'Personnel development for population & reproductive health', 60, 'sector', '130', 'Population policies/programmes & reproductive health', 'primary',   '1'),
    ('41119000-0001-4000-8000-000000000004', '13020', 'Reproductive health care',                                   40, 'sector', '130', 'Population policies/programmes & reproductive health', 'secondary', '1')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('41119000-0001-4000-8000-000000000004', 3, '3.c', 40, 'Health workforce development'),
    ('41119000-0001-4000-8000-000000000004', 3, '3.1', 30, 'Reduce maternal mortality'),
    ('41119000-0001-4000-8000-000000000004', 5, '5.6', 30, 'Reproductive rights')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('41119000-0001-4000-8000-000000000004', '2', 14000000, 'USD', '2022-04-01', 'UNFPA', 'UNFPA Myanmar', 'Total commitment',                              'actual'),
    ('41119000-0001-4000-8000-000000000004', '3',  2500000, 'USD', '2022-09-15', 'UNFPA', 'MOHS',          'Y1: Curriculum reform + regulatory support',    'actual'),
    ('41119000-0001-4000-8000-000000000004', '3',  3200000, 'USD', '2023-04-15', 'UNFPA', 'MOHS',          'Y2 H1: Tutor capacity + skills labs',           'actual'),
    ('41119000-0001-4000-8000-000000000004', '3',  3000000, 'USD', '2023-10-15', 'UNFPA', 'MOHS',          'Y2 H2: Mentorship + CPD rollout',               'actual'),
    ('41119000-0001-4000-8000-000000000004', '3',  2600000, 'USD', '2024-04-15', 'UNFPA', 'MOHS',          'Y3 H1: Training centre upgrades',               'actual'),
    ('41119000-0001-4000-8000-000000000004', '3',  1800000, 'USD', '2024-10-15', 'UNFPA', 'MOHS',          'Y3 H2: National competency assessment',         'actual'),
    ('41119000-0001-4000-8000-000000000004', '4',  9700000, 'USD', '2024-12-31', 'MOHS',  'Various',       'Cumulative expenditure',                        'actual')
    ON CONFLICT DO NOTHING;

    INSERT INTO planned_disbursements (activity_id, amount, currency, period_start, period_end, provider_org_id, provider_org_name, receiver_org_id, receiver_org_name, status) VALUES
    ('41119000-0001-4000-8000-000000000004', 1500000, 'USD', '2025-04-01', '2025-09-30', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original'),
    ('41119000-0001-4000-8000-000000000004', 1400000, 'USD', '2025-10-01', '2026-03-31', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('41119000-0001-4000-8000-000000000004', 'coverage', 'Yangon Region',          'MM', 'Yangon',     'subnational', 20, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000004', 'coverage', 'Mandalay Region',        'MM', 'Mandalay',   'subnational', 20, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000004', 'coverage', 'Naypyidaw Union Territory','MM','Naypyidaw', 'subnational', 15, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000004', 'coverage', 'Mon State',              'MM', 'Mon',        'subnational', 15, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000004', 'coverage', 'Kayin State',            'MM', 'Kayin',      'subnational', 15, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000004', 'coverage', 'Kachin State',           'MM', 'Kachin',     'subnational', 15, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('41119000-0001-4000-8000-000000000004', org_unfpa_id, 'UNFPA', 'funder',     'accepted'),
    ('41119000-0001-4000-8000-000000000004', org_mohs_id,  'MOHS',  'implementer','accepted')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    SELECT '41119000-0001-4000-8000-000000000004'::UUID, pm.uuid, s.significance, s.rationale FROM (VALUES
        ('gender_equality', 2, 'Predominantly female workforce; programme advances women''s economic empowerment')
    ) AS s(code, significance, rationale)
    JOIN policy_markers pm ON pm.code = s.code
    ON CONFLICT (activity_id, policy_marker_id) DO NOTHING;


    -- ========================================================================
    -- ACTIVITY U05: Population & Housing Census Technical Support (Pipeline)
    -- Status: Pipeline | Donor: UNFPA | Total: $7M
    -- ========================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        '41119000-0001-4000-8000-000000000005'::UUID,
        'XM-DAC-41119-MM-CEN-2025-001',
        'Population & Housing Census Technical Support',
        'PHCTS',
        'Multi-year technical assistance to the Department of Population for the planning, enumeration, processing, and analysis of the next Population and Housing Census, including disaggregated data on women, youth, persons with disabilities, and migrants.',
        '1', 'published', '2025-06-01', '2028-05-31', NULL,
        org_unfpa_id, 'D02', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, sector_vocabulary) VALUES
    ('41119000-0001-4000-8000-000000000005', '13010', 'Population policy & administrative management', 100, 'sector', '130', 'Population policies/programmes & reproductive health', 'primary', '1')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('41119000-0001-4000-8000-000000000005', 17, '17.18', 60, 'Disaggregated, high-quality data'),
    ('41119000-0001-4000-8000-000000000005', 17, '17.19', 40, 'Statistical capacity for SDG measurement')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('41119000-0001-4000-8000-000000000005', '2', 7000000, 'USD', '2025-06-01', 'UNFPA', 'UNFPA Myanmar', 'Total commitment (pipeline)', 'draft')
    ON CONFLICT DO NOTHING;

    INSERT INTO planned_disbursements (activity_id, amount, currency, period_start, period_end, provider_org_id, provider_org_name, receiver_org_id, receiver_org_name, status) VALUES
    ('41119000-0001-4000-8000-000000000005', 1500000, 'USD', '2025-07-01', '2025-12-31', org_unfpa_id, 'UNFPA', org_dop_id,   'DOP',   'original'),
    ('41119000-0001-4000-8000-000000000005', 2000000, 'USD', '2026-01-01', '2026-12-31', org_unfpa_id, 'UNFPA', org_dop_id,   'DOP',   'original'),
    ('41119000-0001-4000-8000-000000000005', 2000000, 'USD', '2027-01-01', '2027-12-31', org_unfpa_id, 'UNFPA', org_dop_id,   'DOP',   'original'),
    ('41119000-0001-4000-8000-000000000005', 1500000, 'USD', '2028-01-01', '2028-05-31', org_unfpa_id, 'UNFPA', org_dop_id,   'DOP',   'original')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('41119000-0001-4000-8000-000000000005', 'coverage', 'Myanmar (national coverage)', 'MM', NULL, 'national', 100, 'manual', '1', '3', '0');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('41119000-0001-4000-8000-000000000005', org_unfpa_id, 'UNFPA', 'funder',     'accepted'),
    ('41119000-0001-4000-8000-000000000005', org_dop_id,   'DOP',   'implementer','accepted'),
    ('41119000-0001-4000-8000-000000000005', org_mopfi_id, 'MOPFI', 'implementer','accepted')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    SELECT '41119000-0001-4000-8000-000000000005'::UUID, pm.uuid, s.significance, s.rationale FROM (VALUES
        ('gender_equality',  1, 'Sex-disaggregated data and gender-responsive census instruments'),
        ('disability',       1, 'Disability-disaggregated data using Washington Group Short Set')
    ) AS s(code, significance, rationale)
    JOIN policy_markers pm ON pm.code = s.code
    ON CONFLICT (activity_id, policy_marker_id) DO NOTHING;


    -- ========================================================================
    -- ACTIVITY U06: Emergency Reproductive Health Response (Cyclone)
    -- Status: Implementation, humanitarian | Donor: UNFPA | Total: $5M
    -- ========================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        '41119000-0001-4000-8000-000000000006'::UUID,
        'XM-DAC-41119-MM-EMR-2024-001',
        'Emergency Reproductive Health Response in Cyclone-Affected Townships',
        'EMRH',
        'Implementing the Minimum Initial Service Package (MISP) for reproductive health in cyclone-affected townships: dignity kits, mobile RH services, clinical management of rape, GBV referral pathways, and continuity of maternal care.',
        '2', 'published', '2024-05-15', '2025-05-14', '2024-05-20',
        org_unfpa_id, 'C01', '110', '10', '5', 'USD', true, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, sector_vocabulary) VALUES
    ('41119000-0001-4000-8000-000000000006', '13020', 'Reproductive health care',                       60, 'sector', '130', 'Population policies/programmes & reproductive health', 'primary',   '1'),
    ('41119000-0001-4000-8000-000000000006', '72050', 'Disaster prevention and preparedness (humanitarian)', 40, 'sector', '720', 'Emergency response',                                  'secondary', '1')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('41119000-0001-4000-8000-000000000006', 3, '3.7',  50, 'Reproductive health in emergencies'),
    ('41119000-0001-4000-8000-000000000006', 5, '5.6',  30, 'Reproductive rights for crisis-affected women'),
    ('41119000-0001-4000-8000-000000000006', 11,'11.5', 20, 'Reduce deaths and people affected by disasters')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('41119000-0001-4000-8000-000000000006', '2', 5000000, 'USD', '2024-05-15', 'UNFPA', 'UNFPA Myanmar', 'Total commitment: cyclone emergency RH response', 'actual'),
    ('41119000-0001-4000-8000-000000000006', '3', 2000000, 'USD', '2024-06-01', 'UNFPA', 'MOHS',          'Initial deployment: MISP + dignity kits',         'actual'),
    ('41119000-0001-4000-8000-000000000006', '3', 1500000, 'USD', '2024-09-15', 'UNFPA', 'MOHS',          'Mobile clinics + GBV referral pathways',          'actual'),
    ('41119000-0001-4000-8000-000000000006', '3', 1000000, 'USD', '2024-12-15', 'UNFPA', 'MOHS',          'Clinical management of rape + supplies',          'actual'),
    ('41119000-0001-4000-8000-000000000006', '4', 4200000, 'USD', '2024-12-31', 'MOHS',  'Various',       'Cumulative expenditure',                          'actual')
    ON CONFLICT DO NOTHING;

    INSERT INTO planned_disbursements (activity_id, amount, currency, period_start, period_end, provider_org_id, provider_org_name, receiver_org_id, receiver_org_name, status) VALUES
    ('41119000-0001-4000-8000-000000000006', 500000, 'USD', '2025-01-01', '2025-05-14', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('41119000-0001-4000-8000-000000000006', 'coverage', 'Ayeyarwady Region', 'MM', 'Ayeyarwady', 'subnational', 50, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000006', 'coverage', 'Yangon Region',     'MM', 'Yangon',     'subnational', 30, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000006', 'coverage', 'Bago Region',       'MM', 'Bago',       'subnational', 20, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('41119000-0001-4000-8000-000000000006', org_unfpa_id,  'UNFPA',  'funder',     'accepted'),
    ('41119000-0001-4000-8000-000000000006', org_mohs_id,   'MOHS',   'implementer','accepted'),
    ('41119000-0001-4000-8000-000000000006', org_moswrr_id, 'MOSWRR', 'implementer','accepted')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    SELECT '41119000-0001-4000-8000-000000000006'::UUID, pm.uuid, s.significance, s.rationale FROM (VALUES
        ('gender_equality', 2, 'Targeted services for women and girls in crisis settings'),
        ('human_rights',    1, 'Rights-based approach to humanitarian SRH services')
    ) AS s(code, significance, rationale)
    JOIN policy_markers pm ON pm.code = s.code
    ON CONFLICT (activity_id, policy_marker_id) DO NOTHING;


    -- ========================================================================
    -- ACTIVITY U07: GBV Prevention & Response — Rakhine & Kachin
    -- Status: Implementation | Donor: UNFPA | Total: $8M
    -- ========================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        '41119000-0001-4000-8000-000000000007'::UUID,
        'XM-DAC-41119-MM-GBV-2023-001',
        'Combating Gender-Based Violence in Rakhine & Kachin',
        'GBVRK',
        'Multi-sectoral GBV prevention and response in Rakhine and Kachin: women and girls'' safe spaces, case management, psychosocial support, clinical management of rape, and engagement with men and boys on harmful social norms.',
        '2', 'published', '2023-04-01', '2026-03-31', '2023-06-01',
        org_unfpa_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, sector_vocabulary) VALUES
    ('41119000-0001-4000-8000-000000000007', '15180', 'Ending violence against women and girls', 60, 'sector', '151', 'Government & civil society — general', 'primary',   '1'),
    ('41119000-0001-4000-8000-000000000007', '13020', 'Reproductive health care',                40, 'sector', '130', 'Population policies/programmes & reproductive health', 'secondary', '1')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('41119000-0001-4000-8000-000000000007', 5,  '5.2',  60, 'Eliminate violence against women and girls'),
    ('41119000-0001-4000-8000-000000000007', 16, '16.1', 20, 'Reduce all forms of violence'),
    ('41119000-0001-4000-8000-000000000007', 5,  '5.3',  20, 'Eliminate harmful practices')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('41119000-0001-4000-8000-000000000007', '2', 8000000, 'USD', '2023-04-01', 'UNFPA', 'UNFPA Myanmar', 'Total commitment',                        'actual'),
    ('41119000-0001-4000-8000-000000000007', '3', 1800000, 'USD', '2023-09-15', 'UNFPA', 'MDF',           'Y1: Safe spaces + case management setup', 'actual'),
    ('41119000-0001-4000-8000-000000000007', '3', 1700000, 'USD', '2024-03-15', 'UNFPA', 'MDF',           'Y2 H1: Psychosocial support scale-up',    'actual'),
    ('41119000-0001-4000-8000-000000000007', '3', 1600000, 'USD', '2024-09-15', 'UNFPA', 'MDF',           'Y2 H2: Men & boys engagement',            'actual'),
    ('41119000-0001-4000-8000-000000000007', '4', 4900000, 'USD', '2024-12-31', 'MDF',   'Various',       'Cumulative expenditure',                  'actual')
    ON CONFLICT DO NOTHING;

    INSERT INTO planned_disbursements (activity_id, amount, currency, period_start, period_end, provider_org_id, provider_org_name, receiver_org_id, receiver_org_name, status) VALUES
    ('41119000-0001-4000-8000-000000000007', 1400000, 'USD', '2025-04-01', '2025-09-30', org_unfpa_id, 'UNFPA', org_mdf_id, 'MDF', 'original'),
    ('41119000-0001-4000-8000-000000000007', 1500000, 'USD', '2025-10-01', '2026-03-31', org_unfpa_id, 'UNFPA', org_mdf_id, 'MDF', 'original')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('41119000-0001-4000-8000-000000000007', 'coverage', 'Rakhine State', 'MM', 'Rakhine', 'subnational', 50, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000007', 'coverage', 'Kachin State',  'MM', 'Kachin',  'subnational', 50, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('41119000-0001-4000-8000-000000000007', org_unfpa_id,  'UNFPA',  'funder',     'accepted'),
    ('41119000-0001-4000-8000-000000000007', org_mdf_id,    'MDF',    'implementer','accepted'),
    ('41119000-0001-4000-8000-000000000007', org_moswrr_id, 'MOSWRR', 'implementer','accepted')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    SELECT '41119000-0001-4000-8000-000000000007'::UUID, pm.uuid, s.significance, s.rationale FROM (VALUES
        ('gender_equality', 2, 'Eliminating GBV is the principal objective'),
        ('human_rights',    2, 'Rights-based, survivor-centred approach is the principal objective'),
        ('peacebuilding',   1, 'Conflict-sensitive programming in protracted-crisis settings')
    ) AS s(code, significance, rationale)
    JOIN policy_markers pm ON pm.code = s.code
    ON CONFLICT (activity_id, policy_marker_id) DO NOTHING;


    -- ========================================================================
    -- ACTIVITY U08: HIV Prevention Among Key Populations & Young People
    -- Status: Implementation | Donor: UNFPA | Total: $6M
    -- ========================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        '41119000-0001-4000-8000-000000000008'::UUID,
        'XM-DAC-41119-MM-HIV-2024-001',
        'HIV Prevention Among Key Populations & Young People',
        'HIVPK',
        'Combination prevention approach for sex workers, MSM, transgender people, and adolescents and young people: HIV self-testing, PrEP scale-up, condom programming, and peer-led outreach integrated with SRH services.',
        '2', 'published', '2024-01-01', '2027-12-31', '2024-03-01',
        org_unfpa_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, sector_vocabulary) VALUES
    ('41119000-0001-4000-8000-000000000008', '13040', 'STD control including HIV/AIDS', 70, 'sector', '130', 'Population policies/programmes & reproductive health', 'primary',   '1'),
    ('41119000-0001-4000-8000-000000000008', '13020', 'Reproductive health care',       30, 'sector', '130', 'Population policies/programmes & reproductive health', 'secondary', '1')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('41119000-0001-4000-8000-000000000008', 3, '3.3', 70, 'End AIDS epidemic'),
    ('41119000-0001-4000-8000-000000000008', 3, '3.7', 30, 'Universal access to SRH services')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('41119000-0001-4000-8000-000000000008', '2', 6000000, 'USD', '2024-01-15', 'UNFPA', 'UNFPA Myanmar', 'Total commitment',                       'actual'),
    ('41119000-0001-4000-8000-000000000008', '3',  900000, 'USD', '2024-04-15', 'UNFPA', 'MOHS',          'Y1 Q1: Outreach + HIVST procurement',    'actual'),
    ('41119000-0001-4000-8000-000000000008', '3', 1100000, 'USD', '2024-08-15', 'UNFPA', 'MOHS',          'Y1 Q3: PrEP introduction',               'actual'),
    ('41119000-0001-4000-8000-000000000008', '3', 1000000, 'USD', '2025-01-15', 'UNFPA', 'MOHS',          'Y2 Q1: Peer educator scale-up',          'actual'),
    ('41119000-0001-4000-8000-000000000008', '4', 2700000, 'USD', '2025-03-31', 'MOHS',  'Various',       'Cumulative expenditure',                 'actual')
    ON CONFLICT DO NOTHING;

    INSERT INTO planned_disbursements (activity_id, amount, currency, period_start, period_end, provider_org_id, provider_org_name, receiver_org_id, receiver_org_name, status) VALUES
    ('41119000-0001-4000-8000-000000000008',  900000, 'USD', '2025-04-01', '2025-09-30', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original'),
    ('41119000-0001-4000-8000-000000000008', 1000000, 'USD', '2025-10-01', '2026-03-31', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original'),
    ('41119000-0001-4000-8000-000000000008', 1100000, 'USD', '2026-04-01', '2027-03-31', org_unfpa_id, 'UNFPA', org_mohs_id, 'MOHS', 'original')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('41119000-0001-4000-8000-000000000008', 'coverage', 'Yangon Region',   'MM', 'Yangon',   'subnational', 30, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000008', 'coverage', 'Mandalay Region', 'MM', 'Mandalay', 'subnational', 25, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000008', 'coverage', 'Shan State',      'MM', 'Shan',     'subnational', 25, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000008', 'coverage', 'Kachin State',    'MM', 'Kachin',   'subnational', 20, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('41119000-0001-4000-8000-000000000008', org_unfpa_id, 'UNFPA', 'funder',     'accepted'),
    ('41119000-0001-4000-8000-000000000008', org_mohs_id,  'MOHS',  'implementer','accepted')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    SELECT '41119000-0001-4000-8000-000000000008'::UUID, pm.uuid, s.significance, s.rationale FROM (VALUES
        ('gender_equality', 1, 'Tailored services for women and gender-diverse key populations'),
        ('human_rights',    1, 'Non-discriminatory access for criminalised key populations')
    ) AS s(code, significance, rationale)
    JOIN policy_markers pm ON pm.code = s.code
    ON CONFLICT (activity_id, policy_marker_id) DO NOTHING;


    -- ========================================================================
    -- ACTIVITY U09: Country Programme Document IX Inception (Pipeline)
    -- Status: Pipeline | Donor: UNFPA | Total: $4M
    -- ========================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, reporting_org_id, default_aid_type, default_finance_type,
        default_flow_type, default_tied_status, default_currency, humanitarian,
        activity_scope, language, created_via, general_info
    ) VALUES (
        '41119000-0001-4000-8000-000000000009'::UUID,
        'XM-DAC-41119-MM-CPD-2026-001',
        'UNFPA Country Programme Document IX — Inception Phase',
        'CPD9',
        'Inception activities for the next UNFPA Country Programme Document cycle: situation analysis, gender-and-rights-based programming framework, partnership consultations, monitoring & evaluation system design, and risk-informed planning.',
        '1', 'published', '2026-09-01', '2030-08-31', NULL,
        org_unfpa_id, 'D02', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, sector_vocabulary) VALUES
    ('41119000-0001-4000-8000-000000000009', '13020', 'Reproductive health care',         40, 'sector', '130', 'Population policies/programmes & reproductive health', 'primary',   '1'),
    ('41119000-0001-4000-8000-000000000009', '13030', 'Family planning',                  40, 'sector', '130', 'Population policies/programmes & reproductive health', 'secondary', '1'),
    ('41119000-0001-4000-8000-000000000009', '15170', 'Women''s rights organisations and movements',  20, 'sector', '151', 'Government & civil society — general', 'secondary', '1')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('41119000-0001-4000-8000-000000000009', 3,  '3.7',  40, 'Universal access to SRH services'),
    ('41119000-0001-4000-8000-000000000009', 5,  '5.6',  40, 'Reproductive rights'),
    ('41119000-0001-4000-8000-000000000009', 17, '17.14',20, 'Policy coherence for sustainable development')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('41119000-0001-4000-8000-000000000009', '2', 4000000, 'USD', '2026-09-01', 'UNFPA', 'UNFPA Myanmar', 'Total inception-phase commitment (pipeline)', 'draft')
    ON CONFLICT DO NOTHING;

    INSERT INTO planned_disbursements (activity_id, amount, currency, period_start, period_end, provider_org_id, provider_org_name, receiver_org_id, receiver_org_name, status) VALUES
    ('41119000-0001-4000-8000-000000000009', 1000000, 'USD', '2026-09-01', '2027-08-31', org_unfpa_id, 'UNFPA', org_mohs_id,  'MOHS',  'original'),
    ('41119000-0001-4000-8000-000000000009', 1000000, 'USD', '2027-09-01', '2028-08-31', org_unfpa_id, 'UNFPA', org_mohs_id,  'MOHS',  'original'),
    ('41119000-0001-4000-8000-000000000009', 1000000, 'USD', '2028-09-01', '2029-08-31', org_unfpa_id, 'UNFPA', org_mohs_id,  'MOHS',  'original'),
    ('41119000-0001-4000-8000-000000000009', 1000000, 'USD', '2029-09-01', '2030-08-31', org_unfpa_id, 'UNFPA', org_mohs_id,  'MOHS',  'original')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('41119000-0001-4000-8000-000000000009', 'coverage', 'Myanmar (national coverage)', 'MM', NULL, 'national', 100, 'manual', '1', '3', '0');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('41119000-0001-4000-8000-000000000009', org_unfpa_id, 'UNFPA', 'funder',     'accepted'),
    ('41119000-0001-4000-8000-000000000009', org_mohs_id,  'MOHS',  'implementer','accepted'),
    ('41119000-0001-4000-8000-000000000009', org_mopfi_id, 'MOPFI', 'implementer','accepted')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    SELECT '41119000-0001-4000-8000-000000000009'::UUID, pm.uuid, s.significance, s.rationale FROM (VALUES
        ('gender_equality',  2, 'Gender and rights-based programming framework is principal'),
        ('participatory_dev',1, 'Multi-stakeholder consultation and CSO engagement throughout inception'),
        ('human_rights',     1, 'Rights-based approach embedded in the country programme framework')
    ) AS s(code, significance, rationale)
    JOIN policy_markers pm ON pm.code = s.code
    ON CONFLICT (activity_id, policy_marker_id) DO NOTHING;


    -- ========================================================================
    -- ACTIVITY U10: RH Commodities Pre-Positioning Phase 1 (Closed)
    -- Status: Closed | Donor: UNFPA | Total: $6M | 2020–2022
    -- ========================================================================
    INSERT INTO activities (
        id, iati_identifier, title_narrative, acronym, description_narrative,
        activity_status, publication_status, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, reporting_org_id, default_aid_type,
        default_finance_type, default_flow_type, default_tied_status, default_currency,
        humanitarian, activity_scope, language, created_via, general_info
    ) VALUES (
        '41119000-0001-4000-8000-000000000010'::UUID,
        'XM-DAC-41119-MM-RHC-2020-001',
        'Reproductive Health Commodities Pre-Positioning — Phase 1',
        'RHCPP1',
        'Phase-1 procurement and pre-positioning of reproductive health commodities (LARC, EC, MNCH supplies) at central and regional warehouses, with cold-chain assessment and LMIS integration. Programme closed in November 2022 with all commitments fully disbursed and a Phase-2 design completed.',
        '4', 'published', '2020-01-01', '2022-12-31', '2020-03-01', '2022-11-30',
        org_unfpa_id, 'C01', '110', '10', '5', 'USD', false, '4', 'en', 'manual',
        '{"country_code": "MM", "recipient_country": "Myanmar"}'::JSONB
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage, level, category_code, category_name, type, sector_vocabulary) VALUES
    ('41119000-0001-4000-8000-000000000010', '13030', 'Family planning', 100, 'sector', '130', 'Population policies/programmes & reproductive health', 'primary', '1')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
    ('41119000-0001-4000-8000-000000000010', 3, '3.7', 100, 'Universal access to family planning')
    ON CONFLICT DO NOTHING;

    INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status) VALUES
    ('41119000-0001-4000-8000-000000000010', '2', 6000000, 'USD', '2020-02-01', 'UNFPA', 'UNFPA Myanmar', 'Total commitment',                          'actual'),
    ('41119000-0001-4000-8000-000000000010', '3', 1500000, 'USD', '2020-06-15', 'UNFPA', 'MOHS',          'Y1: Initial procurement',                    'actual'),
    ('41119000-0001-4000-8000-000000000010', '3', 1800000, 'USD', '2021-03-15', 'UNFPA', 'MOHS',          'Y2 H1: Cold chain + LMIS',                   'actual'),
    ('41119000-0001-4000-8000-000000000010', '3', 1500000, 'USD', '2021-10-15', 'UNFPA', 'MOHS',          'Y2 H2: Regional warehouse pre-positioning',  'actual'),
    ('41119000-0001-4000-8000-000000000010', '3', 1200000, 'USD', '2022-06-15', 'UNFPA', 'MOHS',          'Y3: Final restock + Phase 2 design',         'actual'),
    ('41119000-0001-4000-8000-000000000010', '4', 6000000, 'USD', '2022-11-30', 'MOHS',  'Various',       'Cumulative expenditure (programme closed)',  'actual')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_locations (activity_id, location_type, location_name, country_code, state_region_name, coverage_scope, percentage_allocation, source, location_reach, exactness, admin_level) VALUES
    ('41119000-0001-4000-8000-000000000010', 'coverage', 'Yangon Region',          'MM', 'Yangon',    'subnational', 40, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000010', 'coverage', 'Mandalay Region',        'MM', 'Mandalay',  'subnational', 30, 'manual', '2', '2', '1'),
    ('41119000-0001-4000-8000-000000000010', 'coverage', 'Naypyidaw Union Territory','MM','Naypyidaw','subnational', 30, 'manual', '2', '2', '1');

    INSERT INTO activity_contributors (activity_id, organization_id, organization_name, role, status) VALUES
    ('41119000-0001-4000-8000-000000000010', org_unfpa_id, 'UNFPA', 'funder',     'accepted'),
    ('41119000-0001-4000-8000-000000000010', org_mohs_id,  'MOHS',  'implementer','accepted')
    ON CONFLICT DO NOTHING;

    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    SELECT '41119000-0001-4000-8000-000000000010'::UUID, pm.uuid, s.significance, s.rationale FROM (VALUES
        ('gender_equality', 2, 'RH commodity availability is a principal driver of women''s autonomy')
    ) AS s(code, significance, rationale)
    JOIN policy_markers pm ON pm.code = s.code
    ON CONFLICT (activity_id, policy_marker_id) DO NOTHING;


    -- ------------------------------------------------------------------------
    -- TAGS (insert if missing, then attach to activities)
    -- ------------------------------------------------------------------------
    INSERT INTO tags (name, code, vocabulary)
    SELECT t.name, t.name, '99' FROM (VALUES
        ('reproductive-health'), ('family-planning'), ('maternal-health'),
        ('newborn-health'), ('conflict-affected'), ('adolescents'), ('youth'),
        ('comprehensive-sexuality-education'), ('contraceptives'),
        ('supply-chain'), ('midwifery'), ('workforce'), ('census'),
        ('population-data'), ('humanitarian-srh'), ('cyclone-response'),
        ('gbv'), ('survivor-centred'), ('hiv-prevention'), ('key-populations'),
        ('country-programme'), ('rh-commodities')
    ) AS t(name)
    WHERE NOT EXISTS (SELECT 1 FROM tags WHERE tags.name = t.name);

    INSERT INTO activity_tags (activity_id, tag_id)
    SELECT a.id, t.id FROM (VALUES
        ('41119000-0001-4000-8000-000000000001'::UUID, 'reproductive-health'),
        ('41119000-0001-4000-8000-000000000001'::UUID, 'maternal-health'),
        ('41119000-0001-4000-8000-000000000001'::UUID, 'newborn-health'),
        ('41119000-0001-4000-8000-000000000001'::UUID, 'conflict-affected'),

        ('41119000-0001-4000-8000-000000000002'::UUID, 'reproductive-health'),
        ('41119000-0001-4000-8000-000000000002'::UUID, 'adolescents'),
        ('41119000-0001-4000-8000-000000000002'::UUID, 'youth'),
        ('41119000-0001-4000-8000-000000000002'::UUID, 'comprehensive-sexuality-education'),

        ('41119000-0001-4000-8000-000000000003'::UUID, 'family-planning'),
        ('41119000-0001-4000-8000-000000000003'::UUID, 'contraceptives'),
        ('41119000-0001-4000-8000-000000000003'::UUID, 'supply-chain'),

        ('41119000-0001-4000-8000-000000000004'::UUID, 'midwifery'),
        ('41119000-0001-4000-8000-000000000004'::UUID, 'workforce'),
        ('41119000-0001-4000-8000-000000000004'::UUID, 'maternal-health'),

        ('41119000-0001-4000-8000-000000000005'::UUID, 'census'),
        ('41119000-0001-4000-8000-000000000005'::UUID, 'population-data'),

        ('41119000-0001-4000-8000-000000000006'::UUID, 'humanitarian-srh'),
        ('41119000-0001-4000-8000-000000000006'::UUID, 'cyclone-response'),
        ('41119000-0001-4000-8000-000000000006'::UUID, 'reproductive-health'),

        ('41119000-0001-4000-8000-000000000007'::UUID, 'gbv'),
        ('41119000-0001-4000-8000-000000000007'::UUID, 'survivor-centred'),
        ('41119000-0001-4000-8000-000000000007'::UUID, 'conflict-affected'),

        ('41119000-0001-4000-8000-000000000008'::UUID, 'hiv-prevention'),
        ('41119000-0001-4000-8000-000000000008'::UUID, 'key-populations'),
        ('41119000-0001-4000-8000-000000000008'::UUID, 'youth'),

        ('41119000-0001-4000-8000-000000000009'::UUID, 'country-programme'),
        ('41119000-0001-4000-8000-000000000009'::UUID, 'reproductive-health'),

        ('41119000-0001-4000-8000-000000000010'::UUID, 'rh-commodities'),
        ('41119000-0001-4000-8000-000000000010'::UUID, 'family-planning'),
        ('41119000-0001-4000-8000-000000000010'::UUID, 'supply-chain')
    ) AS a(id, tag_name)
    JOIN tags t ON t.name = a.tag_name
    ON CONFLICT (activity_id, tag_id) DO NOTHING;


    -- ------------------------------------------------------------------------
    -- ACTIVITY CONTACTS
    -- ------------------------------------------------------------------------
    INSERT INTO activity_contacts (activity_id, type, title, first_name, last_name, position, organisation, phone, email, notes) VALUES
    ('41119000-0001-4000-8000-000000000001', 'General Enquiries', 'Dr.', 'Aye Aye', 'Mon',     'Reproductive Health Programme Specialist', 'UNFPA Myanmar', '+95-1-545011', 'aamon@unfpa.org',     'Lead programme contact for SMNHS'),
    ('41119000-0001-4000-8000-000000000002', 'General Enquiries', 'Ms.', 'Hnin',    'Wai',     'Adolescent & Youth Specialist',           'UNFPA Myanmar', '+95-1-545012', 'hwai@unfpa.org',      'Lead programme contact for AFSRH'),
    ('41119000-0001-4000-8000-000000000003', 'General Enquiries', 'Mr.', 'Thant',   'Zin',     'Reproductive Health Commodities Manager', 'UNFPA Myanmar', '+95-1-545013', 'tzin@unfpa.org',      'Lead programme contact for LMFPSC'),
    ('41119000-0001-4000-8000-000000000004', 'General Enquiries', 'Ms.', 'Khin',    'Thida',   'Midwifery Specialist',                    'UNFPA Myanmar', '+95-1-545014', 'kthida@unfpa.org',    'Lead programme contact for MWST'),
    ('41119000-0001-4000-8000-000000000005', 'General Enquiries', 'Mr.', 'Ko',      'Lwin',    'Population & Development Specialist',     'UNFPA Myanmar', '+95-1-545015', 'klwin@unfpa.org',     'Lead programme contact for census TA'),
    ('41119000-0001-4000-8000-000000000006', 'General Enquiries', 'Dr.', 'Yu',      'Yu Hlaing','Humanitarian Coordinator',               'UNFPA Myanmar', '+95-1-545016', 'yyhlaing@unfpa.org',  'Lead programme contact for emergency RH'),
    ('41119000-0001-4000-8000-000000000007', 'General Enquiries', 'Ms.', 'Nilar',   'Win',     'GBV Specialist',                          'UNFPA Myanmar', '+95-1-545017', 'nwin@unfpa.org',      'Lead programme contact for GBVRK'),
    ('41119000-0001-4000-8000-000000000008', 'General Enquiries', 'Dr.', 'Soe',     'Naing',   'HIV & Key Populations Specialist',        'UNFPA Myanmar', '+95-1-545018', 'snaing@unfpa.org',    'Lead programme contact for HIV programme'),
    ('41119000-0001-4000-8000-000000000009', 'General Enquiries', 'Ms.', 'Aung',    'Myint',   'Country Representative',                  'UNFPA Myanmar', '+95-1-545019', 'amyint@unfpa.org',    'Lead programme contact for CPD9 inception'),
    ('41119000-0001-4000-8000-000000000010', 'General Enquiries', 'Mr.', 'Win',     'Htut',    'Operations Manager (Programme Closure)',  'UNFPA Myanmar', '+95-1-545020', 'whtut@unfpa.org',     'Closure contact for RHCPP1');


    -- ========================================================================
    -- BACKFILL: Extended activity narratives + IATI fields
    -- ========================================================================

    UPDATE activities SET
        description_objectives    = 'Restore essential maternal and newborn health services in conflict-affected townships, ensure no woman dies giving birth, and prevent newborn deaths through skilled care and emergency obstetric capacity.',
        description_target_groups = 'Pregnant women and new mothers in conflict-affected and IDP communities; newborns; adolescent mothers; community midwives and EmOC providers in Kachin, Shan, Rakhine, and Chin States.',
        description_other         = 'Implemented within the inter-agency MISP framework. Coordinates with WHO and UNICEF on health-cluster activities, and with INGO partners on referral pathways.',
        other_identifiers         = '[{"vocabulary":"A1","ref":"UNFPA-MMR-MNH-001","type":"1"}]'::jsonb
    WHERE id = '41119000-0001-4000-8000-000000000001';

    UPDATE activities SET
        description_objectives    = 'Ensure adolescents have rights-based access to youth-friendly SRH services, accurate information, and decision-making power over their bodies.',
        description_target_groups = 'Adolescents and young people aged 10-24, including out-of-school youth, married adolescents, and young people in vulnerable situations; teachers, peer educators, and parents.',
        description_other         = 'Aligned with the Global Strategy for Women''s, Children''s and Adolescents'' Health 2016-2030 and Myanmar''s National Adolescent Health Strategy.',
        other_identifiers         = '[{"vocabulary":"A1","ref":"UNFPA-MMR-AFSRH-002","type":"1"}]'::jsonb
    WHERE id = '41119000-0001-4000-8000-000000000002';

    UPDATE activities SET
        description_objectives    = 'Eliminate stockouts of essential contraceptives at the last mile by strengthening procurement, LMIS, cold chain, and CHW-led distribution.',
        description_target_groups = 'Women and adolescent girls of reproductive age in rural and peri-urban communities; community health workers; township health departments; central and regional warehouse operators.',
        description_other         = 'Procurement is via the UNFPA Supplies Partnership using the SRH commodity menu; LMIS modernisation aligned with the national e-LMIS roadmap.',
        other_identifiers         = '[{"vocabulary":"A1","ref":"UNFPA-MMR-FP-003","type":"1"}]'::jsonb
    WHERE id = '41119000-0001-4000-8000-000000000003';

    UPDATE activities SET
        description_objectives    = 'Strengthen the midwifery workforce so every birth is attended by a skilled provider, in line with ICM Global Standards for Midwifery Education.',
        description_target_groups = 'Pre-service midwifery students and tutors; newly-deployed midwives; nursing and midwifery regulatory bodies; in-service midwives requiring CPD; nine regional training centres.',
        description_other         = 'Aligned with the State of the World''s Midwifery report and ICM 2018 Global Standards. Coordinated with WHO on health-workforce planning.',
        other_identifiers         = '[{"vocabulary":"A1","ref":"UNFPA-MMR-MWF-004","type":"1"}]'::jsonb
    WHERE id = '41119000-0001-4000-8000-000000000004';

    UPDATE activities SET
        description_objectives    = 'Deliver a credible, gender- and disability-responsive Population and Housing Census whose data underpin SDG monitoring and rights-based planning.',
        description_target_groups = 'Department of Population staff; subnational statistics offices; enumerators; civil society users of disaggregated data; central planning ministries; persons with disabilities (Washington Group SS).',
        description_other         = 'Conducted in accordance with UN Principles and Recommendations for Population and Housing Censuses (Rev. 3). Pipeline pending political and security clearance.',
        other_identifiers         = '[{"vocabulary":"A1","ref":"UNFPA-MMR-CEN-005","type":"1"}]'::jsonb
    WHERE id = '41119000-0001-4000-8000-000000000005';

    UPDATE activities SET
        description_objectives    = 'Implement the Minimum Initial Service Package (MISP) for SRH within 48 hours of emergency onset; prevent maternal and newborn mortality and reduce GBV in cyclone-affected townships.',
        description_target_groups = 'Cyclone-affected women, girls, and pregnant women in Ayeyarwady, Yangon, and Bago; survivors of GBV; mobile health team staff; affected host and IDP communities.',
        description_other         = 'Activated under the Inter-Agency Standing Committee (IASC) MISP framework. Aligned with the Sphere Standards and the Humanitarian Response Plan for Myanmar.',
        other_identifiers         = '[{"vocabulary":"A1","ref":"UNFPA-MMR-EMR-006","type":"1"},{"vocabulary":"B1","ref":"OCHA-MMR-2024-MOCHA","type":"3"}]'::jsonb
    WHERE id = '41119000-0001-4000-8000-000000000006';

    UPDATE activities SET
        description_objectives    = 'Eliminate violence against women and girls in conflict-affected Rakhine and Kachin through prevention, multi-sectoral response, and engagement with men and boys on harmful gender norms.',
        description_target_groups = 'Survivors of GBV; women and girls at risk; community leaders; men and boys engaged in prevention; case workers; legal aid providers; safe space staff.',
        description_other         = 'Aligned with UNFPA''s Strategy for Action: Ending Violence Against Women and Girls 2022-2025 and the Inter-Agency Minimum Standards for GBV in Emergencies.',
        other_identifiers         = '[{"vocabulary":"A1","ref":"UNFPA-MMR-GBV-007","type":"1"}]'::jsonb
    WHERE id = '41119000-0001-4000-8000-000000000007';

    UPDATE activities SET
        description_objectives    = 'Halt new HIV infections among key populations and adolescents through combination prevention and rights-based services that integrate SRH and HIV.',
        description_target_groups = 'Sex workers, men who have sex with men, transgender people, people who inject drugs, and adolescents and young people; peer educators; community-based organisations.',
        description_other         = 'Implements the Global AIDS Strategy 2021-2026 and integrated SRH/HIV services per WHO guidelines. Coordinated with UNAIDS and the National AIDS Programme.',
        other_identifiers         = '[{"vocabulary":"A1","ref":"UNFPA-MMR-HIV-008","type":"1"}]'::jsonb
    WHERE id = '41119000-0001-4000-8000-000000000008';

    UPDATE activities SET
        description_objectives    = 'Inception of CPD-IX produces a costed, gender- and rights-based country programme aligned with the UNDAF/UNSDCF and Myanmar''s national priorities.',
        description_target_groups = 'Government counterparts (MOHS, MOPFI); civil society partners; women''s and youth organisations; UN system partners; bilateral donors.',
        description_other         = 'Inception phase precedes the operational CPD-IX (2027-2030) and informs Strategic Note submission to the UNFPA Executive Board.',
        other_identifiers         = '[{"vocabulary":"A1","ref":"UNFPA-MMR-CPD-009","type":"1"}]'::jsonb
    WHERE id = '41119000-0001-4000-8000-000000000009';

    UPDATE activities SET
        description_objectives    = 'Ensure uninterrupted availability of life-saving reproductive health commodities at central and regional warehouses through procurement, pre-positioning, and LMIS strengthening.',
        description_target_groups = 'Women and adolescent girls of reproductive age served by public-sector facilities; warehouse operators; township health departments; community health workers.',
        description_other         = 'Phase 1 closed November 2022 with 100% disbursement. End-of-programme review informed the Phase 2 design (2023+) which is now being implemented as activity LMFPSC.',
        other_identifiers         = '[{"vocabulary":"A1","ref":"UNFPA-MMR-RHC-010","type":"1"}]'::jsonb
    WHERE id = '41119000-0001-4000-8000-000000000010';

    -- All 10 activities are 100% recipient = Myanmar (national scope)
    UPDATE activities
       SET recipient_countries = '[{"code":"MM","name":"Myanmar","percentage":100}]'::jsonb
     WHERE id::text LIKE '41119000-0001-4000-8000-%';


    -- ========================================================================
    -- BACKFILL: Transactions — link to org FKs, set value_date, humanitarian flag
    -- ========================================================================

    UPDATE transactions SET provider_org_id = org_unfpa_id
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%'
       AND provider_org_name IN ('UNFPA','UNFPA Myanmar');

    UPDATE transactions SET receiver_org_id = org_unfpa_id
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%'
       AND receiver_org_name = 'UNFPA Myanmar';

    UPDATE transactions SET receiver_org_id = org_mohs_id
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%'
       AND receiver_org_name = 'MOHS';

    UPDATE transactions SET provider_org_id = org_mohs_id
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%'
       AND provider_org_name = 'MOHS';

    UPDATE transactions SET receiver_org_id = org_mdf_id
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%'
       AND receiver_org_name = 'MDF';

    UPDATE transactions SET provider_org_id = org_mdf_id
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%'
       AND provider_org_name = 'MDF';

    UPDATE transactions SET provider_org_ref = 'XM-DAC-41119', provider_org_type = '40'
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%'
       AND provider_org_name IN ('UNFPA','UNFPA Myanmar');

    UPDATE transactions SET receiver_org_ref = 'XM-DAC-41119', receiver_org_type = '40'
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%'
       AND receiver_org_name = 'UNFPA Myanmar';

    UPDATE transactions SET receiver_org_ref = 'MM-GOV-MOHS', receiver_org_type = '10'
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%'
       AND receiver_org_name = 'MOHS';

    UPDATE transactions SET aid_type = 'C01', finance_type = '110', flow_type = '10', tied_status = '5',
                            recipient_country_code = 'MM', sector_vocabulary = '1'
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%';

    UPDATE transactions SET value_date = transaction_date
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND value_date IS NULL;

    UPDATE transactions SET is_humanitarian = TRUE
     WHERE activity_id = '41119000-0001-4000-8000-000000000006'::UUID;

    -- Per-transaction sector code (matches each activity's primary sector)
    UPDATE transactions SET sector_code = '13020' WHERE activity_id IN ('41119000-0001-4000-8000-000000000001','41119000-0001-4000-8000-000000000002','41119000-0001-4000-8000-000000000006');
    UPDATE transactions SET sector_code = '13030' WHERE activity_id IN ('41119000-0001-4000-8000-000000000003','41119000-0001-4000-8000-000000000010');
    UPDATE transactions SET sector_code = '13081' WHERE activity_id =  '41119000-0001-4000-8000-000000000004';
    UPDATE transactions SET sector_code = '13010' WHERE activity_id =  '41119000-0001-4000-8000-000000000005';
    UPDATE transactions SET sector_code = '15180' WHERE activity_id =  '41119000-0001-4000-8000-000000000007';
    UPDATE transactions SET sector_code = '13040' WHERE activity_id =  '41119000-0001-4000-8000-000000000008';
    UPDATE transactions SET sector_code = '13020' WHERE activity_id =  '41119000-0001-4000-8000-000000000009';


    -- ========================================================================
    -- BACKFILL: planned_disbursements — link to org FKs, set value_date
    -- ========================================================================

    UPDATE planned_disbursements SET value_date = period_start
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND value_date IS NULL;


    -- ========================================================================
    -- BACKFILL: activity_locations — Myanmar state/region centroids
    -- ========================================================================

    UPDATE activity_locations SET latitude = 25.9000, longitude = 97.5000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Kachin';
    UPDATE activity_locations SET latitude = 21.3000, longitude = 98.0000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Shan';
    UPDATE activity_locations SET latitude = 19.5000, longitude = 93.7000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Rakhine';
    UPDATE activity_locations SET latitude = 22.0000, longitude = 93.6000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Chin';
    UPDATE activity_locations SET latitude = 19.2000, longitude = 97.3000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Kayah';
    UPDATE activity_locations SET latitude = 17.0000, longitude = 97.7000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Kayin';
    UPDATE activity_locations SET latitude = 16.0000, longitude = 97.6000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Mon';
    UPDATE activity_locations SET latitude = 13.5000, longitude = 98.5000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Tanintharyi';
    UPDATE activity_locations SET latitude = 16.8500, longitude = 96.1800
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Yangon';
    UPDATE activity_locations SET latitude = 21.9700, longitude = 96.0800
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Mandalay';
    UPDATE activity_locations SET latitude = 17.3000, longitude = 96.5000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Bago';
    UPDATE activity_locations SET latitude = 22.0000, longitude = 95.2000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Sagaing';
    UPDATE activity_locations SET latitude = 20.1500, longitude = 94.9000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Magway';
    UPDATE activity_locations SET latitude = 17.0000, longitude = 95.2000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Ayeyarwady';
    UPDATE activity_locations SET latitude = 19.7400, longitude = 96.0800
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND state_region_name = 'Naypyidaw';

    -- National-coverage rows (activities 5 and 9) — point at Myanmar centroid
    UPDATE activity_locations SET latitude = 19.0000, longitude = 96.5000
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND coverage_scope = 'national';

    UPDATE activity_locations SET spatial_reference_system = 'http://www.opengis.net/def/crs/EPSG/0/4326'
     WHERE activity_id::text LIKE '41119000-0001-4000-8000-%' AND spatial_reference_system IS NULL;


    -- ========================================================================
    -- ACTIVITY_BUDGETS — IATI annual budget rows (max 1 year per row)
    -- type:   1 = Original, 2 = Revised
    -- status: 1 = Indicative (future), 2 = Committed (current/past)
    -- ========================================================================

    INSERT INTO activity_budgets (activity_id, type, status, period_start, period_end, value, currency, value_date) VALUES
    -- U01 SMNHS: $18M / 4 years
    ('41119000-0001-4000-8000-000000000001', 1, 2, '2023-01-01', '2023-12-31', 4500000, 'USD', '2023-01-01'),
    ('41119000-0001-4000-8000-000000000001', 1, 2, '2024-01-01', '2024-12-31', 4500000, 'USD', '2024-01-01'),
    ('41119000-0001-4000-8000-000000000001', 1, 1, '2025-01-01', '2025-12-31', 4500000, 'USD', '2025-01-01'),
    ('41119000-0001-4000-8000-000000000001', 1, 1, '2026-01-01', '2026-12-31', 4500000, 'USD', '2026-01-01'),
    -- U02 AFSRH: $9M / 3 years
    ('41119000-0001-4000-8000-000000000002', 1, 2, '2024-01-15', '2025-01-14', 3000000, 'USD', '2024-01-15'),
    ('41119000-0001-4000-8000-000000000002', 1, 1, '2025-01-15', '2026-01-14', 3000000, 'USD', '2025-01-15'),
    ('41119000-0001-4000-8000-000000000002', 1, 1, '2026-01-15', '2027-01-14', 3000000, 'USD', '2026-01-15'),
    -- U03 LMFPSC: $11M / 2 years
    ('41119000-0001-4000-8000-000000000003', 1, 2, '2023-07-01', '2024-06-30', 5500000, 'USD', '2023-07-01'),
    ('41119000-0001-4000-8000-000000000003', 1, 2, '2024-07-01', '2025-06-30', 5500000, 'USD', '2024-07-01'),
    -- U04 MWST: $14M / 4 years
    ('41119000-0001-4000-8000-000000000004', 1, 2, '2022-04-01', '2023-03-31', 3500000, 'USD', '2022-04-01'),
    ('41119000-0001-4000-8000-000000000004', 1, 2, '2023-04-01', '2024-03-31', 3500000, 'USD', '2023-04-01'),
    ('41119000-0001-4000-8000-000000000004', 1, 2, '2024-04-01', '2025-03-31', 3500000, 'USD', '2024-04-01'),
    ('41119000-0001-4000-8000-000000000004', 1, 1, '2025-04-01', '2026-03-31', 3500000, 'USD', '2025-04-01'),
    -- U05 PHCTS: $7M / 3 years (pipeline — all indicative)
    ('41119000-0001-4000-8000-000000000005', 1, 1, '2025-06-01', '2026-05-31', 2500000, 'USD', '2025-06-01'),
    ('41119000-0001-4000-8000-000000000005', 1, 1, '2026-06-01', '2027-05-31', 2500000, 'USD', '2026-06-01'),
    ('41119000-0001-4000-8000-000000000005', 1, 1, '2027-06-01', '2028-05-31', 2000000, 'USD', '2027-06-01'),
    -- U06 EMRH: $5M / 1 year (humanitarian)
    ('41119000-0001-4000-8000-000000000006', 1, 2, '2024-05-15', '2025-05-14', 5000000, 'USD', '2024-05-15'),
    -- U07 GBVRK: $8M / 3 years
    ('41119000-0001-4000-8000-000000000007', 1, 2, '2023-04-01', '2024-03-31', 2700000, 'USD', '2023-04-01'),
    ('41119000-0001-4000-8000-000000000007', 1, 2, '2024-04-01', '2025-03-31', 2700000, 'USD', '2024-04-01'),
    ('41119000-0001-4000-8000-000000000007', 1, 1, '2025-04-01', '2026-03-31', 2600000, 'USD', '2025-04-01'),
    -- U08 HIVPK: $6M / 4 years
    ('41119000-0001-4000-8000-000000000008', 1, 2, '2024-01-01', '2024-12-31', 1500000, 'USD', '2024-01-01'),
    ('41119000-0001-4000-8000-000000000008', 1, 2, '2025-01-01', '2025-12-31', 1500000, 'USD', '2025-01-01'),
    ('41119000-0001-4000-8000-000000000008', 1, 1, '2026-01-01', '2026-12-31', 1500000, 'USD', '2026-01-01'),
    ('41119000-0001-4000-8000-000000000008', 1, 1, '2027-01-01', '2027-12-31', 1500000, 'USD', '2027-01-01'),
    -- U09 CPD9: $4M / 4 years (pipeline — indicative)
    ('41119000-0001-4000-8000-000000000009', 1, 1, '2026-09-01', '2027-08-31', 1000000, 'USD', '2026-09-01'),
    ('41119000-0001-4000-8000-000000000009', 1, 1, '2027-09-01', '2028-08-31', 1000000, 'USD', '2027-09-01'),
    ('41119000-0001-4000-8000-000000000009', 1, 1, '2028-09-01', '2029-08-31', 1000000, 'USD', '2028-09-01'),
    ('41119000-0001-4000-8000-000000000009', 1, 1, '2029-09-01', '2030-08-31', 1000000, 'USD', '2029-09-01'),
    -- U10 RHCPP1: $6M / 3 years (closed — all committed)
    ('41119000-0001-4000-8000-000000000010', 1, 2, '2020-01-01', '2020-12-31', 2000000, 'USD', '2020-01-01'),
    ('41119000-0001-4000-8000-000000000010', 1, 2, '2021-01-01', '2021-12-31', 2000000, 'USD', '2021-01-01'),
    ('41119000-0001-4000-8000-000000000010', 1, 2, '2022-01-01', '2022-12-31', 2000000, 'USD', '2022-01-01');


    -- ========================================================================
    -- ACTIVITY_RESULTS (+ result_indicators + indicator_baselines + periods)
    -- One output result per activity, with one indicator and one period.
    -- ========================================================================

    -- Use a CTE-like approach inside DO via explicit IDs so the joins are simple.
    -- We generate result+indicator UUIDs deterministically by INSERT...RETURNING,
    -- captured into local variables; but to keep this readable and idempotent,
    -- we use explicit UUIDs derived from the activity UUID.

    INSERT INTO activity_results (id, activity_id, type, aggregation_status, title, description) VALUES
    ('41119001-0001-4000-8000-000000000001', '41119000-0001-4000-8000-000000000001', 'output',  TRUE,  '{"en":"Women receiving skilled birth attendance in conflict-affected areas"}'::jsonb, '{"en":"Women in target townships giving birth with a skilled provider"}'::jsonb),
    ('41119001-0001-4000-8000-000000000002', '41119000-0001-4000-8000-000000000002', 'outcome', TRUE,  '{"en":"Adolescents accessing youth-friendly SRH services"}'::jsonb,                  '{"en":"Adolescents (10-24) accessing AFHS at supported facilities"}'::jsonb),
    ('41119001-0001-4000-8000-000000000003', '41119000-0001-4000-8000-000000000003', 'output',  TRUE,  '{"en":"Townships free of stockouts of essential contraceptives"}'::jsonb,             '{"en":"Townships reporting zero days of LARC/EC stockout in the last quarter"}'::jsonb),
    ('41119001-0001-4000-8000-000000000004', '41119000-0001-4000-8000-000000000004', 'outcome', TRUE,  '{"en":"Births attended by a skilled provider (national coverage)"}'::jsonb,            '{"en":"Percentage of births nationally attended by a skilled birth attendant"}'::jsonb),
    ('41119001-0001-4000-8000-000000000005', '41119000-0001-4000-8000-000000000005', 'impact',  FALSE, '{"en":"Population & housing census enumerated"}'::jsonb,                              '{"en":"Population enumerated under the next census round"}'::jsonb),
    ('41119001-0001-4000-8000-000000000006', '41119000-0001-4000-8000-000000000006', 'output',  TRUE,  '{"en":"Cyclone-affected women and girls reached with MISP services"}'::jsonb,         '{"en":"Beneficiaries reached with dignity kits and MISP RH services"}'::jsonb),
    ('41119001-0001-4000-8000-000000000007', '41119000-0001-4000-8000-000000000007', 'outcome', TRUE,  '{"en":"GBV survivors accessing multi-sectoral response services"}'::jsonb,            '{"en":"GBV survivors receiving case management, PSS, and/or legal aid"}'::jsonb),
    ('41119001-0001-4000-8000-000000000008', '41119000-0001-4000-8000-000000000008', 'output',  TRUE,  '{"en":"Key population members reached with HIV combination prevention"}'::jsonb,      '{"en":"KP members receiving HIVST, PrEP, or condoms in the last 12 months"}'::jsonb),
    ('41119001-0001-4000-8000-000000000009', '41119000-0001-4000-8000-000000000009', 'output',  FALSE, '{"en":"Country Programme Document IX endorsed"}'::jsonb,                              '{"en":"CPD-IX endorsed by UNFPA Executive Board"}'::jsonb),
    ('41119001-0001-4000-8000-000000000010', '41119000-0001-4000-8000-000000000010', 'output',  TRUE,  '{"en":"Reproductive health commodities pre-positioned (Phase 1)"}'::jsonb,             '{"en":"Volume of RH commodities pre-positioned at central and regional warehouses"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO result_indicators (id, result_id, measure, ascending, aggregation_status, title, description) VALUES
    ('41119002-0001-4000-8000-000000000001', '41119001-0001-4000-8000-000000000001', 'unit',        TRUE, TRUE, '{"en":"Number of births attended by a skilled provider in target townships"}'::jsonb, '{"en":"Cumulative count of skilled-attended births in 14 target townships"}'::jsonb),
    ('41119002-0001-4000-8000-000000000002', '41119001-0001-4000-8000-000000000002', 'unit',        TRUE, TRUE, '{"en":"Adolescents reached with AFHS"}'::jsonb,                                          '{"en":"Cumulative count of unique adolescent users of AFHS centres"}'::jsonb),
    ('41119002-0001-4000-8000-000000000003', '41119001-0001-4000-8000-000000000003', 'percentage',  TRUE, TRUE, '{"en":"Percentage of townships free of LARC/EC stockouts"}'::jsonb,                      '{"en":"Percentage of target townships reporting zero stockout days last quarter"}'::jsonb),
    ('41119002-0001-4000-8000-000000000004', '41119001-0001-4000-8000-000000000004', 'percentage',  TRUE, TRUE, '{"en":"Skilled birth attendance rate (national)"}'::jsonb,                                '{"en":"Percentage of births attended by skilled provider, national level"}'::jsonb),
    ('41119002-0001-4000-8000-000000000005', '41119001-0001-4000-8000-000000000005', 'unit',        TRUE, FALSE,'{"en":"Total population enumerated"}'::jsonb,                                              '{"en":"Total population enumerated under the next census round"}'::jsonb),
    ('41119002-0001-4000-8000-000000000006', '41119001-0001-4000-8000-000000000006', 'unit',        TRUE, TRUE, '{"en":"Women and girls reached with MISP services"}'::jsonb,                              '{"en":"Cumulative count of unique beneficiaries"}'::jsonb),
    ('41119002-0001-4000-8000-000000000007', '41119001-0001-4000-8000-000000000007', 'unit',        TRUE, TRUE, '{"en":"GBV survivors receiving response services"}'::jsonb,                                '{"en":"Cumulative count of survivors with case management"}'::jsonb),
    ('41119002-0001-4000-8000-000000000008', '41119001-0001-4000-8000-000000000008', 'unit',        TRUE, TRUE, '{"en":"Key population members reached"}'::jsonb,                                          '{"en":"Cumulative count of KP members reached with combination prevention"}'::jsonb),
    ('41119002-0001-4000-8000-000000000009', '41119001-0001-4000-8000-000000000009', 'qualitative', TRUE, FALSE,'{"en":"CPD-IX endorsement status (qualitative)"}'::jsonb,                                  '{"en":"Ordinal scale: 1=draft, 2=consulted, 3=submitted, 4=endorsed"}'::jsonb),
    ('41119002-0001-4000-8000-000000000010', '41119001-0001-4000-8000-000000000010', 'unit',        TRUE, TRUE, '{"en":"Volume of RH commodities pre-positioned (units)"}'::jsonb,                          '{"en":"Cumulative units of LARC, EC, and MNCH supplies"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO indicator_baselines (id, indicator_id, baseline_year, iso_date, value, comment) VALUES
    ('41119003-0001-4000-8000-000000000001', '41119002-0001-4000-8000-000000000001', 2022, '2022-12-31',   2400, '{"en":"Pre-programme baseline; conflict reduced facility-based deliveries"}'::jsonb),
    ('41119003-0001-4000-8000-000000000002', '41119002-0001-4000-8000-000000000002', 2023, '2023-12-31',      0, '{"en":"AFHS centres not yet established"}'::jsonb),
    ('41119003-0001-4000-8000-000000000003', '41119002-0001-4000-8000-000000000003', 2023, '2023-06-30',     35, '{"en":"35% of target townships stockout-free at baseline"}'::jsonb),
    ('41119003-0001-4000-8000-000000000004', '41119002-0001-4000-8000-000000000004', 2021, '2021-12-31',     60, '{"en":"National SBA rate (DHS-equivalent)"}'::jsonb),
    ('41119003-0001-4000-8000-000000000005', '41119002-0001-4000-8000-000000000005', 2014, '2014-04-30', 51486253, '{"en":"Most recent census enumeration (2014)"}'::jsonb),
    ('41119003-0001-4000-8000-000000000006', '41119002-0001-4000-8000-000000000006', 2024, '2024-05-15',      0, '{"en":"Programme inception, no beneficiaries reached at start"}'::jsonb),
    ('41119003-0001-4000-8000-000000000007', '41119002-0001-4000-8000-000000000007', 2023, '2023-03-31',      0, '{"en":"Baseline at programme launch"}'::jsonb),
    ('41119003-0001-4000-8000-000000000008', '41119002-0001-4000-8000-000000000008', 2023, '2023-12-31',  18000, '{"en":"KP members reached by predecessor projects"}'::jsonb),
    ('41119003-0001-4000-8000-000000000009', '41119002-0001-4000-8000-000000000009', 2026, '2026-09-01',      1, '{"en":"Baseline: draft framework only"}'::jsonb),
    ('41119003-0001-4000-8000-000000000010', '41119002-0001-4000-8000-000000000010', 2019, '2019-12-31', 120000, '{"en":"Pre-existing commodity stock"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO indicator_periods (id, indicator_id, period_start, period_end, target_value, target_comment, actual_value, actual_comment) VALUES
    ('41119004-0001-4000-8000-000000000001', '41119002-0001-4000-8000-000000000001', '2024-01-01', '2024-12-31',  4500, '{"en":"Annual SBA target"}'::jsonb,                     '4180',   '{"en":"Achieved 93% of annual target"}'::jsonb),
    ('41119004-0001-4000-8000-000000000002', '41119002-0001-4000-8000-000000000002', '2024-04-01', '2025-03-31', 35000, '{"en":"Year-1 reach target"}'::jsonb,                   '12500',  '{"en":"Year-1 H1 actuals; ramping up"}'::jsonb),
    ('41119004-0001-4000-8000-000000000003', '41119002-0001-4000-8000-000000000003', '2024-01-01', '2024-12-31',    80, '{"en":"End of year 1 target (% stockout-free)"}'::jsonb, '72',    '{"en":"72% of townships stockout-free Q4 2024"}'::jsonb),
    ('41119004-0001-4000-8000-000000000004', '41119002-0001-4000-8000-000000000004', '2024-01-01', '2024-12-31',    72, '{"en":"Annual SBA rate target"}'::jsonb,                 '68',    '{"en":"Provisional 2024 actual"}'::jsonb),
    ('41119004-0001-4000-8000-000000000005', '41119002-0001-4000-8000-000000000005', '2026-01-01', '2028-12-31', 56000000, '{"en":"Census round target"}'::jsonb,                NULL,    NULL),
    ('41119004-0001-4000-8000-000000000006', '41119002-0001-4000-8000-000000000006', '2024-05-15', '2025-05-14', 60000, '{"en":"MISP reach target"}'::jsonb,                     '52000', '{"en":"Reached 87% of target by Q4 2024"}'::jsonb),
    ('41119004-0001-4000-8000-000000000007', '41119002-0001-4000-8000-000000000007', '2024-01-01', '2024-12-31',  3500, '{"en":"Annual GBV survivors target"}'::jsonb,           '3120',  '{"en":"Achieved 89% of annual target"}'::jsonb),
    ('41119004-0001-4000-8000-000000000008', '41119002-0001-4000-8000-000000000008', '2024-01-01', '2024-12-31', 12000, '{"en":"Year-1 KP reach target"}'::jsonb,                '9800',  '{"en":"9,800 reached in Year 1"}'::jsonb),
    ('41119004-0001-4000-8000-000000000009', '41119002-0001-4000-8000-000000000009', '2026-09-01', '2027-08-31',     3, '{"en":"Submitted by EOY 2027"}'::jsonb,                 NULL,    NULL),
    ('41119004-0001-4000-8000-000000000010', '41119002-0001-4000-8000-000000000010', '2022-01-01', '2022-12-31', 600000, '{"en":"Phase-1 final cumulative target"}'::jsonb,      '612000','{"en":"Phase-1 closed at 612,000 units (102%)"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;


    -- ========================================================================
    -- ACTIVITY_DOCUMENTS — one external project document per activity
    -- IATI category A02 = Objectives / Purpose of activity
    -- ========================================================================

    INSERT INTO activity_documents (activity_id, url, format, title, description, category_code, language_codes, document_date, recipient_countries, is_external) VALUES
    ('41119000-0001-4000-8000-000000000001', 'https://www.unfpa.org/data/MM', 'application/pdf', '[{"text":"SMNHS Programme Document","lang":"en"}]'::jsonb, '[{"text":"Programme document for Strengthening Maternal & Newborn Health Services in Conflict-Affected Areas","lang":"en"}]'::jsonb, 'A02', ARRAY['en'], '2023-01-15', ARRAY['MM'], TRUE),
    ('41119000-0001-4000-8000-000000000002', 'https://www.unfpa.org/data/MM', 'application/pdf', '[{"text":"AFSRH Programme Document","lang":"en"}]'::jsonb, '[{"text":"Adolescent-Friendly SRH programme description","lang":"en"}]'::jsonb,                                                                'A02', ARRAY['en'], '2024-02-01', ARRAY['MM'], TRUE),
    ('41119000-0001-4000-8000-000000000003', 'https://www.unfpa.org/data/MM', 'application/pdf', '[{"text":"LMFPSC Programme Document","lang":"en"}]'::jsonb, '[{"text":"Last-Mile Family Planning & Supply Chain programme description","lang":"en"}]'::jsonb,                                                       'A02', ARRAY['en'], '2023-07-15', ARRAY['MM'], TRUE),
    ('41119000-0001-4000-8000-000000000004', 'https://www.unfpa.org/data/MM', 'application/pdf', '[{"text":"MWST Programme Document","lang":"en"}]'::jsonb, '[{"text":"Midwifery Workforce Strengthening programme description","lang":"en"}]'::jsonb,                                                                  'A02', ARRAY['en'], '2022-04-15', ARRAY['MM'], TRUE),
    ('41119000-0001-4000-8000-000000000005', 'https://www.unfpa.org/data/MM', 'application/pdf', '[{"text":"PHCTS Concept Note","lang":"en"}]'::jsonb,        '[{"text":"Population & Housing Census Technical Support concept note","lang":"en"}]'::jsonb,                                                                'A02', ARRAY['en'], '2025-04-01', ARRAY['MM'], TRUE),
    ('41119000-0001-4000-8000-000000000006', 'https://www.unfpa.org/data/MM', 'application/pdf', '[{"text":"EMRH Response Plan","lang":"en"}]'::jsonb,        '[{"text":"Emergency Reproductive Health response plan, cyclone Mocha","lang":"en"}]'::jsonb,                                                                'A02', ARRAY['en'], '2024-05-20', ARRAY['MM'], TRUE),
    ('41119000-0001-4000-8000-000000000007', 'https://www.unfpa.org/data/MM', 'application/pdf', '[{"text":"GBVRK Programme Document","lang":"en"}]'::jsonb, '[{"text":"GBV Prevention & Response in Rakhine and Kachin programme description","lang":"en"}]'::jsonb,                                                  'A02', ARRAY['en'], '2023-04-15', ARRAY['MM'], TRUE),
    ('41119000-0001-4000-8000-000000000008', 'https://www.unfpa.org/data/MM', 'application/pdf', '[{"text":"HIVPK Programme Document","lang":"en"}]'::jsonb, '[{"text":"HIV Prevention Among Key Populations programme description","lang":"en"}]'::jsonb,                                                            'A02', ARRAY['en'], '2024-01-15', ARRAY['MM'], TRUE),
    ('41119000-0001-4000-8000-000000000009', 'https://www.unfpa.org/data/MM', 'application/pdf', '[{"text":"CPD9 Inception Note","lang":"en"}]'::jsonb,       '[{"text":"Country Programme Document IX inception note","lang":"en"}]'::jsonb,                                                                              'A02', ARRAY['en'], '2026-08-01', ARRAY['MM'], TRUE),
    ('41119000-0001-4000-8000-000000000010', 'https://www.unfpa.org/data/MM', 'application/pdf', '[{"text":"RHCPP1 Final Report","lang":"en"}]'::jsonb,      '[{"text":"Reproductive Health Commodities Pre-Positioning Phase 1 end-of-programme report","lang":"en"}]'::jsonb,                                       'A07', ARRAY['en'], '2022-12-15', ARRAY['MM'], TRUE);

END $$;


-- ============================================================================
-- CLEANUP (run manually to remove this seed):
--
--   DELETE FROM activities WHERE id::text LIKE '41119000-0001-4000-8000-%';
--   -- Cascade FKs remove activity_sectors, activity_sdg_mappings, transactions,
--   -- planned_disbursements, activity_locations, activity_contributors,
--   -- activity_policy_markers, activity_tags, activity_contacts.
--   -- Tags themselves are intentionally NOT removed (other activities may use them).
-- ============================================================================
