-- Seed default scoring rubric v2 — stage-specific fields only
-- Each stage scores ONLY fields introduced at that stage.

INSERT INTO scoring_rubric_versions (id, version_number, label, description, is_active, activated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  1,
  'Default Rubric v1',
  'Initial scoring rubric with equal 20% weights across all five dimensions.',
  true,
  now()
);

-- Helper: v1 ID
-- rubric_version_id = 'a0000000-0000-0000-0000-000000000001'

-- ============================================================
-- MSDP Alignment (20%) — Intake  (unchanged — all intake fields)
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'intake', 'msdp_alignment', 20.00, '[
  {"key": "ndp_goal_linked", "label": "NDP goal linked", "rule_type": "not_null", "field_path": "ndp_goal_id", "max_points": 10},
  {"key": "ndp_aligned_flag", "label": "NDP aligned flag set", "rule_type": "boolean_field", "field_path": "ndp_aligned", "max_points": 5},
  {"key": "secondary_goals_count", "label": "Secondary NDP goals", "rule_type": "array_length", "field_path": "secondary_ndp_goals", "max_points": 10, "thresholds": [{"min": 1, "points": 5}, {"min": 3, "points": 10}]},
  {"key": "sdg_count", "label": "SDG goals linked", "rule_type": "array_length", "field_path": "sdg_goals", "max_points": 10, "thresholds": [{"min": 1, "points": 5}, {"min": 3, "points": 10}]},
  {"key": "msdp_strategy", "label": "MSDP strategy area specified", "rule_type": "not_null", "field_path": "msdp_strategy_area", "max_points": 10},
  {"key": "alignment_justification", "label": "Alignment justification quality", "rule_type": "text_length", "field_path": "alignment_justification", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "sector_strategy_ref", "label": "Sector strategy reference", "rule_type": "not_null", "field_path": "sector_strategy_reference", "max_points": 5},
  {"key": "in_sector_plan", "label": "In sector investment plan", "rule_type": "boolean_field", "field_path": "in_sector_investment_plan", "max_points": 5}
]'::jsonb);

-- MSDP Alignment — FS-1  (only FS-1-new fields)
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs1', 'msdp_alignment', 20.00, '[
  {"key": "fs1_narrative_alignment", "label": "FS-1 NDP alignment narrative", "rule_type": "text_length", "field_path": "fs1_narrative.ndp_alignment_justification", "max_points": 30, "thresholds": [{"min": 100, "points": 15}, {"min": 300, "points": 30}]},
  {"key": "msdp_alignment_doc", "label": "MSDP alignment justification document", "rule_type": "document_exists", "field_path": "msdp_alignment_justification", "max_points": 20},
  {"key": "alignment_justification", "label": "Alignment justification updated", "rule_type": "text_length", "field_path": "alignment_justification", "max_points": 15, "thresholds": [{"min": 50, "points": 8}, {"min": 200, "points": 15}]},
  {"key": "sector_strategy_ref", "label": "Sector strategy reference", "rule_type": "not_null", "field_path": "sector_strategy_reference", "max_points": 10}
]'::jsonb);

-- MSDP Alignment — FS-2  (only FS-2-new fields)
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs2', 'msdp_alignment', 20.00, '[
  {"key": "socioeconomic_benefits", "label": "Socio-economic benefits documented", "rule_type": "text_length", "field_path": "fs2_study_data.socio_economic_benefits", "max_points": 35, "thresholds": [{"min": 100, "points": 18}, {"min": 300, "points": 35}]},
  {"key": "demand_methodology", "label": "Demand methodology described", "rule_type": "text_length", "field_path": "fs2_study_data.demand_methodology", "max_points": 20, "thresholds": [{"min": 100, "points": 10}, {"min": 300, "points": 20}]},
  {"key": "willingness_to_pay", "label": "Willingness to pay analysis", "rule_type": "text_length", "field_path": "fs2_study_data.willingness_to_pay", "max_points": 15, "thresholds": [{"min": 50, "points": 8}, {"min": 200, "points": 15}]}
]'::jsonb);

-- ============================================================
-- Financial Viability (20%) — Intake  (intake-only, removed FS-1 fields)
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'intake', 'financial_viability', 20.00, '[
  {"key": "cost_provided", "label": "Cost estimate provided", "rule_type": "not_null", "field_path": "estimated_cost", "max_points": 25},
  {"key": "currency_set", "label": "Currency specified", "rule_type": "not_null", "field_path": "currency", "max_points": 10},
  {"key": "budget_doc", "label": "Budget estimate document uploaded", "rule_type": "document_exists", "field_path": "budget_estimate", "max_points": 20},
  {"key": "cost_estimate_doc", "label": "Cost estimate document uploaded", "rule_type": "document_exists", "field_path": "cost_estimate", "max_points": 20}
]'::jsonb);

