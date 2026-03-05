-- Seed default scoring rubric v1 with 15 criteria rows (5 dimensions × 3 stages)

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
-- MSDP Alignment (20%) — Intake
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

-- MSDP Alignment — FS-1
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs1', 'msdp_alignment', 20.00, '[
  {"key": "ndp_goal_linked", "label": "NDP goal linked", "rule_type": "not_null", "field_path": "ndp_goal_id", "max_points": 10},
  {"key": "ndp_aligned_flag", "label": "NDP aligned flag set", "rule_type": "boolean_field", "field_path": "ndp_aligned", "max_points": 5},
  {"key": "secondary_goals_count", "label": "Secondary NDP goals", "rule_type": "array_length", "field_path": "secondary_ndp_goals", "max_points": 10, "thresholds": [{"min": 1, "points": 5}, {"min": 3, "points": 10}]},
  {"key": "sdg_count", "label": "SDG goals linked", "rule_type": "array_length", "field_path": "sdg_goals", "max_points": 10, "thresholds": [{"min": 1, "points": 5}, {"min": 3, "points": 10}]},
  {"key": "msdp_strategy", "label": "MSDP strategy area specified", "rule_type": "not_null", "field_path": "msdp_strategy_area", "max_points": 10},
  {"key": "alignment_justification", "label": "Alignment justification quality", "rule_type": "text_length", "field_path": "alignment_justification", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "sector_strategy_ref", "label": "Sector strategy reference", "rule_type": "not_null", "field_path": "sector_strategy_reference", "max_points": 5},
  {"key": "in_sector_plan", "label": "In sector investment plan", "rule_type": "boolean_field", "field_path": "in_sector_investment_plan", "max_points": 5},
  {"key": "fs1_narrative_alignment", "label": "FS-1 NDP alignment narrative", "rule_type": "text_length", "field_path": "fs1_narrative.ndp_alignment_justification", "max_points": 10, "thresholds": [{"min": 100, "points": 5}, {"min": 300, "points": 10}]}
]'::jsonb);

-- MSDP Alignment — FS-2
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs2', 'msdp_alignment', 20.00, '[
  {"key": "ndp_goal_linked", "label": "NDP goal linked", "rule_type": "not_null", "field_path": "ndp_goal_id", "max_points": 10},
  {"key": "ndp_aligned_flag", "label": "NDP aligned flag set", "rule_type": "boolean_field", "field_path": "ndp_aligned", "max_points": 5},
  {"key": "secondary_goals_count", "label": "Secondary NDP goals", "rule_type": "array_length", "field_path": "secondary_ndp_goals", "max_points": 10, "thresholds": [{"min": 1, "points": 5}, {"min": 3, "points": 10}]},
  {"key": "sdg_count", "label": "SDG goals linked", "rule_type": "array_length", "field_path": "sdg_goals", "max_points": 10, "thresholds": [{"min": 1, "points": 5}, {"min": 3, "points": 10}]},
  {"key": "msdp_strategy", "label": "MSDP strategy area specified", "rule_type": "not_null", "field_path": "msdp_strategy_area", "max_points": 10},
  {"key": "alignment_justification", "label": "Alignment justification quality", "rule_type": "text_length", "field_path": "alignment_justification", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "sector_strategy_ref", "label": "Sector strategy reference", "rule_type": "not_null", "field_path": "sector_strategy_reference", "max_points": 5},
  {"key": "in_sector_plan", "label": "In sector investment plan", "rule_type": "boolean_field", "field_path": "in_sector_investment_plan", "max_points": 5},
  {"key": "socioeconomic_benefits", "label": "Socio-economic benefits documented", "rule_type": "text_length", "field_path": "fs2_study_data.socioeconomic_benefits", "max_points": 10, "thresholds": [{"min": 100, "points": 5}, {"min": 300, "points": 10}]}
]'::jsonb);

