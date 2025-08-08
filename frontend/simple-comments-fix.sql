-- ========================================================================
-- SIMPLE COMMENTS FIX - MINIMAL SETUP
-- ========================================================================
-- This script adds the minimum required setup to make comments work
-- ========================================================================

-- Set default values for existing comments
UPDATE activity_comments 
SET type = 'Feedback' 
WHERE type IS NULL;

UPDATE activity_comments 
SET status = 'Open' 
WHERE status IS NULL;

UPDATE activity_comments 
SET is_archived = FALSE 
WHERE is_archived IS NULL;

-- Create activity_comment_replies table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_comment_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback',
    message TEXT NOT NULL,
    mentions JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_read JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comment_reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS comment_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES activity_comment_replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    reaction_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user_id ON activity_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_created_at ON activity_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_comment_id ON activity_comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);

-- Enable RLS
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
DROP POLICY IF EXISTS "Users can view all comments" ON activity_comments;
CREATE POLICY "Users can view all comments" ON activity_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON activity_comments;
CREATE POLICY "Users can create comments" ON activity_comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view all replies" ON activity_comment_replies;
CREATE POLICY "Users can view all replies" ON activity_comment_replies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create replies" ON activity_comment_replies;
CREATE POLICY "Users can create replies" ON activity_comment_replies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view all reactions" ON comment_reactions;
CREATE POLICY "Users can view all reactions" ON comment_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create reactions" ON comment_reactions;
CREATE POLICY "Users can create reactions" ON comment_reactions FOR INSERT WITH CHECK (true);

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

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '🎉 SIMPLE COMMENTS FIX APPLIED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Set default values for existing comments';
    RAISE NOTICE '✅ Created missing tables (replies, reactions)';
    RAISE NOTICE '✅ Added basic indexes for performance';
    RAISE NOTICE '✅ Enabled Row Level Security with basic policies';
    RAISE NOTICE '✅ Created required functions and triggers';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Comments should now work!';
END $$;

-- ======================================================================== 