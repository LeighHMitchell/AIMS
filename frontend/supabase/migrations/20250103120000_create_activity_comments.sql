-- Create comments tables for activities
-- This migration creates the tables needed for the advanced comment box feature

-- Create activity_comments table
CREATE TABLE IF NOT EXISTS activity_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
    resolved_by_id UUID,
    resolved_by_name TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_comment_replies table
CREATE TABLE IF NOT EXISTS activity_comment_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_comment_likes table for thumbs up/down functionality
CREATE TABLE IF NOT EXISTS activity_comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES activity_comment_replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    like_type TEXT NOT NULL CHECK (like_type IN ('thumbs_up', 'thumbs_down')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user can only like a comment or reply once
    CONSTRAINT unique_user_comment_like UNIQUE (comment_id, user_id),
    CONSTRAINT unique_user_reply_like UNIQUE (reply_id, user_id),
    
    -- Ensure either comment_id or reply_id is provided, but not both
    CONSTRAINT check_comment_or_reply CHECK (
        (comment_id IS NOT NULL AND reply_id IS NULL) OR 
        (comment_id IS NULL AND reply_id IS NOT NULL)
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user_id ON activity_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_created_at ON activity_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_comments_status ON activity_comments(status);

CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_comment_id ON activity_comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_user_id ON activity_comment_replies(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_comment_id ON activity_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_reply_id ON activity_comment_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_user_id ON activity_comment_likes(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comment_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for comments (adjust based on your security requirements)
CREATE POLICY "Users can view all comments" ON activity_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON activity_comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own comments" ON activity_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON activity_comments
    FOR DELETE USING (user_id = auth.uid());

-- Create policies for replies
CREATE POLICY "Users can view all replies" ON activity_comment_replies
    FOR SELECT USING (true);

CREATE POLICY "Users can create replies" ON activity_comment_replies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own replies" ON activity_comment_replies
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own replies" ON activity_comment_replies
    FOR DELETE USING (user_id = auth.uid());

-- Create policies for likes
CREATE POLICY "Users can view all likes" ON activity_comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can create likes" ON activity_comment_likes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own likes" ON activity_comment_likes
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own likes" ON activity_comment_likes
    FOR DELETE USING (user_id = auth.uid());

-- Add triggers to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activity_comments_updated_at
    BEFORE UPDATE ON activity_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_comment_replies_updated_at
    BEFORE UPDATE ON activity_comment_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();