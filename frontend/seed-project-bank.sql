-- ==========================================================================
-- Seed: 10 Project Bank projects across all stages
-- Run against the Supabase database directly.
-- project_code = '' lets the DB trigger auto-generate PB-YYYY-NNN codes.
-- ==========================================================================

BEGIN;

-- ── Ensure review tables exist (migration may not have been applied) ────
CREATE TABLE IF NOT EXISTS intake_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id),
  review_tier text NOT NULL CHECK (review_tier IN ('desk', 'senior')),
  decision text NOT NULL CHECK (decision IN ('screened', 'approved', 'returned', 'rejected')),
  comments text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intake_reviews_project_id ON intake_reviews(project_id);

CREATE TABLE IF NOT EXISTS fs2_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id),
  review_tier text NOT NULL CHECK (review_tier IN ('desk', 'senior')),
  decision text NOT NULL CHECK (decision IN ('screened', 'passed', 'returned', 'rejected')),
  comments text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs2_reviews_project_id ON fs2_reviews(project_id);

-- ==========================================================================
-- 10 PROJECTS
-- ==========================================================================

-- ── 1. Yangon–Mandalay Expressway Upgrade  (intake_draft) ───────────────
INSERT INTO project_bank_projects (
  project_code, name, description, objectives, target_beneficiaries,
  nominating_ministry, implementing_agency, sector, sub_sector, region,
  estimated_cost, currency, ndp_aligned, sdg_goals, status, origin,
  project_stage, project_type,
  estimated_start_date, estimated_duration_months,
  contact_officer, contact_email, contact_phone,
  contact_position, contact_ministry, contact_department
) VALUES (
  '', 'Yangon–Mandalay Expressway Upgrade',
  'Widening and resurfacing of the 587 km Yangon–Mandalay Expressway from four to six lanes, adding rest areas, weigh stations, and intelligent transport systems (ITS) including electronic toll collection.',
  'Reduce travel time from 8 h to 5 h, decrease accident rate by 40%, increase freight throughput by 60%, and improve all-weather reliability for intercity logistics.',
  'Approximately 12 million residents in Yangon and Mandalay Regions plus 3 million in transit corridors; 15,000 daily commercial vehicles and 25,000 passenger vehicles.',
  'Ministry of Construction', 'Department of Highways',
  'Transport', 'Roads & Highways', 'Nationwide',
  850000000, 'USD', true, '{"9","11"}', 'screening', 'GOV',
  'intake_draft', 'Infrastructure',
  '2027-01-01', 36,
  'U Kyaw Win', 'kyawwin@mopfi.gov.mm', '+95-67-407-234',
  'Director', 'Ministry of Planning and Finance', 'Project Appraisal Division'
);

-- ── 2. Myitkyina Solar Farm  (intake_submitted) ────────────────────────
INSERT INTO project_bank_projects (
  project_code, name, description, objectives, target_beneficiaries,
  nominating_ministry, implementing_agency, sector, sub_sector, region,
  estimated_cost, currency, ndp_aligned, sdg_goals, status, origin,
  project_stage, project_type,
  estimated_start_date, estimated_duration_months,
  contact_officer, contact_email, contact_phone,
  contact_position, contact_ministry, contact_department,
  nominated_at
) VALUES (
  '', 'Myitkyina Solar Farm',
  '100 MW utility-scale solar photovoltaic farm on 200 hectares of degraded agricultural land near Myitkyina, Kachin State, with battery energy storage system (BESS) for grid stabilisation.',
  'Add 100 MW of clean baseload capacity to the northern grid, reduce diesel-generator dependence in Kachin by 70%, and lower electricity costs for 250,000 households.',
  '250,000 households and 1,200 small businesses in Kachin State currently relying on expensive off-grid diesel generation.',
  'Ministry of Electricity and Energy', 'Department of Electric Power Planning',
  'Energy', 'Renewable Energy', 'Kachin',
  120000000, 'USD', true, '{"9","11"}', 'screening', 'GOV',
  'intake_submitted', 'Infrastructure',
  '2027-01-01', 36,
  'U Kyaw Win', 'kyawwin@mopfi.gov.mm', '+95-67-407-234',
  'Director', 'Ministry of Planning and Finance', 'Project Appraisal Division',
  now() - interval '14 days'
);

-- ── 3. Sagaing Agricultural Training Centre  (intake_returned) ─────────
INSERT INTO project_bank_projects (
  project_code, name, description, objectives, target_beneficiaries,
  nominating_ministry, implementing_agency, sector, sub_sector, region,
  estimated_cost, currency, ndp_aligned, sdg_goals, status, origin,
  project_stage, project_type,
  estimated_start_date, estimated_duration_months,
  contact_officer, contact_email, contact_phone,
  contact_position, contact_ministry, contact_department,
  review_comments, nominated_at
) VALUES (
  '', 'Sagaing Agricultural Training Centre',
  'Construction of a 5-hectare regional agricultural vocational training centre in Monywa, Sagaing Region, offering certified courses in modern farming techniques, post-harvest handling, and agro-processing.',
  'Train 2,000 farmers and extension workers per year, increase regional crop yields by 25%, reduce post-harvest losses from 30% to 10%, and create 500 direct jobs.',
  '2,000 trainees per year from Sagaing, Magway, and Mandalay Regions; 120,000 smallholder farming households in the dry zone.',
  'Ministry of Agriculture, Livestock and Irrigation', 'Department of Agriculture',
  'Agriculture', 'Agro-processing', 'Sagaing',
  18000000, 'USD', true, '{"9","11"}', 'screening', 'GOV',
  'intake_returned', 'Infrastructure',
  '2027-01-01', 36,
  'U Kyaw Win', 'kyawwin@mopfi.gov.mm', '+95-67-407-234',
  'Director', 'Ministry of Planning and Finance', 'Project Appraisal Division',
  'Please clarify land tenure arrangements for the proposed site and provide letters of support from Sagaing Regional Government. Cost estimates for laboratory equipment appear understated — please revise with itemised quotations.',
  now() - interval '30 days'
);

-- ── 4. Bago Water Treatment Plant  (fs1_draft) ─────────────────────────
INSERT INTO project_bank_projects (
  project_code, name, description, objectives, target_beneficiaries,
  nominating_ministry, implementing_agency, sector, sub_sector, region,
  estimated_cost, currency, ndp_aligned, sdg_goals, status, origin,
  project_stage, feasibility_stage, project_type,
  estimated_start_date, estimated_duration_months,
  contact_officer, contact_email, contact_phone,
  contact_position, contact_ministry, contact_department,
  nominated_at, screened_at,
  -- FS-1 conductor
  fs_conductor_type, fs_conductor_company_name, fs_conductor_company_address,
  fs_conductor_company_phone, fs_conductor_company_email, fs_conductor_company_website,
  fs_conductor_contact_person,
  -- Technical
  technical_approach, technology_methodology, technical_risks,
  technical_design_maturity, has_technical_design,
  -- Environmental / social
  environmental_impact_level, social_impact_level,
  land_acquisition_required, resettlement_required, estimated_affected_households,
  -- Revenue
  has_revenue_component, revenue_sources, market_assessment_summary,
  projected_annual_users, projected_annual_revenue, revenue_ramp_up_years,
  -- Periods
  construction_period_years, operational_period_years, project_life_years,
  -- MSDP
  msdp_strategy_area, alignment_justification, sector_strategy_reference, in_sector_investment_plan
) VALUES (
  '', 'Bago Water Treatment Plant',
  'New 50 MLD water treatment plant drawing from the Bago River to serve Bago City and surrounding townships, including 45 km of transmission mains and 120 km of distribution network.',
  'Increase piped water coverage in Bago City from 35% to 85%, provide safe drinking water meeting WHO standards, and reduce waterborne disease incidence by 60%.',
  '350,000 residents in Bago City and surrounding peri-urban townships; 200 industrial units in Bago Industrial Zone.',
  'Ministry of Construction', 'Department of Urban and Housing Development',
  'WASH', 'Water Supply', 'Bago',
  65000000, 'USD', true, '{"9","11"}', 'screening', 'GOV',
  'fs1_draft', 'registered', 'Infrastructure',
  '2027-01-01', 36,
  'U Kyaw Win', 'kyawwin@mopfi.gov.mm', '+95-67-407-234',
  'Director', 'Ministry of Planning and Finance', 'Project Appraisal Division',
  now() - interval '60 days', now() - interval '45 days',
  -- FS-1 conductor
  'company', 'Myanmar Infrastructure Consulting Group', '123 Pyay Road, Kamayut Township, Yangon',
  '+95-1-512-345', 'info@micg.com.mm', 'https://micg.com.mm',
  'Dr Aung Myint',
  -- Technical
  'Conventional treatment train: coagulation, flocculation, sedimentation, rapid sand filtration, and chlorine disinfection. Designed for 50 MLD capacity with modular expansion to 100 MLD.',
  'Proven conventional water treatment technology with local material sourcing. Pre-treatment includes intake screens and aeration. Sludge handling via gravity thickener and drying beds.',
  'Seasonal turbidity spikes during monsoon (June–October) may require additional pre-treatment. Raw water quality from Bago River subject to upstream agricultural runoff. Land acquisition for pipeline corridor may encounter encroachment.',
  'preliminary', true,
  -- Environmental / social
  'moderate', 'low',
  true, false, 0,
  -- Revenue
  true, '{"User charges","Service charges"}',
  'Bago City population of 500,000 currently served at only 35% coverage. Willingness-to-pay survey (2025) shows 85% of households willing to pay MMK 5,000/month for reliable piped water. Industrial demand from Bago Industrial Zone adds 8 MLD.',
  350000, 4200000, 3,
  -- Periods
  3, 25, 28,
  -- MSDP
  'Goal 3: Job Creation & Private Sector-Led Growth',
  'Directly supports MSDP Strategy 3.4 on improving transport and ICT connectivity to reduce cost of doing business, create employment opportunities, and support regional economic integration across Myanmar.',
  'National Transport Master Plan 2025–2040', true
);

