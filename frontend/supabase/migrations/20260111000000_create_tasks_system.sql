-- =====================================================
-- TASKING SYSTEM
-- Allows org admins and super users to create and assign
-- tasks to users with tracking and deadline reminders
-- =====================================================

-- =====================================================
-- 1. TASKS TABLE - Task definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task content
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),

  -- Timing
  deadline TIMESTAMPTZ,
  reminder_days INTEGER DEFAULT 3, -- Days before deadline to send reminder

  -- Entity linking (optional)
  entity_type TEXT CHECK (entity_type IN ('activity', 'organization')),
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Creator tracking
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: entity_id matches entity_type
  CONSTRAINT valid_entity_link CHECK (
    (entity_type IS NULL AND activity_id IS NULL AND organization_id IS NULL) OR
    (entity_type = 'activity' AND activity_id IS NOT NULL AND organization_id IS NULL) OR
    (entity_type = 'organization' AND organization_id IS NOT NULL AND activity_id IS NULL)
  )
);

-- Indexes for tasks
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_deadline ON tasks(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_tasks_activity_id ON tasks(activity_id) WHERE activity_id IS NOT NULL;
CREATE INDEX idx_tasks_organization_id ON tasks(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. TASK_ASSIGNMENTS TABLE - One row per assignee
-- =====================================================
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Assignment origin (how they were assigned)
  assignment_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (assignment_type IN ('individual', 'organization', 'role')),
  assignment_source TEXT, -- org_id or role name if group assignment

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'declined')),

  -- Completion details
  completion_note TEXT,
  completed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  declined_reason TEXT,

  -- Current handler (for reassignments)
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification tracking
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one assignment per user per task
  UNIQUE(task_id, assignee_id)
);

-- Indexes for task_assignments
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_assignee_id ON task_assignments(assignee_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
CREATE INDEX idx_task_assignments_created_at ON task_assignments(created_at DESC);
CREATE INDEX idx_task_assignments_pending ON task_assignments(assignee_id, status)
  WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_task_assignments_assigned_by ON task_assignments(assigned_by);

-- Enable RLS
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. TASK_ASSIGNMENT_HISTORY TABLE - Audit trail
-- =====================================================
CREATE TABLE IF NOT EXISTS task_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,

  -- What happened
  action TEXT NOT NULL CHECK (action IN ('created', 'reassigned', 'status_changed', 'note_added')),

  -- Who did it
  performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Before/after state (for status changes)
  previous_status TEXT,
  new_status TEXT,

  -- For reassignments
  previous_assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  new_assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Additional context
  note TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for task_assignment_history
CREATE INDEX idx_task_assignment_history_assignment_id ON task_assignment_history(task_assignment_id);
CREATE INDEX idx_task_assignment_history_performed_by ON task_assignment_history(performed_by);
CREATE INDEX idx_task_assignment_history_created_at ON task_assignment_history(created_at DESC);

-- Enable RLS
ALTER TABLE task_assignment_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. TASK_SHARES TABLE - Read-only visibility shares
-- =====================================================
CREATE TABLE IF NOT EXISTS task_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_assignment_id UUID REFERENCES task_assignments(id) ON DELETE CASCADE,

  -- Who shared and who received
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Optional message
  share_message TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(task_id, shared_with_id)
);

-- Indexes for task_shares
CREATE INDEX idx_task_shares_task_id ON task_shares(task_id);
CREATE INDEX idx_task_shares_shared_with_id ON task_shares(shared_with_id);
CREATE INDEX idx_task_shares_shared_by ON task_shares(shared_by);

-- Enable RLS
ALTER TABLE task_shares ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS POLICIES FOR TASKS
-- =====================================================

-- Creators can view their own tasks
CREATE POLICY "Creators can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = created_by);

-- Super users can view all tasks
CREATE POLICY "Super users can view all tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- Users can view tasks if they have an assignment
CREATE POLICY "Assignees can view tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_id = tasks.id AND assignee_id = auth.uid()
    )
  );

