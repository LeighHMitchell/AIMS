-- =====================================================
-- TASK TEMPLATES
-- Reusable blueprints for creating tasks
-- =====================================================

-- =====================================================
-- 1. TASK_TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identity
  name TEXT NOT NULL,
  description TEXT,

  -- Default task content
  default_title TEXT NOT NULL,
  default_body TEXT,

  -- Default delivery settings
  default_send_in_app BOOLEAN DEFAULT TRUE,
  default_send_email BOOLEAN DEFAULT FALSE,

  -- Default task settings
  default_priority TEXT DEFAULT 'medium' CHECK (default_priority IN ('high', 'medium', 'low')),
  default_reminder_days INTEGER DEFAULT 3,
  default_task_type TEXT DEFAULT 'information' CHECK (default_task_type IN ('reporting', 'validation', 'compliance', 'information')),

  -- Default targeting
  default_target_scope TEXT CHECK (default_target_scope IN ('organisation', 'role', 'user', 'activity_set')),

  -- Template classification
  is_system_template BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Creator tracking
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES (with IF NOT EXISTS for idempotency)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_task_templates_created_by_user ON task_templates(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_created_by_org ON task_templates(created_by_org_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_is_system ON task_templates(is_system_template) WHERE is_system_template = TRUE;
CREATE INDEX IF NOT EXISTS idx_task_templates_is_active ON task_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_task_templates_name ON task_templates(name);

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES (drop first for idempotency)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view system templates" ON task_templates;
DROP POLICY IF EXISTS "Users can view own templates" ON task_templates;
DROP POLICY IF EXISTS "Users can view org templates" ON task_templates;
DROP POLICY IF EXISTS "Super users can view all templates" ON task_templates;
DROP POLICY IF EXISTS "Users can create templates" ON task_templates;
DROP POLICY IF EXISTS "Super users can create system templates" ON task_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON task_templates;
DROP POLICY IF EXISTS "Super users can update any template" ON task_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON task_templates;
DROP POLICY IF EXISTS "Super users can delete any template" ON task_templates;

-- Anyone can view system templates
CREATE POLICY "Anyone can view system templates"
  ON task_templates FOR SELECT
  USING (is_system_template = TRUE AND is_active = TRUE);

-- Users can view their own templates
CREATE POLICY "Users can view own templates"
  ON task_templates FOR SELECT
  USING (auth.uid() = created_by_user_id);

-- Users can view their org's templates
CREATE POLICY "Users can view org templates"
  ON task_templates FOR SELECT
  USING (
    created_by_org_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = task_templates.created_by_org_id
    )
  );

-- Super users can view all templates
CREATE POLICY "Super users can view all templates"
  ON task_templates FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- Users can create personal templates
CREATE POLICY "Users can create templates"
  ON task_templates FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_user_id AND
    is_system_template = FALSE
  );

-- Super users can create system templates
CREATE POLICY "Super users can create system templates"
  ON task_templates FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON task_templates FOR UPDATE
  USING (
    auth.uid() = created_by_user_id AND
    is_system_template = FALSE
  )
  WITH CHECK (
    auth.uid() = created_by_user_id AND
    is_system_template = FALSE
  );

-- Super users can update any template
CREATE POLICY "Super users can update any template"
  ON task_templates FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON task_templates FOR DELETE
  USING (
    auth.uid() = created_by_user_id AND
    is_system_template = FALSE
  );

-- Super users can delete any template
CREATE POLICY "Super users can delete any template"
  ON task_templates FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- =====================================================
-- 5. UPDATED_AT TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS update_task_templates_updated_at ON task_templates;
CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- =====================================================
-- 6. SEED SYSTEM TEMPLATES (upsert for idempotency)
-- =====================================================
INSERT INTO task_templates (
  name, description, default_title, default_body,
  default_send_in_app, default_send_email, default_priority,
  default_task_type, default_target_scope, is_system_template
) VALUES
(
  'Quarterly Disbursement Update',
  'Request quarterly disbursement reporting from implementing partners',
  'Quarterly Disbursement Report Required',
  'Please update your disbursement figures for the current quarter. This is required for financial reporting and compliance purposes.',
  TRUE, TRUE, 'high',
  'reporting', 'organisation', TRUE
),
(
  'Annual Results Reporting',
  'Request annual results framework updates from partners',
  'Annual Results Report Due',
  'Please submit your annual results reporting, including progress against targets and key achievements.',
  TRUE, TRUE, 'high',
  'reporting', 'organisation', TRUE
),
(
  'Validation Clarification Request',
  'Request clarification on activity validation issues',
  'Clarification Required for Activity Validation',
  'Your activity submission requires clarification before it can be validated. Please review the comments and provide the requested information.',
  TRUE, TRUE, 'medium',
  'validation', 'user', TRUE
),
(
  'Document Submission Request',
  'Request supporting documents for activities',
  'Document Submission Required',
  'Please upload the required supporting documents for your activity. This may include project proposals, budgets, or progress reports.',
  TRUE, FALSE, 'medium',
  'compliance', 'user', TRUE
),
(
  'Policy Update Notification',
  'Inform stakeholders of policy or procedural updates',
  'Important Policy Update',
  'Please review the attached policy update and acknowledge receipt. This may affect your reporting or operational procedures.',
  TRUE, TRUE, 'low',
  'information', 'organisation', TRUE
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. COMMENTS
-- =====================================================
COMMENT ON TABLE task_templates IS 'Reusable task templates/blueprints for standardized task creation';
COMMENT ON COLUMN task_templates.is_system_template IS 'System templates are read-only and available to all users';
COMMENT ON COLUMN task_templates.default_target_scope IS 'Suggested targeting: organisation, role, user, or activity_set';
COMMENT ON COLUMN task_templates.default_task_type IS 'Type of task: reporting, validation, compliance, or information';
