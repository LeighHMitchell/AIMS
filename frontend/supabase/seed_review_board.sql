-- Seed data: Projects in various FS-1 stages for the Review Board
-- Run with: psql or supabase db execute

-- 1. Two projects in 'fs1_submitted' (awaiting desk review)
INSERT INTO project_bank_projects (project_code, name, description, nominating_ministry, sector, region, estimated_cost, currency, ndp_aligned, status, feasibility_stage, origin, appraisal_stage)
VALUES
  ('', 'Mandalay–Myitkyina Highway Expansion', 'Four-lane expansion of the 600km national highway corridor connecting Mandalay to Kachin State capital', 'Ministry of Construction', 'Transport', 'Mandalay', 320000000, 'USD', true, 'nominated', 'fs1_submitted', 'government', 'intake'),
  ('', 'Yangon Circular Railway Modernization', 'Complete modernization of Yangon circular railway including electrification, new rolling stock, and station upgrades', 'Ministry of Transport and Communications', 'Transport', 'Yangon', 450000000, 'USD', true, 'nominated', 'fs1_submitted', 'government', 'intake'),
  ('', 'National Fiber Optic Backbone Phase III', 'Extension of fiber optic network to 120 additional townships in underserved areas', 'Ministry of Transport and Communications', 'ICT', 'Nationwide', 85000000, 'USD', true, 'nominated', 'fs1_submitted', 'government', 'intake');

-- 2. Two projects in 'fs1_desk_screened' (passed desk, awaiting senior review)
INSERT INTO project_bank_projects (project_code, name, description, nominating_ministry, sector, region, estimated_cost, currency, ndp_aligned, status, feasibility_stage, origin, appraisal_stage)
VALUES
  ('', 'Thilawa SEZ Water Treatment Plant', 'Industrial water treatment facility to serve Thilawa Special Economic Zone Phase 2 expansion', 'Ministry of Industry', 'Water Resources', 'Yangon', 42000000, 'USD', true, 'nominated', 'fs1_desk_screened', 'government', 'intake'),
  ('', 'Bagan Solar Farm (200MW)', '200MW utility-scale solar photovoltaic installation near Bagan with battery energy storage', 'Ministry of Electric Power', 'Energy', 'Mandalay', 180000000, 'USD', true, 'nominated', 'fs1_desk_screened', 'government', 'intake');

-- 3. Three decided projects (passed, returned, rejected)
INSERT INTO project_bank_projects (project_code, name, description, nominating_ministry, sector, region, estimated_cost, currency, ndp_aligned, status, feasibility_stage, origin, appraisal_stage)
VALUES
  ('', 'Hpa-An District Hospital Upgrade', 'Upgrade of 200-bed district hospital including new surgical wing and diagnostic equipment', 'Ministry of Health', 'Health', 'Kayin', 28000000, 'USD', true, 'nominated', 'fs1_passed', 'government', 'intake'),
  ('', 'Ayeyarwady Delta Flood Control', 'Integrated flood management system with embankments, pumping stations, and early warning', 'Ministry of Agriculture, Livestock and Irrigation', 'Water Resources', 'Ayeyarwady', 95000000, 'USD', true, 'nominated', 'fs1_returned', 'government', 'intake'),
  ('', 'Naypyitaw Convention Center', 'International convention and exhibition center with 5000-seat capacity', 'Ministry of Construction', 'Tourism', 'Naypyitaw', 120000000, 'USD', false, 'nominated', 'fs1_rejected', 'government', 'intake');

-- Set fs1_rejected_at for the rejected project (for cool-down display)
UPDATE project_bank_projects
SET fs1_rejected_at = NOW() - INTERVAL '2 months'
WHERE name = 'Naypyitaw Convention Center' AND feasibility_stage = 'fs1_rejected';

-- Insert FS-1 narratives for the submitted projects
INSERT INTO fs1_narratives (project_id, problem_statement, target_beneficiaries, ndp_alignment_justification, expected_outcomes, preliminary_cost_justification, version)
SELECT
  p.id,
  'The existing Mandalay–Myitkyina highway is a two-lane road built in the 1970s that carries over 8,000 vehicles per day, far exceeding its designed capacity of 3,000. Journey times exceed 16 hours with frequent accidents at blind curves and narrow bridges. The deteriorating road surface and lack of safety features have resulted in an average of 45 fatalities per year along this corridor. The economic cost of congestion and accidents is estimated at $50M annually.',
  'Primary beneficiaries include 4.2 million residents of Kachin State and northern Shan State who depend on this corridor for access to markets, healthcare, and education. Secondary beneficiaries include commercial trucking operators (estimated 1,200 registered firms), agricultural producers in the northern corridor, and tourism operators serving Myitkyina and surrounding areas. An estimated 800,000 people will benefit from reduced travel times.',
  'This project directly supports NDP Pillar 3: Job Creation and the Private Sector, by reducing logistics costs and improving market access. It also aligns with MSDP Goal 3 (Economic Growth) and the National Transport Master Plan 2030 target of upgrading all national highways to four-lane divided carriageway standard. The corridor is identified as a priority in the GMS Transport Strategy.',
  'Measurable outcomes include: (1) Reduction of average journey time from 16 hours to 8 hours; (2) 60% reduction in road fatalities along the corridor; (3) 30% reduction in vehicle operating costs; (4) 25% increase in freight volumes within 3 years of completion; (5) Creation of 15,000 construction jobs during the 5-year build period. The economic rate of return is preliminarily estimated at 18-22%.',
  'The estimated cost of $320M is based on the Ministry of Construction standard cost tables for four-lane highway construction in mountainous terrain ($2.1M/km for 152km), plus bridge replacements ($45M for 12 major bridges), road safety features ($18M), and project management and contingencies (15%). This is benchmarked against the recently completed Mandalay–Meiktila expressway which cost $1.8M/km in flatter terrain.',
  1
