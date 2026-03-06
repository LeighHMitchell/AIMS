-- FS-3 (PPP / VGF Structuring) scoring criteria for all five dimensions
-- rubric_version_id = 'a0000000-0000-0000-0000-000000000001'

-- ============================================================
-- MSDP Alignment (20%) — FS-3
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs3', 'msdp_alignment', 20.00, '[
  {"key": "dap_compliant", "label": "DAP compliance confirmed", "rule_type": "boolean_field", "field_path": "dap_compliant", "max_points": 30},
  {"key": "dap_notes", "label": "DAP compliance justification", "rule_type": "text_length", "field_path": "dap_notes", "max_points": 25, "thresholds": [{"min": 50, "points": 13}, {"min": 200, "points": 25}]},
  {"key": "dap_doc", "label": "DAP compliance document uploaded", "rule_type": "document_exists", "field_path": "dap_compliance", "max_points": 20}
]'::jsonb);

-- ============================================================
-- Financial Viability (20%) — FS-3
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs3', 'financial_viability', 20.00, '[
  {"key": "vgf_calculated", "label": "VGF amount calculated", "rule_type": "not_null", "field_path": "vgf_amount", "max_points": 15},
  {"key": "vgf_modality", "label": "VGF modality selected", "rule_type": "not_null", "field_path": "vgf_status", "max_points": 10},
  {"key": "support_mechanism", "label": "PPP support mechanism selected", "rule_type": "not_null", "field_path": "ppp_support_mechanism", "max_points": 15},
  {"key": "equity_ratio", "label": "Equity ratio specified", "rule_type": "not_null", "field_path": "equity_ratio", "max_points": 10},
  {"key": "budget_status", "label": "Budget allocation status set", "rule_type": "not_null", "field_path": "budget_allocation_status", "max_points": 10},
  {"key": "budget_amount", "label": "Budget amount specified", "rule_type": "not_null", "field_path": "budget_amount", "max_points": 10},
  {"key": "vgf_doc", "label": "VGF calculation document uploaded", "rule_type": "document_exists", "field_path": "vgf_calculation", "max_points": 10}
]'::jsonb);

-- ============================================================
-- Technical Maturity (20%) — FS-3
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs3', 'technical_maturity', 20.00, '[
  {"key": "contract_type", "label": "PPP contract type selected", "rule_type": "not_null", "field_path": "ppp_contract_type", "max_points": 25},
  {"key": "contract_details", "label": "Contract details provided", "rule_type": "not_null", "field_path": "ppp_contract_details", "max_points": 20},
  {"key": "land_parcel", "label": "Land parcel identified", "rule_type": "not_null", "field_path": "land_parcel_id", "max_points": 20},
  {"key": "risk_matrix_doc", "label": "Risk allocation matrix uploaded", "rule_type": "document_exists", "field_path": "risk_allocation_matrix", "max_points": 15}
]'::jsonb);

-- ============================================================
-- Environmental & Social Risk Management (20%) — FS-3
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs3', 'environmental_social_risk', 20.00, '[
  {"key": "checklist_land", "label": "Land parcel identified in checklist", "rule_type": "json_field_exists", "field_path": "vgf_calculation_data.checklist.land_identified", "max_points": 20},
  {"key": "checklist_dp", "label": "Development partners consulted", "rule_type": "json_field_exists", "field_path": "vgf_calculation_data.checklist.dp_consulted", "max_points": 20},
  {"key": "checklist_risk", "label": "Risk allocation matrix prepared", "rule_type": "json_field_exists", "field_path": "vgf_calculation_data.checklist.risk_allocated", "max_points": 25},
  {"key": "dap_compliant_env", "label": "DAP compliance (env/social safeguards)", "rule_type": "json_field_exists", "field_path": "vgf_calculation_data.checklist.dap_compliant", "max_points": 15}
]'::jsonb);

-- ============================================================
-- Institutional Capacity (20%) — FS-3
-- ============================================================
INSERT INTO scoring_criteria (rubric_version_id, stage, dimension, dimension_weight, sub_criteria)
VALUES ('a0000000-0000-0000-0000-000000000001', 'fs3', 'institutional_capacity', 20.00, '[
  {"key": "checklist_budget", "label": "Budget allocation secured", "rule_type": "json_field_exists", "field_path": "vgf_calculation_data.checklist.budget_allocated", "max_points": 25},
  {"key": "readiness_complete", "label": "Readiness checklist completeness", "rule_type": "ppp_readiness_pct", "field_path": "vgf_calculation_data.checklist", "max_points": 25, "thresholds": [{"min": 3, "points": 13}, {"min": 5, "points": 25}]},
  {"key": "funding_request_doc", "label": "Funding request document uploaded", "rule_type": "document_exists", "field_path": "funding_request", "max_points": 20}
]'::jsonb);
