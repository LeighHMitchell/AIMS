-- Create two comprehensive sample projects with all related data
-- Project 1: Green Energy Access Initiative
-- Project 2: Digital Health Infrastructure Program

-- First, let's create the activities
INSERT INTO activities (
    id,
    title_narrative,
    description_narrative,
    iati_identifier,
    other_identifier,
    activity_status,
    planned_start_date,
    planned_end_date,
    actual_start_date,
    default_currency,
    default_finance_type,
    default_aid_type,
    default_tied_status,
    hierarchy,
    reporting_org_id,
    created_by_org_name,
    created_by_org_acronym,
    submission_status,
    publication_status,
    created_at,
    updated_at
) VALUES 
(
    'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    'Green Energy Access Initiative',
    '<p>The <strong>Green Energy Access Initiative</strong> is a transformative program designed to bring sustainable, affordable renewable energy solutions to rural and underserved communities across the region. This initiative addresses critical energy poverty affecting over 2 million people who currently lack reliable access to electricity.</p><p>Through strategic partnerships with local communities, government agencies, and private sector innovators, the program deploys solar microgrids, household solar systems, and community wind projects. The initiative emphasizes local capacity building, training community members as renewable energy technicians and establishing sustainable maintenance frameworks.</p><p>Key components include: installation of 500 solar microgrids serving 250,000 households, distribution of 100,000 solar home systems, establishment of 20 community-managed renewable energy cooperatives, and comprehensive training programs for 1,000 local technicians. The program also integrates productive use applications, supporting agricultural processing, small businesses, and healthcare facilities with reliable power.</p>',
    'XI-IATI-DEMO-10001',
    'GEA-2024-001',
    '2', -- Implementation
    '2024-01-01',
    '2027-12-31',
    '2024-02-15',
    'USD',
    '110', -- Standard grant
    '31166', -- Solar energy
    '5', -- Untied
    1,
    (SELECT id FROM organizations WHERE name ILIKE '%World Bank%' LIMIT 1),
    'International Development Agency',
    'IDA',
    'validated',
    'published',
    NOW(),
    NOW()
),
(
    'b2c3d4e5-6789-01bc-def2-2345678901bc',
    'Digital Health Infrastructure Program',
    '<p>The <strong>Digital Health Infrastructure Program</strong> represents a comprehensive effort to revolutionize healthcare delivery through advanced digital technologies and integrated health information systems. This ambitious program aims to connect 500 health facilities, train 5,000 healthcare workers, and ultimately improve health outcomes for 5 million citizens.</p><p>The program focuses on establishing robust digital health platforms including electronic health records (EHR), telemedicine capabilities, mobile health applications, and data analytics systems. It emphasizes interoperability, data security, and user-centered design to ensure sustainable adoption across diverse healthcare settings.</p><p>Core deliverables include: deployment of integrated EHR systems in 500 facilities, establishment of 50 telemedicine centers in remote areas, development of mobile health apps for maternal and child health, creation of a national health data warehouse, and comprehensive digital literacy training for healthcare professionals. The initiative also includes provisions for cybersecurity infrastructure and data governance frameworks to protect sensitive health information.</p>',
    'XI-IATI-DEMO-10002',
    'DHI-2024-002',
    '2', -- Implementation
    '2024-03-01',
    '2028-02-29',
    '2024-04-01',
    'USD',
    '110', -- Standard grant
    '12261', -- Health education
    '5', -- Untied
    1,
    (SELECT id FROM organizations WHERE name ILIKE '%USAID%' LIMIT 1),
    'United States Agency for International Development',
    'USAID',
    'validated',
    'published',
    NOW(),
    NOW()
);

