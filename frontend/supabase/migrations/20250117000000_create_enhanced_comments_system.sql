-- Enhanced Comments System Migration
-- Creates comprehensive commenting system with real-time features

-- Create activity_comments table with enhanced features
CREATE TABLE IF NOT EXISTS activity_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
    context_section TEXT, -- Which activity section this comment relates to
    context_field TEXT,   -- Specific field within the section
    resolved_by_id UUID,
    resolved_by_name TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    mentions JSONB DEFAULT '[]'::jsonb, -- Array of mentioned user/org IDs
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment objects
    is_read JSONB DEFAULT '{}'::jsonb, -- Object mapping user_id to read status
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_comment_replies table with enhanced features
CREATE TABLE IF NOT EXISTS activity_comment_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
    message TEXT NOT NULL,
    mentions JSONB DEFAULT '[]'::jsonb, -- Array of mentioned user/org IDs
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment objects
    is_read JSONB DEFAULT '{}'::jsonb, -- Object mapping user_id to read status
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comment_notifications table for real-time notifications
CREATE TABLE IF NOT EXISTS comment_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES activity_comment_replies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('new_comment', 'new_reply', 'mention', 'resolved')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user_id ON activity_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_created_at ON activity_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_comments_context ON activity_comments(activity_id, context_section, context_field);
CREATE INDEX IF NOT EXISTS idx_activity_comments_mentions ON activity_comments USING GIN (mentions);
CREATE INDEX IF NOT EXISTS idx_activity_comments_search ON activity_comments USING GIN (to_tsvector('english', message));

CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_comment_id ON activity_comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_user_id ON activity_comment_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_mentions ON activity_comment_replies USING GIN (mentions);
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_search ON activity_comment_replies USING GIN (to_tsvector('english', message));