-- ============================================================
-- Financial Viability (20%) — Intake
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'intake', 'financial_viability', 20.00, '[
  {"key": "cost_provided", "label": "Cost estimate provided", "rule_type": "not_null", "field_path": "estimated_cost", "max_points": 15},
  {"key": "budget_doc", "label": "Budget document uploaded", "rule_type": "document_exists", "field_path": "budget_estimate", "max_points": 10},
  {"key": "revenue_component", "label": "Revenue component identified", "rule_type": "boolean_field", "field_path": "has_revenue_component", "max_points": 10},
  {"key": "revenue_sources", "label": "Revenue sources specified", "rule_type": "array_length", "field_path": "revenue_sources", "max_points": 10, "thresholds": [{"min": 1, "points": 5}, {"min": 2, "points": 10}]},
  {"key": "cost_estimate_doc", "label": "Cost estimate document", "rule_type": "document_exists", "field_path": "cost_estimate", "max_points": 10},
  {"key": "currency_set", "label": "Currency specified", "rule_type": "not_null", "field_path": "currency", "max_points": 5}
]'::jsonb);

-- Financial Viability — FS-1
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs1', 'financial_viability', 20.00, '[
  {"key": "cost_provided", "label": "Cost estimate provided", "rule_type": "not_null", "field_path": "estimated_cost", "max_points": 10},
  {"key": "firr_calculated", "label": "FIRR calculated", "rule_type": "not_null", "field_path": "firr", "max_points": 10},
  {"key": "firr_value", "label": "FIRR value", "rule_type": "numeric_threshold", "field_path": "firr", "max_points": 15, "thresholds": [{"min": 5, "points": 8}, {"min": 10, "points": 15}]},
  {"key": "cost_table", "label": "Cost table completed", "rule_type": "array_length", "field_path": "cost_table_data", "max_points": 10, "thresholds": [{"min": 1, "points": 5}, {"min": 3, "points": 10}]},
  {"key": "revenue_component", "label": "Revenue component identified", "rule_type": "boolean_field", "field_path": "has_revenue_component", "max_points": 5},
  {"key": "market_assessment", "label": "Market assessment provided", "rule_type": "text_length", "field_path": "market_assessment_summary", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "revenue_projections", "label": "Revenue projections", "rule_type": "not_null", "field_path": "projected_annual_revenue", "max_points": 5}
]'::jsonb);

-- Financial Viability — FS-2
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs2', 'financial_viability', 20.00, '[
  {"key": "cost_provided", "label": "Cost estimate provided", "rule_type": "not_null", "field_path": "estimated_cost", "max_points": 5},
  {"key": "firr_calculated", "label": "FIRR calculated", "rule_type": "not_null", "field_path": "firr", "max_points": 5},
  {"key": "firr_value", "label": "FIRR value", "rule_type": "numeric_threshold", "field_path": "firr", "max_points": 10, "thresholds": [{"min": 5, "points": 5}, {"min": 10, "points": 10}]},
  {"key": "eirr_calculated", "label": "EIRR calculated", "rule_type": "not_null", "field_path": "eirr", "max_points": 10},
  {"key": "eirr_value", "label": "EIRR value", "rule_type": "numeric_threshold", "field_path": "eirr", "max_points": 15, "thresholds": [{"min": 10, "points": 8}, {"min": 15, "points": 15}]},
  {"key": "detailed_cost_breakdown", "label": "Detailed cost breakdown", "rule_type": "array_length", "field_path": "cost_table_data", "max_points": 10, "thresholds": [{"min": 3, "points": 5}, {"min": 5, "points": 10}]},
  {"key": "financing_plan", "label": "Financing plan documented", "rule_type": "text_length", "field_path": "fs2_study_data.financing_plan", "max_points": 10, "thresholds": [{"min": 100, "points": 5}, {"min": 300, "points": 10}]}
]'::jsonb);

-- ============================================================
-- Technical Maturity (20%) — Intake
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'intake', 'technical_maturity', 20.00, '[
  {"key": "objectives", "label": "Objectives defined", "rule_type": "text_length", "field_path": "objectives", "max_points": 15, "thresholds": [{"min": 20, "points": 8}, {"min": 100, "points": 15}]},
  {"key": "project_type", "label": "Project type specified", "rule_type": "not_null", "field_path": "project_type", "max_points": 10},
  {"key": "concept_note", "label": "Concept note uploaded", "rule_type": "document_exists", "field_path": "concept_note", "max_points": 15},
  {"key": "proposal_doc", "label": "Project proposal uploaded", "rule_type": "document_exists", "field_path": "project_proposal", "max_points": 15},
  {"key": "timeline", "label": "Timeline provided", "rule_type": "not_null", "field_path": "estimated_duration_months", "max_points": 10}
]'::jsonb);

