-- Add archived field to task_assignments for hiding completed/declined tasks
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Index for efficient filtering of non-archived assignments
CREATE INDEX IF NOT EXISTS idx_task_assignments_archived ON task_assignments(archived) WHERE archived = FALSE;

-- Update the action CHECK constraint to include archived/unarchived actions
ALTER TABLE task_assignment_history DROP CONSTRAINT IF EXISTS task_assignment_history_action_check;
ALTER TABLE task_assignment_history ADD CONSTRAINT task_assignment_history_action_check
  CHECK (action IN ('created', 'reassigned', 'status_changed', 'note_added', 'archived', 'unarchived'));

COMMENT ON COLUMN task_assignments.archived IS 'When true, hides the task from default views. Users can archive completed or declined tasks.';
COMMENT ON COLUMN task_assignments.archived_at IS 'Timestamp when the task was archived';
