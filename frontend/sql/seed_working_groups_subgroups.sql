-- Seed script: Populate existing working groups with descriptions, sub-groups, and members
-- Run this AFTER the parent_id migration (20260328000000_add_working_group_parent_id.sql)
-- This script is idempotent - it uses ON CONFLICT to skip duplicates

-- ============================================================
-- 1. Update descriptions for existing working groups (if blank)
-- ============================================================
UPDATE working_groups SET description = 'Coordinates health sector activities, policy dialogue, and resource mobilization across all health partners. Provides strategic guidance on health system strengthening, disease surveillance, and universal health coverage initiatives.' WHERE code = 'TWG-Health' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Oversees education sector development, including curriculum reform, teacher training, school infrastructure, and equitable access to quality education at all levels.' WHERE code = 'TWG-Education' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Promotes gender equality and women''s empowerment across all development sectors. Coordinates gender mainstreaming efforts and tracks progress on gender-related indicators.' WHERE code = 'TWG-Gender' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Coordinates agricultural development initiatives, food security programmes, rural livelihoods support, and sustainable farming practices.' WHERE code = 'TWG-Agriculture' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Addresses water, sanitation and hygiene needs including clean water access, sanitation infrastructure, and hygiene promotion across rural and urban areas.' WHERE code = 'TWG-WASH' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Promotes private sector development, trade facilitation, investment climate reform, and public-private partnerships.' WHERE code = 'TWG-PrivateSector' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Facilitates international trade policy dialogue, export promotion, trade capacity building, and integration into regional and global markets.' WHERE code = 'TWG-Trade' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Supports governance reform, rule of law, public financial management, anti-corruption efforts, and institutional capacity building.' WHERE code = 'TWG-Governance' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Coordinates infrastructure development including transport, energy, telecommunications, and urban planning across all regions.' WHERE code = 'TWG-Infrastructure' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Addresses environmental conservation, climate change adaptation and mitigation, natural resource management, and disaster risk reduction.' WHERE code = 'TWG-Environment' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Coordinates social protection programmes including cash transfers, social insurance, pensions, and safety nets for vulnerable populations.' WHERE code = 'TWG-SocialProtection' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Oversees monitoring and evaluation frameworks, results-based management, data quality assurance, and impact assessment across all development programmes.' WHERE code = 'TWG-M&E' AND (description IS NULL OR description = '');
UPDATE working_groups SET description = 'Facilitates donor coordination and harmonization of development assistance in line with aid effectiveness principles.' WHERE code = 'TWG-Coordination' AND (description IS NULL OR description = '');

-- Also update group_type for existing top-level groups if not set
UPDATE working_groups SET group_type = 'technical' WHERE code LIKE 'TWG-%' AND (group_type IS NULL OR group_type = '');
UPDATE working_groups SET group_type = 'sub_working_group' WHERE code LIKE 'SWG-%' AND (group_type IS NULL OR group_type = '');

-- ============================================================
-- 2. Create sub-working groups under existing parent groups
-- ============================================================

-- Health TWG sub-groups (link SWG-HealthFinancing and SWG-ReproductiveHealth if they exist)
UPDATE working_groups SET parent_id = (SELECT id FROM working_groups WHERE code = 'TWG-Health' LIMIT 1)
WHERE code IN ('SWG-HealthFinancing', 'SWG-ReproductiveHealth') AND parent_id IS NULL;

-- Education TWG sub-groups (link SWG-BasicEducation and SWG-TechVocational)
UPDATE working_groups SET parent_id = (SELECT id FROM working_groups WHERE code = 'TWG-Education' LIMIT 1)
WHERE code IN ('SWG-BasicEducation', 'SWG-TechVocational') AND parent_id IS NULL;

-- Governance TWG sub-group (link SWG-Decentralization)
UPDATE working_groups SET parent_id = (SELECT id FROM working_groups WHERE code = 'TWG-Governance' LIMIT 1)
WHERE code = 'SWG-Decentralization' AND parent_id IS NULL;

