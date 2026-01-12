-- =====================================================
-- EXPAND TASKS TABLE
-- Add workflow orchestration fields to existing tasks table
-- Backwards compatible - all new columns have defaults
-- =====================================================

-- =====================================================
-- 1. ADD NEW COLUMNS TO TASKS TABLE
-- =====================================================

-- Task type classification
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'information'
    CHECK (task_type IN ('reporting', 'validation', 'compliance', 'information'));

-- Task lifecycle status (separate from assignment status)
-- 'sent' is the default for backwards compatibility with existing tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent'
    CHECK (status IN ('draft', 'scheduled', 'sent', 'completed', 'cancelled'));

-- Notification delivery settings
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS send_in_app BOOLEAN DEFAULT TRUE;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS send_email BOOLEAN DEFAULT FALSE;

-- Scheduling fields
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS scheduled_send_at TIMESTAMPTZ;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Template and recurrence links
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES task_recurrence_rules(id) ON DELETE SET NULL;

-- Target scope (how assignments were determined)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS target_scope TEXT
    CHECK (target_scope IN ('organisation', 'role', 'user', 'activity_set'));

-- Parent task for recurring task instances
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Email tracking
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS email_sent_count INTEGER DEFAULT 0;

-- Dispatch tracking
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS dispatched_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- 2. NEW INDEXES
-- =====================================================

-- Index for finding scheduled tasks to dispatch
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_send
  ON tasks(scheduled_send_at)
  WHERE status = 'scheduled' AND scheduled_send_at IS NOT NULL;

-- Index for task status
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Index for task type
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);

-- Index for template relationship
CREATE INDEX IF NOT EXISTS idx_tasks_template_id
  ON tasks(template_id)
  WHERE template_id IS NOT NULL;

-- Index for recurrence relationship
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_id
  ON tasks(recurrence_id)
  WHERE recurrence_id IS NOT NULL;

-- Index for finding child tasks of a recurring task
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- Index for finding tasks with pending emails
CREATE INDEX IF NOT EXISTS idx_tasks_pending_email
  ON tasks(status)
  WHERE send_email = TRUE AND email_sent_at IS NULL AND status = 'sent';

-- =====================================================
-- 3. UPDATE EXISTING TASKS
-- Set status = 'sent' for any existing tasks (backwards compatibility)
-- =====================================================
UPDATE tasks SET status = 'sent' WHERE status IS NULL;
UPDATE tasks SET task_type = 'information' WHERE task_type IS NULL;

-- =====================================================
-- 4. ADD FUNCTION TO DISPATCH TASK
-- =====================================================
CREATE OR REPLACE FUNCTION dispatch_task(p_task_id UUID, p_dispatched_by UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get and lock the task
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found: %', p_task_id;
  END IF;

  -- Check if already dispatched
  IF v_task.status NOT IN ('draft', 'scheduled') THEN
    RAISE EXCEPTION 'Task % is already in status: %', p_task_id, v_task.status;
  END IF;

  -- Update task status
  UPDATE tasks SET
    status = 'sent',
    dispatched_at = v_now,
    dispatched_by = COALESCE(p_dispatched_by, v_task.created_by),
    updated_at = v_now
  WHERE id = p_task_id;

  -- Note: Assignment creation and notifications are handled by the API
  -- This function just handles the status transition

  RETURN TRUE;
END;
$$;

-- =====================================================
-- 5. ADD FUNCTION TO COMPLETE TASK (when all assignments done)
-- =====================================================
CREATE OR REPLACE FUNCTION check_task_completion(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_assignments INTEGER;
  v_completed_assignments INTEGER;
BEGIN
  -- Count total and completed assignments
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('completed', 'declined'))
  INTO v_total_assignments, v_completed_assignments
  FROM task_assignments
  WHERE task_id = p_task_id;

  -- If all assignments are completed or declined, mark task as completed
  IF v_total_assignments > 0 AND v_total_assignments = v_completed_assignments THEN
    UPDATE tasks SET
      status = 'completed',
      updated_at = NOW()
    WHERE id = p_task_id AND status = 'sent';

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- =====================================================
-- 6. TRIGGER TO CHECK TASK COMPLETION ON ASSIGNMENT UPDATE
-- =====================================================
CREATE OR REPLACE FUNCTION on_assignment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if task should be marked as completed
  IF NEW.status IN ('completed', 'declined') AND OLD.status != NEW.status THEN
    PERFORM check_task_completion(NEW.task_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS check_task_completion_trigger ON task_assignments;
CREATE TRIGGER check_task_completion_trigger
  AFTER UPDATE OF status ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION on_assignment_status_change();

-- =====================================================
-- 7. COMMENTS
-- =====================================================
COMMENT ON COLUMN tasks.task_type IS 'Classification: reporting, validation, compliance, or information';
COMMENT ON COLUMN tasks.status IS 'Task lifecycle: draft (not visible), scheduled (pending dispatch), sent (active), completed (all done), cancelled';
COMMENT ON COLUMN tasks.send_in_app IS 'Create in-app notifications when dispatched';
COMMENT ON COLUMN tasks.send_email IS 'Send email notifications when dispatched';
COMMENT ON COLUMN tasks.scheduled_send_at IS 'When to dispatch the task (null = send immediately)';
COMMENT ON COLUMN tasks.timezone IS 'Timezone for scheduled dispatch and deadlines';
COMMENT ON COLUMN tasks.template_id IS 'Reference to template used to create this task';
COMMENT ON COLUMN tasks.recurrence_id IS 'Reference to recurrence rule for recurring tasks';
COMMENT ON COLUMN tasks.target_scope IS 'How recipients were determined: organisation, role, user, or activity_set';
COMMENT ON COLUMN tasks.parent_task_id IS 'For recurring tasks, reference to the parent/template task';
COMMENT ON COLUMN tasks.email_sent_at IS 'When email notifications were sent';
COMMENT ON COLUMN tasks.email_sent_count IS 'Number of email notifications sent';
COMMENT ON COLUMN tasks.dispatched_at IS 'When the task was dispatched/sent';
COMMENT ON COLUMN tasks.dispatched_by IS 'User who dispatched the task (may differ from creator for scheduled)';
COMMENT ON FUNCTION dispatch_task IS 'Transition task from draft/scheduled to sent status';
COMMENT ON FUNCTION check_task_completion IS 'Check if all assignments are complete and update task status';

-- =====================================================
-- 8. RLS POLICIES FOR TASK_RECURRENCE_RULES
-- These are added here because they reference tasks.recurrence_id
-- which is created in this migration
-- =====================================================

-- Users can view recurrence rules for tasks they created or are assigned to
CREATE POLICY "Users can view recurrence rules for their tasks"
  ON task_recurrence_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.recurrence_id = task_recurrence_rules.id
      AND (
        t.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM task_assignments ta
          WHERE ta.task_id = t.id AND ta.assignee_id = auth.uid()
        )
      )
    )
  );

-- Task creators can delete recurrence rules for their tasks
CREATE POLICY "Task creators can delete recurrence rules"
  ON task_recurrence_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.recurrence_id = task_recurrence_rules.id
      AND t.created_by = auth.uid()
    )
  );