-- Users with shares can view tasks (read-only)
CREATE POLICY "Shared users can view tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_shares
      WHERE task_id = tasks.id AND shared_with_id = auth.uid()
    )
  );

-- Org admins and super_users can create tasks
CREATE POLICY "Org admins and super_users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND (
        u.role = 'super_user' OR
        EXISTS (
          SELECT 1 FROM user_organizations uo
          WHERE uo.user_id = auth.uid() AND uo.role = 'admin'
        )
      )
    )
  );

-- Creators can update their own tasks
CREATE POLICY "Creators can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Creators can delete their own tasks
CREATE POLICY "Creators can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = created_by);

-- =====================================================
-- 6. RLS POLICIES FOR TASK_ASSIGNMENTS
-- =====================================================

-- Assignees can view their own assignments
CREATE POLICY "Assignees can view own assignments"
  ON task_assignments FOR SELECT
  USING (auth.uid() = assignee_id);

-- Task creators can view all assignments for their tasks
CREATE POLICY "Task creators can view task assignments"
  ON task_assignments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND created_by = auth.uid())
  );

-- Super users can view all assignments
CREATE POLICY "Super users can view all assignments"
  ON task_assignments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- Service role can insert (via API)
CREATE POLICY "Service can create assignments"
  ON task_assignments FOR INSERT
  WITH CHECK (true);

-- Assignees can update their own assignments (status, note)
CREATE POLICY "Assignees can update own assignments"
  ON task_assignments FOR UPDATE
  USING (auth.uid() = assignee_id);

-- Task creators can update assignments (for reassignment)
CREATE POLICY "Task creators can update assignments"
  ON task_assignments FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND created_by = auth.uid())
  );

-- Task creators can delete assignments
CREATE POLICY "Task creators can delete assignments"
  ON task_assignments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND created_by = auth.uid())
  );

-- =====================================================
-- 7. RLS POLICIES FOR TASK_ASSIGNMENT_HISTORY
-- =====================================================

-- Users can view history for assignments they're involved in
CREATE POLICY "Users can view history for their assignments"
  ON task_assignment_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.id = task_assignment_id AND (
        ta.assignee_id = auth.uid() OR
        EXISTS (SELECT 1 FROM tasks t WHERE t.id = ta.task_id AND t.created_by = auth.uid())
      )
    )
  );

-- Super users can view all history
CREATE POLICY "Super users can view all history"
  ON task_assignment_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- Service can insert history
CREATE POLICY "Service can create history"
  ON task_assignment_history FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 8. RLS POLICIES FOR TASK_SHARES
-- =====================================================

-- Users can view shares they created or received
CREATE POLICY "Users can view their shares"
  ON task_shares FOR SELECT
  USING (auth.uid() = shared_with_id OR auth.uid() = shared_by);

-- Assignees can create shares for their tasks
CREATE POLICY "Assignees can create shares"
  ON task_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_id = task_shares.task_id AND assignee_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM tasks
      WHERE id = task_shares.task_id AND created_by = auth.uid()
    )
  );

-- Sharers can delete their shares
CREATE POLICY "Sharers can delete their shares"
  ON task_shares FOR DELETE
  USING (auth.uid() = shared_by);

-- =====================================================
-- 9. TRIGGERS AND FUNCTIONS
-- =====================================================

-- Updated_at trigger function (reuse if exists, else create)
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Apply updated_at trigger to task_assignments
CREATE TRIGGER update_task_assignments_updated_at
  BEFORE UPDATE ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- =====================================================
-- 10. NOTIFICATION TRIGGER - When task is assigned
-- =====================================================
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_record RECORD;
  assigner_name TEXT;