CREATE INDEX IF NOT EXISTS idx_comment_notifications_user_id ON comment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_unread ON comment_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_activity ON comment_notifications(activity_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for comments (open access for now, can be restricted later)
DROP POLICY IF EXISTS "Users can view all comments" ON activity_comments;
DROP POLICY IF EXISTS "Users can create comments" ON activity_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON activity_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON activity_comments;

CREATE POLICY "Users can view all comments" ON activity_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON activity_comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own comments" ON activity_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON activity_comments
    FOR DELETE USING (user_id = auth.uid());

-- Policies for replies
DROP POLICY IF EXISTS "Users can view all replies" ON activity_comment_replies;
DROP POLICY IF EXISTS "Users can create replies" ON activity_comment_replies;
DROP POLICY IF EXISTS "Users can update their own replies" ON activity_comment_replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON activity_comment_replies;

CREATE POLICY "Users can view all replies" ON activity_comment_replies
    FOR SELECT USING (true);

CREATE POLICY "Users can create replies" ON activity_comment_replies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own replies" ON activity_comment_replies
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own replies" ON activity_comment_replies
    FOR DELETE USING (user_id = auth.uid());

-- Policies for notifications
CREATE POLICY "Users can view their own notifications" ON comment_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON comment_notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON comment_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Add triggers to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_activity_comments_updated_at ON activity_comments;
CREATE TRIGGER update_activity_comments_updated_at
    BEFORE UPDATE ON activity_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_activity_comment_replies_updated_at ON activity_comment_replies;
CREATE TRIGGER update_activity_comment_replies_updated_at
    BEFORE UPDATE ON activity_comment_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create notifications for new comments
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    activity_title TEXT;
    mention_user_id UUID;
    mentioned_user JSONB;
BEGIN
    -- Get activity title
    SELECT title INTO activity_title FROM activities WHERE id = NEW.activity_id;
    
    -- Create notification for new comment
    INSERT INTO comment_notifications (
        user_id, activity_id, comment_id, type, title, message
    )
    SELECT DISTINCT u.id, NEW.activity_id, NEW.id, 'new_comment',
           'New comment on "' || COALESCE(activity_title, 'Activity') || '"',
           NEW.user_name || ' left a ' || NEW.type || ': ' || LEFT(NEW.message, 100) || 
           CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END
    FROM users u
    WHERE u.id != NEW.user_id -- Don't notify the commenter
      AND EXISTS (
          SELECT 1 FROM activity_contributors ac 
          WHERE ac.activity_id = NEW.activity_id 
          AND ac.organization_id = u.organization_id
          AND ac.status = 'accepted'
      );
    
    -- Create notifications for mentioned users
    IF NEW.mentions IS NOT NULL AND jsonb_array_length(NEW.mentions) > 0 THEN
        FOR mentioned_user IN SELECT * FROM jsonb_array_elements(NEW.mentions)
        LOOP
            mention_user_id := (mentioned_user->>'id')::UUID;
            IF mention_user_id IS NOT NULL AND mention_user_id != NEW.user_id THEN
                INSERT INTO comment_notifications (
                    user_id, activity_id, comment_id, type, title, message
                ) VALUES (
                    mention_user_id,
                    NEW.activity_id,
                    NEW.id,
                    'mention',
                    'You were mentioned in "' || COALESCE(activity_title, 'Activity') || '"',
                    NEW.user_name || ' mentioned you in a comment'
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notifications for new replies
CREATE OR REPLACE FUNCTION create_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
    activity_title TEXT;
    comment_author_id UUID;
    activity_id_var UUID;
    mention_user_id UUID;
    mentioned_user JSONB;
BEGIN
    -- Get activity info and original comment author
    SELECT a.title, a.id, c.user_id 
    INTO activity_title, activity_id_var, comment_author_id
    FROM activities a
    JOIN activity_comments c ON c.id = NEW.comment_id
    WHERE a.id = c.activity_id;
    
    -- Notify original comment author
    IF comment_author_id != NEW.user_id THEN
        INSERT INTO comment_notifications (
            user_id, activity_id, reply_id, type, title, message
        ) VALUES (
            comment_author_id,
            activity_id_var,
            NEW.id,
            'new_reply',
            'Reply to your comment on "' || COALESCE(activity_title, 'Activity') || '"',
            NEW.user_name || ' replied to your comment'
        );
    END IF;
    
    -- Create notifications for mentioned users in reply
    IF NEW.mentions IS NOT NULL AND jsonb_array_length(NEW.mentions) > 0 THEN
        FOR mentioned_user IN SELECT * FROM jsonb_array_elements(NEW.mentions)
        LOOP
            mention_user_id := (mentioned_user->>'id')::UUID;
            IF mention_user_id IS NOT NULL AND mention_user_id != NEW.user_id THEN
                INSERT INTO comment_notifications (
                    user_id, activity_id, reply_id, type, title, message
                ) VALUES (
                    mention_user_id,
                    activity_id_var,
                    NEW.id,
                    'mention',
                    'You were mentioned in a reply on "' || COALESCE(activity_title, 'Activity') || '"',
                    NEW.user_name || ' mentioned you in a reply'
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for notifications
DROP TRIGGER IF EXISTS trigger_comment_notification ON activity_comments;
CREATE TRIGGER trigger_comment_notification
    AFTER INSERT ON activity_comments
    FOR EACH ROW
    EXECUTE FUNCTION create_comment_notification();

DROP TRIGGER IF EXISTS trigger_reply_notification ON activity_comment_replies;
CREATE TRIGGER trigger_reply_notification
    AFTER INSERT ON activity_comment_replies
    FOR EACH ROW
    EXECUTE FUNCTION create_reply_notification();

-- Function for full-text search on comments
CREATE OR REPLACE FUNCTION search_comments(
    p_activity_id UUID,
    p_search_term TEXT DEFAULT NULL,
    p_context_section TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    comment_id UUID,
    comment_type TEXT,
    comment_message TEXT,
    comment_status TEXT,
    context_section TEXT,
    context_field TEXT,
    author_name TEXT,
    author_role TEXT,
    created_at TIMESTAMPTZ,
    reply_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.type,
        c.message,
        c.status,
        c.context_section,
        c.context_field,
        c.user_name,
        c.user_role,
        c.created_at,
        (SELECT COUNT(*) FROM activity_comment_replies r WHERE r.comment_id = c.id)
    FROM activity_comments c
    WHERE c.activity_id = p_activity_id
      AND (p_search_term IS NULL OR to_tsvector('english', c.message) @@ plainto_tsquery('english', p_search_term))
      AND (p_context_section IS NULL OR c.context_section = p_context_section)
      AND (p_type IS NULL OR c.type = p_type)
      AND (p_status IS NULL OR c.status = p_status)
    ORDER BY c.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
