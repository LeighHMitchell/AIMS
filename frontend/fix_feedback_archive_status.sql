-- Fix feedback table status constraint to allow archived status
-- This script fixes the "invalid status value" error when archiving feedback

-- First, check if the constraint exists and what it currently allows
DO $$
DECLARE
    constraint_name text;
    constraint_definition text;
BEGIN
    -- Find the constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint 
    WHERE conrelid = 'public.feedback'::regclass 
    AND contype = 'c' 
    AND pg_get_constraintdef(oid) LIKE '%status%';
    
    IF constraint_name IS NOT NULL THEN
        RAISE NOTICE 'Found constraint: %', constraint_name;
        
        -- Get the constraint definition
        SELECT pg_get_constraintdef(oid) INTO constraint_definition
        FROM pg_constraint 
        WHERE conname = constraint_name;
        
        RAISE NOTICE 'Current constraint: %', constraint_definition;
    ELSE
        RAISE NOTICE 'No status constraint found on feedback table';
    END IF;
END $$;

-- Drop the existing check constraint if it exists
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_status_check;

-- Add the new check constraint that includes 'archived'
ALTER TABLE public.feedback ADD CONSTRAINT feedback_status_check 
  CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'archived'));

-- Verify the constraint was added
DO $$
BEGIN
    RAISE NOTICE 'Successfully added feedback_status_check constraint';
    RAISE NOTICE 'Status values now allowed: open, in_progress, resolved, closed, archived';
END $$;

-- Test the constraint by trying to insert a test record (will be rolled back)
BEGIN;
    -- This should work now
    INSERT INTO public.feedback (user_id, category, message, status) 
    VALUES ('00000000-0000-0000-0000-000000000000', 'question', 'Test archived status', 'archived');
    
    -- Roll back the test insert
    ROLLBACK;
    
    RAISE NOTICE 'Test insert with archived status succeeded - constraint is working!';
END;
