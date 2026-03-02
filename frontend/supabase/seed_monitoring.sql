-- Seed data: Projects with monitoring schedules and reports
-- Run with: psql or supabase db execute

-- 1. Insert projects that are in implementation/approved status (monitorable)
INSERT INTO project_bank_projects (project_code, name, description, nominating_ministry, sector, region, estimated_cost, currency, ndp_aligned, status, feasibility_stage, origin, appraisal_stage)
VALUES
  ('', 'Myitkyina Water Supply Improvement', 'Upgrading the municipal water supply network for 200,000 residents in Myitkyina City, including new treatment plant and distribution mains', 'Ministry of Construction', 'Water Resources', 'Kachin', 38000000, 'USD', true, 'approved', 'fs2_completed', 'government', 'vgf_assessment'),
  ('', 'Monywa Industrial Zone Expansion', 'Phase 2 expansion of Monywa industrial zone adding 120 hectares with roads, power, and water infrastructure', 'Ministry of Industry', 'Industry', 'Sagaing', 52000000, 'USD', true, 'approved', 'categorized', 'government', 'detailed_fs'),
  ('', 'Pathein–Mawlamyine Coastal Road', 'Construction of 280km all-weather coastal road connecting Pathein to Mawlamyine via the Ayeyarwady delta', 'Ministry of Construction', 'Transport', 'Ayeyarwady', 210000000, 'USD', true, 'approved', 'categorized', 'government', 'detailed_fs'),
  ('', 'Mandalay Solid Waste Management', 'Integrated solid waste collection, transfer, and sanitary landfill system for Mandalay metro area (1.2M population)', 'Ministry of Natural Resources and Environmental Conservation', 'Environment', 'Mandalay', 45000000, 'USD', true, 'approved', 'fs2_completed', 'government', 'vgf_assessment'),
  ('', 'Taunggyi Solar Microgrid Network', 'Deployment of 15 interconnected solar microgrids serving 40 off-grid villages in southern Shan State', 'Ministry of Electric Power', 'Energy', 'Shan', 12000000, 'USD', true, 'approved', 'categorized', 'government', 'detailed_fs'),
  ('', 'National Teacher Training Centers (Phase I)', 'Construction of 5 regional teacher training centers in Sagaing, Magway, Bago, Mon, and Chin', 'Ministry of Education', 'Education', 'Nationwide', 32000000, 'USD', true, 'approved', 'categorized', 'government', 'detailed_fs');

-- 2. Insert monitoring schedules for the new projects
-- Each gets an active monitoring schedule with a different interval and next_due_date
INSERT INTO project_monitoring_schedules (project_id, interval_months, next_due_date, is_active)
SELECT p.id, 6, '2026-03-15', true
FROM project_bank_projects p WHERE p.name = 'Myitkyina Water Supply Improvement' LIMIT 1;

INSERT INTO project_monitoring_schedules (project_id, interval_months, next_due_date, is_active)
SELECT p.id, 3, '2026-02-28', true
FROM project_bank_projects p WHERE p.name = 'Monywa Industrial Zone Expansion' LIMIT 1;

INSERT INTO project_monitoring_schedules (project_id, interval_months, next_due_date, is_active)
SELECT p.id, 6, '2026-04-01', true
FROM project_bank_projects p WHERE p.name = 'Pathein–Mawlamyine Coastal Road' LIMIT 1;

INSERT INTO project_monitoring_schedules (project_id, interval_months, next_due_date, is_active)
SELECT p.id, 3, '2026-02-15', true
FROM project_bank_projects p WHERE p.name = 'Mandalay Solid Waste Management' LIMIT 1;

INSERT INTO project_monitoring_schedules (project_id, interval_months, next_due_date, is_active)
SELECT p.id, 6, '2026-05-01', true
FROM project_bank_projects p WHERE p.name = 'Taunggyi Solar Microgrid Network' LIMIT 1;

INSERT INTO project_monitoring_schedules (project_id, interval_months, next_due_date, is_active)
SELECT p.id, 12, '2026-09-01', true
FROM project_bank_projects p WHERE p.name = 'National Teacher Training Centers (Phase I)' LIMIT 1;

-- 3. Insert monitoring reports (mix of reviewed, pending, overdue)
-- Myitkyina Water Supply — 1 reviewed (compliant) + 1 pending
INSERT INTO project_monitoring_reports (project_id, schedule_id, report_period_start, report_period_end, due_date, submitted_date, status, compliance_status, key_findings, recommendations)
SELECT p.id, s.id, '2025-06-01', '2025-12-01', '2025-12-01', '2025-11-28', 'reviewed', 'compliant',
  'Construction of water treatment plant 72% complete. Distribution network installation ahead of schedule in 3 of 5 zones. Water quality testing meets WHO standards.',
  'Continue current pace. Prioritize Zone 4 connections before monsoon season. Request additional soil testing for Zone 5 pipeline route.'
FROM project_bank_projects p
JOIN project_monitoring_schedules s ON s.project_id = p.id
WHERE p.name = 'Myitkyina Water Supply Improvement' LIMIT 1;

INSERT INTO project_monitoring_reports (project_id, schedule_id, report_period_start, report_period_end, due_date, status, compliance_status)
SELECT p.id, s.id, '2025-12-01', '2026-06-01', '2026-03-15', 'pending', 'pending'
FROM project_bank_projects p
JOIN project_monitoring_schedules s ON s.project_id = p.id
WHERE p.name = 'Myitkyina Water Supply Improvement' LIMIT 1;