BEGIN
  -- Get task details
  SELECT t.*,
         COALESCE(u.first_name || ' ' || u.last_name, u.email) AS creator_name
  INTO task_record
  FROM tasks t
  JOIN users u ON t.created_by = u.id
  WHERE t.id = NEW.task_id;

  -- Get assigner name
  SELECT COALESCE(first_name || ' ' || last_name, email) INTO assigner_name
  FROM users WHERE id = NEW.assigned_by;

  -- Create notification for assignee
  INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata
  ) VALUES (
    NEW.assignee_id,
    'task_assigned',
    'New Task Assigned',
    COALESCE(assigner_name, 'Someone') || ' assigned you a task: ' || task_record.title,
    '/dashboard?tab=tasks',
    jsonb_build_object(
      'task_id', NEW.task_id,
      'assignment_id', NEW.id,
      'priority', task_record.priority,
      'deadline', task_record.deadline
    )
  );

  -- Log history
  INSERT INTO task_assignment_history (
    task_assignment_id,
    action,
    performed_by,
    new_status,
    note
  ) VALUES (
    NEW.id,
    'created',
    NEW.assigned_by,
    'pending',
    'Task assigned'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_assignment_created
  AFTER INSERT ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();

-- =====================================================
-- 11. DEADLINE REMINDER FUNCTION
-- Call this via pg_cron or scheduled Edge Function
-- =====================================================
CREATE OR REPLACE FUNCTION send_task_deadline_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reminder_count INTEGER := 0;
  assignment_record RECORD;
BEGIN
  -- Find assignments that need reminders
  FOR assignment_record IN
    SELECT ta.*, t.title, t.deadline, t.reminder_days
    FROM task_assignments ta
    JOIN tasks t ON ta.task_id = t.id
    WHERE ta.status IN ('pending', 'in_progress')
      AND ta.reminder_sent = FALSE
      AND t.deadline IS NOT NULL
      AND t.deadline > NOW()
      AND t.deadline <= NOW() + (COALESCE(t.reminder_days, 3) || ' days')::INTERVAL
  LOOP
    -- Create reminder notification
    INSERT INTO user_notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      assignment_record.assignee_id,
      'task_deadline_reminder',
      'Task Deadline Approaching',
      'Task "' || assignment_record.title || '" is due ' ||
        CASE
          WHEN assignment_record.deadline::date = CURRENT_DATE THEN 'today'
          WHEN assignment_record.deadline::date = CURRENT_DATE + 1 THEN 'tomorrow'
          ELSE 'on ' || TO_CHAR(assignment_record.deadline, 'Mon DD, YYYY')
        END,
      '/dashboard?tab=tasks',
      jsonb_build_object(
        'task_id', assignment_record.task_id,
        'assignment_id', assignment_record.id,
        'deadline', assignment_record.deadline
      )
    );

    -- Mark reminder as sent
    UPDATE task_assignments
    SET reminder_sent = TRUE, reminder_sent_at = NOW()
    WHERE id = assignment_record.id;

    reminder_count := reminder_count + 1;
  END LOOP;

  RETURN reminder_count;
END;
$$;

COMMENT ON FUNCTION send_task_deadline_reminders IS
'Call this function via pg_cron or Supabase Edge Function on schedule (e.g., daily at 9am). Returns count of reminders sent.';

-- =====================================================
-- 12. COMMENTS
-- =====================================================
COMMENT ON TABLE tasks IS 'Task definitions created by org admins or super users';
COMMENT ON TABLE task_assignments IS 'Individual user assignments for tasks - one row per assignee';
COMMENT ON TABLE task_assignment_history IS 'Audit trail for all assignment changes (status, reassignments)';
COMMENT ON TABLE task_shares IS 'Read-only visibility shares for tasks';

COMMENT ON COLUMN tasks.entity_type IS 'Type of linked entity: activity, organization, or NULL for standalone';
COMMENT ON COLUMN tasks.reminder_days IS 'Days before deadline to send reminder notification';
COMMENT ON COLUMN task_assignments.assignment_type IS 'How the user was assigned: individual, organization (all org members), or role (all users with role)';
COMMENT ON COLUMN task_assignments.assignment_source IS 'Source of group assignment: org_id or role name';
