-- Add reactions (thumbs up/down) to comments system
-- This extends the enhanced comments system with reaction support

-- Create comment_reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_reply_id ON comment_reactions(reply_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_type ON comment_reactions(reaction_type);

-- Enable RLS
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for reactions
CREATE POLICY "Users can view all reactions" ON comment_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can create reactions" ON comment_reactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own reactions" ON comment_reactions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions" ON comment_reactions
    FOR DELETE USING (user_id = auth.uid());

-- Add trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_comment_reactions_updated_at ON comment_reactions;
CREATE TRIGGER update_comment_reactions_updated_at
    BEFORE UPDATE ON comment_reactions
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

-- Function to toggle a reaction (add if not exists, remove if exists, update if different)
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

-- Add reaction count columns to comments view (for performance)
-- These will be calculated on-demand rather than stored

-- Comment on the new functionality
COMMENT ON TABLE comment_reactions IS 'Stores user reactions (thumbs up/down, etc.) to comments and replies';
COMMENT ON FUNCTION toggle_comment_reaction IS 'Toggles user reactions - adds, removes, or updates reactions intelligently';
COMMENT ON FUNCTION get_comment_reaction_counts IS 'Gets aggregated reaction counts and user lists for a comment';
COMMENT ON FUNCTION get_reply_reaction_counts IS 'Gets aggregated reaction counts and user lists for a reply';