-- Financial Viability — FS-1  (only FS-1-new fields, fixed field paths)
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs1', 'financial_viability', 20.00, '[
  {"key": "revenue_component", "label": "Revenue component identified", "rule_type": "boolean_field", "field_path": "has_revenue_component", "max_points": 5},
  {"key": "revenue_sources", "label": "Revenue sources specified", "rule_type": "array_length", "field_path": "revenue_sources", "max_points": 10, "thresholds": [{"min": 1, "points": 5}, {"min": 2, "points": 10}]},
  {"key": "market_assessment", "label": "Market assessment provided", "rule_type": "text_length", "field_path": "market_assessment_summary", "max_points": 15, "thresholds": [{"min": 50, "points": 8}, {"min": 200, "points": 15}]},
  {"key": "projected_users", "label": "Projected annual users", "rule_type": "not_null", "field_path": "projected_annual_users", "max_points": 5},
  {"key": "cost_table", "label": "FIRR cost table completed", "rule_type": "array_length", "field_path": "firr_cost_table_data", "max_points": 15, "thresholds": [{"min": 1, "points": 8}, {"min": 3, "points": 15}]},
  {"key": "firr_calculated", "label": "FIRR calculated", "rule_type": "not_null", "field_path": "firr", "max_points": 10},
  {"key": "firr_value", "label": "FIRR value", "rule_type": "numeric_threshold", "field_path": "firr", "max_points": 10, "thresholds": [{"min": 5, "points": 5}, {"min": 10, "points": 10}]}
]'::jsonb);

-- Financial Viability — FS-2  (only FS-2-new fields)
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs2', 'financial_viability', 20.00, '[
  {"key": "eirr_calculated", "label": "EIRR calculated", "rule_type": "not_null", "field_path": "eirr", "max_points": 15},
  {"key": "eirr_value", "label": "EIRR value", "rule_type": "numeric_threshold", "field_path": "eirr", "max_points": 20, "thresholds": [{"min": 10, "points": 10}, {"min": 15, "points": 20}]},
  {"key": "financing_plan", "label": "Financing plan documented", "rule_type": "text_length", "field_path": "fs2_study_data.financing_plan", "max_points": 15, "thresholds": [{"min": 100, "points": 8}, {"min": 300, "points": 15}]},
  {"key": "financial_assumptions", "label": "Financial assumptions documented", "rule_type": "text_length", "field_path": "fs2_study_data.financial_assumptions", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "cost_breakdown", "label": "Cost breakdown completeness", "rule_type": "count_filled_fields", "field_path": "cost_land,cost_civil,cost_equipment,cost_consultancy,cost_contingency", "max_points": 10, "thresholds": [{"min": 3, "points": 5}, {"min": 5, "points": 10}]}
]'::jsonb);

-- ============================================================
-- Technical Maturity (20%) — Intake  (unchanged — all intake fields)
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'intake', 'technical_maturity', 20.00, '[
  {"key": "objectives", "label": "Objectives defined", "rule_type": "text_length", "field_path": "objectives", "max_points": 15, "thresholds": [{"min": 20, "points": 8}, {"min": 100, "points": 15}]},
  {"key": "project_type", "label": "Project type specified", "rule_type": "not_null", "field_path": "project_type", "max_points": 10},
  {"key": "concept_note", "label": "Concept note uploaded", "rule_type": "document_exists", "field_path": "concept_note", "max_points": 15},
  {"key": "proposal_doc", "label": "Project proposal uploaded", "rule_type": "document_exists", "field_path": "project_proposal", "max_points": 15},
  {"key": "timeline", "label": "Timeline provided", "rule_type": "not_null", "field_path": "estimated_duration_months", "max_points": 10}
]'::jsonb);

