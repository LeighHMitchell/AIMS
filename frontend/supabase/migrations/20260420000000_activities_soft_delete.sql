-- Soft-delete support for activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_activities_deleted_at
  ON activities(deleted_at)
  WHERE deleted_at IS NOT NULL;
