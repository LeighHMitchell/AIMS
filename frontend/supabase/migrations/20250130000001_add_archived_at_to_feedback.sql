-- Add archived_at timestamp column to feedback table
-- Migration: 20250130000001_add_archived_at_to_feedback.sql

-- Add the archived_at column
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Create index for sorting by archived_at
CREATE INDEX IF NOT EXISTS idx_feedback_archived_at ON public.feedback(archived_at DESC);

-- Backfill: Set archived_at to updated_at for existing closed/archived items
UPDATE public.feedback 
SET archived_at = updated_at 
WHERE status = 'closed' AND archived_at IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Added archived_at column to feedback table successfully!';
END $$;

