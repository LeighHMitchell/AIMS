-- Add attachment columns to feedback table
-- Run this SQL directly in your Supabase SQL editor

-- Add attachment columns to existing feedback table
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- Create index for attachment queries
CREATE INDEX IF NOT EXISTS idx_feedback_has_attachment ON public.feedback(attachment_url) 
WHERE attachment_url IS NOT NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'feedback' 
AND table_schema = 'public'
ORDER BY ordinal_position;
