-- Create transaction_documents table for storing evidence files
CREATE TABLE transaction_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL,
  activity_id UUID,
  
  -- File information
  file_name TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_type TEXT,
  file_url TEXT, -- URL to stored file (S3, Supabase storage, etc.)
  external_url TEXT, -- External link to document
  
  -- Metadata
  description TEXT,
  document_type TEXT DEFAULT 'evidence', -- evidence, receipt, invoice, contract, etc.
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT transaction_documents_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions(uuid) ON DELETE CASCADE,
  CONSTRAINT transaction_documents_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  CONSTRAINT transaction_documents_file_or_url CHECK (
    (file_url IS NOT NULL AND external_url IS NULL) OR 
    (file_url IS NULL AND external_url IS NOT NULL)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_transaction_documents_transaction_id ON transaction_documents(transaction_id);
CREATE INDEX idx_transaction_documents_activity_id ON transaction_documents(activity_id);
CREATE INDEX idx_transaction_documents_uploaded_by ON transaction_documents(uploaded_by);
CREATE INDEX idx_transaction_documents_created_at ON transaction_documents(created_at);

-- Enable RLS
ALTER TABLE transaction_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_documents
-- Users can view documents for transactions they have access to
CREATE POLICY "Users can view transaction documents they have access to"
ON transaction_documents FOR SELECT
USING (
  -- Check if user has access to the associated activity
  activity_id IN (
    SELECT a.id FROM activities a
    LEFT JOIN activity_contributors ac ON a.id = ac.activity_id
    WHERE 
      a.created_by = auth.uid() OR
      ac.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      ) OR
      a.publication_status = 'published'
  )
);

-- Users can insert documents for transactions they can edit
CREATE POLICY "Users can upload documents for transactions they can edit"
ON transaction_documents FOR INSERT
WITH CHECK (
  -- Check if user can edit the associated activity
  activity_id IN (
    SELECT a.id FROM activities a
    LEFT JOIN activity_contributors ac ON a.id = ac.activity_id
    WHERE 
      a.created_by = auth.uid() OR
      ac.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
  )
);

-- Users can update documents they uploaded or have edit access to
CREATE POLICY "Users can update transaction documents they uploaded or have edit access"
ON transaction_documents FOR UPDATE
USING (
  uploaded_by = auth.uid() OR
  activity_id IN (
    SELECT a.id FROM activities a
    LEFT JOIN activity_contributors ac ON a.id = ac.activity_id
    WHERE 
      a.created_by = auth.uid() OR
      ac.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
  )
);

-- Users can delete documents they uploaded or have admin access to
CREATE POLICY "Users can delete transaction documents they uploaded or have admin access"
ON transaction_documents FOR DELETE
USING (
  uploaded_by = auth.uid() OR
  activity_id IN (
    SELECT a.id FROM activities a
    LEFT JOIN activity_contributors ac ON a.id = ac.activity_id
    WHERE 
      a.created_by = auth.uid() OR
      ac.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
  )
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transaction_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_transaction_documents_updated_at
  BEFORE UPDATE ON transaction_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_documents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE transaction_documents IS 'Supporting documents and evidence files for financial transactions';
COMMENT ON COLUMN transaction_documents.transaction_id IS 'Reference to the transaction this document supports';
COMMENT ON COLUMN transaction_documents.activity_id IS 'Reference to the activity for additional access control';
COMMENT ON COLUMN transaction_documents.file_url IS 'URL to the stored file (e.g., Supabase Storage)';
COMMENT ON COLUMN transaction_documents.external_url IS 'External URL link to document hosted elsewhere';
COMMENT ON COLUMN transaction_documents.document_type IS 'Type of document: evidence, receipt, invoice, contract, etc.';
COMMENT ON COLUMN transaction_documents.file_size IS 'File size in bytes (0 for external URLs)';

-- Create a view for easy access to transaction documents with user info
CREATE VIEW transaction_documents_with_user AS
SELECT 
  td.*,
  u.email as uploaded_by_email,
  u.raw_user_meta_data->>'first_name' as uploaded_by_first_name,
  u.raw_user_meta_data->>'last_name' as uploaded_by_last_name
FROM transaction_documents td
LEFT JOIN auth.users u ON td.uploaded_by = u.id;

-- Grant access to the view
GRANT SELECT ON transaction_documents_with_user TO authenticated;

-- Add RLS to the view (inherits from base table)

-- Create storage bucket for transaction documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('transaction-documents', 'transaction-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for transaction documents bucket
-- Users can upload documents for activities they can edit
CREATE POLICY "Users can upload transaction documents for activities they can edit"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'transaction-documents' AND
  (
    -- Extract transaction ID from the path (format: transaction-id/filename)
    substring(name from '^([^/]+)') IN (
      SELECT t.uuid::text FROM transactions t
      JOIN activities a ON t.activity_id = a.id
      LEFT JOIN activity_contributors ac ON a.id = ac.activity_id
      WHERE 
        a.created_by = auth.uid() OR
        ac.organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
    )
  )
);

-- Users can view documents for activities they have access to  
CREATE POLICY "Users can view transaction documents for activities they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transaction-documents' AND
  (
    substring(name from '^([^/]+)') IN (
      SELECT t.uuid::text FROM transactions t
      JOIN activities a ON t.activity_id = a.id
      LEFT JOIN activity_contributors ac ON a.id = ac.activity_id
      WHERE 
        a.created_by = auth.uid() OR
        ac.organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        ) OR
        a.publication_status = 'published'
    )
  )
);

-- Users can delete documents they uploaded or have admin access to
CREATE POLICY "Users can delete transaction documents they uploaded or have admin access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'transaction-documents' AND
  (
    substring(name from '^([^/]+)') IN (
      SELECT t.uuid::text FROM transactions t
      JOIN activities a ON t.activity_id = a.id
      LEFT JOIN activity_contributors ac ON a.id = ac.activity_id
      WHERE 
        a.created_by = auth.uid() OR
        ac.organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
    )
  )
);