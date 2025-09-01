-- Add feature field to feedback table for better categorization
-- Migration: 20250129000009_add_feature_field_to_feedback.sql

-- Add the feature column to store which app feature/functionality the feedback is about
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS feature VARCHAR(100);

-- Add an index for performance
CREATE INDEX IF NOT EXISTS idx_feedback_feature ON public.feedback(feature);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Added feature field to feedback table successfully!';
END $$;
