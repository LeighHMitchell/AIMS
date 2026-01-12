-- =====================================================
-- TASK EVENTS
-- Enhanced audit log for task-level events (compliance traceability)
-- Complements task_assignment_history for assignment-level events
-- =====================================================

-- =====================================================
-- 1. TASK_EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to task
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',           -- Task created (draft or immediate)
    'updated',           -- Task details updated
    'scheduled',         -- Task scheduled for future dispatch
    'sent',              -- Task dispatched to recipients
    'email_sent',        -- Email notifications sent
    'email_failed',      -- Email sending failed
    'opened',            -- Recipient opened/viewed the task
    'completed',         -- Task marked as completed (all assignments done)
    'cancelled',         -- Task cancelled before completion
    'overdue_flagged',   -- At least one assignment became overdue
    'reminder_sent',     -- Reminder notifications sent
    'recurrence_generated', -- New instance generated from recurring task
    'attachment_added',  -- Attachment uploaded
    'attachment_removed' -- Attachment deleted
  )),

  -- Who triggered the event (null for system events)
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Flexible metadata for event-specific data
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================
CREATE INDEX idx_task_events_task_id ON task_events(task_id);
CREATE INDEX idx_task_events_type ON task_events(event_type);
CREATE INDEX idx_task_events_actor ON task_events(actor_user_id) WHERE actor_user_id IS NOT NULL;
CREATE INDEX idx_task_events_created_at ON task_events(created_at DESC);

-- Composite index for filtering by task and type
CREATE INDEX idx_task_events_task_type ON task_events(task_id, event_type);

-- GIN index for metadata queries
CREATE INDEX idx_task_events_metadata ON task_events USING GIN (metadata);

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- Task creators can view events for their tasks
CREATE POLICY "Task creators can view events"
  ON task_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_events.task_id AND t.created_by = auth.uid()
    )
  );

-- Task assignees can view events
CREATE POLICY "Assignees can view events"
  ON task_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.task_id = task_events.task_id AND ta.assignee_id = auth.uid()
    )
  );

-- Super users can view all events
CREATE POLICY "Super users can view all events"
  ON task_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- Service can create events (via API and triggers)
CREATE POLICY "Service can create events"
  ON task_events FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 5. EXPAND TASK_ASSIGNMENT_HISTORY ACTIONS
-- =====================================================
-- Update the constraint to allow more action types
ALTER TABLE task_assignment_history
  DROP CONSTRAINT IF EXISTS task_assignment_history_action_check;

ALTER TABLE task_assignment_history
  ADD CONSTRAINT task_assignment_history_action_check
  CHECK (action IN (
    'created',
    'reassigned',
    'status_changed',
    'note_added',
    'archived',
    'unarchived',
    'reminder_sent',
    'email_sent',
    'opened'
  ));

-- =====================================================
-- 6. TRIGGER: Log Task Creation Event
-- =====================================================
CREATE OR REPLACE FUNCTION log_task_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO task_events (
    task_id,
    event_type,
    actor_user_id,
    metadata
  ) VALUES (
    NEW.id,
    'created',
    NEW.created_by,
    jsonb_build_object(
      'title', NEW.title,
      'task_type', NEW.task_type,
      'priority', NEW.priority,
      'status', NEW.status,
      'deadline', NEW.deadline,
      'template_id', NEW.template_id,
      'recurrence_id', NEW.recurrence_id
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_created
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_created();

-- =====================================================
-- 7. TRIGGER: Log Task Status Changes
-- =====================================================
CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO task_events (
      task_id,
      event_type,
      actor_user_id,
      metadata
    ) VALUES (
      NEW.id,
      CASE NEW.status
        WHEN 'scheduled' THEN 'scheduled'
        WHEN 'sent' THEN 'sent'
        WHEN 'completed' THEN 'completed'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'updated'
      END,
      -- For system-triggered changes (cron), actor is null
      CASE
        WHEN NEW.dispatched_by IS NOT NULL THEN NEW.dispatched_by
        ELSE NULL
      END,
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'scheduled_send_at', NEW.scheduled_send_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_status_change
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_task_status_change();

-- =====================================================
-- 8. TRIGGER: Log Attachment Events
-- =====================================================
CREATE OR REPLACE FUNCTION log_attachment_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_events (
      task_id,
      event_type,
      actor_user_id,
      metadata
    ) VALUES (
      NEW.task_id,
      'attachment_added',
      NEW.uploaded_by_user_id,
      jsonb_build_object(
        'attachment_id', NEW.id,
        'file_name', NEW.file_name,
        'file_type', NEW.file_type,
        'file_size', NEW.file_size,
        'attachment_type', NEW.attachment_type
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO task_events (
      task_id,
      event_type,
      actor_user_id,
      metadata
    ) VALUES (
      OLD.task_id,
      'attachment_removed',
      NULL, -- Can't determine who deleted in a trigger
      jsonb_build_object(
        'attachment_id', OLD.id,
        'file_name', OLD.file_name
      )
    );
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_attachment_added
  AFTER INSERT ON task_attachments
  FOR EACH ROW
  EXECUTE FUNCTION log_attachment_event();

CREATE TRIGGER on_attachment_removed
  AFTER DELETE ON task_attachments
  FOR EACH ROW
  EXECUTE FUNCTION log_attachment_event();

-- =====================================================
-- 9. VIEW: Task Events with Actor Info
-- =====================================================
CREATE OR REPLACE VIEW task_events_with_actor AS
SELECT
  te.*,
  u.first_name AS actor_first_name,
  u.last_name AS actor_last_name,
  u.email AS actor_email,
  u.avatar_url AS actor_avatar_url,
  t.title AS task_title
FROM task_events te
LEFT JOIN users u ON te.actor_user_id = u.id
LEFT JOIN tasks t ON te.task_id = t.id;

-- =====================================================
-- 10. HELPER FUNCTION: Log Custom Event
-- =====================================================
CREATE OR REPLACE FUNCTION log_task_event(
  p_task_id UUID,
  p_event_type TEXT,
  p_actor_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO task_events (task_id, event_type, actor_user_id, metadata)
  VALUES (p_task_id, p_event_type, p_actor_user_id, p_metadata)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- =====================================================
-- 11. COMMENTS
-- =====================================================
COMMENT ON TABLE task_events IS 'Audit log for task-level events (compliance traceability)';
COMMENT ON COLUMN task_events.event_type IS 'Type of event: created, scheduled, sent, completed, cancelled, etc.';
COMMENT ON COLUMN task_events.actor_user_id IS 'User who triggered the event (null for system events like cron)';
COMMENT ON COLUMN task_events.metadata IS 'Event-specific data as JSON';
COMMENT ON VIEW task_events_with_actor IS 'Task events with actor and task information';
COMMENT ON FUNCTION log_task_event IS 'Helper to manually log task events from application code';
