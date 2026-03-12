-- Graduate MSDP goal scoring: more goals = more points
-- Primary goal: 10 pts for selecting any
-- Secondary goals: graduated 3/7/10 pts for 1/2/3+ additional goals

UPDATE scoring_criteria
SET sub_criteria = '[
  {"key": "ndp_goal_linked", "label": "MSDP goal linked", "rule_type": "not_null", "field_path": "ndp_goal_id", "max_points": 10},
  {"key": "ndp_aligned_flag", "label": "NDP aligned flag set", "rule_type": "boolean_field", "field_path": "ndp_aligned", "max_points": 5},
  {"key": "secondary_goals_count", "label": "Additional MSDP goals", "rule_type": "array_length", "field_path": "secondary_ndp_goals", "max_points": 10, "thresholds": [{"min": 1, "points": 3}, {"min": 2, "points": 7}, {"min": 3, "points": 10}]},
  {"key": "sdg_count", "label": "SDG goals linked", "rule_type": "array_length", "field_path": "sdg_goals", "max_points": 10, "thresholds": [{"min": 1, "points": 5}, {"min": 3, "points": 10}]},
  {"key": "msdp_strategy", "label": "MSDP strategy area specified", "rule_type": "not_null", "field_path": "msdp_strategy_area", "max_points": 10},
  {"key": "alignment_justification", "label": "Alignment justification quality", "rule_type": "text_length", "field_path": "alignment_justification", "max_points": 10, "thresholds": [{"min": 50, "points": 5}, {"min": 200, "points": 10}]},
  {"key": "sector_strategy_ref", "label": "Sector strategy reference", "rule_type": "not_null", "field_path": "sector_strategy_reference", "max_points": 5},
  {"key": "in_sector_plan", "label": "In sector investment plan", "rule_type": "boolean_field", "field_path": "in_sector_investment_plan", "max_points": 5}
]'::jsonb
WHERE rubric_version_id = 'a0000000-0000-0000-0000-000000000001'
  AND stage = 'intake'
  AND dimension = 'msdp_alignment';