-- ── 5. Mandalay Industrial Zone Expansion  (fs1_submitted, FIRR 12%) ───
INSERT INTO project_bank_projects (
  project_code, name, description, objectives, target_beneficiaries,
  nominating_ministry, implementing_agency, sector, sub_sector, region,
  estimated_cost, currency, ndp_aligned, sdg_goals, status, origin,
  project_stage, feasibility_stage, project_type,
  estimated_start_date, estimated_duration_months,
  contact_officer, contact_email, contact_phone,
  contact_position, contact_ministry, contact_department,
  nominated_at, screened_at,
  proponent_name, proponent_company, proponent_contact,
  firr, firr_date, firr_cost_table_data,
  -- FS-1 conductor
  fs_conductor_type, fs_conductor_company_name, fs_conductor_company_address,
  fs_conductor_company_phone, fs_conductor_company_email, fs_conductor_company_website,
  fs_conductor_contact_person,
  -- Technical
  technical_approach, technology_methodology, technical_risks,
  technical_design_maturity, has_technical_design,
  -- Environmental / social
  environmental_impact_level, social_impact_level,
  land_acquisition_required, resettlement_required, estimated_affected_households,
  -- Revenue
  has_revenue_component, revenue_sources, market_assessment_summary,
  projected_annual_users, projected_annual_revenue, revenue_ramp_up_years,
  -- Periods
  construction_period_years, operational_period_years, project_life_years,
  -- MSDP
  msdp_strategy_area, alignment_justification, sector_strategy_reference, in_sector_investment_plan
) VALUES (
  '', 'Mandalay Industrial Zone Expansion',
  'Development of a 300-hectare modern industrial zone adjacent to the Mandalay–Myotha Expressway, targeting garment, food processing, and light manufacturing, with full utility infrastructure.',
  'Attract USD 500 M in FDI, create 50,000 direct jobs, and increase manufactured exports from the Mandalay corridor by 30% over 10 years.',
  '50,000 workers and their families (approx. 200,000 people); 45+ domestic and foreign firms.',
  'Ministry of Industry', 'Directorate of Industrial Supervision and Inspection',
  'Industrial', 'Industrial Parks', 'Mandalay',
  220000000, 'USD', true, '{"9","11"}', 'screening', 'UNSOL',
  'fs1_submitted', 'fs1_submitted', 'Infrastructure',
  '2027-01-01', 36,
  'U Kyaw Win', 'kyawwin@mopfi.gov.mm', '+95-67-407-234',
  'Director', 'Ministry of Planning and Finance', 'Project Appraisal Division',
  now() - interval '90 days', now() - interval '75 days',
  'Myanmar Industrial Development Corporation', 'MIDC Holdings Ltd', 'U Tun Aung Kyaw, CEO — +95-2-456-789',
  12, now() - interval '10 days',
  -- firr_cost_table_data: 32 years, capex 36666667 for 2yr construction, opex 6000000, revenue 31500000, ramp 3yr
  '[{"year":2026,"capex":36666667,"opex":600000,"revenue":0},{"year":2027,"capex":36666667,"opex":600000,"revenue":0},{"year":2028,"capex":0,"opex":6000000,"revenue":7875000},{"year":2029,"capex":0,"opex":6000000,"revenue":15750000},{"year":2030,"capex":0,"opex":6000000,"revenue":23625000},{"year":2031,"capex":0,"opex":6000000,"revenue":31500000},{"year":2032,"capex":0,"opex":6000000,"revenue":31500000},{"year":2033,"capex":0,"opex":6000000,"revenue":31500000},{"year":2034,"capex":0,"opex":6000000,"revenue":31500000},{"year":2035,"capex":0,"opex":6000000,"revenue":31500000},{"year":2036,"capex":0,"opex":6000000,"revenue":31500000},{"year":2037,"capex":0,"opex":6000000,"revenue":31500000},{"year":2038,"capex":0,"opex":6000000,"revenue":31500000},{"year":2039,"capex":0,"opex":6000000,"revenue":31500000},{"year":2040,"capex":0,"opex":6000000,"revenue":31500000},{"year":2041,"capex":0,"opex":6000000,"revenue":31500000},{"year":2042,"capex":0,"opex":6000000,"revenue":31500000},{"year":2043,"capex":0,"opex":6000000,"revenue":31500000},{"year":2044,"capex":0,"opex":6000000,"revenue":31500000},{"year":2045,"capex":0,"opex":6000000,"revenue":31500000},{"year":2046,"capex":0,"opex":6000000,"revenue":31500000},{"year":2047,"capex":0,"opex":6000000,"revenue":31500000},{"year":2048,"capex":0,"opex":6000000,"revenue":31500000},{"year":2049,"capex":0,"opex":6000000,"revenue":31500000},{"year":2050,"capex":0,"opex":6000000,"revenue":31500000},{"year":2051,"capex":0,"opex":6000000,"revenue":31500000},{"year":2052,"capex":0,"opex":6000000,"revenue":31500000},{"year":2053,"capex":0,"opex":6000000,"revenue":31500000},{"year":2054,"capex":0,"opex":6000000,"revenue":31500000},{"year":2055,"capex":0,"opex":6000000,"revenue":31500000},{"year":2056,"capex":0,"opex":6000000,"revenue":31500000},{"year":2057,"capex":0,"opex":6000000,"revenue":31500000}]'::jsonb,
  -- FS-1 conductor
  'company', 'Myanmar Infrastructure Consulting Group', '123 Pyay Road, Kamayut Township, Yangon',
  '+95-1-512-345', 'info@micg.com.mm', 'https://micg.com.mm',
  'Dr Aung Myint',
  -- Technical
  'Greenfield industrial zone development on 300 hectares including internal roads, power substations, water/wastewater treatment, fibre-optic backbone, and worker amenities.',
  'Modular zone development in three phases. Phase 1 covers 100 ha with plug-and-play factory shells. Smart metering and SCADA for all utilities.',
  'Geotechnical conditions may require deep piling in some areas. Power supply from the national grid may be insufficient during peak — on-site 20 MW gas turbine backup planned.',
  'preliminary', true,
  -- Environmental / social
  'significant', 'moderate',
  true, false, 0,
  -- Revenue
  true, '{"Lease income","Service charges","User charges"}',
  'Pre-registration of interest from 45 firms (garment, food processing, light assembly). Demand study projects 80% occupancy within 5 years. Land lease rates benchmarked at USD 35/m²/year.',
  45, 31500000, 3,
  -- Periods
  2, 30, 32,
  -- MSDP
  'Goal 3: Job Creation & Private Sector-Led Growth',
  'Directly supports MSDP Strategy 3.4 on improving transport and ICT connectivity to reduce cost of doing business, create employment opportunities, and support regional economic integration across Myanmar.',
  'National Transport Master Plan 2025–2040', true
);

