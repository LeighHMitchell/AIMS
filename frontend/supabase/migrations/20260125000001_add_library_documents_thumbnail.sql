-- Migration: Add thumbnail columns to library_documents
-- Description: Store server-generated thumbnails for PDF and other document types

-- Add thumbnail columns
ALTER TABLE library_documents ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE library_documents ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

-- Add index for thumbnail lookup
CREATE INDEX IF NOT EXISTS idx_library_documents_thumbnail_url ON library_documents(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- Add comments
COMMENT ON COLUMN library_documents.thumbnail_url IS 'Public URL to the server-generated thumbnail image';
COMMENT ON COLUMN library_documents.thumbnail_path IS 'Path to thumbnail in Supabase Storage';
