-- Review Board Improvements: two-step intake & FS-2 review, new stages
-- ====================================================================

-- 1. Widen project_stage CHECK to accept new values
--    (DROP + re-ADD approach since ALTER CONSTRAINT is not supported)
ALTER TABLE project_bank_projects DROP CONSTRAINT IF EXISTS chk_project_stage;
ALTER TABLE project_bank_projects ADD CONSTRAINT chk_project_stage
  CHECK (project_stage IN (
    'intake_draft', 'intake_submitted', 'intake_desk_screened', 'intake_approved', 'intake_returned', 'intake_rejected',
    'fs1_draft', 'fs1_submitted', 'fs1_desk_screened', 'fs1_approved', 'fs1_returned', 'fs1_rejected',
    'fs2_assigned', 'fs2_in_progress', 'fs2_completed', 'fs2_desk_reviewed', 'fs2_senior_reviewed', 'fs2_returned', 'fs2_categorized',
    'fs3_in_progress', 'fs3_completed'
  ));

-- 2. Widen feasibility_stage CHECK to accept new values
ALTER TABLE project_bank_projects DROP CONSTRAINT IF EXISTS chk_feasibility_stage;
ALTER TABLE project_bank_projects ADD CONSTRAINT chk_feasibility_stage
  CHECK (feasibility_stage IS NULL OR feasibility_stage IN (
    'registered',
    'fs1_submitted', 'fs1_desk_screened', 'fs1_passed', 'fs1_returned', 'fs1_rejected',
    'fs2_assigned', 'fs2_in_progress', 'fs2_completed', 'fs2_desk_reviewed', 'fs2_senior_reviewed', 'fs2_returned',
    'categorized',
    'fs3_in_progress', 'fs3_completed'
  ));

-- 3. Create intake_reviews table (mirrors fs1_reviews pattern)
CREATE TABLE IF NOT EXISTS intake_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id),
  review_tier text NOT NULL CHECK (review_tier IN ('desk', 'senior')),
  decision text NOT NULL CHECK (decision IN ('screened', 'approved', 'returned', 'rejected')),
  comments text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_reviews_project_id ON intake_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_intake_reviews_reviewer_id ON intake_reviews(reviewer_id);

ALTER TABLE intake_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_reviews_select" ON intake_reviews FOR SELECT USING (true);
CREATE POLICY "intake_reviews_insert" ON intake_reviews FOR INSERT WITH CHECK (true);

-- 4. Create fs2_reviews table (same pattern)
CREATE TABLE IF NOT EXISTS fs2_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id),
  review_tier text NOT NULL CHECK (review_tier IN ('desk', 'senior')),
  decision text NOT NULL CHECK (decision IN ('screened', 'passed', 'returned', 'rejected')),
  comments text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fs2_reviews_project_id ON fs2_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_fs2_reviews_reviewer_id ON fs2_reviews(reviewer_id);

ALTER TABLE fs2_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fs2_reviews_select" ON fs2_reviews FOR SELECT USING (true);
CREATE POLICY "fs2_reviews_insert" ON fs2_reviews FOR INSERT WITH CHECK (true);