-- Add sectors for both projects
-- Project 1 sectors (Green Energy)
INSERT INTO activity_sectors (
    id,
    activity_id,
    sector_code,
    sector_name,
    sector_percentage,
    sector_category_code,
    sector_category_name,
    category_percentage,
    type
) VALUES 
(
    gen_random_uuid(),
    'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    '23183',
    'Energy generation, renewable sources - multiple technologies',
    40,
    '231',
    'Energy Policy',
    40,
    'primary'
),
(
    gen_random_uuid(),
    'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    '23210',
    'Energy generation, renewable sources – multiple technologies',
    30,
    '232',
    'Energy generation, renewable sources',
    30,
    'secondary'
),
(
    gen_random_uuid(),
    'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    '41081',
    'Environmental education/training',
    30,
    '410',
    'General environmental protection',
    30,
    'secondary'
);

-- Project 2 sectors (Digital Health)
INSERT INTO activity_sectors (
    id,
    activity_id,
    sector_code,
    sector_name,
    sector_percentage,
    sector_category_code,
    sector_category_name,
    category_percentage,
    type
) VALUES 
(
    gen_random_uuid(),
    'b2c3d4e5-6789-01bc-def2-2345678901bc',
    '12261',
    'Health education',
    35,
    '122',
    'Basic Health',
    35,
    'primary'
),
(
    gen_random_uuid(),
    'b2c3d4e5-6789-01bc-def2-2345678901bc',
    '12220',
    'Basic health care',
    35,
    '122',
    'Basic Health',
    35,
    'secondary'
),
(
    gen_random_uuid(),
    'b2c3d4e5-6789-01bc-def2-2345678901bc',
    '22040',
    'Information and communication technology (ICT)',
    30,
    '220',
    'Communications',
    30,
    'secondary'
);

-- Add locations for both projects
INSERT INTO activity_locations (
    id,
    activity_id,
    location_type,
    location_name,
    admin_unit,
    latitude,
    longitude,
    description
) VALUES 
-- Green Energy project locations
(
    gen_random_uuid(),
    'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    'site',
    'Northern Solar Hub',
    'Northern Province',
    15.8700,
    100.9925,
    'Main solar microgrid installation and training center'
),
(
    gen_random_uuid(),
    'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    'site',
    'Eastern Wind Farm',
    'Eastern Province',
    14.0583,
    108.2772,
    'Community wind energy project site'
),
-- Digital Health project locations
(
    gen_random_uuid(),
    'b2c3d4e5-6789-01bc-def2-2345678901bc',
    'site',
    'National Health Data Center',
    'Capital District',
    13.7563,
    100.5018,
    'Central data processing and telemedicine hub'
),
(
    gen_random_uuid(),
    'b2c3d4e5-6789-01bc-def2-2345678901bc',
    'coverage',
    'Rural Health Network',
    'Rural Districts',
    NULL,
    NULL,
    'Coverage area for rural health facility digitization'
);

-- Add SDG mappings
INSERT INTO activity_sdg_mappings (
    id,
    activity_id,
    sdg_goal,
    sdg_target,
    contribution_percent,
    notes
) VALUES 
-- Green Energy SDGs
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 7, '7.1', 40, 'Universal access to affordable, reliable and modern energy'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 7, '7.2', 30, 'Increase share of renewable energy'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 13, '13.2', 30, 'Climate change measures integrated into policies'),
-- Digital Health SDGs
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 3, '3.8', 50, 'Achieve universal health coverage'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 9, '9.c', 50, 'Universal and affordable access to ICT');

-- Add contacts
INSERT INTO activity_contacts (
    id,
    activity_id,
    type,
    first_name,
    last_name,
    position,
    organisation,
    email,
    phone
) VALUES 
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'administrative', 'Sarah', 'Johnson', 'Program Director', 'Green Energy Initiative', 'sjohnson@greenenergyaccess.org', '+1-202-555-0123'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'technical', 'Dr. Robert', 'Chen', 'Chief Technical Advisor', 'Renewable Energy Institute', 'rchen@rei.org', '+1-202-555-0124'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'administrative', 'Maria', 'Rodriguez', 'Program Manager', 'Digital Health Solutions', 'mrodriguez@digitalhealth.org', '+1-202-555-0125'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'technical', 'Dr. James', 'Thompson', 'Health IT Specialist', 'Global Health Tech', 'jthompson@ght.org', '+1-202-555-0126');