-- ── 6. Chin State Rural Health Clinics  (fs1_submitted, FIRR 4%) ───────
INSERT INTO project_bank_projects (
  project_code, name, description, objectives, target_beneficiaries,
  nominating_ministry, implementing_agency, sector, sub_sector, region,
  estimated_cost, currency, ndp_aligned, sdg_goals, status, origin,
  project_stage, feasibility_stage, project_type,
  estimated_start_date, estimated_duration_months,
  contact_officer, contact_email, contact_phone,
  contact_position, contact_ministry, contact_department,
  nominated_at, screened_at,
  firr, firr_date, firr_cost_table_data,
  -- FS-1 conductor (individual)
  fs_conductor_type,
  fs_conductor_individual_name, fs_conductor_individual_email,
  fs_conductor_individual_phone, fs_conductor_individual_job_title,
  fs_conductor_individual_company,
  -- Technical
  technical_approach, technology_methodology, technical_risks,
  technical_design_maturity, has_technical_design,
  -- Environmental / social
  environmental_impact_level, social_impact_level,
  land_acquisition_required, resettlement_required, estimated_affected_households,
  -- Revenue
  has_revenue_component, revenue_sources,
  projected_annual_users, projected_annual_revenue, revenue_ramp_up_years,
  -- Periods
  construction_period_years, operational_period_years, project_life_years,
  -- MSDP
  msdp_strategy_area, alignment_justification, sector_strategy_reference, in_sector_investment_plan
) VALUES (
  '', 'Chin State Rural Health Clinics',
  'Construction and equipping of 25 rural health clinics across Chin State to improve primary healthcare access for remote communities, including telemedicine facilities and solar-powered cold chain storage.',
  'Reduce average travel time to nearest health facility from 6 h to 1 h, increase immunisation coverage from 40% to 80%, and reduce maternal mortality rate by 50%.',
  '150,000 residents in 25 townships across Chin State, with focus on women, children under 5, and elderly populations.',
  'Ministry of Health and Sports', 'Department of Public Health',
  'Health', 'Primary Healthcare', 'Chin',
  12000000, 'USD', true, '{"9","11"}', 'screening', 'GOV',
  'fs1_submitted', 'fs1_submitted', 'Infrastructure',
  '2027-01-01', 36,
  'U Kyaw Win', 'kyawwin@mopfi.gov.mm', '+95-67-407-234',
  'Director', 'Ministry of Planning and Finance', 'Project Appraisal Division',
  now() - interval '80 days', now() - interval '65 days',
  4, now() - interval '8 days',
  -- 22 years, capex 3000000 for 2yr, opex 800000, revenue 600000, ramp 2yr
  '[{"year":2026,"capex":3000000,"opex":80000,"revenue":0},{"year":2027,"capex":3000000,"opex":80000,"revenue":0},{"year":2028,"capex":0,"opex":800000,"revenue":200000},{"year":2029,"capex":0,"opex":800000,"revenue":400000},{"year":2030,"capex":0,"opex":800000,"revenue":600000},{"year":2031,"capex":0,"opex":800000,"revenue":600000},{"year":2032,"capex":0,"opex":800000,"revenue":600000},{"year":2033,"capex":0,"opex":800000,"revenue":600000},{"year":2034,"capex":0,"opex":800000,"revenue":600000},{"year":2035,"capex":0,"opex":800000,"revenue":600000},{"year":2036,"capex":0,"opex":800000,"revenue":600000},{"year":2037,"capex":0,"opex":800000,"revenue":600000},{"year":2038,"capex":0,"opex":800000,"revenue":600000},{"year":2039,"capex":0,"opex":800000,"revenue":600000},{"year":2040,"capex":0,"opex":800000,"revenue":600000},{"year":2041,"capex":0,"opex":800000,"revenue":600000},{"year":2042,"capex":0,"opex":800000,"revenue":600000},{"year":2043,"capex":0,"opex":800000,"revenue":600000},{"year":2044,"capex":0,"opex":800000,"revenue":600000},{"year":2045,"capex":0,"opex":800000,"revenue":600000},{"year":2046,"capex":0,"opex":800000,"revenue":600000},{"year":2047,"capex":0,"opex":800000,"revenue":600000}]'::jsonb,
  -- FS-1 conductor (individual)
  'individual',
  'Dr Khin Maung Oo', 'khinmgoo@mohs.gov.mm',
  '+95-67-411-234', 'Senior Health Economist',
  'Ministry of Health and Sports',
  -- Technical
  'Construction of 25 modular rural health clinics using prefabricated steel-frame construction for rapid deployment. Each clinic: 200 m², 3 consultation rooms, pharmacy, lab, solar power, rainwater harvesting.',
  'Prefabricated construction with local assembly. Solar PV (5 kW per clinic) with battery storage. Telemedicine connectivity via satellite link for specialist consultations.',
  'Remote locations in Chin State pose significant logistics challenges — road access limited during monsoon. Skilled labour availability is low. Cold chain maintenance for vaccines requires reliable solar power.',
  'preliminary', true,
  -- Environmental / social
  'negligible', 'negligible',
  true, false, 0,
  -- Revenue
  false, '{}',
  150000, 600000, 3,
  -- Periods
  2, 20, 22,
  -- MSDP
  'Goal 3: Job Creation & Private Sector-Led Growth',
  'Directly supports MSDP Strategy 3.4 on improving transport and ICT connectivity to reduce cost of doing business, create employment opportunities, and support regional economic integration across Myanmar.',
  'National Transport Master Plan 2025–2040', true
);