-- Technical Maturity — FS-1  (only FS-1-new fields)
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs1', 'technical_maturity', 20.00, '[
  {"key": "technical_approach", "label": "Technical approach documented", "rule_type": "text_length", "field_path": "technical_approach", "max_points": 15, "thresholds": [{"min": 50, "points": 8}, {"min": 200, "points": 15}]},
  {"key": "methodology", "label": "Technology/methodology described", "rule_type": "text_length", "field_path": "technology_methodology", "max_points": 15, "thresholds": [{"min": 50, "points": 8}, {"min": 200, "points": 15}]},
  {"key": "risks", "label": "Technical risks identified", "rule_type": "text_length", "field_path": "technical_risks", "max_points": 15, "thresholds": [{"min": 30, "points": 8}, {"min": 100, "points": 15}]},
  {"key": "has_technical_design", "label": "Has technical design", "rule_type": "boolean_field", "field_path": "has_technical_design", "max_points": 5},
  {"key": "design_maturity", "label": "Design maturity level", "rule_type": "enum_map", "field_path": "technical_design_maturity", "max_points": 15, "enum_values": {"concept": 3, "preliminary": 8, "detailed": 12, "construction_ready": 15}},
  {"key": "project_life", "label": "Project life defined", "rule_type": "not_null", "field_path": "project_life_years", "max_points": 5}
]'::jsonb);

-- Technical Maturity — FS-2  (only FS-2-new fields)
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs2', 'technical_maturity', 20.00, '[
  {"key": "engineering_approach", "label": "Engineering approach", "rule_type": "text_length", "field_path": "fs2_study_data.engineering_approach", "max_points": 15, "thresholds": [{"min": 100, "points": 8}, {"min": 300, "points": 15}]},
  {"key": "design_standards", "label": "Design standards referenced", "rule_type": "text_length", "field_path": "fs2_study_data.design_standards", "max_points": 10, "thresholds": [{"min": 30, "points": 5}, {"min": 100, "points": 10}]},
  {"key": "construction_methodology", "label": "Construction methodology", "rule_type": "text_length", "field_path": "fs2_study_data.construction_methodology", "max_points": 15, "thresholds": [{"min": 100, "points": 8}, {"min": 300, "points": 15}]},
  {"key": "milestones", "label": "Implementation milestones", "rule_type": "json_field_exists", "field_path": "fs2_study_data.milestones", "max_points": 10},
  {"key": "tech_design_doc", "label": "Technical design document", "rule_type": "document_exists", "field_path": "technical_design", "max_points": 15}
]'::jsonb);

-- ============================================================
-- Environmental & Social Risk Management (20%) — Intake  (intake-only docs)
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'intake', 'environmental_social_risk', 20.00, '[
  {"key": "env_screening_doc", "label": "Environmental screening document uploaded", "rule_type": "document_exists", "field_path": "environmental_screening", "max_points": 35},
  {"key": "stakeholder_analysis_doc", "label": "Stakeholder analysis document uploaded", "rule_type": "document_exists", "field_path": "stakeholder_analysis", "max_points": 35}
]'::jsonb);

-- Environmental & Social Risk Management — FS-1  (only FS-1-new fields)
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs1', 'environmental_social_risk', 20.00, '[
  {"key": "env_impact_assessed", "label": "Environmental impact level assessed", "rule_type": "not_null", "field_path": "environmental_impact_level", "max_points": 10},
  {"key": "social_impact_assessed", "label": "Social impact level assessed", "rule_type": "not_null", "field_path": "social_impact_level", "max_points": 10},
  {"key": "env_description", "label": "Environmental impact description", "rule_type": "text_length", "field_path": "environmental_impact_description", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "social_description", "label": "Social impact description", "rule_type": "text_length", "field_path": "social_impact_description", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "land_identified", "label": "Land acquisition requirement identified", "rule_type": "not_null", "field_path": "land_acquisition_required", "max_points": 10},
  {"key": "resettlement_identified", "label": "Resettlement requirement identified", "rule_type": "not_null", "field_path": "resettlement_required", "max_points": 10},
  {"key": "affected_households", "label": "Affected households quantified", "rule_type": "not_null", "field_path": "estimated_affected_households", "max_points": 5},
  {"key": "eia_doc", "label": "EIA document uploaded", "rule_type": "document_exists", "field_path": "environmental_impact_assessment", "max_points": 5}
]'::jsonb);

