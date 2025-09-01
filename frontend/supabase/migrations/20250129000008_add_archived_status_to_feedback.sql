-- Add archived status to feedback table status constraint
-- Migration: 20250129000008_add_archived_status_to_feedback.sql

-- Drop the existing check constraint
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_status_check;

-- Add the new check constraint that includes 'archived'
ALTER TABLE public.feedback ADD CONSTRAINT feedback_status_check 
  CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'archived'));

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Added archived status to feedback table status constraint successfully!';
END $$;
