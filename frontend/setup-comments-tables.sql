-- SQL script to manually create the missing comments tables
-- Run this directly in your Supabase SQL editor or database console

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
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_comment_id ON activity_comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_user_id ON activity_comment_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_comment_id ON activity_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_reply_id ON activity_comment_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_user_id ON activity_comment_likes(user_id);

-- Display success message
SELECT 'Comments tables setup completed successfully!' as status;