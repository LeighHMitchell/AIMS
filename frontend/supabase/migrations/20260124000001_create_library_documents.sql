-- Migration: Create library_documents table for standalone documents
-- Description: Centralized document library that allows super users to upload 
-- standalone documents not linked to activities, transactions, or organizations

-- Create library_documents table
CREATE TABLE IF NOT EXISTS library_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- IATI Document Link fields (same structure as activity_documents)
  url TEXT NOT NULL,
  format TEXT NOT NULL, -- MIME type or IATI format code
  title JSONB NOT NULL DEFAULT '[]', -- Array of narrative objects [{text: string, lang: string}]
  description JSONB DEFAULT '[]', -- Array of narrative objects [{text: string, lang: string}]
  category_code VARCHAR(10), -- IATI document category code (A01, A02, etc.)
  language_codes TEXT[] DEFAULT ARRAY['en'], -- Array of ISO 639-1 language codes
  document_date DATE,
  recipient_countries TEXT[], -- Array of ISO 3166-1 country codes
  
  -- File metadata (for uploaded files)
  file_name TEXT, -- Original filename
  file_size BIGINT DEFAULT 0, -- File size in bytes
  file_path TEXT, -- Path in Supabase Storage
  is_external BOOLEAN DEFAULT false, -- true for external URLs, false for uploaded files
  
  -- Optional organization association (for filtering)
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT library_documents_valid_url CHECK (url IS NOT NULL AND url != ''),
  CONSTRAINT library_documents_valid_format CHECK (format IS NOT NULL AND format != ''),
  CONSTRAINT library_documents_file_consistency CHECK (
    (is_external = true AND file_path IS NULL) OR 
    (is_external = false AND file_path IS NOT NULL) OR
    (is_external = true) -- Allow external URLs without file_path
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_library_documents_category_code ON library_documents(category_code);
CREATE INDEX IF NOT EXISTS idx_library_documents_organization_id ON library_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_library_documents_uploaded_by ON library_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_library_documents_created_at ON library_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_library_documents_is_external ON library_documents(is_external);
CREATE INDEX IF NOT EXISTS idx_library_documents_document_date ON library_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_library_documents_format ON library_documents(format);

-- Create GIN index for JSONB fields (for text search)
CREATE INDEX IF NOT EXISTS idx_library_documents_title_gin ON library_documents USING GIN (title);
CREATE INDEX IF NOT EXISTS idx_library_documents_description_gin ON library_documents USING GIN (description);

-- Enable RLS
ALTER TABLE library_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for library_documents

-- All authenticated users can view library documents
CREATE POLICY "All authenticated users can view library documents"
ON library_documents FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only super_user or admin can insert library documents
CREATE POLICY "Super users can insert library documents"
ON library_documents FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND (u.role = 'super_user' OR u.role = 'admin')
  )
);

-- Only super_user or admin can update library documents
CREATE POLICY "Super users can update library documents"
ON library_documents FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND (u.role = 'super_user' OR u.role = 'admin')
  )
);

-- Only super_user or admin can delete library documents
CREATE POLICY "Super users can delete library documents"
ON library_documents FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND (u.role = 'super_user' OR u.role = 'admin')
  )
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_library_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_library_documents_updated_at ON library_documents;
CREATE TRIGGER trigger_update_library_documents_updated_at
  BEFORE UPDATE ON library_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_library_documents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE library_documents IS 'Standalone library documents not linked to specific activities, transactions, or organizations';
COMMENT ON COLUMN library_documents.url IS 'Public URL to access the document (local or external)';
COMMENT ON COLUMN library_documents.format IS 'MIME type or IATI format code for the document';
COMMENT ON COLUMN library_documents.title IS 'JSONB array of narrative objects with text and language';
COMMENT ON COLUMN library_documents.description IS 'JSONB array of narrative objects with text and language';
COMMENT ON COLUMN library_documents.category_code IS 'IATI document category code (A01=Pre/post impact appraisal, etc.)';
COMMENT ON COLUMN library_documents.language_codes IS 'Array of ISO 639-1 language codes for document content';
COMMENT ON COLUMN library_documents.document_date IS 'Date when the document was created or published';
COMMENT ON COLUMN library_documents.recipient_countries IS 'Array of ISO 3166-1 country codes if document is country-specific';
COMMENT ON COLUMN library_documents.organization_id IS 'Optional reference to an organization for filtering purposes';
COMMENT ON COLUMN library_documents.file_path IS 'Path to file in Supabase Storage (null for external URLs)';
COMMENT ON COLUMN library_documents.is_external IS 'True for external URLs, false for uploaded files';

-- Create a view for easy access to library documents with user info
CREATE OR REPLACE VIEW library_documents_with_user AS
SELECT 
  ld.*,
  u.email as uploaded_by_email,
  u.raw_user_meta_data->>'first_name' as uploaded_by_first_name,
  u.raw_user_meta_data->>'last_name' as uploaded_by_last_name,
  o.name as organization_name,
  o.acronym as organization_acronym
FROM library_documents ld
LEFT JOIN auth.users u ON ld.uploaded_by = u.id
LEFT JOIN organizations o ON ld.organization_id = o.id;

-- Grant access to the view
GRANT SELECT ON library_documents_with_user TO authenticated;

-- Create storage bucket for library documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('library-documents', 'library-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for library documents bucket

-- All authenticated users can view library documents
CREATE POLICY "All authenticated users can view library documents storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'library-documents'
  AND auth.uid() IS NOT NULL
);

-- Only super users can upload library documents
CREATE POLICY "Super users can upload library documents storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'library-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND (u.role = 'super_user' OR u.role = 'admin')
  )
);

-- Only super users can delete library documents from storage
CREATE POLICY "Super users can delete library documents storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'library-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND (u.role = 'super_user' OR u.role = 'admin')
  )
);