-- Add budgets
INSERT INTO activity_budgets (
    id,
    activity_id,
    budget_type,
    budget_status,
    period_start,
    period_end,
    value_amount,
    value_currency,
    value_date
) VALUES 
-- Green Energy budgets
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Original', 'Indicative', '2024-01-01', '2024-12-31', 15000000, 'USD', '2023-12-01'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Original', 'Indicative', '2025-01-01', '2025-12-31', 20000000, 'USD', '2023-12-01'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Original', 'Indicative', '2026-01-01', '2026-12-31', 18000000, 'USD', '2023-12-01'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Original', 'Indicative', '2027-01-01', '2027-12-31', 12000000, 'USD', '2023-12-01'),
-- Digital Health budgets
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Original', 'Indicative', '2024-01-01', '2024-12-31', 25000000, 'USD', '2024-01-15'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Original', 'Indicative', '2025-01-01', '2025-12-31', 30000000, 'USD', '2024-01-15'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Original', 'Indicative', '2026-01-01', '2026-12-31', 28000000, 'USD', '2024-01-15'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Original', 'Indicative', '2027-01-01', '2027-12-31', 22000000, 'USD', '2024-01-15'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Original', 'Indicative', '2028-01-01', '2028-02-29', 5000000, 'USD', '2024-01-15');

-- Add planned disbursements
INSERT INTO activity_planned_disbursements (
    id,
    activity_id,
    disbursement_type,
    period_start,
    period_end,
    value_amount,
    value_currency,
    value_date,
    provider_org_narrative
) VALUES 
-- Green Energy planned disbursements
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Outgoing', '2024-01-01', '2024-03-31', 3750000, 'USD', '2024-01-01', 'Q1 2024 disbursement'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Outgoing', '2024-04-01', '2024-06-30', 3750000, 'USD', '2024-04-01', 'Q2 2024 disbursement'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Outgoing', '2024-07-01', '2024-09-30', 3750000, 'USD', '2024-07-01', 'Q3 2024 disbursement'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Outgoing', '2024-10-01', '2024-12-31', 3750000, 'USD', '2024-10-01', 'Q4 2024 disbursement'),
-- Digital Health planned disbursements
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Outgoing', '2024-03-01', '2024-06-30', 8000000, 'USD', '2024-03-01', 'Initial setup and procurement'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Outgoing', '2024-07-01', '2024-09-30', 6000000, 'USD', '2024-07-01', 'Q3 2024 implementation'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Outgoing', '2024-10-01', '2024-12-31', 6000000, 'USD', '2024-10-01', 'Q4 2024 rollout'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Outgoing', '2025-01-01', '2025-03-31', 7500000, 'USD', '2025-01-01', 'Q1 2025 expansion');

-- Add transactions (commitments and disbursements)
INSERT INTO transactions (
    id,
    activity_id,
    transaction_type,
    transaction_date,
    value_amount,
    value_currency,
    value_date,
    description,
    provider_org_narrative,
    receiver_org_narrative,
    disbursement_channel,
    flow_type,
    finance_type,
    aid_type,
    tied_status
) VALUES 
-- Green Energy transactions
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Commitment', '2024-01-15', 65000000, 'USD', '2024-01-15', 'Total program commitment for Green Energy Access Initiative', 'International Development Agency', 'Ministry of Energy', '1', '10', '110', '31166', '5'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Disbursement', '2024-02-15', 3750000, 'USD', '2024-02-15', 'Q1 2024 disbursement - Phase 1 implementation', 'International Development Agency', 'Green Energy Implementation Unit', '1', '10', '110', '31166', '5'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Disbursement', '2024-05-15', 3750000, 'USD', '2024-05-15', 'Q2 2024 disbursement - Solar microgrid deployment', 'International Development Agency', 'Green Energy Implementation Unit', '1', '10', '110', '31166', '5'),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Disbursement', '2024-08-15', 3750000, 'USD', '2024-08-15', 'Q3 2024 disbursement - Community training programs', 'International Development Agency', 'Green Energy Implementation Unit', '1', '10', '110', '31166', '5'),
-- Digital Health transactions
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Commitment', '2024-03-01', 110000000, 'USD', '2024-03-01', 'Total program commitment for Digital Health Infrastructure', 'USAID', 'Ministry of Health', '1', '10', '110', '12261', '5'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Disbursement', '2024-04-01', 8000000, 'USD', '2024-04-01', 'Initial disbursement - System procurement and setup', 'USAID', 'Digital Health Program Office', '1', '10', '110', '12261', '5'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Disbursement', '2024-07-15', 6000000, 'USD', '2024-07-15', 'Q3 2024 - EHR system deployment phase 1', 'USAID', 'Digital Health Program Office', '1', '10', '110', '12261', '5'),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Disbursement', '2024-10-15', 6000000, 'USD', '2024-10-15', 'Q4 2024 - Telemedicine center establishment', 'USAID', 'Digital Health Program Office', '1', '10', '110', '12261', '5');

