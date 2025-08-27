-- Add attachment support to feedback table
-- Migration: 20250129000006_add_feedback_attachments.sql

-- Add attachment columns to existing feedback table
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- Create index for attachment queries
CREATE INDEX IF NOT EXISTS idx_feedback_has_attachment ON public.feedback(attachment_url) 
WHERE attachment_url IS NOT NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Feedback table updated with attachment support!';
END $$;