-- Environmental & Social Risk Management — FS-2  (only FS-2-new fields)
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs2', 'environmental_social_risk', 20.00, '[
  {"key": "eia_category", "label": "EIA category assigned", "rule_type": "not_null", "field_path": "fs2_study_data.eia_category", "max_points": 10},
  {"key": "env_findings", "label": "Environmental findings summary", "rule_type": "text_length", "field_path": "fs2_study_data.environmental_findings", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "env_mitigation", "label": "Environmental mitigation plan", "rule_type": "text_length", "field_path": "fs2_study_data.environmental_mitigation", "max_points": 15, "thresholds": [{"min": 100, "points": 8}, {"min": 300, "points": 15}]},
  {"key": "resettlement_plan", "label": "Resettlement plan documented", "rule_type": "text_length", "field_path": "fs2_study_data.resettlement_plan", "max_points": 15, "thresholds": [{"min": 100, "points": 8}, {"min": 300, "points": 15}]},
  {"key": "grievance_mechanism", "label": "Grievance mechanism described", "rule_type": "text_length", "field_path": "fs2_study_data.grievance_mechanism", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "eia_doc", "label": "EIA document uploaded", "rule_type": "document_exists", "field_path": "environmental_impact_assessment", "max_points": 10}
]'::jsonb);

-- ============================================================
-- Institutional Capacity (20%) — Intake  (unchanged — all intake fields)
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'intake', 'institutional_capacity', 20.00, '[
  {"key": "contact_officer", "label": "Contact officer assigned", "rule_type": "not_null", "field_path": "contact_officer", "max_points": 10},
  {"key": "contact_completeness", "label": "Contact information complete", "rule_type": "count_filled_fields", "field_path": "contact_email,contact_phone", "max_points": 10, "thresholds": [{"min": 1, "points": 5}, {"min": 2, "points": 10}]},
  {"key": "ministry", "label": "Nominating ministry specified", "rule_type": "not_null", "field_path": "nominating_ministry", "max_points": 10},
  {"key": "implementing_agency", "label": "Implementing agency identified", "rule_type": "not_null", "field_path": "implementing_agency", "max_points": 15},
  {"key": "endorsement_letter", "label": "Endorsement letter uploaded", "rule_type": "document_exists", "field_path": "endorsement_letter", "max_points": 15},
  {"key": "origin_type", "label": "Project origin specified", "rule_type": "not_null", "field_path": "origin", "max_points": 5}
]'::jsonb);

-- Institutional Capacity — FS-1  (only FS-1-new fields, fixed field paths)
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs1', 'institutional_capacity', 20.00, '[
  {"key": "fs_conductor", "label": "FS conductor identified", "rule_type": "not_null", "field_path": "fs_conductor_type", "max_points": 10},
  {"key": "fs_date", "label": "FS date recorded", "rule_type": "not_null", "field_path": "preliminary_fs_date", "max_points": 10},
  {"key": "fs1_narrative_completeness", "label": "FS-1 narrative completeness", "rule_type": "count_filled_fields", "field_path": "fs1_narrative.problem_statement,fs1_narrative.target_beneficiaries,fs1_narrative.expected_outcomes,fs1_narrative.preliminary_cost_justification", "max_points": 20, "thresholds": [{"min": 2, "points": 10}, {"min": 4, "points": 20}]},
  {"key": "preliminary_fs_report", "label": "Preliminary FS report uploaded", "rule_type": "document_exists", "field_path": "preliminary_fs_report", "max_points": 15},
  {"key": "endorsement_letter", "label": "Endorsement letter uploaded", "rule_type": "document_exists", "field_path": "endorsement_letter", "max_points": 10}
]'::jsonb);

-- Institutional Capacity — FS-2  (only FS-2-new fields, fixed field paths)
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs2', 'institutional_capacity', 20.00, '[
  {"key": "procurement_strategy", "label": "Procurement strategy documented", "rule_type": "text_length", "field_path": "fs2_study_data.procurement_strategy", "max_points": 15, "thresholds": [{"min": 100, "points": 8}, {"min": 300, "points": 15}]},
  {"key": "institutional_arrangements", "label": "Institutional arrangements", "rule_type": "text_length", "field_path": "fs2_study_data.institutional_arrangements", "max_points": 15, "thresholds": [{"min": 100, "points": 8}, {"min": 300, "points": 15}]},
  {"key": "me_framework", "label": "M&E framework", "rule_type": "text_length", "field_path": "fs2_study_data.me_framework", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "capacity_building", "label": "Capacity building plan", "rule_type": "text_length", "field_path": "fs2_study_data.capacity_building", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "risk_register_quality", "label": "Risk register quality", "rule_type": "risk_register_quality", "field_path": "fs2_study_data.risk_register", "max_points": 15},
  {"key": "detailed_fs_report", "label": "Detailed FS report uploaded", "rule_type": "document_exists", "field_path": "detailed_fs_report", "max_points": 10}
]'::jsonb);
