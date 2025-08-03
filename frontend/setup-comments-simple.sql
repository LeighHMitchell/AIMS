-- Simple Comments Database Setup - Tables Only
-- Run this if you want to create just the tables without policies

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

-- Create essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_comment_id ON activity_comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_comment_id ON activity_comment_likes(comment_id);

-- Disable RLS for simpler setup (you can enable later if needed)
ALTER TABLE activity_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comment_replies DISABLE ROW LEVEL SECURITY;  
ALTER TABLE activity_comment_likes DISABLE ROW LEVEL SECURITY;

-- Add triggers to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist and recreate
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

-- Test query to verify tables exist
SELECT 
    'activity_comments' as table_name, 
    count(*) as row_count 
FROM activity_comments
UNION ALL
SELECT 
    'activity_comment_replies', 
    count(*) 
FROM activity_comment_replies  
UNION ALL
SELECT 
    'activity_comment_likes', 
    count(*) 
FROM activity_comment_likes;