-- Agriculture TWG sub-group (link SWG-FoodSecurity)
UPDATE working_groups SET parent_id = (SELECT id FROM working_groups WHERE code = 'TWG-Agriculture' LIMIT 1)
WHERE code = 'SWG-FoodSecurity' AND parent_id IS NULL;

-- Now create NEW sub-groups that don't exist yet

-- Health: Community Health sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-CommunityHealth', 'Community Health Sub-Working Group',
  'Focuses on community-based health services, primary healthcare delivery, community health worker programmes, and village health committees.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-Health'
ON CONFLICT (code) DO NOTHING;

-- Health: Nutrition sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-Nutrition', 'Nutrition Sub-Working Group',
  'Coordinates nutrition interventions including micronutrient supplementation, infant and young child feeding, and management of acute malnutrition.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-Health'
ON CONFLICT (code) DO NOTHING;

-- Education: Higher Education sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-HigherEducation', 'Higher Education Sub-Working Group',
  'Supports university reform, research capacity building, scholarship programmes, and alignment of higher education with labour market needs.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-Education'
ON CONFLICT (code) DO NOTHING;

-- Agriculture: Livestock sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-Livestock', 'Livestock & Fisheries Sub-Working Group',
  'Coordinates livestock development, aquaculture, fisheries management, and animal health programmes.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-Agriculture'
ON CONFLICT (code) DO NOTHING;

-- Agriculture: Climate-Smart Agriculture sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-ClimateAgri', 'Climate-Smart Agriculture Sub-Working Group',
  'Promotes climate-resilient farming practices, drought-resistant crops, sustainable land management, and agricultural adaptation strategies.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-Agriculture'
ON CONFLICT (code) DO NOTHING;

-- WASH: Rural Water Supply sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-RuralWater', 'Rural Water Supply Sub-Working Group',
  'Focuses on rural water supply infrastructure, borehole drilling, spring protection, and community-managed water systems.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-WASH'
ON CONFLICT (code) DO NOTHING;

-- WASH: Urban Sanitation sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-UrbanSanitation', 'Urban Sanitation Sub-Working Group',
  'Addresses urban sanitation challenges including sewerage systems, solid waste management, and sanitation marketing in peri-urban areas.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-WASH'
ON CONFLICT (code) DO NOTHING;

-- Governance: Public Financial Management sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-PFM', 'Public Financial Management Sub-Working Group',
  'Supports budget reform, treasury modernization, audit strengthening, and transparent public expenditure management.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-Governance'
ON CONFLICT (code) DO NOTHING;

-- Environment: Disaster Risk Reduction sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-DRR', 'Disaster Risk Reduction Sub-Working Group',
  'Coordinates disaster preparedness, early warning systems, emergency response planning, and resilience building across vulnerable communities.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-Environment'
ON CONFLICT (code) DO NOTHING;

-- Social Protection: Cash Transfers sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-CashTransfers', 'Cash Transfer Programmes Sub-Working Group',
  'Coordinates design and implementation of conditional and unconditional cash transfer programmes targeting the poorest households.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-SocialProtection'
ON CONFLICT (code) DO NOTHING;

-- Gender: GBV Prevention sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-GBVPrevention', 'GBV Prevention & Response Sub-Working Group',
  'Coordinates gender-based violence prevention, survivor services, referral pathways, and community awareness campaigns.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-Gender'
ON CONFLICT (code) DO NOTHING;

-- M&E: Data Quality sub-group
INSERT INTO working_groups (code, label, description, group_type, parent_id, is_active, status)
SELECT 'SWG-DataQuality', 'Data Quality & Statistics Sub-Working Group',
  'Ensures data quality standards, statistical capacity building, survey coordination, and harmonized indicator frameworks.',
  'sub_working_group', id, true, 'active'
FROM working_groups WHERE code = 'TWG-M&E'
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. Add sample members to working groups
--    Using fictional names to avoid conflicts with real users
-- ============================================================

