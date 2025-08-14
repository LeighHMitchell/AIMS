-- Create comprehensive activity documents system
-- This migration creates a proper relational structure for activity documents

-- Create activity_documents table
CREATE TABLE activity_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  -- IATI Document Link fields
  url TEXT NOT NULL,
  format TEXT NOT NULL, -- MIME type or IATI format code
  title JSONB NOT NULL, -- Array of narrative objects [{text: string, lang: string}]
  description JSONB, -- Array of narrative objects [{text: string, lang: string}]
  category_code VARCHAR(10) NOT NULL, -- IATI document category code (A01, A02, etc.)
  language_codes TEXT[] DEFAULT ARRAY['en'], -- Array of ISO 639-1 language codes
  document_date DATE,
  recipient_countries TEXT[], -- Array of ISO 3166-1 country codes
  
  -- File metadata (for uploaded files)
  file_name TEXT, -- Original filename
  file_size BIGINT DEFAULT 0, -- File size in bytes
  file_path TEXT, -- Path in Supabase Storage
  thumbnail_url TEXT, -- URL to generated thumbnail
  is_external BOOLEAN DEFAULT false, -- true for external URLs, false for uploaded files
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT activity_documents_valid_url CHECK (url IS NOT NULL AND url != ''),
  CONSTRAINT activity_documents_valid_format CHECK (format IS NOT NULL AND format != ''),
  CONSTRAINT activity_documents_valid_title CHECK (jsonb_array_length(title) > 0),
  CONSTRAINT activity_documents_valid_category CHECK (category_code IS NOT NULL AND category_code != ''),
  CONSTRAINT activity_documents_file_consistency CHECK (
    (is_external = true AND file_path IS NULL) OR 
    (is_external = false AND file_path IS NOT NULL)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_activity_documents_activity_id ON activity_documents(activity_id);
CREATE INDEX idx_activity_documents_category_code ON activity_documents(category_code);
CREATE INDEX idx_activity_documents_uploaded_by ON activity_documents(uploaded_by);
CREATE INDEX idx_activity_documents_created_at ON activity_documents(created_at);
CREATE INDEX idx_activity_documents_is_external ON activity_documents(is_external);
CREATE INDEX idx_activity_documents_document_date ON activity_documents(document_date);

-- Create GIN index for JSONB fields
CREATE INDEX idx_activity_documents_title_gin ON activity_documents USING GIN (title);
CREATE INDEX idx_activity_documents_description_gin ON activity_documents USING GIN (description);

-- Enable RLS
ALTER TABLE activity_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_documents
-- Users can view documents for activities they have access to
CREATE POLICY "Users can view activity documents they have access to"
ON activity_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM activities a 
    WHERE a.id = activity_documents.activity_id 
    AND (
      -- Public activities are viewable by everyone
      a.publication_status = 'published'
      OR
      -- Private activities are viewable by authenticated users with access
      (
        auth.uid() IS NOT NULL 
        AND (
          -- Activity creator
          a.created_by = auth.uid()::text
          OR
          -- Activity contributors
          EXISTS (
            SELECT 1 FROM activity_contributors ac 
            WHERE ac.activity_id = a.id 
            AND ac.user_id = auth.uid()
            AND ac.role IN ('editor', 'admin', 'viewer')
          )
          OR
          -- Organization members (if user has organization access)
          EXISTS (
            SELECT 1 FROM user_organizations uo
            WHERE uo.user_id = auth.uid()
            AND uo.organization_id = a.reporting_org_id
          )
        )
      )
    )
  )
);

-- Users can insert documents for activities they can edit
CREATE POLICY "Users can insert activity documents they can edit"
ON activity_documents FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM activities a 
    WHERE a.id = activity_documents.activity_id 
    AND (
      -- Activity creator
      a.created_by = auth.uid()::text
      OR
      -- Activity contributors with edit access
      EXISTS (
        SELECT 1 FROM activity_contributors ac 
        WHERE ac.activity_id = a.id 
        AND ac.user_id = auth.uid()
        AND ac.role IN ('editor', 'admin')
      )
    )
  )
);

-- Users can update documents they uploaded or have edit access to
CREATE POLICY "Users can update activity documents they can edit"
ON activity_documents FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Document uploader
    uploaded_by = auth.uid()
    OR
    -- Activity edit access
    EXISTS (
      SELECT 1 FROM activities a 
      WHERE a.id = activity_documents.activity_id 
      AND (
        -- Activity creator
        a.created_by = auth.uid()::text
        OR
        -- Activity contributors with edit access
        EXISTS (
          SELECT 1 FROM activity_contributors ac 
          WHERE ac.activity_id = a.id 
          AND ac.user_id = auth.uid()
          AND ac.role IN ('editor', 'admin')
        )
      )
    )
  )
);

-- Users can delete documents they uploaded or have admin access to
CREATE POLICY "Users can delete activity documents they can admin"
ON activity_documents FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Document uploader
    uploaded_by = auth.uid()
    OR
    -- Activity admin access
    EXISTS (
      SELECT 1 FROM activities a 
      WHERE a.id = activity_documents.activity_id 
      AND (
        -- Activity creator
        a.created_by = auth.uid()::text
        OR
        -- Activity contributors with admin access
        EXISTS (
          SELECT 1 FROM activity_contributors ac 
          WHERE ac.activity_id = a.id 
          AND ac.user_id = auth.uid()
          AND ac.role = 'admin'
        )
      )
    )
  )
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_activity_documents_updated_at
  BEFORE UPDATE ON activity_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_documents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE activity_documents IS 'IATI-compliant documents and images associated with activities';
