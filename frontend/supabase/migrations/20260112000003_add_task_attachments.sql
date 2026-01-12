-- =====================================================
-- TASK ATTACHMENTS
-- Document attachments for tasks (signed letters, guidance docs, etc.)
-- =====================================================

-- =====================================================
-- 1. TASK_ATTACHMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to task
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- File informationP
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_name TEXT NOT NULL, -- Original filename
  file_type TEXT NOT NULL, -- MIME type
  file_size BIGINT DEFAULT 0, -- Size in bytes

  -- Optional description
  description TEXT,

  -- Attachment type classification
  attachment_type TEXT DEFAULT 'document'
    CHECK (attachment_type IN ('document', 'guidance', 'letter', 'template', 'evidence', 'other')),

  -- Upload tracking
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_type ON task_attachments(attachment_type);

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Task creators can view attachments" ON task_attachments;
DROP POLICY IF EXISTS "Assignees can view attachments" ON task_attachments;
DROP POLICY IF EXISTS "Shared users can view attachments" ON task_attachments;
DROP POLICY IF EXISTS "Super users can view all attachments" ON task_attachments;
DROP POLICY IF EXISTS "Task creators can add attachments" ON task_attachments;
DROP POLICY IF EXISTS "Super users can add attachments" ON task_attachments;
DROP POLICY IF EXISTS "Task creators can delete attachments" ON task_attachments;
DROP POLICY IF EXISTS "Super users can delete any attachment" ON task_attachments;

-- Task creators can view attachments for their tasks
CREATE POLICY "Task creators can view attachments"
  ON task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_attachments.task_id AND t.created_by = auth.uid()
    )
  );

-- Task assignees can view attachments
CREATE POLICY "Assignees can view attachments"
  ON task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments ta
      JOIN tasks t ON t.id = ta.task_id
      WHERE t.id = task_attachments.task_id AND ta.assignee_id = auth.uid()
    )
  );

-- Users with shares can view attachments
CREATE POLICY "Shared users can view attachments"
  ON task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_shares ts
      WHERE ts.task_id = task_attachments.task_id AND ts.shared_with_id = auth.uid()
    )
  );

-- Super users can view all attachments
CREATE POLICY "Super users can view all attachments"
  ON task_attachments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- Task creators can add attachments
CREATE POLICY "Task creators can add attachments"
  ON task_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_attachments.task_id AND t.created_by = auth.uid()
    )
  );

-- Super users can add attachments to any task
CREATE POLICY "Super users can add attachments"
  ON task_attachments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- Task creators can delete attachments from their tasks
CREATE POLICY "Task creators can delete attachments"
  ON task_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_attachments.task_id AND t.created_by = auth.uid()
    )
  );

-- Super users can delete any attachment
CREATE POLICY "Super users can delete any attachment"
  ON task_attachments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- =====================================================
-- 5. STORAGE BUCKET FOR TASK ATTACHMENTS
-- =====================================================

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  FALSE, -- Private bucket - access controlled via RLS
  52428800, -- 50MB limit per file
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- 6. STORAGE POLICIES
-- =====================================================

-- Drop existing storage policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Task creators can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Super users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can read task attachments they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Task creators can delete their attachments" ON storage.objects;

-- Policy for uploading files - task creators can upload
CREATE POLICY "Task creators can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments' AND
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id::text = (storage.foldername(name))[1]
      AND t.created_by = auth.uid()
    )
  );

-- Super users can upload to any task
CREATE POLICY "Super users can upload task attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- Policy for reading files
CREATE POLICY "Users can read task attachments they have access to"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task-attachments' AND
    (
      -- Task creator
      EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id::text = (storage.foldername(name))[1]
        AND t.created_by = auth.uid()
      ) OR
      -- Task assignee
      EXISTS (
        SELECT 1 FROM task_assignments ta
        JOIN tasks t ON t.id = ta.task_id
        WHERE t.id::text = (storage.foldername(name))[1]
        AND ta.assignee_id = auth.uid()
      ) OR
      -- Shared user
      EXISTS (
        SELECT 1 FROM task_shares ts
        WHERE ts.task_id::text = (storage.foldername(name))[1]
        AND ts.shared_with_id = auth.uid()
      ) OR
      -- Super user
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
    )
  );

-- Policy for deleting files
CREATE POLICY "Task creators can delete their attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task-attachments' AND
    (
      EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id::text = (storage.foldername(name))[1]
        AND t.created_by = auth.uid()
      ) OR
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
    )
  );

-- =====================================================
-- 7. VIEW FOR ATTACHMENTS WITH USER INFO
-- =====================================================
CREATE OR REPLACE VIEW task_attachments_with_user AS
SELECT
  ta.*,
  u.first_name AS uploader_first_name,
  u.last_name AS uploader_last_name,
  u.email AS uploader_email,
  u.avatar_url AS uploader_avatar_url
FROM task_attachments ta
LEFT JOIN users u ON ta.uploaded_by_user_id = u.id;

-- =====================================================
-- 8. COMMENTS
-- =====================================================
COMMENT ON TABLE task_attachments IS 'Document attachments for tasks (letters, guidance, templates)';
COMMENT ON COLUMN task_attachments.file_path IS 'Path in Supabase Storage task-attachments bucket';
COMMENT ON COLUMN task_attachments.attachment_type IS 'Classification: document, guidance, letter, template, evidence, other';
COMMENT ON VIEW task_attachments_with_user IS 'Task attachments with uploader information';
