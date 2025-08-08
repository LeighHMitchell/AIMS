-- ========================================================================
-- ADVANCED COMMENTS SYSTEM - COMPLETE ACTIVATION SCRIPT
-- ========================================================================
-- Run this complete script in your Supabase SQL editor to activate
-- all advanced commenting features in one go.
--
-- Features included:
-- ✅ Enhanced comments with context linking
-- ✅ Reactions (thumbs up/down, heart, celebrate, confused)
-- ✅ Mentions (@users, #organizations)  
-- ✅ File attachments
-- ✅ Archive functionality
-- ✅ Real-time notifications
-- ✅ Advanced search and filtering
-- ========================================================================

-- Drop existing tables if they exist (for clean installation)
DROP TABLE IF EXISTS comment_reactions CASCADE;
DROP TABLE IF EXISTS comment_notifications CASCADE;
DROP TABLE IF EXISTS activity_comment_replies CASCADE;
DROP TABLE IF EXISTS activity_comments CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS toggle_comment_reaction CASCADE;
DROP FUNCTION IF EXISTS get_comment_reaction_counts CASCADE;
DROP FUNCTION IF EXISTS get_reply_reaction_counts CASCADE;
DROP FUNCTION IF EXISTS search_comments CASCADE;
DROP FUNCTION IF EXISTS create_comment_notification CASCADE;
DROP FUNCTION IF EXISTS create_reply_notification CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- ========================================================================
-- 1. ENHANCED COMMENTS TABLE
-- ========================================================================

CREATE TABLE activity_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
    message TEXT NOT NULL,
    content TEXT, -- Backward compatibility field
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
    is_archived BOOLEAN DEFAULT FALSE,
    archived_by_id UUID,
    archived_by_name TEXT,
    archived_at TIMESTAMPTZ,
    archive_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 2. COMMENT REPLIES TABLE
-- ========================================================================

CREATE TABLE activity_comment_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
    message TEXT NOT NULL,
    mentions JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_read JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 3. REACTIONS TABLE
-- ========================================================================

CREATE TABLE comment_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES activity_comment_replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('thumbs_up', 'thumbs_down', 'heart', 'celebrate', 'confused')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user can only have one reaction per comment/reply
    CONSTRAINT unique_user_comment_reaction UNIQUE (comment_id, user_id),
    CONSTRAINT unique_user_reply_reaction UNIQUE (reply_id, user_id),
    
    -- Ensure either comment_id or reply_id is set, but not both
    CONSTRAINT comment_or_reply_check CHECK (
        (comment_id IS NOT NULL AND reply_id IS NULL) OR 
        (comment_id IS NULL AND reply_id IS NOT NULL)
    )
);

-- ========================================================================
-- 4. NOTIFICATIONS TABLE
-- ========================================================================

