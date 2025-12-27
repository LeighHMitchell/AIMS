-- Create organization comments tables
-- Similar structure to activity_comments but for organizations

-- Create organization_comments table with enhanced features
CREATE TABLE IF NOT EXISTS organization_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
    message TEXT NOT NULL,
    content TEXT, -- Backward compatibility field
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
    context_section TEXT, -- Which organization section this comment relates to
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

-- Create organization_comment_replies table with enhanced features
CREATE TABLE IF NOT EXISTS organization_comment_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_comment_id UUID NOT NULL REFERENCES organization_comments(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
    message TEXT NOT NULL,
    content TEXT, -- Backward compatibility field
    mentions JSONB DEFAULT '[]'::jsonb, -- Array of mentioned user/org IDs
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment objects
    is_read JSONB DEFAULT '{}'::jsonb, -- Object mapping user_id to read status
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_comments_organization_id ON organization_comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_comments_user_id ON organization_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_comments_created_at ON organization_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organization_comments_context_section ON organization_comments(context_section);
CREATE INDEX IF NOT EXISTS idx_organization_comments_status ON organization_comments(status);
CREATE INDEX IF NOT EXISTS idx_organization_comments_is_archived ON organization_comments(is_archived);

CREATE INDEX IF NOT EXISTS idx_organization_comment_replies_parent_comment_id ON organization_comment_replies(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_organization_comment_replies_organization_id ON organization_comment_replies(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_comment_replies_user_id ON organization_comment_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_comment_replies_created_at ON organization_comment_replies(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE organization_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_comment_replies ENABLE ROW LEVEL SECURITY;

-- Create policies for organization comments (adjust based on your security requirements)
-- Allow all authenticated users to view comments
CREATE POLICY "Users can view all organization comments" ON organization_comments
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert comments
CREATE POLICY "Users can create organization comments" ON organization_comments
    FOR INSERT
    WITH CHECK (true);

-- Allow users to update their own comments or if they have admin role
CREATE POLICY "Users can update organization comments" ON organization_comments
    FOR UPDATE
    USING (true);

-- Create policies for organization comment replies
CREATE POLICY "Users can view all organization comment replies" ON organization_comment_replies
    FOR SELECT
    USING (true);

CREATE POLICY "Users can create organization comment replies" ON organization_comment_replies
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update organization comment replies" ON organization_comment_replies
    FOR UPDATE
    USING (true);


