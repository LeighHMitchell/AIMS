-- Migration to add missing feature column to feedback table
-- This allows users to specify which app feature their feedback relates to

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS feature TEXT;

-- Add comment for clarity
COMMENT ON COLUMN feedback.feature IS 'App feature/functionality this feedback relates to';