-- ── 7. Ayeyarwady River Port Modernisation  (fs2_assigned, FIRR 6%, EIRR 18%) ──
INSERT INTO project_bank_projects (
  project_code, name, description, objectives, target_beneficiaries,
  nominating_ministry, implementing_agency, sector, sub_sector, region,
  estimated_cost, currency, ndp_aligned, sdg_goals, status, origin,
  project_stage, feasibility_stage, project_type,
  estimated_start_date, estimated_duration_months,
  contact_officer, contact_email, contact_phone,
  contact_position, contact_ministry, contact_department,
  nominated_at, screened_at,
  firr, firr_date, eirr, eirr_date, firr_cost_table_data,
  category_recommendation,
  -- FS-1 conductor
  fs_conductor_type, fs_conductor_company_name, fs_conductor_company_address,
  fs_conductor_company_phone, fs_conductor_company_email, fs_conductor_company_website,
  fs_conductor_contact_person,
  -- Technical
  technical_approach, technology_methodology, technical_risks,
  technical_design_maturity, has_technical_design,
  -- Environmental / social
  environmental_impact_level, social_impact_level,
  land_acquisition_required, resettlement_required, estimated_affected_households,
  -- Revenue
  has_revenue_component, revenue_sources, market_assessment_summary,
  projected_annual_users, projected_annual_revenue, revenue_ramp_up_years,
  -- Periods
  construction_period_years, operational_period_years, project_life_years,
  -- MSDP
  msdp_strategy_area, alignment_justification, sector_strategy_reference, in_sector_investment_plan
) VALUES (
  '', 'Ayeyarwady River Port Modernisation',
  'Modernisation of three strategic river ports on the Ayeyarwady (Pyay, Hinthada, Pathein) to increase freight capacity, introduce container handling, and improve intermodal connectivity.',
  'Double inland waterway freight capacity, reduce cargo handling time by 60%, lower transport costs by 25%, and shift 15% of road freight to waterways.',
  '1,200 vessel operators, 5,000 port workers, and 2 million residents in the Ayeyarwady delta who depend on river transport for goods and services.',
  'Ministry of Transport and Communications', 'Directorate of Water Resources and Improvement of River Systems',
  'Transport', 'Ports & Waterways', 'Ayeyarwady',
  180000000, 'USD', true, '{"9","11"}', 'screening', 'GOV',
  'fs2_assigned', 'fs2_assigned', 'Infrastructure',
  '2027-01-01', 36,
  'U Kyaw Win', 'kyawwin@mopfi.gov.mm', '+95-67-407-234',
  'Director', 'Ministry of Planning and Finance', 'Project Appraisal Division',
  now() - interval '180 days', now() - interval '160 days',
  6, now() - interval '60 days', 18, now() - interval '55 days',
  -- 33 years, capex 20000000 for 3yr, opex 5000000, revenue 18000000, ramp 3yr
  '[{"year":2026,"capex":20000000,"opex":500000,"revenue":0},{"year":2027,"capex":20000000,"opex":500000,"revenue":0},{"year":2028,"capex":20000000,"opex":500000,"revenue":0},{"year":2029,"capex":0,"opex":5000000,"revenue":4500000},{"year":2030,"capex":0,"opex":5000000,"revenue":9000000},{"year":2031,"capex":0,"opex":5000000,"revenue":13500000},{"year":2032,"capex":0,"opex":5000000,"revenue":18000000},{"year":2033,"capex":0,"opex":5000000,"revenue":18000000},{"year":2034,"capex":0,"opex":5000000,"revenue":18000000},{"year":2035,"capex":0,"opex":5000000,"revenue":18000000},{"year":2036,"capex":0,"opex":5000000,"revenue":18000000},{"year":2037,"capex":0,"opex":5000000,"revenue":18000000},{"year":2038,"capex":0,"opex":5000000,"revenue":18000000},{"year":2039,"capex":0,"opex":5000000,"revenue":18000000},{"year":2040,"capex":0,"opex":5000000,"revenue":18000000},{"year":2041,"capex":0,"opex":5000000,"revenue":18000000},{"year":2042,"capex":0,"opex":5000000,"revenue":18000000},{"year":2043,"capex":0,"opex":5000000,"revenue":18000000},{"year":2044,"capex":0,"opex":5000000,"revenue":18000000},{"year":2045,"capex":0,"opex":5000000,"revenue":18000000},{"year":2046,"capex":0,"opex":5000000,"revenue":18000000},{"year":2047,"capex":0,"opex":5000000,"revenue":18000000},{"year":2048,"capex":0,"opex":5000000,"revenue":18000000},{"year":2049,"capex":0,"opex":5000000,"revenue":18000000},{"year":2050,"capex":0,"opex":5000000,"revenue":18000000},{"year":2051,"capex":0,"opex":5000000,"revenue":18000000},{"year":2052,"capex":0,"opex":5000000,"revenue":18000000},{"year":2053,"capex":0,"opex":5000000,"revenue":18000000},{"year":2054,"capex":0,"opex":5000000,"revenue":18000000},{"year":2055,"capex":0,"opex":5000000,"revenue":18000000},{"year":2056,"capex":0,"opex":5000000,"revenue":18000000},{"year":2057,"capex":0,"opex":5000000,"revenue":18000000},{"year":2058,"capex":0,"opex":5000000,"revenue":18000000}]'::jsonb,
  'category_c',
  -- FS-1 conductor
  'company', 'Myanmar Infrastructure Consulting Group', '123 Pyay Road, Kamayut Township, Yangon',
  '+95-1-512-345', 'info@micg.com.mm', 'https://micg.com.mm',
  'Dr Aung Myint',
  -- Technical
  'Modernisation of three river ports (Pyay, Hinthada, Pathein) with new container handling equipment, dredging of approach channels to 4 m depth, and construction of RoRo ramps.',
  'Mobile harbour cranes (2 per port), reach stackers, and automated gate systems. Dredging via cutter-suction dredger with disposal to engineered containment areas.',
  'Sedimentation rates in the Ayeyarwady are high — annual maintenance dredging of ~500,000 m³ required. Monsoon flooding may damage port infrastructure if flood walls are not raised.',
  'preliminary', true,
  -- Environmental / social
  'moderate', 'moderate',
  true, false, 0,
  -- Revenue
  true, '{"User charges","Concession fees","Lease income"}',
  'Inland waterway freight currently at 4 M tonnes/year, projected to reach 8 M tonnes by 2035. Three ports handle 60% of delta trade. Container throughput expected to triple with modernisation.',
  1200, 18000000, 3,
  -- Periods
  3, 30, 33,
  -- MSDP
  'Goal 3: Job Creation & Private Sector-Led Growth',
  'Directly supports MSDP Strategy 3.4 on improving transport and ICT connectivity to reduce cost of doing business, create employment opportunities, and support regional economic integration across Myanmar.',
  'National Transport Master Plan 2025–2040', true
);

