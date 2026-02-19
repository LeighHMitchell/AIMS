-- Add archived_at column to user_notifications for archive functionality
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add DELETE policy so users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON user_notifications FOR DELETE
  USING (auth.uid() = user_id);
