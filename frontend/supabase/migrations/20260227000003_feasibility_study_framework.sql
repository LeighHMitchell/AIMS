-- ============================================================================
-- Three-Tier Feasibility Study Framework
-- Adds FS-1 (Preliminary Screening), FS-2 (Detailed Feasibility),
-- FS-3 (PPP Structuring) workflow to the Project Bank.
-- ============================================================================

-- 1. Add feasibility stage and related columns to project_bank_projects
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS feasibility_stage TEXT DEFAULT 'registered',
  ADD COLUMN IF NOT EXISTS fs1_rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fs1_resubmission_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category_recommendation TEXT,
  ADD COLUMN IF NOT EXISTS category_decision TEXT,
  ADD COLUMN IF NOT EXISTS category_rationale TEXT,
  ADD COLUMN IF NOT EXISTS proceeding_independently BOOLEAN DEFAULT FALSE;

-- Add check constraint for feasibility_stage
ALTER TABLE project_bank_projects
  ADD CONSTRAINT chk_feasibility_stage CHECK (
    feasibility_stage IS NULL OR feasibility_stage IN (
      'registered',
      'fs1_submitted', 'fs1_desk_screened', 'fs1_passed', 'fs1_returned', 'fs1_rejected',
      'fs2_assigned', 'fs2_in_progress', 'fs2_completed',
      'categorized',
      'fs3_in_progress', 'fs3_completed'
    )
  );

-- Add check constraint for category_recommendation / category_decision
ALTER TABLE project_bank_projects
  ADD CONSTRAINT chk_category_recommendation CHECK (
    category_recommendation IS NULL OR category_recommendation IN ('category_a', 'category_b', 'category_c')
  );
ALTER TABLE project_bank_projects
  ADD CONSTRAINT chk_category_decision CHECK (
    category_decision IS NULL OR category_decision IN ('category_a', 'category_b', 'category_c')
  );

-- 2. PPP support mechanism fields (FS-3)
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS ppp_support_mechanism TEXT,
  ADD COLUMN IF NOT EXISTS mrg_guaranteed_minimum NUMERIC,
  ADD COLUMN IF NOT EXISTS mrg_trigger_conditions TEXT,
  ADD COLUMN IF NOT EXISTS mrg_government_liability_cap NUMERIC,
  ADD COLUMN IF NOT EXISTS mrg_duration_years INTEGER,
  ADD COLUMN IF NOT EXISTS availability_payment_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS availability_payment_duration_years INTEGER,
  ADD COLUMN IF NOT EXISTS availability_payment_conditions TEXT;

ALTER TABLE project_bank_projects
  ADD CONSTRAINT chk_ppp_support_mechanism CHECK (
    ppp_support_mechanism IS NULL OR ppp_support_mechanism IN (
      'vgf', 'mrg', 'availability_payment', 'interest_subsidy', 'tax_incentive', 'land_grant', 'combined'
    )
  );

-- 3. FS-1 Narratives table
CREATE TABLE IF NOT EXISTS fs1_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  problem_statement TEXT NOT NULL,
  target_beneficiaries TEXT NOT NULL,
  ndp_alignment_justification TEXT NOT NULL,
  expected_outcomes TEXT NOT NULL,
  preliminary_cost_justification TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fs1_narratives_project ON fs1_narratives(project_id);

-- 4. FS-1 Reviews table
CREATE TABLE IF NOT EXISTS fs1_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  narrative_id UUID REFERENCES fs1_narratives(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES auth.users(id),
  review_tier TEXT NOT NULL CHECK (review_tier IN ('desk', 'senior')),
  decision TEXT NOT NULL CHECK (decision IN ('screened', 'passed', 'returned', 'rejected')),
  comments TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fs1_reviews_project ON fs1_reviews(project_id);

-- 5. FS-2 Assignments table
CREATE TABLE IF NOT EXISTS fs2_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  assigned_to TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
  completed_at TIMESTAMPTZ,
  report_document_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fs2_assignments_project ON fs2_assignments(project_id);

-- 6. Cool-down enforcement function
CREATE OR REPLACE FUNCTION check_fs1_cooldown()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM project_bank_projects
    WHERE nominating_ministry = NEW.nominating_ministry
    AND name ILIKE '%' || NEW.name || '%'
    AND fs1_rejected_at IS NOT NULL
    AND fs1_rejected_at > NOW() - INTERVAL '6 months'
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'A similar project from this ministry was rejected within the last 6 months';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_fs1_cooldown'
  ) THEN
    CREATE TRIGGER trg_check_fs1_cooldown
      BEFORE INSERT ON project_bank_projects
      FOR EACH ROW
      EXECUTE FUNCTION check_fs1_cooldown();
  END IF;
END;
$$;

-- 7. RLS policies for new tables
ALTER TABLE fs1_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE fs1_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE fs2_assignments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all records
CREATE POLICY "Authenticated users can read fs1_narratives"
  ON fs1_narratives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fs1_narratives"
  ON fs1_narratives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fs1_narratives"
  ON fs1_narratives FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read fs1_reviews"
  ON fs1_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fs1_reviews"
  ON fs1_reviews FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read fs2_assignments"
  ON fs2_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fs2_assignments"
  ON fs2_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fs2_assignments"
  ON fs2_assignments FOR UPDATE TO authenticated USING (true);