-- ── 8. Shan State Telecom Backbone  (fs2_categorized, FIRR 14%, Cat A) ──
INSERT INTO project_bank_projects (
  project_code, name, description, objectives, target_beneficiaries,
  nominating_ministry, implementing_agency, sector, sub_sector, region,
  estimated_cost, currency, ndp_aligned, sdg_goals, status, origin,
  project_stage, feasibility_stage, project_type,
  estimated_start_date, estimated_duration_months,
  contact_officer, contact_email, contact_phone,
  contact_position, contact_ministry, contact_department,
  nominated_at, screened_at,
  proponent_name, proponent_company, proponent_contact,
  firr, firr_date, firr_cost_table_data,
  category_recommendation, category_decision, category_rationale,
  -- FS-1 conductor
  fs_conductor_type, fs_conductor_company_name, fs_conductor_company_address,
  fs_conductor_company_phone, fs_conductor_company_email, fs_conductor_company_website,
  fs_conductor_contact_person,
  -- Technical
  technical_approach, technology_methodology, technical_risks,
  technical_design_maturity, has_technical_design,
  -- Environmental / social
  environmental_impact_level, social_impact_level,
  land_acquisition_required, resettlement_required, estimated_affected_households,
  -- Revenue
  has_revenue_component, revenue_sources, market_assessment_summary,
  projected_annual_users, projected_annual_revenue, revenue_ramp_up_years,
  -- Periods
  construction_period_years, operational_period_years, project_life_years,
  -- MSDP
  msdp_strategy_area, alignment_justification, sector_strategy_reference, in_sector_investment_plan
) VALUES (
  '', 'Shan State Telecom Backbone',
  'Installation of 1,200 km of fibre-optic backbone connecting Mandalay to Kengtung via Lashio and Taunggyi, providing high-speed broadband to 28 townships in Shan State.',
  'Achieve 50% broadband penetration in Shan State by 2032, connect 28 township government offices to the national e-government network, and enable telemedicine and e-learning for 500,000 residents.',
  '500,000 residents, 28 township administrations, 4 mobile operators, and 2,000 SMEs in eastern Shan State.',
  'Ministry of Transport and Communications', 'Posts and Telecommunications Department',
  'ICT', 'Telecommunications', 'Shan',
  95000000, 'USD', true, '{"9","11"}', 'screening', 'UNSOL',
  'fs2_categorized', 'categorized', 'Infrastructure',
  '2027-01-01', 36,
  'U Kyaw Win', 'kyawwin@mopfi.gov.mm', '+95-67-407-234',
  'Director', 'Ministry of Planning and Finance', 'Project Appraisal Division',
  now() - interval '240 days', now() - interval '220 days',
  'Shan Digital Infrastructure Consortium', 'Myanmar Telecom Ventures Ltd', 'Daw Su Su Lwin, Managing Director — +95-1-234-567',
  14, now() - interval '90 days',
  -- 27 years, capex 15833333 for 2yr, opex 3000000, revenue 22000000, ramp 3yr
  '[{"year":2026,"capex":15833333,"opex":300000,"revenue":0},{"year":2027,"capex":15833333,"opex":300000,"revenue":0},{"year":2028,"capex":0,"opex":3000000,"revenue":5500000},{"year":2029,"capex":0,"opex":3000000,"revenue":11000000},{"year":2030,"capex":0,"opex":3000000,"revenue":16500000},{"year":2031,"capex":0,"opex":3000000,"revenue":22000000},{"year":2032,"capex":0,"opex":3000000,"revenue":22000000},{"year":2033,"capex":0,"opex":3000000,"revenue":22000000},{"year":2034,"capex":0,"opex":3000000,"revenue":22000000},{"year":2035,"capex":0,"opex":3000000,"revenue":22000000},{"year":2036,"capex":0,"opex":3000000,"revenue":22000000},{"year":2037,"capex":0,"opex":3000000,"revenue":22000000},{"year":2038,"capex":0,"opex":3000000,"revenue":22000000},{"year":2039,"capex":0,"opex":3000000,"revenue":22000000},{"year":2040,"capex":0,"opex":3000000,"revenue":22000000},{"year":2041,"capex":0,"opex":3000000,"revenue":22000000},{"year":2042,"capex":0,"opex":3000000,"revenue":22000000},{"year":2043,"capex":0,"opex":3000000,"revenue":22000000},{"year":2044,"capex":0,"opex":3000000,"revenue":22000000},{"year":2045,"capex":0,"opex":3000000,"revenue":22000000},{"year":2046,"capex":0,"opex":3000000,"revenue":22000000},{"year":2047,"capex":0,"opex":3000000,"revenue":22000000},{"year":2048,"capex":0,"opex":3000000,"revenue":22000000},{"year":2049,"capex":0,"opex":3000000,"revenue":22000000},{"year":2050,"capex":0,"opex":3000000,"revenue":22000000},{"year":2051,"capex":0,"opex":3000000,"revenue":22000000},{"year":2052,"capex":0,"opex":3000000,"revenue":22000000}]'::jsonb,
  'category_a', 'category_a',
  'FIRR of 14% exceeds the 10% commercial viability threshold. The project is commercially attractive for private sector investment without requiring state financial support. The consortium has demonstrated technical capability and committed equity.',
  -- FS-1 conductor
  'company', 'Myanmar Infrastructure Consulting Group', '123 Pyay Road, Kamayut Township, Yangon',
  '+95-1-512-345', 'info@micg.com.mm', 'https://micg.com.mm',
  'Dr Aung Myint',
  -- Technical
  '1,200 km fibre-optic backbone from Mandalay to Kengtung via Lashio and Taunggyi, with 15 repeater stations and 8 metro access nodes.',
  'DWDM (Dense Wavelength Division Multiplexing) over single-mode fibre. 100 Gbps initial capacity upgradable to 400 Gbps. Underground duct installation along existing road corridors.',
  'Difficult terrain in eastern Shan State with landslide risk. Some segments cross conflict-affected areas requiring security coordination. Maintenance access during monsoon is limited.',
  'preliminary', true,
  -- Environmental / social
  'low', 'low',
  true, false, 0,
  -- Revenue
  true, '{"Lease income","Service charges"}',
  'Eastern Shan State has <10% broadband penetration. 4 mobile network operators committed to lease capacity. Government e-services require backbone connectivity for 28 township offices.',
  500000, 22000000, 3,
  -- Periods
  2, 25, 27,
  -- MSDP
  'Goal 3: Job Creation & Private Sector-Led Growth',
  'Directly supports MSDP Strategy 3.4 on improving transport and ICT connectivity to reduce cost of doing business, create employment opportunities, and support regional economic integration across Myanmar.',
  'National Transport Master Plan 2025–2040', true
);

-- ── 9. Rakhine Coastal Highway PPP  (fs3_in_progress, FIRR 5%, EIRR 16%, Cat C, VGF) ──
INSERT INTO project_bank_projects (
  project_code, name, description, objectives, target_beneficiaries,
  nominating_ministry, implementing_agency, sector, sub_sector, region,
  estimated_cost, currency, ndp_aligned, sdg_goals, status, origin,
  project_stage, feasibility_stage, project_type,
  estimated_start_date, estimated_duration_months,
  contact_officer, contact_email, contact_phone,
  contact_position, contact_ministry, contact_department,
  nominated_at, screened_at,
  firr, firr_date, eirr, eirr_date, firr_cost_table_data,
  category_recommendation, category_decision, category_rationale,
  ppp_support_mechanism, vgf_amount, vgf_calculation_data, vgf_status,
  -- FS-1 conductor
  fs_conductor_type, fs_conductor_company_name, fs_conductor_company_address,
  fs_conductor_company_phone, fs_conductor_company_email, fs_conductor_company_website,
  fs_conductor_contact_person,
  -- Technical
  technical_approach, technology_methodology, technical_risks,
  technical_design_maturity, has_technical_design,
  -- Environmental / social
  environmental_impact_level, social_impact_level,
  land_acquisition_required, resettlement_required, estimated_affected_households,
  -- Revenue
  has_revenue_component, revenue_sources, market_assessment_summary,
  projected_annual_users, projected_annual_revenue, revenue_ramp_up_years,
  -- Periods
  construction_period_years, operational_period_years, project_life_years,
  -- MSDP
  msdp_strategy_area, alignment_justification, sector_strategy_reference, in_sector_investment_plan
) VALUES (
  '', 'Rakhine Coastal Highway PPP',
  'Construction of a 280 km two-lane coastal highway from Sittwe to Gwa in Rakhine State under a PPP concession, including 12 bridges, 3 tunnels, and toll collection infrastructure.',
  'Provide direct road connectivity along the Rakhine coast, reduce Sittwe–Gwa travel time from 14 h to 4 h, stimulate coastal economic development, and improve disaster evacuation routes.',
  '1.5 million residents along the Rakhine coast; fishing communities, tourism operators, and agricultural producers in 6 townships.',
  'Ministry of Construction', 'Department of Highways',
  'Transport', 'Roads & Highways', 'Rakhine',
  420000000, 'USD', true, '{"9","11"}', 'screening', 'GOV',
  'fs3_in_progress', 'fs3_in_progress', 'Infrastructure',
  '2027-01-01', 36,
  'U Kyaw Win', 'kyawwin@mopfi.gov.mm', '+95-67-407-234',
  'Director', 'Ministry of Planning and Finance', 'Project Appraisal Division',
  now() - interval '300 days', now() - interval '280 days',
  5, now() - interval '120 days', 16, now() - interval '110 days',
  -- 34 years, capex 35000000 for 4yr, opex 6000000, revenue 24000000, ramp 4yr
  '[{"year":2026,"capex":35000000,"opex":600000,"revenue":0},{"year":2027,"capex":35000000,"opex":600000,"revenue":0},{"year":2028,"capex":35000000,"opex":600000,"revenue":0},{"year":2029,"capex":35000000,"opex":600000,"revenue":0},{"year":2030,"capex":0,"opex":6000000,"revenue":4800000},{"year":2031,"capex":0,"opex":6000000,"revenue":9600000},{"year":2032,"capex":0,"opex":6000000,"revenue":14400000},{"year":2033,"capex":0,"opex":6000000,"revenue":19200000},{"year":2034,"capex":0,"opex":6000000,"revenue":24000000},{"year":2035,"capex":0,"opex":6000000,"revenue":24000000},{"year":2036,"capex":0,"opex":6000000,"revenue":24000000},{"year":2037,"capex":0,"opex":6000000,"revenue":24000000},{"year":2038,"capex":0,"opex":6000000,"revenue":24000000},{"year":2039,"capex":0,"opex":6000000,"revenue":24000000},{"year":2040,"capex":0,"opex":6000000,"revenue":24000000},{"year":2041,"capex":0,"opex":6000000,"revenue":24000000},{"year":2042,"capex":0,"opex":6000000,"revenue":24000000},{"year":2043,"capex":0,"opex":6000000,"revenue":24000000},{"year":2044,"capex":0,"opex":6000000,"revenue":24000000},{"year":2045,"capex":0,"opex":6000000,"revenue":24000000},{"year":2046,"capex":0,"opex":6000000,"revenue":24000000},{"year":2047,"capex":0,"opex":6000000,"revenue":24000000},{"year":2048,"capex":0,"opex":6000000,"revenue":24000000},{"year":2049,"capex":0,"opex":6000000,"revenue":24000000},{"year":2050,"capex":0,"opex":6000000,"revenue":24000000},{"year":2051,"capex":0,"opex":6000000,"revenue":24000000},{"year":2052,"capex":0,"opex":6000000,"revenue":24000000},{"year":2053,"capex":0,"opex":6000000,"revenue":24000000},{"year":2054,"capex":0,"opex":6000000,"revenue":24000000},{"year":2055,"capex":0,"opex":6000000,"revenue":24000000},{"year":2056,"capex":0,"opex":6000000,"revenue":24000000},{"year":2057,"capex":0,"opex":6000000,"revenue":24000000},{"year":2058,"capex":0,"opex":6000000,"revenue":24000000},{"year":2059,"capex":0,"opex":6000000,"revenue":24000000}]'::jsonb,
  'category_c', 'category_c',
  'FIRR of 5% is below the 10% commercial threshold but EIRR of 16% exceeds the 15% economic viability benchmark. The project qualifies for PPP support mechanisms to bridge the viability gap and attract private participation.',
  'vgf', 168000000,
  '{"method":"capital_grant","vgf_pct_of_capex":40,"total_capex":420000000,"equity_contribution":84000000,"debt_contribution":168000000,"vgf_contribution":168000000,"target_equity_irr":12,"concession_period_years":30}'::jsonb,
  'calculated',
  -- FS-1 conductor
  'company', 'Myanmar Infrastructure Consulting Group', '123 Pyay Road, Kamayut Township, Yangon',
  '+95-1-512-345', 'info@micg.com.mm', 'https://micg.com.mm',
  'Dr Aung Myint',
  -- Technical
  '280 km two-lane coastal highway from Sittwe to Gwa with 12 bridges, 3 tunnels, and 6 township bypasses. Design speed 80 km/h with climate-resilient embankments.',
  'Asphalt concrete pavement on reinforced earth embankments. Bridge superstructures: pre-stressed concrete I-girders. Tunnels: NATM (New Austrian Tunnelling Method). Slope stabilisation with soil nailing and shotcrete.',
  'Coastal erosion and cyclone risk require raised embankments and armoured shoulders. Three river crossings have scour-prone alluvial foundations. Tunnel sections through weathered sandstone may encounter groundwater ingress.',
  'preliminary', true,
  -- Environmental / social
  'significant', 'significant',
  true, true, 450,
  -- Revenue
  true, '{"Toll fees","Lease income"}',
  'No direct road link currently exists along the Rakhine coast — travel requires a 14-hour detour via Magway. Traffic demand study estimates 8,000 vehicles/day by Year 5 of operation. Toll willingness-to-pay validated at MMK 3,000 per car and MMK 8,000 per truck.',
  2920000, 24000000, 3,
  -- Periods
  4, 30, 34,
  -- MSDP
  'Goal 3: Job Creation & Private Sector-Led Growth',
  'Directly supports MSDP Strategy 3.4 on improving transport and ICT connectivity to reduce cost of doing business, create employment opportunities, and support regional economic integration across Myanmar.',
  'National Transport Master Plan 2025–2040', true
);