COMMENT ON COLUMN activity_documents.activity_id IS 'Reference to the activity this document belongs to';
COMMENT ON COLUMN activity_documents.url IS 'Public URL to access the document (local or external)';
COMMENT ON COLUMN activity_documents.format IS 'MIME type or IATI format code for the document';
COMMENT ON COLUMN activity_documents.title IS 'JSONB array of narrative objects with text and language';
COMMENT ON COLUMN activity_documents.description IS 'JSONB array of narrative objects with text and language';
COMMENT ON COLUMN activity_documents.category_code IS 'IATI document category code (A01=Pre/post impact appraisal, etc.)';
COMMENT ON COLUMN activity_documents.language_codes IS 'Array of ISO 639-1 language codes for document content';
COMMENT ON COLUMN activity_documents.document_date IS 'Date when the document was created or published';
COMMENT ON COLUMN activity_documents.recipient_countries IS 'Array of ISO 3166-1 country codes if document is country-specific';
COMMENT ON COLUMN activity_documents.file_path IS 'Path to file in Supabase Storage (null for external URLs)';
COMMENT ON COLUMN activity_documents.is_external IS 'True for external URLs, false for uploaded files';

-- Create a view for easy access to activity documents with user info
CREATE VIEW activity_documents_with_user AS
SELECT 
  ad.*,
  u.email as uploaded_by_email,
  u.raw_user_meta_data->>'first_name' as uploaded_by_first_name,
  u.raw_user_meta_data->>'last_name' as uploaded_by_last_name,
  a.title_narrative as activity_title,
  a.activity_status
FROM activity_documents ad
LEFT JOIN auth.users u ON ad.uploaded_by = u.id
LEFT JOIN activities a ON ad.activity_id = a.id;

-- Grant access to the view
GRANT SELECT ON activity_documents_with_user TO authenticated;

-- Create storage bucket for activity documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('activity-documents', 'activity-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for activity documents bucket
-- Users can upload documents for activities they can edit
CREATE POLICY "Users can upload activity documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'activity-documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- Extract activity ID from path (format: activity-documents/{activityId}/...)
    CASE 
      WHEN position('/' in name) > 0 THEN
        EXISTS (
          SELECT 1 FROM activities a 
          WHERE a.id::text = split_part(name, '/', 1)
          AND (
            a.created_by = auth.uid()::text
            OR EXISTS (
              SELECT 1 FROM activity_contributors ac 
              WHERE ac.activity_id = a.id 
              AND ac.user_id = auth.uid()
              AND ac.role IN ('editor', 'admin')
            )
          )
        )
      ELSE false
    END
  )
);

-- Users can view documents for activities they have access to
CREATE POLICY "Users can view activity documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'activity-documents'
  AND (
    -- Extract activity ID from path
    CASE 
      WHEN position('/' in name) > 0 THEN
        EXISTS (
          SELECT 1 FROM activities a 
          WHERE a.id::text = split_part(name, '/', 1)
          AND (
            a.publication_status = 'published'
            OR (
              auth.uid() IS NOT NULL 
              AND (
                a.created_by = auth.uid()::text
                OR EXISTS (
                  SELECT 1 FROM activity_contributors ac 
                  WHERE ac.activity_id = a.id 
                  AND ac.user_id = auth.uid()
                )
              )
            )
          )
        )
      ELSE false
    END
  )
);

-- Users can delete documents they uploaded or have admin access to
CREATE POLICY "Users can delete activity documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'activity-documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if user has admin access to the activity
    CASE 
      WHEN position('/' in name) > 0 THEN
        EXISTS (
          SELECT 1 FROM activities a 
          WHERE a.id::text = split_part(name, '/', 1)
          AND (
            a.created_by = auth.uid()::text
            OR EXISTS (
              SELECT 1 FROM activity_contributors ac 
              WHERE ac.activity_id = a.id 
              AND ac.user_id = auth.uid()
              AND ac.role = 'admin'
            )
          )
        )
      ELSE false
    END
  )
);

-- Create helper functions for document management

-- Function to get documents for an activity (with proper access control)
CREATE OR REPLACE FUNCTION get_activity_documents(activity_uuid UUID)
RETURNS TABLE (
  id UUID,
  url TEXT,
  format TEXT,
  title JSONB,
  description JSONB,
  category_code VARCHAR(10),
  language_codes TEXT[],
  document_date DATE,
  recipient_countries TEXT[],
  file_name TEXT,
  file_size BIGINT,
  thumbnail_url TEXT,
  is_external BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  uploaded_by_email TEXT,
  uploaded_by_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ad.id,
    ad.url,
    ad.format,
    ad.title,
    ad.description,
    ad.category_code,
    ad.language_codes,
    ad.document_date,
    ad.recipient_countries,
    ad.file_name,
    ad.file_size,
    ad.thumbnail_url,
    ad.is_external,
    ad.created_at,
    ad.updated_at,
    u.email as uploaded_by_email,
    COALESCE(
      u.raw_user_meta_data->>'first_name' || ' ' || u.raw_user_meta_data->>'last_name',
      u.email
    ) as uploaded_by_name
  FROM activity_documents ad
  LEFT JOIN auth.users u ON ad.uploaded_by = u.id
  WHERE ad.activity_id = activity_uuid
  ORDER BY ad.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_activity_documents(UUID) TO authenticated;