CREATE TABLE comment_notifications (
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

-- ========================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ========================================================================

-- Comments indexes
CREATE INDEX idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX idx_activity_comments_user_id ON activity_comments(user_id);
CREATE INDEX idx_activity_comments_created_at ON activity_comments(created_at DESC);
CREATE INDEX idx_activity_comments_context ON activity_comments(activity_id, context_section, context_field);
CREATE INDEX idx_activity_comments_mentions ON activity_comments USING GIN (mentions);
CREATE INDEX idx_activity_comments_search ON activity_comments USING GIN (to_tsvector('english', message));
CREATE INDEX idx_activity_comments_is_archived ON activity_comments(is_archived);
CREATE INDEX idx_activity_comments_archived_at ON activity_comments(archived_at);

-- Replies indexes
CREATE INDEX idx_activity_comment_replies_comment_id ON activity_comment_replies(comment_id);
CREATE INDEX idx_activity_comment_replies_user_id ON activity_comment_replies(user_id);
CREATE INDEX idx_activity_comment_replies_mentions ON activity_comment_replies USING GIN (mentions);
CREATE INDEX idx_activity_comment_replies_search ON activity_comment_replies USING GIN (to_tsvector('english', message));

-- Reactions indexes
CREATE INDEX idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_reply_id ON comment_reactions(reply_id);
CREATE INDEX idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX idx_comment_reactions_type ON comment_reactions(reaction_type);

-- Notifications indexes
CREATE INDEX idx_comment_notifications_user_id ON comment_notifications(user_id);
CREATE INDEX idx_comment_notifications_unread ON comment_notifications(user_id, is_read);
CREATE INDEX idx_comment_notifications_activity ON comment_notifications(activity_id);

-- ========================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ========================================================================

ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_notifications ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Users can view all comments" ON activity_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON activity_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own comments" ON activity_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own comments" ON activity_comments FOR DELETE USING (user_id = auth.uid());

-- Replies policies
CREATE POLICY "Users can view all replies" ON activity_comment_replies FOR SELECT USING (true);
CREATE POLICY "Users can create replies" ON activity_comment_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own replies" ON activity_comment_replies FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own replies" ON activity_comment_replies FOR DELETE USING (user_id = auth.uid());

-- Reactions policies
CREATE POLICY "Users can view all reactions" ON comment_reactions FOR SELECT USING (true);
CREATE POLICY "Users can create reactions" ON comment_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own reactions" ON comment_reactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own reactions" ON comment_reactions FOR DELETE USING (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON comment_notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON comment_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own notifications" ON comment_notifications FOR UPDATE USING (user_id = auth.uid());

-- ========================================================================
-- 7. UTILITY FUNCTIONS
-- ========================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_activity_comments_updated_at
    BEFORE UPDATE ON activity_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_comment_replies_updated_at
    BEFORE UPDATE ON activity_comment_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comment_reactions_updated_at
    BEFORE UPDATE ON comment_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- 8. REACTION FUNCTIONS
-- ========================================================================

-- Function to get reaction counts for comments
CREATE OR REPLACE FUNCTION get_comment_reaction_counts(p_comment_id UUID)
RETURNS TABLE (
    reaction_type TEXT,
    count BIGINT,
    user_names TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.reaction_type,
        COUNT(*)::BIGINT,
        ARRAY_AGG(cr.user_name ORDER BY cr.created_at)
    FROM comment_reactions cr
    WHERE cr.comment_id = p_comment_id
    GROUP BY cr.reaction_type
    ORDER BY cr.reaction_type;
END;
$$ LANGUAGE plpgsql;

-- Function to get reaction counts for replies
CREATE OR REPLACE FUNCTION get_reply_reaction_counts(p_reply_id UUID)
RETURNS TABLE (
    reaction_type TEXT,
    count BIGINT,
    user_names TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.reaction_type,
        COUNT(*)::BIGINT,
        ARRAY_AGG(cr.user_name ORDER BY cr.created_at)
    FROM comment_reactions cr
    WHERE cr.reply_id = p_reply_id
    GROUP BY cr.reaction_type
    ORDER BY cr.reaction_type;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle reactions
CREATE OR REPLACE FUNCTION toggle_comment_reaction(
    p_comment_id UUID,
    p_reply_id UUID,
    p_user_id UUID,
    p_user_name TEXT,
    p_reaction_type TEXT
)
RETURNS TEXT AS $$
DECLARE
    existing_reaction TEXT;
    result_action TEXT;
BEGIN
    -- Check for existing reaction
    IF p_comment_id IS NOT NULL THEN
        SELECT reaction_type INTO existing_reaction 
        FROM comment_reactions 
        WHERE comment_id = p_comment_id AND user_id = p_user_id;
    ELSE
        SELECT reaction_type INTO existing_reaction 
        FROM comment_reactions 
        WHERE reply_id = p_reply_id AND user_id = p_user_id;
    END IF;
    
    IF existing_reaction IS NULL THEN
        -- No existing reaction, add new one
        INSERT INTO comment_reactions (comment_id, reply_id, user_id, user_name, reaction_type)
        VALUES (p_comment_id, p_reply_id, p_user_id, p_user_name, p_reaction_type);
        result_action := 'added';
    ELSIF existing_reaction = p_reaction_type THEN
        -- Same reaction exists, remove it (toggle off)
        DELETE FROM comment_reactions 
        WHERE (comment_id = p_comment_id OR reply_id = p_reply_id) 
        AND user_id = p_user_id;
        result_action := 'removed';
    ELSE
        -- Different reaction exists, update it
        UPDATE comment_reactions 
        SET reaction_type = p_reaction_type, updated_at = NOW()
        WHERE (comment_id = p_comment_id OR reply_id = p_reply_id) 
        AND user_id = p_user_id;
        result_action := 'updated';
    END IF;
    
    RETURN result_action;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 9. SEARCH FUNCTION
-- ========================================================================

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

-- ========================================================================
-- 10. NOTIFICATION FUNCTIONS
-- ========================================================================

-- Function to create notifications for new comments
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    activity_title TEXT;
    mention_user_id UUID;
    mentioned_user JSONB;
BEGIN
    -- Get activity title (handle both title and title_narrative)
    SELECT COALESCE(title_narrative, 'Activity') INTO activity_title 
    FROM activities 
    WHERE id = NEW.activity_id;
    
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
                    'You were mentioned in "' || activity_title || '"',
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
    SELECT COALESCE(a.title_narrative, 'Activity'), a.id, c.user_id 
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
            'Reply to your comment on "' || activity_title || '"',
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
                    'You were mentioned in a reply on "' || activity_title || '"',
                    NEW.user_name || ' mentioned you in a reply'
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for notifications
CREATE TRIGGER trigger_comment_notification
    AFTER INSERT ON activity_comments
    FOR EACH ROW
    EXECUTE FUNCTION create_comment_notification();

CREATE TRIGGER trigger_reply_notification
    AFTER INSERT ON activity_comment_replies
    FOR EACH ROW
    EXECUTE FUNCTION create_reply_notification();

-- ========================================================================
-- 11. COMMENTS AND DOCUMENTATION
-- ========================================================================

COMMENT ON TABLE activity_comments IS 'Enhanced comments with context linking, mentions, attachments, and archiving';
COMMENT ON TABLE activity_comment_replies IS 'Threaded replies to comments with full feature support';
COMMENT ON TABLE comment_reactions IS 'User reactions to comments and replies (thumbs up/down, etc.)';
COMMENT ON TABLE comment_notifications IS 'Real-time notifications for comment activity';

COMMENT ON COLUMN activity_comments.context_section IS 'Links comment to specific activity section (basic_info, finances, etc.)';
COMMENT ON COLUMN activity_comments.context_field IS 'Links comment to specific field within section';
COMMENT ON COLUMN activity_comments.mentions IS 'JSON array of mentioned users/organizations';
COMMENT ON COLUMN activity_comments.attachments IS 'JSON array of file attachments';
COMMENT ON COLUMN activity_comments.is_read IS 'JSON object mapping user_id to read status';
COMMENT ON COLUMN activity_comments.is_archived IS 'Whether comment is archived (hidden from active view)';

COMMENT ON FUNCTION toggle_comment_reaction IS 'Intelligently toggles reactions - adds, removes, or updates';
COMMENT ON FUNCTION search_comments IS 'Full-text search with filtering by context, type, and status';

-- ========================================================================
-- 🎉 ACTIVATION COMPLETE!
-- ========================================================================

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '🎉 ADVANCED COMMENTS SYSTEM ACTIVATED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Enhanced comments with context linking';
    RAISE NOTICE '✅ Reactions (👍👎❤️🎉😕)';
    RAISE NOTICE '✅ Mentions (@users #organizations)';
    RAISE NOTICE '✅ File attachments';
    RAISE NOTICE '✅ Archive/resolve workflow';
    RAISE NOTICE '✅ Real-time notifications';
    RAISE NOTICE '✅ Advanced search & filtering';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready to use! Check /demo/enhanced-comments for live demo.';
END $$;

-- ========================================================================