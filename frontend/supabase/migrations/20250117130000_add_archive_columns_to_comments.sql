-- Add archive functionality to activity_comments table
-- This adds the necessary columns for comment archiving feature

-- Add archive columns to activity_comments table
ALTER TABLE public.activity_comments 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_by_id UUID,
ADD COLUMN IF NOT EXISTS archived_by_name TEXT,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Create index for better performance when filtering archived comments
CREATE INDEX IF NOT EXISTS idx_activity_comments_is_archived ON public.activity_comments(is_archived);

-- Create index for archived date for sorting
CREATE INDEX IF NOT EXISTS idx_activity_comments_archived_at ON public.activity_comments(archived_at);

-- Update the updated_at timestamp when archive status changes
-- The trigger already exists, so archive operations will update updated_at automatically

-- Add comment for documentation
COMMENT ON COLUMN public.activity_comments.is_archived IS 'Whether this comment has been archived (hidden from active view)';
COMMENT ON COLUMN public.activity_comments.archived_by_id IS 'UUID of user who archived this comment';
COMMENT ON COLUMN public.activity_comments.archived_by_name IS 'Name of user who archived this comment';
COMMENT ON COLUMN public.activity_comments.archived_at IS 'Timestamp when comment was archived';
COMMENT ON COLUMN public.activity_comments.archive_reason IS 'Optional reason for archiving the comment';