-- ============================================
-- NATIONAL PLANS SYSTEM
-- Container for grouping national priorities into independent plans/strategies
-- Extends the existing national_priorities system
-- ============================================

-- Table for national development plans and sectoral strategies
CREATE TABLE IF NOT EXISTS national_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  acronym VARCHAR(50),
  name_local VARCHAR(255),
  description TEXT,
  plan_type VARCHAR(20) NOT NULL DEFAULT 'national' CHECK (plan_type IN ('national', 'sectoral', 'thematic')),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Ensure columns exist (handles case where table was created without them)
ALTER TABLE national_plans
  ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) NOT NULL DEFAULT 'national';
ALTER TABLE national_plans
  ADD COLUMN IF NOT EXISTS acronym VARCHAR(50);
ALTER TABLE national_plans
  ADD COLUMN IF NOT EXISTS level1_label VARCHAR(50) NOT NULL DEFAULT 'Goal';
ALTER TABLE national_plans
  ADD COLUMN IF NOT EXISTS level2_label VARCHAR(50) NOT NULL DEFAULT 'Objective';
ALTER TABLE national_plans
  ADD COLUMN IF NOT EXISTS level3_label VARCHAR(50) NOT NULL DEFAULT 'Action';
ALTER TABLE national_plans
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- Add check constraint if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'national_plans_plan_type_check'
  ) THEN
    ALTER TABLE national_plans
      ADD CONSTRAINT national_plans_plan_type_check
      CHECK (plan_type IN ('national', 'sectoral', 'thematic'));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_national_plans_active ON national_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_national_plans_display_order ON national_plans(display_order);
CREATE INDEX IF NOT EXISTS idx_national_plans_type ON national_plans(plan_type);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_national_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_national_plans_updated_at ON national_plans;
CREATE TRIGGER trigger_update_national_plans_updated_at
  BEFORE UPDATE ON national_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_national_plans_updated_at();

-- RLS: Anyone can read, authenticated users can manage
ALTER TABLE national_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read national_plans" ON national_plans;
CREATE POLICY "Anyone can read national_plans" ON national_plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage national_plans" ON national_plans;
CREATE POLICY "Authenticated users can manage national_plans" ON national_plans
  FOR ALL USING (true);

-- ============================================
-- ADD plan_id TO national_priorities
-- ============================================

-- Step 1: Add nullable plan_id column
ALTER TABLE national_priorities
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES national_plans(id) ON DELETE CASCADE;

-- Step 2: Assign any orphaned priorities to the first available plan
-- (Legacy plan creation removed — orphans are cleaned up instead)
DO $$
DECLARE
  fallback_plan_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM national_priorities WHERE plan_id IS NULL LIMIT 1) THEN
    SELECT id INTO fallback_plan_id FROM national_plans ORDER BY display_order LIMIT 1;
    IF fallback_plan_id IS NOT NULL THEN
      UPDATE national_priorities SET plan_id = fallback_plan_id WHERE plan_id IS NULL;
    ELSE
      -- No plans exist yet — delete orphaned priorities
      DELETE FROM national_priorities WHERE plan_id IS NULL;
    END IF;
  END IF;
END $$;

-- Step 3: Make plan_id NOT NULL now that all rows have a value
ALTER TABLE national_priorities
  ALTER COLUMN plan_id SET NOT NULL;

-- Step 4: Add index on plan_id
CREATE INDEX IF NOT EXISTS idx_national_priorities_plan ON national_priorities(plan_id);

-- Step 5: Drop old unique constraint and create new one that includes plan_id
-- The old constraint was: UNIQUE (parent_id, code)
-- The new constraint is: UNIQUE (plan_id, parent_id, code)
ALTER TABLE national_priorities
  DROP CONSTRAINT IF EXISTS unique_code_per_parent;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_code_per_plan_parent'
      AND table_name = 'national_priorities'
  ) THEN
    ALTER TABLE national_priorities
      ADD CONSTRAINT unique_code_per_plan_parent UNIQUE (plan_id, parent_id, code);
  END IF;
END $$;

-- ============================================
-- SEED EXAMPLE PLANS & STRATEGIES
-- ============================================

INSERT INTO national_plans (name, acronym, description, plan_type, start_date, end_date, is_active, display_order) VALUES
  ('National Education Strategic Plan', 'NESP', 'Strategic plan for the education sector covering primary, secondary, and higher education', 'sectoral', '2021-01-01', '2030-12-31', true, 10),
  ('National Health Plan', 'NHP', 'Comprehensive health sector strategy covering universal health coverage, disease prevention, and health system strengthening', 'sectoral', '2021-01-01', '2026-12-31', true, 11),
  ('National Strategy for Rural Development', 'NSRD', 'Strategy for improving livelihoods and infrastructure in rural areas', 'sectoral', '2022-01-01', '2027-12-31', true, 12),
  ('Climate Change Strategy and Action Plan', 'CCSAP', 'National climate change adaptation and mitigation strategy', 'thematic', '2023-01-01', '2030-12-31', true, 20),
  ('National Gender Equality Strategy', 'NGES', 'Strategy for advancing gender equality and women''s empowerment across all sectors', 'thematic', '2022-01-01', '2027-12-31', true, 21),
  ('National Financial Inclusion Strategy', 'NFIS', 'Strategy to expand access to financial services for underserved populations', 'thematic', '2023-01-01', '2028-12-31', true, 22)
ON CONFLICT DO NOTHING;
