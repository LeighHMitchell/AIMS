-- User profiles table for extended user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  profile_picture_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  default_currency TEXT DEFAULT 'USD',
  reporting_org_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Super users can view all profiles
CREATE POLICY "Super users can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_user'
    )
  );

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mention', 'system')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  activity_title TEXT,
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  related_user_name TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications (using service role)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create a notification when a user is mentioned
CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_users TEXT[];
  mentioned_user TEXT;
  mentioned_user_id UUID;
  mentioning_user_name TEXT;
BEGIN
  -- Extract @mentions from the comment content
  mentioned_users := ARRAY(
    SELECT DISTINCT substring(content from '@(\w+)')
    FROM regexp_split_to_table(NEW.content, '\s+') AS content
    WHERE content ~ '^@\w+'
  );
  
  -- Get the name of the user who made the comment
  SELECT name INTO mentioning_user_name
  FROM users
  WHERE id = NEW.user_id;
  
  -- Create notifications for each mentioned user
  FOREACH mentioned_user IN ARRAY mentioned_users
  LOOP
    -- Find the user ID by username (assuming email prefix as username)
    SELECT id INTO mentioned_user_id
    FROM users
    WHERE split_part(email, '@', 1) = mentioned_user
    LIMIT 1;
    
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        description,
        activity_id,
        activity_title,
        related_user_id,
        related_user_name
      ) VALUES (
        mentioned_user_id,
        'mention',
        mentioning_user_name || ' mentioned you',
        'You were mentioned in a comment on an activity',
        NEW.activity_id,
        (SELECT title_narrative FROM activities WHERE id = NEW.activity_id),
        NEW.user_id,
        mentioning_user_name
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for mentions in activity comments
CREATE TRIGGER create_mention_notification_trigger
AFTER INSERT ON activity_comments
FOR EACH ROW
EXECUTE FUNCTION create_mention_notification();

-- Function to create system notifications for activity status changes
CREATE OR REPLACE FUNCTION create_activity_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_description TEXT;
  activity_creator_id UUID;
BEGIN
  -- Only create notifications for specific status changes
  IF OLD.submission_status != NEW.submission_status THEN
    -- Get the activity creator
    SELECT created_by INTO activity_creator_id
    FROM activities
    WHERE id = NEW.id;
    
    -- Don't notify if the user is changing their own activity status
    IF activity_creator_id = auth.uid() THEN
      RETURN NEW;
    END IF;
    
    CASE NEW.submission_status
      WHEN 'validated' THEN
        notification_title := 'Activity Validated';
        notification_description := 'Your activity "' || NEW.title_narrative || '" has been validated by the government partner';
      WHEN 'rejected' THEN
        notification_title := 'Activity Rejected';
        notification_description := 'Activity "' || NEW.title_narrative || '" was rejected. ' || COALESCE(NEW.rejection_reason, 'Please check the activity for more details.');
      WHEN 'more_info_requested' THEN
        notification_title := 'Information Requested';
        notification_description := 'Additional information has been requested for "' || NEW.title_narrative || '". Please review the comments.';
      ELSE
        RETURN NEW;
    END CASE;
    
    -- Create the notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      description,
      activity_id,
      activity_title
    ) VALUES (
      activity_creator_id,
      'system',
      notification_title,
      notification_description,
      NEW.id,
      NEW.title_narrative
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for activity status notifications
CREATE TRIGGER create_activity_status_notification_trigger
AFTER UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION create_activity_status_notification(); 