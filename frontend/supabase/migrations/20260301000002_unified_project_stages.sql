-- Unified Project Stages
-- Replaces dual appraisal_stage + feasibility_stage with a single project_stage column.

-- 1. Add the new column (nullable first so we can seed)
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS project_stage TEXT;

-- 2. Seed from existing data
--    Priority: feasibility_stage (more granular) → appraisal_stage → default
UPDATE project_bank_projects SET project_stage = CASE
  -- Map feasibility_stage values (most specific)
  WHEN feasibility_stage = 'fs1_submitted'     THEN 'fs1_submitted'
  WHEN feasibility_stage = 'fs1_desk_screened'  THEN 'fs1_submitted'   -- still under FS-1 review
  WHEN feasibility_stage = 'fs1_passed'         THEN 'fs1_approved'
  WHEN feasibility_stage = 'fs1_returned'       THEN 'fs1_returned'
  WHEN feasibility_stage = 'fs1_rejected'       THEN 'fs1_rejected'
  WHEN feasibility_stage = 'fs2_assigned'       THEN 'fs2_assigned'
  WHEN feasibility_stage = 'fs2_in_progress'    THEN 'fs2_in_progress'
  WHEN feasibility_stage = 'fs2_completed'      THEN 'fs2_completed'
  WHEN feasibility_stage = 'categorized'        THEN 'fs2_categorized'
  WHEN feasibility_stage = 'fs3_in_progress'    THEN 'fs3_in_progress'
  WHEN feasibility_stage = 'fs3_completed'      THEN 'fs3_completed'
  -- Map appraisal_stage values (when feasibility_stage is null or registered)
  WHEN appraisal_stage = 'intake'               THEN 'intake_draft'
  WHEN appraisal_stage = 'preliminary_fs'       THEN 'fs1_draft'
  WHEN appraisal_stage = 'msdp_screening'       THEN 'fs1_draft'
  WHEN appraisal_stage = 'firr_assessment'      THEN 'fs1_draft'
  WHEN appraisal_stage = 'eirr_assessment'      THEN 'fs1_draft'
  WHEN appraisal_stage = 'vgf_assessment'       THEN 'fs1_draft'
  WHEN appraisal_stage = 'dp_consultation'      THEN 'fs1_draft'
  WHEN appraisal_stage = 'routing_complete'     THEN 'fs1_submitted'
  WHEN appraisal_stage = 'rejected'             THEN 'intake_rejected'
  -- Default
  ELSE 'intake_draft'
END
WHERE project_stage IS NULL;

-- 3. Set NOT NULL default
ALTER TABLE project_bank_projects
  ALTER COLUMN project_stage SET DEFAULT 'intake_draft',
  ALTER COLUMN project_stage SET NOT NULL;

-- 4. Add CHECK constraint for valid values
ALTER TABLE project_bank_projects
  ADD CONSTRAINT chk_project_stage CHECK (project_stage IN (
    'intake_draft', 'intake_submitted', 'intake_approved', 'intake_returned', 'intake_rejected',
    'fs1_draft', 'fs1_submitted', 'fs1_approved', 'fs1_returned', 'fs1_rejected',
    'fs2_assigned', 'fs2_in_progress', 'fs2_completed', 'fs2_categorized',
    'fs3_in_progress', 'fs3_completed'
  ));

-- 5. Add index for common queries
CREATE INDEX IF NOT EXISTS idx_project_bank_project_stage
  ON project_bank_projects (project_stage);

-- 6. Add review_comments column for intake/fs1 return feedback
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS review_comments TEXT;