-- Helper: Add members only if the working group exists and the member doesn't already exist
-- We use person_name + working_group_id uniqueness check via a CTE

-- Health TWG members
INSERT INTO working_group_memberships (working_group_id, person_name, person_email, person_organization, role, joined_on, is_active)
SELECT wg.id, m.person_name, m.person_email, m.person_organization, m.role, m.joined_on::date, true
FROM working_groups wg
CROSS JOIN (VALUES
  ('Dr. Khin Mar Aye', 'khinmaraye@mohs.gov.mm', 'Ministry of Health and Sports', 'chair', '2024-03-15'),
  ('Dr. Aung Thu Win', 'aungthuw@who.int', 'World Health Organization (WHO)', 'co_chair', '2024-03-15'),
  ('Nang Kham Noung', 'nkhamnoung@unicef.org', 'UNICEF Myanmar', 'member', '2024-06-01'),
  ('Dr. James Patterson', 'jpatterson@usaid.gov', 'USAID', 'member', '2024-08-01'),
  ('Daw Aye Aye Mon', 'ayeayemon@3mdg.org', 'Three Millennium Development Goal Fund', 'secretariat', '2024-03-15')
) AS m(person_name, person_email, person_organization, role, joined_on)
WHERE wg.code = 'TWG-Health'
AND NOT EXISTS (SELECT 1 FROM working_group_memberships wgm WHERE wgm.working_group_id = wg.id AND wgm.person_name = m.person_name);

-- Education TWG members
INSERT INTO working_group_memberships (working_group_id, person_name, person_email, person_organization, role, joined_on, is_active)
SELECT wg.id, m.person_name, m.person_email, m.person_organization, m.role, m.joined_on::date, true
FROM working_groups wg
CROSS JOIN (VALUES
  ('U Myo Thein Gyi', 'myotheingyi@moe.gov.mm', 'Ministry of Education', 'chair', '2024-01-10'),
  ('Sarah Thompson', 'sthompson@worldbank.org', 'World Bank', 'co_chair', '2024-01-10'),
  ('Dr. Tin Tin Hla', 'tintinhla@unesco.org', 'UNESCO Myanmar', 'member', '2024-04-01'),
  ('Maung Zaw Htet', 'zawhtet@jica.go.jp', 'Japan International Cooperation Agency (JICA)', 'member', '2024-05-15')
) AS m(person_name, person_email, person_organization, role, joined_on)
WHERE wg.code = 'TWG-Education'
AND NOT EXISTS (SELECT 1 FROM working_group_memberships wgm WHERE wgm.working_group_id = wg.id AND wgm.person_name = m.person_name);

-- WASH TWG members
INSERT INTO working_group_memberships (working_group_id, person_name, person_email, person_organization, role, joined_on, is_active)
SELECT wg.id, m.person_name, m.person_email, m.person_organization, m.role, m.joined_on::date, true
FROM working_groups wg
CROSS JOIN (VALUES
  ('U Kyaw Soe', 'kyawsoe@moali.gov.mm', 'Ministry of Agriculture, Livestock and Irrigation', 'chair', '2024-02-01'),
  ('Maria Santos', 'msantos@unicef.org', 'UNICEF Myanmar', 'co_chair', '2024-02-01'),
  ('Daw Su Su Hlaing', 'ssuhlaing@wateraid.org', 'WaterAid Myanmar', 'member', '2024-06-15')
) AS m(person_name, person_email, person_organization, role, joined_on)
WHERE wg.code = 'TWG-WASH'
AND NOT EXISTS (SELECT 1 FROM working_group_memberships wgm WHERE wgm.working_group_id = wg.id AND wgm.person_name = m.person_name);

