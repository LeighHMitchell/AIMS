-- 1. Add 'returned_to_desk' decision to all review tables
-- Allows senior reviewers to send projects back to desk review

-- intake_reviews: drop and re-add decision CHECK
ALTER TABLE intake_reviews DROP CONSTRAINT IF EXISTS intake_reviews_decision_check;
ALTER TABLE intake_reviews ADD CONSTRAINT intake_reviews_decision_check
  CHECK (decision IN ('screened', 'approved', 'returned', 'returned_to_desk', 'rejected'));

-- fs1_reviews: drop and re-add decision CHECK
ALTER TABLE fs1_reviews DROP CONSTRAINT IF EXISTS fs1_reviews_decision_check;
ALTER TABLE fs1_reviews ADD CONSTRAINT fs1_reviews_decision_check
  CHECK (decision IN ('screened', 'passed', 'returned', 'returned_to_desk', 'rejected'));

-- fs2_reviews: drop and re-add decision CHECK
ALTER TABLE fs2_reviews DROP CONSTRAINT IF EXISTS fs2_reviews_decision_check;
ALTER TABLE fs2_reviews ADD CONSTRAINT fs2_reviews_decision_check
  CHECK (decision IN ('screened', 'passed', 'returned', 'returned_to_desk', 'rejected'));

-- 2. Add desk_claimed stages for 3-column Kanban (Pending → Desk Review → Senior Review)
ALTER TABLE project_bank_projects DROP CONSTRAINT IF EXISTS chk_project_stage;
ALTER TABLE project_bank_projects ADD CONSTRAINT chk_project_stage
  CHECK (project_stage IN (
    'intake_draft', 'intake_submitted', 'intake_desk_claimed', 'intake_desk_screened', 'intake_approved', 'intake_returned', 'intake_rejected',
    'fs1_draft', 'fs1_submitted', 'fs1_desk_claimed', 'fs1_desk_screened', 'fs1_approved', 'fs1_returned', 'fs1_rejected',
    'fs2_assigned', 'fs2_in_progress', 'fs2_completed', 'fs2_desk_claimed', 'fs2_desk_reviewed', 'fs2_senior_reviewed', 'fs2_returned', 'fs2_categorized',
    'fs3_in_progress', 'fs3_completed'
  ));