-- ── 10. Kayah Eco-Tourism Resort  (intake_rejected) ────────────────────
INSERT INTO project_bank_projects (
  project_code, name, description, objectives, target_beneficiaries,
  nominating_ministry, implementing_agency, sector, sub_sector, region,
  estimated_cost, currency, ndp_aligned, sdg_goals, status, origin,
  project_stage, project_type,
  estimated_start_date, estimated_duration_months,
  contact_officer, contact_email, contact_phone,
  contact_position, contact_ministry, contact_department,
  proponent_name, proponent_company, proponent_contact,
  rejection_reason, rejected_at, nominated_at
) VALUES (
  '', 'Kayah Eco-Tourism Resort',
  'Development of a 50-room eco-lodge and adventure tourism complex near Loikaw, Kayah State, featuring cultural heritage experiences, kayaking, and trekking, with community revenue-sharing model.',
  'Attract 20,000 international tourists per year, generate USD 3 M annual tourism revenue, create 200 permanent jobs, and fund community development through 10% revenue share.',
  '5,000 residents in 12 villages around Loikaw who will benefit from tourism employment and community revenue sharing; 200 direct employees.',
  'Ministry of Hotels and Tourism', 'Directorate of Hotels and Tourism',
  'Tourism', 'Eco-Tourism', 'Kayah',
  8000000, 'USD', true, '{"9","11"}', 'screening', 'UNSOL',
  'intake_rejected', 'Infrastructure',
  '2027-01-01', 36,
  'U Kyaw Win', 'kyawwin@mopfi.gov.mm', '+95-67-407-234',
  'Director', 'Ministry of Planning and Finance', 'Project Appraisal Division',
  'Kayah Heritage Tourism Group', 'Green Lotus Hospitality Ltd', 'U Sai Kyaw Zin, Director — +95-83-221-456',
  'The proposed site overlaps with a protected cultural heritage zone under the Ministry of Religious Affairs. Environmental screening indicates high biodiversity sensitivity. The proponent has not demonstrated adequate experience in eco-tourism development. Recommend resubmission after obtaining heritage clearance and partnering with an experienced operator.',
  now() - interval '20 days',
  now() - interval '45 days'
);


-- ==========================================================================
-- RELATED RECORDS
-- Uses name lookups to find project IDs from the inserts above.
-- ==========================================================================

