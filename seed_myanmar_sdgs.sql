-- Seed SDG mappings for Myanmar activities
-- First, add any missing SDG targets needed for our activities

-- Goal 2 targets (Zero Hunger)
INSERT INTO sdg_targets (id, goal_number, target_text, target_description) VALUES
('2.1', 2, 'End hunger', 'By 2030, end hunger and ensure access by all people, in particular the poor and people in vulnerable situations, including infants, to safe, nutritious and sufficient food all year round'),
('2.3', 2, 'Double agricultural productivity', 'By 2030, double the agricultural productivity and incomes of small-scale food producers'),
('2.4', 2, 'Sustainable food production', 'By 2030, ensure sustainable food production systems and implement resilient agricultural practices')
ON CONFLICT (id) DO NOTHING;

-- Goal 3 targets (Good Health and Well-being)
INSERT INTO sdg_targets (id, goal_number, target_text, target_description) VALUES
('3.1', 3, 'Reduce maternal mortality', 'By 2030, reduce the global maternal mortality ratio to less than 70 per 100,000 live births'),
('3.2', 3, 'End preventable child deaths', 'By 2030, end preventable deaths of newborns and children under 5 years of age'),
('3.8', 3, 'Universal health coverage', 'Achieve universal health coverage, including financial risk protection, access to quality essential health-care services and access to safe, effective, quality and affordable essential medicines and vaccines for all')
ON CONFLICT (id) DO NOTHING;

-- Goal 4 targets (Quality Education)
INSERT INTO sdg_targets (id, goal_number, target_text, target_description) VALUES
('4.1', 4, 'Free primary and secondary education', 'By 2030, ensure that all girls and boys complete free, equitable and quality primary and secondary education leading to relevant and effective learning outcomes'),
('4.2', 4, 'Early childhood development', 'By 2030, ensure that all girls and boys have access to quality early childhood development, care and pre-primary education'),
('4.a', 4, 'Build inclusive learning facilities', 'Build and upgrade education facilities that are child, disability and gender sensitive and provide safe, non-violent, inclusive and effective learning environments for all')
ON CONFLICT (id) DO NOTHING;

-- Goal 6 targets (Clean Water and Sanitation)
INSERT INTO sdg_targets (id, goal_number, target_text, target_description) VALUES
('6.1', 6, 'Safe drinking water', 'By 2030, achieve universal and equitable access to safe and affordable drinking water for all'),
('6.2', 6, 'Adequate sanitation and hygiene', 'By 2030, achieve access to adequate and equitable sanitation and hygiene for all and end open defecation'),
('6.b', 6, 'Community participation', 'Support and strengthen the participation of local communities in improving water and sanitation management')
ON CONFLICT (id) DO NOTHING;

-- Goal 8 targets (Decent Work and Economic Growth)
INSERT INTO sdg_targets (id, goal_number, target_text, target_description) VALUES
('8.3', 8, 'Promote development-oriented policies', 'Promote development-oriented policies that support productive activities, decent job creation, entrepreneurship, creativity and innovation'),
('8.5', 8, 'Full employment and decent work', 'By 2030, achieve full and productive employment and decent work for all women and men, including for young people and persons with disabilities')
ON CONFLICT (id) DO NOTHING;

-- Goal 9 targets (Industry, Innovation and Infrastructure)
INSERT INTO sdg_targets (id, goal_number, target_text, target_description) VALUES
('9.1', 9, 'Develop quality infrastructure', 'Develop quality, reliable, sustainable and resilient infrastructure to support economic development and human well-being'),
('9.a', 9, 'Facilitate infrastructure development', 'Facilitate sustainable and resilient infrastructure development in developing countries')
ON CONFLICT (id) DO NOTHING;

-- Goal 11 targets (Sustainable Cities and Communities)
INSERT INTO sdg_targets (id, goal_number, target_text, target_description) VALUES
('11.1', 11, 'Safe and affordable housing', 'By 2030, ensure access for all to adequate, safe and affordable housing and basic services'),
('11.2', 11, 'Sustainable transport systems', 'By 2030, provide access to safe, affordable, accessible and sustainable transport systems for all')
ON CONFLICT (id) DO NOTHING;

-- Goal 15 targets (Life on Land)
INSERT INTO sdg_targets (id, goal_number, target_text, target_description) VALUES
('15.1', 15, 'Conserve terrestrial ecosystems', 'By 2020, ensure the conservation, restoration and sustainable use of terrestrial and inland freshwater ecosystems and their services'),
('15.2', 15, 'Sustainable forest management', 'By 2020, promote the implementation of sustainable management of all types of forests'),
('15.3', 15, 'Combat desertification', 'By 2030, combat desertification, restore degraded land and soil, including land affected by desertification, drought and floods')
ON CONFLICT (id) DO NOTHING;

-- Goal 16 targets (Peace, Justice and Strong Institutions)
INSERT INTO sdg_targets (id, goal_number, target_text, target_description) VALUES
('16.3', 16, 'Promote rule of law', 'Promote the rule of law at the national and international levels and ensure equal access to justice for all'),
('16.6', 16, 'Effective institutions', 'Develop effective, accountable and transparent institutions at all levels'),
('16.7', 16, 'Inclusive decision-making', 'Ensure responsive, inclusive, participatory and representative decision-making at all levels')
ON CONFLICT (id) DO NOTHING;

