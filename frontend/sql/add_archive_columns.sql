-- Add archive functionality to activity_comments table
-- Run this SQL in your Supabase SQL Editor

-- Add archive columns to activity_comments table
ALTER TABLE public.activity_comments 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_by_id UUID,
ADD COLUMN IF NOT EXISTS archived_by_name TEXT,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_comments_is_archived ON public.activity_comments(is_archived);
CREATE INDEX IF NOT EXISTS idx_activity_comments_archived_at ON public.activity_comments(archived_at);

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'activity_comments' 
    AND table_schema = 'public'
    AND column_name LIKE '%archive%'
ORDER BY ordinal_position;