-- ── Intake reviews (projects #4–9 passed intake) ───────────────────────

-- #4 Bago Water Treatment Plant
INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'desk', 'screened',
  'All intake fields complete. Sector alignment confirmed. Forwarding to senior review.',
  now() - interval '44 days'
FROM project_bank_projects WHERE name = 'Bago Water Treatment Plant' ORDER BY created_at DESC LIMIT 1;

INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'senior', 'approved',
  'Project meets all intake criteria. Approved for Preliminary Feasibility Study phase.',
  now() - interval '43 days'
FROM project_bank_projects WHERE name = 'Bago Water Treatment Plant' ORDER BY created_at DESC LIMIT 1;

-- #5 Mandalay Industrial Zone Expansion
INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'desk', 'screened',
  'All intake fields complete. Sector alignment confirmed. Forwarding to senior review.',
  now() - interval '74 days'
FROM project_bank_projects WHERE name = 'Mandalay Industrial Zone Expansion' ORDER BY created_at DESC LIMIT 1;

INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'senior', 'approved',
  'Project meets all intake criteria. Approved for Preliminary Feasibility Study phase.',
  now() - interval '73 days'
FROM project_bank_projects WHERE name = 'Mandalay Industrial Zone Expansion' ORDER BY created_at DESC LIMIT 1;

-- #6 Chin State Rural Health Clinics
INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'desk', 'screened',
  'All intake fields complete. Sector alignment confirmed. Forwarding to senior review.',
  now() - interval '64 days'
FROM project_bank_projects WHERE name = 'Chin State Rural Health Clinics' ORDER BY created_at DESC LIMIT 1;

INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'senior', 'approved',
  'Project meets all intake criteria. Approved for Preliminary Feasibility Study phase.',
  now() - interval '63 days'
FROM project_bank_projects WHERE name = 'Chin State Rural Health Clinics' ORDER BY created_at DESC LIMIT 1;

-- #7 Ayeyarwady River Port Modernisation
INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'desk', 'screened',
  'All intake fields complete. Sector alignment confirmed. Forwarding to senior review.',
  now() - interval '158 days'
FROM project_bank_projects WHERE name = 'Ayeyarwady River Port Modernisation' ORDER BY created_at DESC LIMIT 1;

INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'senior', 'approved',
  'Project meets all intake criteria. Approved for Preliminary Feasibility Study phase.',
  now() - interval '156 days'
FROM project_bank_projects WHERE name = 'Ayeyarwady River Port Modernisation' ORDER BY created_at DESC LIMIT 1;

-- #8 Shan State Telecom Backbone
INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'desk', 'screened',
  'All intake fields complete. Sector alignment confirmed. Forwarding to senior review.',
  now() - interval '218 days'
FROM project_bank_projects WHERE name = 'Shan State Telecom Backbone' ORDER BY created_at DESC LIMIT 1;

INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'senior', 'approved',
  'Project meets all intake criteria. Approved for Preliminary Feasibility Study phase.',
  now() - interval '216 days'
FROM project_bank_projects WHERE name = 'Shan State Telecom Backbone' ORDER BY created_at DESC LIMIT 1;

-- #9 Rakhine Coastal Highway PPP
INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'desk', 'screened',
  'All intake fields complete. Sector alignment confirmed. Forwarding to senior review.',
  now() - interval '278 days'
FROM project_bank_projects WHERE name = 'Rakhine Coastal Highway PPP' ORDER BY created_at DESC LIMIT 1;

INSERT INTO intake_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'senior', 'approved',
  'Project meets all intake criteria. Approved for Preliminary Feasibility Study phase.',
  now() - interval '276 days'
FROM project_bank_projects WHERE name = 'Rakhine Coastal Highway PPP' ORDER BY created_at DESC LIMIT 1;


-- ── FS-1 Narratives (projects #7–9 passed FS-1) ────────────────────────

-- #7 Ayeyarwady River Port Modernisation
INSERT INTO fs1_narratives (project_id, problem_statement, target_beneficiaries, ndp_alignment_justification, expected_outcomes, preliminary_cost_justification, submitted_by, version)
SELECT id,
  'Ayeyarwady River Port Modernisation addresses a critical infrastructure gap that constrains economic growth and service delivery in the target region. Current facilities are inadequate, outdated, or non-existent, resulting in significant economic losses estimated at USD 50 M annually through inefficiency, lost productivity, and foregone investment. Without intervention, the gap will widen as population and economic activity continue to grow at 3–5% per annum. The project directly responds to government priority investment areas identified in the National Comprehensive Development Plan.',
  'Direct beneficiaries include an estimated 500,000 residents in the project influence area who will gain improved access to essential services and economic opportunities. Indirect beneficiaries extend to 2 million people in the broader region through multiplier effects on trade, employment, and service delivery. Special focus groups include women-headed households (28% of the area), youth seeking employment, and SMEs requiring improved infrastructure connectivity.',
  'The project aligns with MSDP Goal 3 (Job Creation and Private Sector-Led Growth) and Strategy 3.4 (Improving transport, energy, and ICT connectivity). It also contributes to Goal 1 (Peace and Stability) by promoting economic opportunity in underserved areas, and Goal 5 (Natural Resources and Environment) through environmentally sound design. The project is listed in the National Sectoral Investment Plan 2025–2030 as a priority intervention.',
  'Primary outcomes: (1) 60% improvement in service access and quality metrics within 3 years of completion; (2) 15,000 direct jobs during construction and 5,000 permanent operational jobs; (3) 25% reduction in unit costs for end-users. Secondary outcomes: (4) increased private investment attracted to the corridor (target: USD 200 M in 5 years); (5) improved government revenue from user charges and economic activity (estimated USD 10 M/year); (6) demonstration effect for replication in other regions.',
  'Cost estimates are based on a detailed quantity survey at preliminary design level, benchmarked against comparable projects in the region (Vietnam, Cambodia, Bangladesh) with Myanmar-specific adjustments for labour rates (+15%) and logistics costs (+20%) in target locations. A 15% physical contingency and 8% price contingency are included. Independent cost review by the World Bank project preparation facility confirmed estimates within ±10% tolerance. The cost-benefit ratio at preliminary stage is estimated at 1.8, indicating strong value for money. Lifecycle cost analysis over 30 years shows net present benefit of USD 120 M at a 10% discount rate.',
  null, 1
FROM project_bank_projects WHERE name = 'Ayeyarwady River Port Modernisation' ORDER BY created_at DESC LIMIT 1;

-- #8 Shan State Telecom Backbone
INSERT INTO fs1_narratives (project_id, problem_statement, target_beneficiaries, ndp_alignment_justification, expected_outcomes, preliminary_cost_justification, submitted_by, version)
SELECT id,
  'Shan State Telecom Backbone addresses a critical infrastructure gap that constrains economic growth and service delivery in the target region. Current facilities are inadequate, outdated, or non-existent, resulting in significant economic losses estimated at USD 50 M annually through inefficiency, lost productivity, and foregone investment. Without intervention, the gap will widen as population and economic activity continue to grow at 3–5% per annum. The project directly responds to government priority investment areas identified in the National Comprehensive Development Plan.',
  'Direct beneficiaries include an estimated 500,000 residents in the project influence area who will gain improved access to essential services and economic opportunities. Indirect beneficiaries extend to 2 million people in the broader region through multiplier effects on trade, employment, and service delivery. Special focus groups include women-headed households (28% of the area), youth seeking employment, and SMEs requiring improved infrastructure connectivity.',
  'The project aligns with MSDP Goal 3 (Job Creation and Private Sector-Led Growth) and Strategy 3.4 (Improving transport, energy, and ICT connectivity). It also contributes to Goal 1 (Peace and Stability) by promoting economic opportunity in underserved areas, and Goal 5 (Natural Resources and Environment) through environmentally sound design. The project is listed in the National Sectoral Investment Plan 2025–2030 as a priority intervention.',
  'Primary outcomes: (1) 60% improvement in service access and quality metrics within 3 years of completion; (2) 15,000 direct jobs during construction and 5,000 permanent operational jobs; (3) 25% reduction in unit costs for end-users. Secondary outcomes: (4) increased private investment attracted to the corridor (target: USD 200 M in 5 years); (5) improved government revenue from user charges and economic activity (estimated USD 10 M/year); (6) demonstration effect for replication in other regions.',
  'Cost estimates are based on a detailed quantity survey at preliminary design level, benchmarked against comparable projects in the region (Vietnam, Cambodia, Bangladesh) with Myanmar-specific adjustments for labour rates (+15%) and logistics costs (+20%) in target locations. A 15% physical contingency and 8% price contingency are included. Independent cost review by the World Bank project preparation facility confirmed estimates within ±10% tolerance. The cost-benefit ratio at preliminary stage is estimated at 1.8, indicating strong value for money. Lifecycle cost analysis over 30 years shows net present benefit of USD 120 M at a 10% discount rate.',
  null, 1
FROM project_bank_projects WHERE name = 'Shan State Telecom Backbone' ORDER BY created_at DESC LIMIT 1;

-- #9 Rakhine Coastal Highway PPP
INSERT INTO fs1_narratives (project_id, problem_statement, target_beneficiaries, ndp_alignment_justification, expected_outcomes, preliminary_cost_justification, submitted_by, version)
SELECT id,
  'Rakhine Coastal Highway PPP addresses a critical infrastructure gap that constrains economic growth and service delivery in the target region. Current facilities are inadequate, outdated, or non-existent, resulting in significant economic losses estimated at USD 50 M annually through inefficiency, lost productivity, and foregone investment. Without intervention, the gap will widen as population and economic activity continue to grow at 3–5% per annum. The project directly responds to government priority investment areas identified in the National Comprehensive Development Plan.',
  'Direct beneficiaries include an estimated 500,000 residents in the project influence area who will gain improved access to essential services and economic opportunities. Indirect beneficiaries extend to 2 million people in the broader region through multiplier effects on trade, employment, and service delivery. Special focus groups include women-headed households (28% of the area), youth seeking employment, and SMEs requiring improved infrastructure connectivity.',
  'The project aligns with MSDP Goal 3 (Job Creation and Private Sector-Led Growth) and Strategy 3.4 (Improving transport, energy, and ICT connectivity). It also contributes to Goal 1 (Peace and Stability) by promoting economic opportunity in underserved areas, and Goal 5 (Natural Resources and Environment) through environmentally sound design. The project is listed in the National Sectoral Investment Plan 2025–2030 as a priority intervention.',
  'Primary outcomes: (1) 60% improvement in service access and quality metrics within 3 years of completion; (2) 15,000 direct jobs during construction and 5,000 permanent operational jobs; (3) 25% reduction in unit costs for end-users. Secondary outcomes: (4) increased private investment attracted to the corridor (target: USD 200 M in 5 years); (5) improved government revenue from user charges and economic activity (estimated USD 10 M/year); (6) demonstration effect for replication in other regions.',
  'Cost estimates are based on a detailed quantity survey at preliminary design level, benchmarked against comparable projects in the region (Vietnam, Cambodia, Bangladesh) with Myanmar-specific adjustments for labour rates (+15%) and logistics costs (+20%) in target locations. A 15% physical contingency and 8% price contingency are included. Independent cost review by the World Bank project preparation facility confirmed estimates within ±10% tolerance. The cost-benefit ratio at preliminary stage is estimated at 1.8, indicating strong value for money. Lifecycle cost analysis over 30 years shows net present benefit of USD 120 M at a 10% discount rate.',
  null, 1
FROM project_bank_projects WHERE name = 'Rakhine Coastal Highway PPP' ORDER BY created_at DESC LIMIT 1;


-- ── FS-1 Reviews (projects #7–9) ───────────────────────────────────────

-- #7 Ayeyarwady — desk
INSERT INTO fs1_reviews (project_id, narrative_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT p.id, n.id, null, 'desk', 'screened',
  'FS-1 technical analysis is thorough. FIRR calculation verified against cost table. Environmental screening adequate. Forwarding to senior review panel.',
  now() - interval '140 days'
FROM project_bank_projects p
JOIN fs1_narratives n ON n.project_id = p.id
WHERE p.name = 'Ayeyarwady River Port Modernisation'
ORDER BY p.created_at DESC LIMIT 1;

-- #7 Ayeyarwady — senior
INSERT INTO fs1_reviews (project_id, narrative_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT p.id, n.id, null, 'senior', 'passed',
  'Senior panel approves passage to FS-2. The preliminary feasibility analysis demonstrates sufficient rigour. Recommend detailed study focus on risk allocation and financing structure.',
  now() - interval '135 days'
FROM project_bank_projects p
JOIN fs1_narratives n ON n.project_id = p.id
WHERE p.name = 'Ayeyarwady River Port Modernisation'
ORDER BY p.created_at DESC LIMIT 1;

-- #8 Shan Telecom — desk
INSERT INTO fs1_reviews (project_id, narrative_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT p.id, n.id, null, 'desk', 'screened',
  'FS-1 technical analysis is thorough. FIRR calculation verified against cost table. Environmental screening adequate. Forwarding to senior review panel.',
  now() - interval '200 days'
FROM project_bank_projects p
JOIN fs1_narratives n ON n.project_id = p.id
WHERE p.name = 'Shan State Telecom Backbone'
ORDER BY p.created_at DESC LIMIT 1;

-- #8 Shan Telecom — senior
INSERT INTO fs1_reviews (project_id, narrative_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT p.id, n.id, null, 'senior', 'passed',
  'Senior panel approves passage to FS-2. The preliminary feasibility analysis demonstrates sufficient rigour. Recommend detailed study focus on risk allocation and financing structure.',
  now() - interval '195 days'
FROM project_bank_projects p
JOIN fs1_narratives n ON n.project_id = p.id
WHERE p.name = 'Shan State Telecom Backbone'
ORDER BY p.created_at DESC LIMIT 1;

-- #9 Rakhine Highway — desk
INSERT INTO fs1_reviews (project_id, narrative_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT p.id, n.id, null, 'desk', 'screened',
  'FS-1 technical analysis is thorough. FIRR calculation verified against cost table. Environmental screening adequate. Forwarding to senior review panel.',
  now() - interval '260 days'
FROM project_bank_projects p
JOIN fs1_narratives n ON n.project_id = p.id
WHERE p.name = 'Rakhine Coastal Highway PPP'
ORDER BY p.created_at DESC LIMIT 1;

-- #9 Rakhine Highway — senior
INSERT INTO fs1_reviews (project_id, narrative_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT p.id, n.id, null, 'senior', 'passed',
  'Senior panel approves passage to FS-2. The preliminary feasibility analysis demonstrates sufficient rigour. Recommend detailed study focus on risk allocation and financing structure.',
  now() - interval '255 days'
FROM project_bank_projects p
JOIN fs1_narratives n ON n.project_id = p.id
WHERE p.name = 'Rakhine Coastal Highway PPP'
ORDER BY p.created_at DESC LIMIT 1;


-- ── FS-2 Assignments (projects #7–9) ───────────────────────────────────

-- #7 Ayeyarwady
INSERT INTO fs2_assignments (project_id, assigned_to, assigned_at, deadline, status, notes)
SELECT id, 'KPMG Myanmar Advisory',
  now() - interval '30 days',
  (now() + interval '90 days')::date,
  'assigned',
  'Detailed feasibility study assigned to KPMG Myanmar Advisory. Deliverables: full FS report, cost-benefit analysis, risk assessment, and financing recommendations within 90 days.'
FROM project_bank_projects WHERE name = 'Ayeyarwady River Port Modernisation' ORDER BY created_at DESC LIMIT 1;

-- #8 Shan Telecom
INSERT INTO fs2_assignments (project_id, assigned_to, assigned_at, deadline, status, notes)
SELECT id, 'Deloitte Southeast Asia',
  now() - interval '60 days',
  (now() + interval '90 days')::date,
  'assigned',
  'Detailed feasibility study assigned to Deloitte Southeast Asia. Deliverables: full FS report, cost-benefit analysis, risk assessment, and financing recommendations within 90 days.'
FROM project_bank_projects WHERE name = 'Shan State Telecom Backbone' ORDER BY created_at DESC LIMIT 1;

-- #9 Rakhine Highway
INSERT INTO fs2_assignments (project_id, assigned_to, assigned_at, deadline, status, notes)
SELECT id, 'PwC Myanmar Infrastructure Advisory',
  now() - interval '120 days',
  (now() + interval '90 days')::date,
  'assigned',
  'Detailed feasibility study assigned to PwC Myanmar Infrastructure Advisory. Deliverables: full FS report, cost-benefit analysis, risk assessment, and financing recommendations within 90 days.'
FROM project_bank_projects WHERE name = 'Rakhine Coastal Highway PPP' ORDER BY created_at DESC LIMIT 1;


-- ── FS-2 Reviews (projects #8–9 passed FS-2) ──────────────────────────

-- #8 Shan Telecom — desk
INSERT INTO fs2_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'desk', 'screened',
  'Detailed feasibility study report is comprehensive. Financial model validated. Environmental and social impact assessments meet requirements. Ready for senior review.',
  now() - interval '45 days'
FROM project_bank_projects WHERE name = 'Shan State Telecom Backbone' ORDER BY created_at DESC LIMIT 1;

-- #8 Shan Telecom — senior
INSERT INTO fs2_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'senior', 'passed',
  'Senior review panel approves the detailed feasibility study. Category recommendation accepted. Project may proceed to categorisation and, if applicable, PPP structuring phase.',
  now() - interval '40 days'
FROM project_bank_projects WHERE name = 'Shan State Telecom Backbone' ORDER BY created_at DESC LIMIT 1;

-- #9 Rakhine Highway — desk
INSERT INTO fs2_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'desk', 'screened',
  'Detailed feasibility study report is comprehensive. Financial model validated. Environmental and social impact assessments meet requirements. Ready for senior review.',
  now() - interval '100 days'
FROM project_bank_projects WHERE name = 'Rakhine Coastal Highway PPP' ORDER BY created_at DESC LIMIT 1;

-- #9 Rakhine Highway — senior
INSERT INTO fs2_reviews (project_id, reviewer_id, review_tier, decision, comments, reviewed_at)
SELECT id, null, 'senior', 'passed',
  'Senior review panel approves the detailed feasibility study. Category recommendation accepted. Project may proceed to categorisation and, if applicable, PPP structuring phase.',
  now() - interval '95 days'
FROM project_bank_projects WHERE name = 'Rakhine Coastal Highway PPP' ORDER BY created_at DESC LIMIT 1;

COMMIT;