FROM project_bank_projects p
WHERE p.name = 'Mandalay–Myitkyina Highway Expansion' AND p.feasibility_stage = 'fs1_submitted'
LIMIT 1;

INSERT INTO fs1_narratives (project_id, problem_statement, target_beneficiaries, ndp_alignment_justification, expected_outcomes, preliminary_cost_justification, version)
SELECT
  p.id,
  'The Yangon Circular Railway, built in 1954, serves as the primary mass transit system for Greater Yangon (population 7.3 million). The system currently operates diesel locomotives at an average speed of 15 km/h with a daily ridership of only 80,000 — a fraction of its potential. Stations lack accessibility features, the signaling system is manual, and services are unreliable. Without modernization, Yangon faces worsening traffic congestion estimated to cost the economy $1.2B annually by 2030.',
  'Direct beneficiaries include 7.3 million Yangon residents, with particular impact on 2.5 million low-income commuters in satellite townships (Insein, Mingaladon, Dagon Myothit) who currently spend 3+ hours daily commuting. Women commuters (45% of riders) will benefit from improved safety and frequency. Local businesses along the 46km corridor will benefit from increased foot traffic at modernized station precincts.',
  'The project aligns with NDP Pillar 1 (Peace and Stability) by providing affordable transport, and Pillar 3 (Private Sector Development) by improving labor market connectivity. It directly supports the Yangon Urban Transport Master Plan and MSDP Strategy 5 (Infrastructure Development). The project is listed in the National Comprehensive Development Plan as a Priority 1 investment.',
  'Key outcomes: (1) Increase daily ridership from 80,000 to 500,000 within 2 years of completion; (2) Reduce average commute time for corridor users by 60%; (3) Reduce CO2 emissions by 120,000 tonnes annually through modal shift; (4) Average operating speed increase from 15 km/h to 45 km/h; (5) 100% accessibility compliance at all 39 stations; (6) Generate 8,000 permanent jobs in rail operations and station services.',
  'The $450M estimate comprises: electrification and signaling ($180M benchmarked against Jakarta LRT costs), 20 new EMU trainsets ($120M at $6M per set from Chinese/Japanese manufacturers), station modernization for all 39 stations ($90M), track rehabilitation ($35M), and project management/contingencies ($25M). JICA pre-feasibility study (2023) estimated $420-480M, placing our estimate in the mid-range.',
  1
FROM project_bank_projects p
WHERE p.name = 'Yangon Circular Railway Modernization' AND p.feasibility_stage = 'fs1_submitted'
LIMIT 1;

INSERT INTO fs1_narratives (project_id, problem_statement, target_beneficiaries, ndp_alignment_justification, expected_outcomes, preliminary_cost_justification, version)
SELECT
  p.id,
  'Myanmar currently has fiber optic coverage in only 190 of 330 townships, leaving 140 townships (42%) with no high-speed internet access. These underserved townships rely on expensive and unreliable satellite or microwave links, with typical broadband speeds below 2 Mbps. The digital divide is widening: Yangon has average speeds of 50 Mbps while rural townships average 1.5 Mbps. This limits access to digital government services, telemedicine, and e-commerce opportunities in areas that need them most.',
  'The project targets 8.5 million people in 120 underserved townships across Chin, Kayah, Shan, and Sagaing regions. Priority beneficiaries include: 2,400 rural health centers that could offer telemedicine, 5,800 schools that could access digital education platforms, 45,000 SMEs that could participate in e-commerce, and 120 government township offices requiring connectivity for e-governance services. Women entrepreneurs in rural areas (estimated 18,000 registered businesses) stand to benefit significantly.',
  'This project directly supports NDP Pillar 2 (Economic Stability) and MSDP Strategy Area 5 (Infrastructure for Digital Economy). It is identified as a priority under the Myanmar Digital Economy Development Committee roadmap and aligns with SDG 9 (Industry, Innovation, and Infrastructure). The Universal Service Fund mandate requires coverage of all townships by 2028, making this project a regulatory compliance priority.',
  'Target outcomes: (1) Broadband access extended to 120 additional townships; (2) Average speeds in connected townships increase from <2 Mbps to 100+ Mbps; (3) 50% of rural health centers connected to telemedicine within 1 year of completion; (4) 30% increase in e-commerce transactions in connected townships within 2 years; (5) Government e-services available in all 330 townships; (6) Creation of 3,000 construction jobs and 500 permanent technical maintenance positions.',
  'Cost breakdown: 8,500 km of fiber optic cable ($55M at $6,500/km for aerial deployment, benchmarked against Phase II actuals), 120 township access nodes ($12M), last-mile distribution ($8M), network operations center upgrade ($3M), project management and contingencies ($7M). Phase II covered 90 townships at $62M, making Phase III per-township cost 8% lower due to economies of scale and established contractor relationships.',
  1
FROM project_bank_projects p
WHERE p.name = 'National Fiber Optic Backbone Phase III' AND p.feasibility_stage = 'fs1_submitted'
LIMIT 1;