-- Add tags for better searchability
INSERT INTO tags (id, name, created_by) VALUES 
(gen_random_uuid(), 'renewable-energy', (SELECT id FROM auth.users LIMIT 1)),
(gen_random_uuid(), 'solar-power', (SELECT id FROM auth.users LIMIT 1)),
(gen_random_uuid(), 'climate-action', (SELECT id FROM auth.users LIMIT 1)),
(gen_random_uuid(), 'digital-health', (SELECT id FROM auth.users LIMIT 1)),
(gen_random_uuid(), 'telemedicine', (SELECT id FROM auth.users LIMIT 1)),
(gen_random_uuid(), 'health-technology', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (name) DO NOTHING;

-- Link tags to activities
INSERT INTO activity_tags (activity_id, tag_id)
SELECT 'a1b2c3d4-5678-90ab-cdef-1234567890ab', id FROM tags WHERE name IN ('renewable-energy', 'solar-power', 'climate-action')
ON CONFLICT DO NOTHING;

INSERT INTO activity_tags (activity_id, tag_id)
SELECT 'b2c3d4e5-6789-01bc-def2-2345678901bc', id FROM tags WHERE name IN ('digital-health', 'telemedicine', 'health-technology')
ON CONFLICT DO NOTHING;

-- Add some indicator results for tracking
INSERT INTO indicator_results (
    id,
    activity_id,
    indicator_title,
    indicator_description,
    baseline_year,
    baseline_value,
    target_year,
    target_value,
    actual_value,
    measurement_unit,
    created_at,
    updated_at
) VALUES 
-- Green Energy indicators
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Households with electricity access', 'Number of households connected to renewable energy sources', 2023, 0, 2027, 250000, 15000, 'households', NOW(), NOW()),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Renewable energy capacity installed', 'Total megawatts of renewable energy capacity', 2023, 0, 2027, 150, 12, 'MW', NOW(), NOW()),
(gen_random_uuid(), 'a1b2c3d4-5678-90ab-cdef-1234567890ab', 'Local technicians trained', 'Number of community members trained as renewable energy technicians', 2023, 0, 2027, 1000, 85, 'people', NOW(), NOW()),
-- Digital Health indicators
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Health facilities digitized', 'Number of health facilities with functional digital systems', 2023, 0, 2028, 500, 45, 'facilities', NOW(), NOW()),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Healthcare workers trained', 'Number of healthcare professionals trained in digital health', 2023, 0, 2028, 5000, 320, 'people', NOW(), NOW()),
(gen_random_uuid(), 'b2c3d4e5-6789-01bc-def2-2345678901bc', 'Telemedicine consultations', 'Monthly telemedicine consultations conducted', 2023, 0, 2028, 50000, 2500, 'consultations/month', NOW(), NOW());

-- Update the activity icons and banners
UPDATE activities 
SET 
    icon = 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=400&fit=crop',
    banner = 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=400&fit=crop'
WHERE id = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';

UPDATE activities 
SET 
    icon = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=400&fit=crop',
    banner = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=400&fit=crop'
WHERE id = 'b2c3d4e5-6789-01bc-def2-2345678901bc';