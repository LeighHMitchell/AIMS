-- Create user_notifications table for generic in-app notifications
-- This supports FAQ notifications and can be extended for other notification types

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_is_read ON user_notifications(user_id, is_read);
CREATE INDEX idx_user_notifications_type ON user_notifications(type);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert notifications for any user
CREATE POLICY "Service can insert notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (true);

-- Comment on columns
COMMENT ON TABLE user_notifications IS 'Generic in-app notification system for all notification types';
COMMENT ON COLUMN user_notifications.type IS 'Notification type: faq_question_submitted, faq_question_answered, faq_new_question, etc.';
COMMENT ON COLUMN user_notifications.metadata IS 'Additional JSON data like question_id, faq_id, etc.';
