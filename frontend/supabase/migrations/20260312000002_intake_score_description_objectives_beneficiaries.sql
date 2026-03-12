-- Add description, objectives (updated), and target_beneficiaries to intake Technical Maturity scoring
-- Awards points for 200+ character text in each field

UPDATE scoring_criteria
SET sub_criteria = '[
  {"key": "description", "label": "Project description (200+ chars)", "rule_type": "text_length", "field_path": "description", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "objectives", "label": "Objectives defined (200+ chars)", "rule_type": "text_length", "field_path": "objectives", "max_points": 15, "thresholds": [{"min": 50, "points": 8}, {"min": 200, "points": 15}]},
  {"key": "target_beneficiaries", "label": "Target beneficiaries described (200+ chars)", "rule_type": "text_length", "field_path": "target_beneficiaries", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "region", "label": "Region specified", "rule_type": "not_null", "field_path": "region", "max_points": 5},
  {"key": "project_type", "label": "Project type specified", "rule_type": "not_null", "field_path": "project_type", "max_points": 10},
  {"key": "concept_note", "label": "Concept note uploaded", "rule_type": "document_exists", "field_path": "concept_note", "max_points": 15},
  {"key": "proposal_doc", "label": "Project proposal uploaded", "rule_type": "document_exists", "field_path": "project_proposal", "max_points": 15},
  {"key": "timeline", "label": "Timeline provided", "rule_type": "not_null", "field_path": "estimated_duration_months", "max_points": 10}
]'::jsonb
WHERE rubric_version_id = 'a0000000-0000-0000-0000-000000000001'
  AND stage = 'intake'
  AND dimension = 'technical_maturity';
