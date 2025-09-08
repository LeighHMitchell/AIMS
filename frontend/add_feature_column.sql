-- SQL Migration: Add feature column to feedback table
-- Run this in your Supabase SQL Editor

-- Step 1: Add the feature column to the feedback table
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS feature TEXT;

-- Step 2: Add a comment to describe the column
COMMENT ON COLUMN feedback.feature IS 'App feature/functionality this feedback relates to';

-- Step 3: Verify the column was added (optional query to check)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name = 'feedback' 
    AND column_name = 'feature';

-- Step 4: Check if there are any existing feedback records (optional)
SELECT 
  It 
    subject, 
    created_at 
FROM 
    feedback 
ORDER BY 
    created_at DESC 
LIMIT 5;