-- Now insert SDG mappings for the 10 Myanmar activities

-- Activity 1: RPSCTP - Rural Primary School Construction and Teacher Training Programme (Education)
-- SDG 4: Quality Education
INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
('a1000001-0001-4000-8000-000000000001', 4, '4.1', 60, 'Primary focus on free primary education completion'),
('a1000001-0001-4000-8000-000000000001', 4, '4.a', 40, 'Construction of inclusive school facilities');

-- Activity 2: MCHIP-AYR - Maternal and Child Health Improvement Programme (Health - Humanitarian)
-- SDG 3: Good Health and Well-being
INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
('a1000001-0001-4000-8000-000000000002', 3, '3.1', 50, 'Focus on reducing maternal mortality'),
('a1000001-0001-4000-8000-000000000002', 3, '3.2', 50, 'Focus on reducing child mortality under 5');

-- Activity 3: CSRVC - Climate-Smart Rice Value Chain Enhancement (Agriculture)
-- SDG 2: Zero Hunger
INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
('a1000001-0001-4000-8000-000000000003', 2, '2.3', 50, 'Doubling agricultural productivity for smallholder farmers'),
('a1000001-0001-4000-8000-000000000003', 2, '2.4', 30, 'Implementing climate-smart sustainable farming'),
('a1000001-0001-4000-8000-000000000003', 13, '13.1', 20, 'Building climate resilience in agricultural communities');

-- Activity 4: RWSSIP - Rural Water Supply and Sanitation Improvement Programme (WASH)
-- SDG 6: Clean Water and Sanitation
INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
('a1000001-0001-4000-8000-000000000004', 6, '6.1', 50, 'Providing safe drinking water access'),
('a1000001-0001-4000-8000-000000000004', 6, '6.2', 40, 'Improving sanitation and hygiene facilities'),
('a1000001-0001-4000-8000-000000000004', 6, '6.b', 10, 'Community participation in WASH management');

-- Activity 5: RRCMAP - Rural Roads Construction and Market Access Programme (Infrastructure)
-- SDG 9: Industry, Innovation and Infrastructure + SDG 11: Sustainable Cities
INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
('a1000001-0001-4000-8000-000000000005', 9, '9.1', 60, 'Developing quality rural road infrastructure'),
('a1000001-0001-4000-8000-000000000005', 11, '11.2', 25, 'Improving rural transport connectivity'),
('a1000001-0001-4000-8000-000000000005', 8, '8.3', 15, 'Supporting economic activities through market access');

-- Activity 6: EHADP-RKN - Emergency Humanitarian Assistance and Displacement Programme (Humanitarian)
-- SDG 1: No Poverty, SDG 2: Zero Hunger, SDG 3: Good Health
INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
('a1000001-0001-4000-8000-000000000006', 1, '1.5', 35, 'Building resilience of displaced populations'),
('a1000001-0001-4000-8000-000000000006', 2, '2.1', 35, 'Emergency food assistance to conflict-affected areas'),
('a1000001-0001-4000-8000-000000000006', 3, '3.8', 30, 'Emergency health services for displaced populations');

-- Activity 7: LGPASP - Local Governance and Public Administration Strengthening Programme (Governance)
-- SDG 16: Peace, Justice and Strong Institutions
INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
('a1000001-0001-4000-8000-000000000007', 16, '16.6', 50, 'Developing effective local government institutions'),
('a1000001-0001-4000-8000-000000000007', 16, '16.7', 50, 'Promoting inclusive participatory governance');

-- Activity 8: WEEMST - Women''s Economic Empowerment and Market Systems Transformation (Livelihoods)
-- SDG 5: Gender Equality + SDG 8: Decent Work
INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
('a1000001-0001-4000-8000-000000000008', 5, '5.5', 40, 'Women''s participation in economic leadership'),
('a1000001-0001-4000-8000-000000000008', 5, '5.4', 20, 'Recognition of women''s unpaid work through market systems'),
('a1000001-0001-4000-8000-000000000008', 8, '8.5', 40, 'Decent work opportunities for women');

-- Activity 9: CMRCCR - Coastal Mangrove Restoration and Climate Change Resilience (Environment)
-- SDG 13: Climate Action + SDG 15: Life on Land
INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
('a1000001-0001-4000-8000-000000000009', 13, '13.1', 40, 'Building coastal climate resilience'),
('a1000001-0001-4000-8000-000000000009', 13, '13.2', 20, 'Integrating climate measures into local planning'),
('a1000001-0001-4000-8000-000000000009', 15, '15.1', 40, 'Restoration of coastal mangrove ecosystems');

-- Activity 10: MCCT-NS - Maternal and Child Cash Transfer for Nutrition Security (Social Protection - Humanitarian)
-- SDG 1: No Poverty + SDG 2: Zero Hunger
INSERT INTO activity_sdg_mappings (activity_id, sdg_goal, sdg_target, contribution_percent, notes) VALUES
('a1000001-0001-4000-8000-000000000010', 1, '1.3', 50, 'Social protection system for vulnerable mothers and children'),
('a1000001-0001-4000-8000-000000000010', 2, '2.1', 50, 'Ensuring food and nutrition security for young children');