-- Technical Maturity — FS-1
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs1', 'technical_maturity', 20.00, '[
  {"key": "objectives", "label": "Objectives defined", "rule_type": "text_length", "field_path": "objectives", "max_points": 10, "thresholds": [{"min": 20, "points": 5}, {"min": 100, "points": 10}]},
  {"key": "technical_approach", "label": "Technical approach documented", "rule_type": "text_length", "field_path": "technical_approach", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "methodology", "label": "Technology/methodology described", "rule_type": "text_length", "field_path": "technology_methodology", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "risks", "label": "Technical risks identified", "rule_type": "text_length", "field_path": "technical_risks", "max_points": 10, "thresholds": [{"min": 30, "points": 5}, {"min": 100, "points": 10}]},
  {"key": "design_maturity", "label": "Design maturity level", "rule_type": "enum_map", "field_path": "technical_design_maturity", "max_points": 10, "enum_values": {"concept": 2, "preliminary": 5, "detailed": 8, "construction_ready": 10}},
  {"key": "project_life", "label": "Project life defined", "rule_type": "not_null", "field_path": "project_life_years", "max_points": 5}
]'::jsonb);

-- Technical Maturity — FS-2
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs2', 'technical_maturity', 20.00, '[
  {"key": "technical_approach", "label": "Technical approach documented", "rule_type": "text_length", "field_path": "technical_approach", "max_points": 8, "thresholds": [{"min": 50, "points": 4}, {"min": 200, "points": 8}]},
  {"key": "engineering_approach", "label": "Engineering approach", "rule_type": "text_length", "field_path": "fs2_study_data.engineering_approach", "max_points": 10, "thresholds": [{"min": 100, "points": 5}, {"min": 300, "points": 10}]},
  {"key": "design_standards", "label": "Design standards referenced", "rule_type": "text_length", "field_path": "fs2_study_data.design_standards", "max_points": 8, "thresholds": [{"min": 30, "points": 4}, {"min": 100, "points": 8}]},
  {"key": "construction_methodology", "label": "Construction methodology", "rule_type": "text_length", "field_path": "fs2_study_data.construction_methodology", "max_points": 10, "thresholds": [{"min": 100, "points": 5}, {"min": 300, "points": 10}]},
  {"key": "milestones", "label": "Implementation milestones", "rule_type": "json_field_exists", "field_path": "fs2_study_data.milestones", "max_points": 8},
  {"key": "tech_design_doc", "label": "Technical design document", "rule_type": "document_exists", "field_path": "technical_design", "max_points": 10},
  {"key": "design_maturity", "label": "Design maturity level", "rule_type": "enum_map", "field_path": "technical_design_maturity", "max_points": 10, "enum_values": {"concept": 2, "preliminary": 5, "detailed": 8, "construction_ready": 10}}
]'::jsonb);

-- ============================================================
-- Environmental & Social Risk Management (20%) — Intake
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'intake', 'environmental_social_risk', 20.00, '[
  {"key": "env_impact_assessed", "label": "Environmental impact level assessed", "rule_type": "not_null", "field_path": "environmental_impact_level", "max_points": 20},
  {"key": "social_impact_assessed", "label": "Social impact level assessed", "rule_type": "not_null", "field_path": "social_impact_level", "max_points": 20},
  {"key": "land_identified", "label": "Land acquisition requirement identified", "rule_type": "not_null", "field_path": "land_acquisition_required", "max_points": 15},
  {"key": "resettlement_identified", "label": "Resettlement requirement identified", "rule_type": "not_null", "field_path": "resettlement_required", "max_points": 15}
]'::jsonb);

-- Environmental & Social Risk Management — FS-1
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs1', 'environmental_social_risk', 20.00, '[
  {"key": "env_impact_assessed", "label": "Environmental impact level assessed", "rule_type": "not_null", "field_path": "environmental_impact_level", "max_points": 10},
  {"key": "social_impact_assessed", "label": "Social impact level assessed", "rule_type": "not_null", "field_path": "social_impact_level", "max_points": 10},
  {"key": "env_description", "label": "Environmental impact description", "rule_type": "text_length", "field_path": "environmental_impact_description", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "social_description", "label": "Social impact description", "rule_type": "text_length", "field_path": "social_impact_description", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "eia_doc", "label": "EIA document uploaded", "rule_type": "document_exists", "field_path": "environmental_impact_assessment", "max_points": 10},
  {"key": "sia_doc", "label": "SIA document uploaded", "rule_type": "document_exists", "field_path": "social_impact_assessment", "max_points": 10},
  {"key": "affected_households", "label": "Affected households quantified", "rule_type": "not_null", "field_path": "estimated_affected_households", "max_points": 10}
]'::jsonb);