-- Governance TWG members
INSERT INTO working_group_memberships (working_group_id, person_name, person_email, person_organization, role, joined_on, is_active)
SELECT wg.id, m.person_name, m.person_email, m.person_organization, m.role, m.joined_on::date, true
FROM working_groups wg
CROSS JOIN (VALUES
  ('U Aung Naing Oo', 'aungnaingoo@mopfi.gov.mm', 'Ministry of Planning, Finance and Industry', 'chair', '2024-04-01'),
  ('Hans Mueller', 'hmueller@giz.de', 'Deutsche Gesellschaft fur Internationale Zusammenarbeit (GIZ)', 'co_chair', '2024-04-01'),
  ('Dr. Phyu Phyu Win', 'ppwin@undp.org', 'United Nations Development Programme (UNDP)', 'member', '2024-07-01')
) AS m(person_name, person_email, person_organization, role, joined_on)
WHERE wg.code = 'TWG-Governance'
AND NOT EXISTS (SELECT 1 FROM working_group_memberships wgm WHERE wgm.working_group_id = wg.id AND wgm.person_name = m.person_name);

-- Gender TWG members
INSERT INTO working_group_memberships (working_group_id, person_name, person_email, person_organization, role, joined_on, is_active)
SELECT wg.id, m.person_name, m.person_email, m.person_organization, m.role, m.joined_on::date, true
FROM working_groups wg
CROSS JOIN (VALUES
  ('Daw Nang Hseng Noon', 'nhsengnoon@mswrr.gov.mm', 'Ministry of Social Welfare, Relief and Resettlement', 'chair', '2024-05-01'),
  ('Elena Rodriguez', 'erodriguez@unwomen.org', 'UN Women Myanmar', 'co_chair', '2024-05-01'),
  ('Ma Thuzar Lwin', 'thuzar@actionaid.org', 'ActionAid Myanmar', 'member', '2024-08-15'),
  ('Dr. Nilar Aung', 'nilaraung@unfpa.org', 'UNFPA Myanmar', 'member', '2024-06-01')
) AS m(person_name, person_email, person_organization, role, joined_on)
WHERE wg.code = 'TWG-Gender'
AND NOT EXISTS (SELECT 1 FROM working_group_memberships wgm WHERE wgm.working_group_id = wg.id AND wgm.person_name = m.person_name);

-- Environment TWG members
INSERT INTO working_group_memberships (working_group_id, person_name, person_email, person_organization, role, joined_on, is_active)
SELECT wg.id, m.person_name, m.person_email, m.person_organization, m.role, m.joined_on::date, true
FROM working_groups wg
CROSS JOIN (VALUES
  ('U Win Htun', 'winhtun@monrec.gov.mm', 'Ministry of Natural Resources and Environmental Conservation', 'chair', '2024-03-01'),
  ('Dr. Rachel Green', 'rgreen@iucn.org', 'International Union for Conservation of Nature (IUCN)', 'co_chair', '2024-03-01'),
  ('Maung Hla Myint', 'hlamyint@wwf.org', 'World Wide Fund for Nature (WWF)', 'member', '2024-09-01')
) AS m(person_name, person_email, person_organization, role, joined_on)
WHERE wg.code = 'TWG-Environment'
AND NOT EXISTS (SELECT 1 FROM working_group_memberships wgm WHERE wgm.working_group_id = wg.id AND wgm.person_name = m.person_name);

-- Social Protection TWG members
INSERT INTO working_group_memberships (working_group_id, person_name, person_email, person_organization, role, joined_on, is_active)
SELECT wg.id, m.person_name, m.person_email, m.person_organization, m.role, m.joined_on::date, true
FROM working_groups wg
CROSS JOIN (VALUES
  ('Daw Khin Saw Oo', 'khinsawoo@mswrr.gov.mm', 'Ministry of Social Welfare, Relief and Resettlement', 'chair', '2024-06-01'),
  ('Thomas Anderson', 'tanderson@worldbank.org', 'World Bank', 'co_chair', '2024-06-01'),
  ('Ma Wai Wai Aung', 'wwaung@savethechildren.org', 'Save the Children', 'member', '2024-10-01')
) AS m(person_name, person_email, person_organization, role, joined_on)
WHERE wg.code = 'TWG-SocialProtection'
AND NOT EXISTS (SELECT 1 FROM working_group_memberships wgm WHERE wgm.working_group_id = wg.id AND wgm.person_name = m.person_name);

