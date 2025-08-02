-- Simple comments table for AIMS system
-- Run this in your Supabase SQL editor to enable basic commenting

CREATE TABLE IF NOT EXISTS activity_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
    context_section TEXT,
    context_field TEXT,
    resolved_by_id UUID,
    resolved_by_name TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    mentions JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    is_read JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create replies table
CREATE TABLE IF NOT EXISTS activity_comment_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
    mentions JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    is_read JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user_id ON activity_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_created_at ON activity_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_comment_id ON activity_comment_replies(comment_id);

-- Enable RLS
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comment_replies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all comments" ON activity_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON activity_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own comments" ON activity_comments FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view all replies" ON activity_comment_replies FOR SELECT USING (true);
CREATE POLICY "Users can create replies" ON activity_comment_replies FOR INSERT WITH CHECK (true);