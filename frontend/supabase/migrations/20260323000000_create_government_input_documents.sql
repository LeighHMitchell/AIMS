-- Create government_input_documents table for file uploads
-- associated with government inputs (budget supporting docs, agreement docs, evaluation docs)

CREATE TABLE IF NOT EXISTS government_input_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    category TEXT NOT NULL,  -- 'budget-supporting', 'agreement', 'evaluation'
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,  -- Supabase Storage path
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gov_input_docs_activity_id ON government_input_documents(activity_id);
CREATE INDEX IF NOT EXISTS idx_gov_input_docs_category ON government_input_documents(activity_id, category);

-- Enable RLS
ALTER TABLE government_input_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies (match the pattern from government_inputs)
CREATE POLICY "Users can view government input documents for accessible activities"
    ON government_input_documents FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = government_input_documents.activity_id
            AND a.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert government input documents for their activities"
    ON government_input_documents FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = government_input_documents.activity_id
            AND a.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete government input documents for their activities"
    ON government_input_documents FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = government_input_documents.activity_id
            AND a.created_by = auth.uid()
        )
    );

-- Service role bypass (for API routes using getSupabaseAdmin / requireAuth)
CREATE POLICY "Service role has full access to government input documents"
    ON government_input_documents FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Create storage bucket for government input documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'government-input-documents',
    'government-input-documents',
    false,  -- private bucket, access via signed URLs
    10485760, -- 10MB limit
    ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
CREATE POLICY "Allow authenticated users to upload government input documents"
    ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'government-input-documents'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated users to read government input documents"
    ON storage.objects FOR SELECT USING (
        bucket_id = 'government-input-documents'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated users to delete government input documents"
    ON storage.objects FOR DELETE USING (
        bucket_id = 'government-input-documents'
        AND auth.role() = 'authenticated'
    );

-- Service role storage access
CREATE POLICY "Service role full access to government input documents storage"
    ON storage.objects FOR ALL USING (
        bucket_id = 'government-input-documents'
        AND auth.role() = 'service_role'
    ) WITH CHECK (
        bucket_id = 'government-input-documents'
        AND auth.role() = 'service_role'
    );
