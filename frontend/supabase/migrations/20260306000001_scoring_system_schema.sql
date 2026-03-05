-- Scoring System Schema
-- Multi-stage scoring rubric with versioning and immutable score snapshots

-- 1. Versioned rubric configurations
CREATE TABLE scoring_rubric_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active version at a time
CREATE UNIQUE INDEX idx_scoring_rubric_active
  ON scoring_rubric_versions (is_active)
  WHERE is_active = true;

-- 2. Criteria: one row per dimension per stage per rubric version
CREATE TABLE scoring_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_version_id UUID NOT NULL REFERENCES scoring_rubric_versions(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('intake', 'fs1', 'fs2')),
  dimension TEXT NOT NULL CHECK (dimension IN (
    'msdp_alignment', 'financial_viability', 'technical_maturity',
    'environmental_social_risk', 'institutional_capacity'
  )),
  dimension_weight NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  sub_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rubric_version_id, stage, dimension)
);

-- 3. Immutable score snapshots (INSERT-only)
CREATE TABLE project_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  rubric_version_id UUID NOT NULL REFERENCES scoring_rubric_versions(id),
  stage TEXT NOT NULL CHECK (stage IN ('intake', 'fs1', 'fs2')),
  composite_score NUMERIC(5,2) NOT NULL,
  dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_project_scores_project ON project_scores(project_id);
CREATE INDEX idx_project_scores_project_stage ON project_scores(project_id, stage);

-- 4. Denormalized latest score on projects for fast listing sort
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS latest_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS latest_score_stage TEXT,
  ADD COLUMN IF NOT EXISTS latest_score_id UUID REFERENCES project_scores(id);

-- RLS Policies
ALTER TABLE scoring_rubric_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rubric versions"
  ON scoring_rubric_versions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage rubric versions"
  ON scoring_rubric_versions FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read scoring criteria"
  ON scoring_criteria FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage scoring criteria"
  ON scoring_criteria FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read project scores"
  ON project_scores FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert project scores"
  ON project_scores FOR INSERT
  TO authenticated WITH CHECK (true);
