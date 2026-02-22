-- ============================================================
-- Seed: Aid Effectiveness Dropdown Options
-- Table: aid_effectiveness_options
--
-- Populates all four categories with realistic options based
-- on GPEDC indicators and common development planning frameworks.
-- ============================================================

-- Clear existing options (if re-seeding)
-- DELETE FROM aid_effectiveness_options;

-- ────────────────────────────────────────────────
-- Category 1: National Development Plans
-- (includedInNationalPlan)
-- Field: "Included in National Development Plan or Sector Strategy"
-- ────────────────────────────────────────────────
INSERT INTO aid_effectiveness_options (category, label, description, sort_order, is_active) VALUES
('includedInNationalPlan', 'National Development Strategy (NDS)', 'The overarching medium-term national development strategy or plan', 1, true),
('includedInNationalPlan', 'National Development Plan (NDP)', 'Multi-year national development plan setting out government priorities', 2, true),
('includedInNationalPlan', 'Sector Strategic Plan', 'A sector-specific strategic plan (e.g. Health Sector Plan, Education Sector Plan)', 3, true),
('includedInNationalPlan', 'Medium-Term Development Plan (MTDP)', 'Government medium-term (3-5 year) development plan', 4, true),
('includedInNationalPlan', 'Annual Development Plan', 'Government annual development or work plan', 5, true),
('includedInNationalPlan', 'Poverty Reduction Strategy', 'National poverty reduction strategy or action plan', 6, true),
('includedInNationalPlan', 'National Vision / Long-Term Strategy', 'Long-term national vision document (e.g. Vision 2030, Vision 2050)', 7, true),
('includedInNationalPlan', 'Provincial / Sub-National Development Plan', 'A provincial, state, or sub-national development plan', 8, true),
('includedInNationalPlan', 'Climate Change / Resilience Strategy', 'National climate change adaptation or resilience strategy', 9, true),
('includedInNationalPlan', 'Gender Equality Strategy', 'National gender equality or women''s empowerment strategy', 10, true),
('includedInNationalPlan', 'SDG Implementation Plan', 'National plan for implementing the Sustainable Development Goals', 11, true),
('includedInNationalPlan', 'Disaster Risk Management Plan', 'National disaster risk management or emergency preparedness plan', 12, true);

-- ────────────────────────────────────────────────
-- Category 2: Government Results Frameworks
-- (linkedToGovFramework)
-- Field: "Linked to Government Results Framework"
-- ────────────────────────────────────────────────
INSERT INTO aid_effectiveness_options (category, label, description, sort_order, is_active) VALUES
('linkedToGovFramework', 'National Results Framework (NRF)', 'The government''s overarching national results or performance framework', 1, true),
('linkedToGovFramework', 'Sector Results Framework', 'A sector-level results framework (e.g. Health Sector M&E Framework)', 2, true),
('linkedToGovFramework', 'National M&E Framework', 'Government-wide monitoring and evaluation framework', 3, true),
('linkedToGovFramework', 'National Statistics / Census Framework', 'National statistical system or census-based indicators framework', 4, true),
('linkedToGovFramework', 'SDG Monitoring Framework', 'National SDG indicator monitoring framework', 5, true),
('linkedToGovFramework', 'Medium-Term Expenditure Framework (MTEF)', 'Government medium-term expenditure framework linking budgets to results', 6, true),
('linkedToGovFramework', 'Government Performance Assessment Framework', 'Framework for assessing performance of government ministries or programmes', 7, true),
('linkedToGovFramework', 'Provincial / Sub-National Results Framework', 'Sub-national or provincial government results monitoring framework', 8, true),
('linkedToGovFramework', 'Joint Sector Review Framework', 'Framework used in joint annual sector reviews with government and partners', 9, true),
('linkedToGovFramework', 'National Budget Performance Framework', 'Framework linking national budget allocations to measurable outcomes', 10, true);

-- ────────────────────────────────────────────────
-- Category 3: Accountability Frameworks
-- (mutualAccountabilityFramework)
-- Field: "Activity Assessed Under a Formal Country-Level Mutual Accountability Framework"
-- ────────────────────────────────────────────────
INSERT INTO aid_effectiveness_options (category, label, description, sort_order, is_active) VALUES
('mutualAccountabilityFramework', 'Development Partnership Policy / Framework', 'Country-level development partnership or aid coordination policy framework', 1, true),
('mutualAccountabilityFramework', 'Aid Management Policy', 'National aid or development cooperation management policy', 2, true),
('mutualAccountabilityFramework', 'Joint Country Action Plan (JCAP)', 'Joint action plan between government and development partners', 3, true),
('mutualAccountabilityFramework', 'Paris Declaration / Accra Agenda Assessment', 'Assessment under the Paris Declaration on Aid Effectiveness or Accra Agenda for Action', 4, true),
('mutualAccountabilityFramework', 'GPEDC Country-Level Monitoring', 'Country-level monitoring under the Global Partnership for Effective Development Co-operation', 5, true),
('mutualAccountabilityFramework', 'Development Cooperation Dialogue Forum', 'Regular government-partner dialogue forum or coordination mechanism', 6, true),
('mutualAccountabilityFramework', 'Budget Support Performance Assessment Framework (PAF)', 'Performance assessment framework used for general or sector budget support', 7, true),
('mutualAccountabilityFramework', 'Sector-Wide Approach (SWAp) Compact', 'Mutual accountability compact under a sector-wide approach', 8, true),
('mutualAccountabilityFramework', 'UN Development Assistance Framework (UNDAF / UNSDCF)', 'United Nations Sustainable Development Cooperation Framework or equivalent', 9, true),
('mutualAccountabilityFramework', 'Donor Coordination Mechanism / Joint Accountability Matrix', 'Formal donor coordination or joint accountability mechanism', 10, true);

-- ────────────────────────────────────────────────
-- Category 4: National Capacity Plans
-- (capacityDevFromNationalPlan)
-- Field: "Capacity Development Based on Nationally Identified Capacity Plan"
-- ────────────────────────────────────────────────
INSERT INTO aid_effectiveness_options (category, label, description, sort_order, is_active) VALUES
('capacityDevFromNationalPlan', 'National Capacity Development Strategy', 'Overarching national capacity development strategy or framework', 1, true),
('capacityDevFromNationalPlan', 'Public Service Reform Strategy', 'Government public service reform or public administration modernisation plan', 2, true),
('capacityDevFromNationalPlan', 'Sector Capacity Development Plan', 'Sector-specific capacity development plan (e.g. Health Workforce Plan)', 3, true),
('capacityDevFromNationalPlan', 'Human Resource Development Plan', 'National human resource or workforce development plan', 4, true),
('capacityDevFromNationalPlan', 'Institutional Strengthening Plan', 'Plan focused on strengthening specific government institutions or ministries', 5, true),
('capacityDevFromNationalPlan', 'National Training / Skills Development Strategy', 'National training, skills development, or technical education strategy', 6, true),
('capacityDevFromNationalPlan', 'PFM Reform Action Plan', 'Public financial management reform or capacity building action plan', 7, true),
('capacityDevFromNationalPlan', 'Decentralisation / Local Government Capacity Plan', 'Plan for building capacity of sub-national or local government', 8, true),
('capacityDevFromNationalPlan', 'ICT / Digital Government Capacity Plan', 'National plan for building ICT or digital government capacity', 9, true),
('capacityDevFromNationalPlan', 'Statistical Capacity Development Plan', 'Plan for strengthening the national statistical system', 10, true);