-- Add a couple members to some new sub-groups too
-- Community Health SWG
INSERT INTO working_group_memberships (working_group_id, person_name, person_email, person_organization, role, joined_on, is_active)
SELECT wg.id, m.person_name, m.person_email, m.person_organization, m.role, m.joined_on::date, true
FROM working_groups wg
CROSS JOIN (VALUES
  ('Dr. Than Than Aye', 'thanthanaye@mohs.gov.mm', 'Ministry of Health and Sports', 'chair', '2025-01-15'),
  ('Naw Eh Htoo', 'nehhtoo@jhpiego.org', 'Jhpiego Myanmar', 'member', '2025-02-01')
) AS m(person_name, person_email, person_organization, role, joined_on)
WHERE wg.code = 'SWG-CommunityHealth'
AND NOT EXISTS (SELECT 1 FROM working_group_memberships wgm WHERE wgm.working_group_id = wg.id AND wgm.person_name = m.person_name);

-- Nutrition SWG
INSERT INTO working_group_memberships (working_group_id, person_name, person_email, person_organization, role, joined_on, is_active)
SELECT wg.id, m.person_name, m.person_email, m.person_organization, m.role, m.joined_on::date, true
FROM working_groups wg
CROSS JOIN (VALUES
  ('Dr. Myat Mon Oo', 'myatmonoo@mohs.gov.mm', 'Ministry of Health and Sports', 'chair', '2025-01-15'),
  ('Patricia Chen', 'pchen@wfp.org', 'World Food Programme (WFP)', 'co_chair', '2025-01-15')
) AS m(person_name, person_email, person_organization, role, joined_on)
WHERE wg.code = 'SWG-Nutrition'
AND NOT EXISTS (SELECT 1 FROM working_group_memberships wgm WHERE wgm.working_group_id = wg.id AND wgm.person_name = m.person_name);

-- GBV Prevention SWG
INSERT INTO working_group_memberships (working_group_id, person_name, person_email, person_organization, role, joined_on, is_active)
SELECT wg.id, m.person_name, m.person_email, m.person_organization, m.role, m.joined_on::date, true
FROM working_groups wg
CROSS JOIN (VALUES
  ('Daw May Thu', 'maythu@mswrr.gov.mm', 'Ministry of Social Welfare, Relief and Resettlement', 'chair', '2025-02-01'),
  ('Dr. Suki Nagra', 'snagra@unfpa.org', 'UNFPA Myanmar', 'co_chair', '2025-02-01'),
  ('Ma Hnin Si', 'hninsi@womenleague.org', 'Women''s League of Burma', 'member', '2025-03-01')
) AS m(person_name, person_email, person_organization, role, joined_on)
WHERE wg.code = 'SWG-GBVPrevention'
AND NOT EXISTS (SELECT 1 FROM working_group_memberships wgm WHERE wgm.working_group_id = wg.id AND wgm.person_name = m.person_name);

-- DRR SWG
INSERT INTO working_group_memberships (working_group_id, person_name, person_email, person_organization, role, joined_on, is_active)
SELECT wg.id, m.person_name, m.person_email, m.person_organization, m.role, m.joined_on::date, true
FROM working_groups wg
CROSS JOIN (VALUES
  ('U Tun Tun Naing', 'ttnaing@rrd.gov.mm', 'Relief and Resettlement Department', 'chair', '2025-01-20'),
  ('Yuki Tanaka', 'ytanaka@adrc.asia', 'Asian Disaster Reduction Center', 'member', '2025-03-01')
) AS m(person_name, person_email, person_organization, role, joined_on)
WHERE wg.code = 'SWG-DRR'
AND NOT EXISTS (SELECT 1 FROM working_group_memberships wgm WHERE wgm.working_group_id = wg.id AND wgm.person_name = m.person_name);
