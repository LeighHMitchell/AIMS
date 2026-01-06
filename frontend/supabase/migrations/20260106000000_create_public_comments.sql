-- Public Comments System Migration
-- Creates a separate public commenting system for activity profile pages
-- Distinct from internal activity_comments used in Activity Editor

-- Create activity_public_comments table
CREATE TABLE IF NOT EXISTS activity_public_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES activity_public_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    user_role TEXT,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_public_comment_likes table for tracking likes
CREATE TABLE IF NOT EXISTS activity_public_comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES activity_public_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_public_comments_activity_id ON activity_public_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_public_comments_parent_id ON activity_public_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_public_comments_user_id ON activity_public_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_public_comments_created_at ON activity_public_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_comment_likes_comment_id ON activity_public_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_public_comment_likes_user_id ON activity_public_comment_likes(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE activity_public_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_public_comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies for public comments (open read access, authenticated write)
DROP POLICY IF EXISTS "Anyone can view public comments" ON activity_public_comments;
DROP POLICY IF EXISTS "Users can create public comments" ON activity_public_comments;
DROP POLICY IF EXISTS "Users can update their own public comments" ON activity_public_comments;
DROP POLICY IF EXISTS "Users can delete their own public comments" ON activity_public_comments;

CREATE POLICY "Anyone can view public comments" ON activity_public_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create public comments" ON activity_public_comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own public comments" ON activity_public_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own public comments" ON activity_public_comments
    FOR DELETE USING (user_id = auth.uid());

-- Policies for likes
DROP POLICY IF EXISTS "Anyone can view likes" ON activity_public_comment_likes;
DROP POLICY IF EXISTS "Users can create likes" ON activity_public_comment_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON activity_public_comment_likes;

CREATE POLICY "Anyone can view likes" ON activity_public_comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can create likes" ON activity_public_comment_likes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own likes" ON activity_public_comment_likes
    FOR DELETE USING (user_id = auth.uid());

-- Trigger to update the updated_at timestamp
DROP TRIGGER IF EXISTS update_public_comments_updated_at ON activity_public_comments;
CREATE TRIGGER update_public_comments_updated_at
    BEFORE UPDATE ON activity_public_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update likes count when likes are added/removed
CREATE OR REPLACE FUNCTION update_public_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE activity_public_comments
        SET likes_count = likes_count + 1
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE activity_public_comments
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for likes count updates
DROP TRIGGER IF EXISTS trigger_update_likes_count ON activity_public_comment_likes;
CREATE TRIGGER trigger_update_likes_count
    AFTER INSERT OR DELETE ON activity_public_comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_public_comment_likes_count();

-- Grant necessary permissions
GRANT ALL ON activity_public_comments TO authenticated;
GRANT ALL ON activity_public_comment_likes TO authenticated;
GRANT SELECT ON activity_public_comments TO anon;
GRANT SELECT ON activity_public_comment_likes TO anon;

-- Add comments for documentation
COMMENT ON TABLE activity_public_comments IS 'Public comments on activity profile pages, visible to all users';
COMMENT ON TABLE activity_public_comment_likes IS 'Likes on public comments';
COMMENT ON COLUMN activity_public_comments.parent_id IS 'Self-reference for nested replies - NULL for top-level comments';