-- Monywa Industrial Zone — 2 reviewed (1 compliant, 1 non-compliant) + 1 overdue
INSERT INTO project_monitoring_reports (project_id, schedule_id, report_period_start, report_period_end, due_date, submitted_date, status, compliance_status, key_findings, recommendations)
SELECT p.id, s.id, '2025-06-01', '2025-09-01', '2025-09-01', '2025-09-05', 'reviewed', 'compliant',
  'Land clearing completed for 80 of 120 hectares. Environmental impact mitigation measures in place. Road grading begun on internal road network.',
  'Accelerate clearing of remaining 40 hectares. Monitor dust suppression compliance during dry season.'
FROM project_bank_projects p
JOIN project_monitoring_schedules s ON s.project_id = p.id
WHERE p.name = 'Monywa Industrial Zone Expansion' LIMIT 1;

INSERT INTO project_monitoring_reports (project_id, schedule_id, report_period_start, report_period_end, due_date, submitted_date, status, compliance_status, key_findings, recommendations)
SELECT p.id, s.id, '2025-09-01', '2025-12-01', '2025-12-01', '2025-12-10', 'reviewed', 'non_compliant',
  'Road construction delayed 6 weeks due to contractor mobilization issues. Power substation procurement behind schedule — bid evaluation not yet complete. Budget utilization at 45% vs planned 60%.',
  'Issue show-cause notice to road contractor. Fast-track power substation procurement with single-source justification. Monthly progress meetings with all contractors required.'
FROM project_bank_projects p
JOIN project_monitoring_schedules s ON s.project_id = p.id
WHERE p.name = 'Monywa Industrial Zone Expansion' LIMIT 1;

INSERT INTO project_monitoring_reports (project_id, schedule_id, report_period_start, report_period_end, due_date, status, compliance_status)
SELECT p.id, s.id, '2025-12-01', '2026-03-01', '2026-02-28', 'overdue', 'pending'
FROM project_bank_projects p
JOIN project_monitoring_schedules s ON s.project_id = p.id
WHERE p.name = 'Monywa Industrial Zone Expansion' LIMIT 1;

-- Pathein–Mawlamyine Coastal Road — 1 reviewed + 1 pending
INSERT INTO project_monitoring_reports (project_id, schedule_id, report_period_start, report_period_end, due_date, submitted_date, status, compliance_status, key_findings, recommendations)
SELECT p.id, s.id, '2025-09-01', '2026-03-01', '2025-12-15', '2025-12-12', 'reviewed', 'compliant',
  'Detailed engineering design completed for 280km route. Environmental clearance obtained. Right-of-way acquisition 60% complete across 3 townships. Geotechnical surveys confirm viability of delta crossing alignment.',
  'Prioritize ROW acquisition in remaining townships. Begin early works package (bridges) to maintain schedule. Engage with delta communities on resettlement action plan.'
FROM project_bank_projects p
JOIN project_monitoring_schedules s ON s.project_id = p.id
WHERE p.name = 'Pathein–Mawlamyine Coastal Road' LIMIT 1;

INSERT INTO project_monitoring_reports (project_id, schedule_id, report_period_start, report_period_end, due_date, status, compliance_status)
SELECT p.id, s.id, '2026-03-01', '2026-09-01', '2026-04-01', 'pending', 'pending'
FROM project_bank_projects p
JOIN project_monitoring_schedules s ON s.project_id = p.id
WHERE p.name = 'Pathein–Mawlamyine Coastal Road' LIMIT 1;

-- Mandalay Solid Waste — 1 reviewed (non-compliant) — overdue next report
INSERT INTO project_monitoring_reports (project_id, schedule_id, report_period_start, report_period_end, due_date, submitted_date, status, compliance_status, key_findings, recommendations)
SELECT p.id, s.id, '2025-08-01', '2025-11-01', '2025-11-15', '2025-11-20', 'reviewed', 'non_compliant',
  'Landfill site preparation 40% complete — behind 55% target. Collection vehicle procurement completed (25 trucks delivered). Transfer station construction not yet started due to permitting delays.',
  'Escalate transfer station permits to regional government. Consider temporary collection points to maintain service levels. Review landfill contractor capacity and consider additional resources.'
FROM project_bank_projects p
JOIN project_monitoring_schedules s ON s.project_id = p.id
WHERE p.name = 'Mandalay Solid Waste Management' LIMIT 1;

INSERT INTO project_monitoring_reports (project_id, schedule_id, report_period_start, report_period_end, due_date, status, compliance_status)
SELECT p.id, s.id, '2025-11-01', '2026-02-01', '2026-02-15', 'overdue', 'pending'
FROM project_bank_projects p
JOIN project_monitoring_schedules s ON s.project_id = p.id
WHERE p.name = 'Mandalay Solid Waste Management' LIMIT 1;

-- Taunggyi Solar Microgrid — 1 pending (first report)
INSERT INTO project_monitoring_reports (project_id, schedule_id, report_period_start, report_period_end, due_date, status, compliance_status)
SELECT p.id, s.id, '2025-11-01', '2026-05-01', '2026-05-01', 'pending', 'pending'
FROM project_bank_projects p
JOIN project_monitoring_schedules s ON s.project_id = p.id
WHERE p.name = 'Taunggyi Solar Microgrid Network' LIMIT 1;

-- Teacher Training Centers — 1 pending (first report, long cycle)
INSERT INTO project_monitoring_reports (project_id, schedule_id, report_period_start, report_period_end, due_date, status, compliance_status)
SELECT p.id, s.id, '2025-09-01', '2026-09-01', '2026-09-01', 'pending', 'pending'
FROM project_bank_projects p
JOIN project_monitoring_schedules s ON s.project_id = p.id
WHERE p.name = 'National Teacher Training Centers (Phase I)' LIMIT 1;
