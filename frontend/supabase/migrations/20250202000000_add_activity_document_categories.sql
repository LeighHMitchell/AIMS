-- Add support for multiple document categories per document
-- This migration creates a junction table to support IATI XML's ability to have multiple <category> elements

-- Create junction table for document categories
CREATE TABLE IF NOT EXISTS activity_document_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES activity_documents(id) ON DELETE CASCADE,
  category_code VARCHAR(10) NOT NULL,
  
  -- Ensure unique category per document
  UNIQUE(document_id, category_code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_document_categories_document_id 
  ON activity_document_categories(document_id);
CREATE INDEX IF NOT EXISTS idx_activity_document_categories_category_code 
  ON activity_document_categories(category_code);

-- Migrate existing data: Copy current category_code values to the new table
-- Only migrate documents that don't already have entries in the junction table
INSERT INTO activity_document_categories (document_id, category_code)
SELECT 
  id AS document_id,
  category_code
FROM activity_documents
WHERE category_code IS NOT NULL
  AND category_code != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM activity_document_categories adc 
    WHERE adc.document_id = activity_documents.id
  );

-- Make category_code nullable in activity_documents for backward compatibility
-- We'll keep it for now but new code should use the junction table
ALTER TABLE activity_documents 
  ALTER COLUMN category_code DROP NOT NULL;

-- Remove the constraint that requires category_code to be NOT NULL
ALTER TABLE activity_documents 
  DROP CONSTRAINT IF EXISTS activity_documents_valid_category;

-- Add new constraint that allows NULL (for documents with categories in junction table)
ALTER TABLE activity_documents 
  ADD CONSTRAINT activity_documents_valid_category 
  CHECK (
    category_code IS NULL OR 
    (category_code IS NOT NULL AND category_code != '')
  );

-- Enable Row Level Security
ALTER TABLE activity_document_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read document categories if they can read the document
CREATE POLICY "Users can read document categories for accessible documents"
ON activity_document_categories FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM activity_documents ad
    JOIN activities a ON a.id = ad.activity_id
    WHERE ad.id = activity_document_categories.document_id
    AND (
      -- Public activities are viewable by everyone
      a.publication_status = 'published'
      OR
      -- Private activities are viewable by authenticated users with access
      (
        auth.uid() IS NOT NULL 
        AND (
          -- Activity creator (cast both sides to text for compatibility)
          a.created_by::text = auth.uid()::text
          OR
          -- Activity contributors (check if user's organization is a contributor)
          EXISTS (
            SELECT 1 FROM activity_contributors ac 
            WHERE ac.activity_id = a.id 
            AND ac.organization_id IN (
              SELECT organization_id FROM users WHERE id = auth.uid()
            )
            AND ac.status = 'accepted'
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

-- RLS Policy: Users can insert document categories if they can edit the document
CREATE POLICY "Users can insert document categories for editable documents"
ON activity_document_categories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM activity_documents ad
    JOIN activities a ON a.id = ad.activity_id
    WHERE ad.id = activity_document_categories.document_id
    AND (
      -- Activity creator (cast both sides to text for compatibility)
      a.created_by::text = auth.uid()::text
      OR
      -- Activity contributors (check if user's organization is a contributor)
      EXISTS (
        SELECT 1 FROM activity_contributors ac
        WHERE ac.activity_id = a.id
        AND ac.organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND ac.status = 'accepted'
      )
      OR
      -- Document uploader (uploaded_by is UUID, so direct comparison)
      ad.uploaded_by = auth.uid()
    )
  )
);

-- RLS Policy: Users can update document categories if they can edit the document
CREATE POLICY "Users can update document categories for editable documents"
ON activity_document_categories FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM activity_documents ad
    JOIN activities a ON a.id = ad.activity_id
    WHERE ad.id = activity_document_categories.document_id
    AND (
      -- Activity creator (cast both sides to text for compatibility)
      a.created_by::text = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM activity_contributors ac
        WHERE ac.activity_id = a.id
        AND ac.organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND ac.status = 'accepted'
      )
      OR 
      -- Document uploader (uploaded_by is UUID, so direct comparison)
      ad.uploaded_by = auth.uid()
    )
  )
);

-- RLS Policy: Users can delete document categories if they can edit the document
CREATE POLICY "Users can delete document categories for editable documents"
ON activity_document_categories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM activity_documents ad
    JOIN activities a ON a.id = ad.activity_id
    WHERE ad.id = activity_document_categories.document_id
    AND (
      -- Activity creator (cast both sides to text for compatibility)
      a.created_by::text = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM activity_contributors ac
        WHERE ac.activity_id = a.id
        AND ac.organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND ac.status = 'accepted'
      )
      OR 
      -- Document uploader (uploaded_by is UUID, so direct comparison)
      ad.uploaded_by = auth.uid()
    )
  )
);

-- Add comments for documentation
COMMENT ON TABLE activity_document_categories IS 'Junction table for multiple IATI document categories per document';
COMMENT ON COLUMN activity_document_categories.document_id IS 'Reference to the activity document';
COMMENT ON COLUMN activity_document_categories.category_code IS 'IATI document category code (A01, A02, etc.)';

