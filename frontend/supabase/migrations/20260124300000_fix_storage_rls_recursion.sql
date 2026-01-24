-- =====================================================
-- FIX: Infinite recursion in storage policies
-- The task-attachments storage policies reference the tasks table,
-- which has RLS policies that create a circular dependency.
-- This migration fixes the issue by using SECURITY DEFINER functions
-- that bypass RLS when checking permissions.
-- =====================================================

-- =====================================================
-- 1. DROP EXISTING TASK HELPER FUNCTIONS (if they exist)
-- Note: We do NOT drop is_super_user as it's used by other policies
-- =====================================================
DROP FUNCTION IF EXISTS is_task_creator(TEXT, UUID);
DROP FUNCTION IF EXISTS is_task_assignee(TEXT, UUID);
DROP FUNCTION IF EXISTS has_task_share(TEXT, UUID);

-- =====================================================
-- 2. CREATE HELPER FUNCTIONS WITH SECURITY DEFINER
-- These functions bypass RLS to avoid recursion
-- =====================================================

-- Function to check if user is a task creator
CREATE OR REPLACE FUNCTION is_task_creator(task_uuid TEXT, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id::text = task_uuid
    AND t.created_by = user_uuid
  );
END;
$$;

-- Function to check if user is a task assignee
CREATE OR REPLACE FUNCTION is_task_assignee(task_uuid TEXT, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM task_assignments ta
    WHERE ta.task_id::text = task_uuid
    AND ta.assignee_id = user_uuid
  );
END;
$$;

-- Function to check if user has task share
CREATE OR REPLACE FUNCTION has_task_share(task_uuid TEXT, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM task_shares ts
    WHERE ts.task_id::text = task_uuid
    AND ts.shared_with_id = user_uuid
  );
END;
$$;

-- =====================================================
-- 3. DROP AND RECREATE STORAGE POLICIES FOR task-attachments
-- =====================================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Task creators can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Super users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can read task attachments they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Task creators can delete their attachments" ON storage.objects;

-- Policy for uploading files - task creators can upload (using SECURITY DEFINER function)
CREATE POLICY "Task creators can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments' AND
    is_task_creator((storage.foldername(name))[1], auth.uid())
  );

-- Super users can upload to any task (using existing is_super_user function)
CREATE POLICY "Super users can upload task attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments' AND
    is_super_user(auth.uid())
  );

-- Policy for reading files (using SECURITY DEFINER functions)
CREATE POLICY "Users can read task attachments they have access to"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task-attachments' AND
    (
      is_task_creator((storage.foldername(name))[1], auth.uid()) OR
      is_task_assignee((storage.foldername(name))[1], auth.uid()) OR
      has_task_share((storage.foldername(name))[1], auth.uid()) OR
      is_super_user(auth.uid())
    )
  );

-- Policy for deleting files (using SECURITY DEFINER functions)
CREATE POLICY "Task creators can delete their attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task-attachments' AND
    (
      is_task_creator((storage.foldername(name))[1], auth.uid()) OR
      is_super_user(auth.uid())
    )
  );

-- =====================================================
-- 4. COMMENTS
-- =====================================================
COMMENT ON FUNCTION is_task_creator IS 'Check if user created the task - SECURITY DEFINER to avoid RLS recursion';
COMMENT ON FUNCTION is_task_assignee IS 'Check if user is assigned to the task - SECURITY DEFINER to avoid RLS recursion';
COMMENT ON FUNCTION has_task_share IS 'Check if user has task share - SECURITY DEFINER to avoid RLS recursion';