-- Environmental & Social Risk Management — FS-2
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs2', 'environmental_social_risk', 20.00, '[
  {"key": "env_impact_assessed", "label": "Environmental impact level assessed", "rule_type": "not_null", "field_path": "environmental_impact_level", "max_points": 5},
  {"key": "eia_category", "label": "EIA category assigned", "rule_type": "not_null", "field_path": "fs2_study_data.eia_category", "max_points": 10},
  {"key": "env_mitigation_plan", "label": "Environmental mitigation plan", "rule_type": "text_length", "field_path": "fs2_study_data.env_mitigation_plan", "max_points": 15, "thresholds": [{"min": 100, "points": 8}, {"min": 300, "points": 15}]},
  {"key": "resettlement_plan", "label": "Resettlement plan documented", "rule_type": "text_length", "field_path": "fs2_study_data.resettlement_plan", "max_points": 15, "thresholds": [{"min": 100, "points": 8}, {"min": 300, "points": 15}]},
  {"key": "grievance_mechanism", "label": "Grievance mechanism described", "rule_type": "text_length", "field_path": "fs2_study_data.grievance_mechanism", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "eia_doc", "label": "EIA document uploaded", "rule_type": "document_exists", "field_path": "environmental_impact_assessment", "max_points": 10},
  {"key": "env_findings", "label": "Environmental findings summary", "rule_type": "text_length", "field_path": "fs2_study_data.environmental_findings", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]}
]'::jsonb);

-- ============================================================
-- Institutional Capacity (20%) — Intake
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

-- Institutional Capacity — FS-1
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs1', 'institutional_capacity', 20.00, '[
  {"key": "contact_officer", "label": "Contact officer assigned", "rule_type": "not_null", "field_path": "contact_officer", "max_points": 5},
  {"key": "ministry", "label": "Nominating ministry specified", "rule_type": "not_null", "field_path": "nominating_ministry", "max_points": 5},
  {"key": "implementing_agency", "label": "Implementing agency identified", "rule_type": "not_null", "field_path": "implementing_agency", "max_points": 10},
  {"key": "fs_conductor", "label": "FS conductor identified", "rule_type": "not_null", "field_path": "preliminary_fs_conducted_by", "max_points": 10},
  {"key": "fs1_narrative_completeness", "label": "FS-1 narrative completeness", "rule_type": "count_filled_fields", "field_path": "fs1_narrative.problem_statement,fs1_narrative.target_beneficiaries,fs1_narrative.expected_outcomes,fs1_narrative.preliminary_cost_justification", "max_points": 15, "thresholds": [{"min": 2, "points": 8}, {"min": 4, "points": 15}]},
  {"key": "fs_date", "label": "FS date recorded", "rule_type": "not_null", "field_path": "preliminary_fs_date", "max_points": 5},
  {"key": "endorsement_letter", "label": "Endorsement letter uploaded", "rule_type": "document_exists", "field_path": "endorsement_letter", "max_points": 10}
]'::jsonb);

-- Institutional Capacity — FS-2
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs2', 'institutional_capacity', 20.00, '[
  {"key": "implementing_agency", "label": "Implementing agency identified", "rule_type": "not_null", "field_path": "implementing_agency", "max_points": 5},
  {"key": "procurement_strategy", "label": "Procurement strategy documented", "rule_type": "text_length", "field_path": "fs2_study_data.procurement_strategy", "max_points": 15, "thresholds": [{"min": 100, "points": 8}, {"min": 300, "points": 15}]},
  {"key": "institutional_arrangements", "label": "Institutional arrangements", "rule_type": "text_length", "field_path": "fs2_study_data.institutional_arrangements", "max_points": 15, "thresholds": [{"min": 100, "points": 8}, {"min": 300, "points": 15}]},
  {"key": "monitoring_framework", "label": "M&E framework", "rule_type": "text_length", "field_path": "fs2_study_data.monitoring_framework", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "capacity_building", "label": "Capacity building plan", "rule_type": "text_length", "field_path": "fs2_study_data.capacity_building", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "risk_register_quality", "label": "Risk register quality", "rule_type": "risk_register_quality", "field_path": "fs2_study_data.risk_register", "max_points": 15}
]'::jsonb);
