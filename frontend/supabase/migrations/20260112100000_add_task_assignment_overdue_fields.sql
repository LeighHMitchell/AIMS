-- =====================================================
-- ADD OVERDUE NOTIFICATION TRACKING TO TASK_ASSIGNMENTS
-- =====================================================

-- Add fields to track overdue notifications
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS overdue_notified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;

-- Index for finding assignments needing overdue notification
CREATE INDEX IF NOT EXISTS idx_task_assignments_overdue_notified
  ON task_assignments(overdue_notified, status)
  WHERE status IN ('pending', 'in_progress') AND overdue_notified = FALSE;

COMMENT ON COLUMN task_assignments.overdue_notified IS 'Whether an overdue notification has been sent for this assignment';
COMMENT ON COLUMN task_assignments.overdue_notified_at IS 'When the overdue notification was sent';
