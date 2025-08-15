-- Create Supabase Storage buckets for file uploads
-- This migration sets up the necessary storage buckets and policies

-- Create the main uploads bucket for general files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/json',
    'application/xml',
    'text/xml'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create activity documents bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'activity-documents',
  'activity-documents',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/json',
    'application/xml',
    'text/xml'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create transaction documents bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transaction-documents',
  'transaction-documents',
  true,
  52428800, -- 50MB limit
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

-- Storage policies for uploads bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'uploads' AND 
  auth.role() = 'authenticated'
);

-- Allow public read access to uploaded files
CREATE POLICY "Allow public read access to uploads" ON storage.objects
FOR SELECT USING (bucket_id = 'uploads');

-- Allow users to update their own uploaded files
CREATE POLICY "Allow users to update their own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own uploaded files
CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for activity-documents bucket
-- Allow authenticated users to upload activity documents
CREATE POLICY "Allow authenticated users to upload activity documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'activity-documents' AND 
  auth.role() = 'authenticated'
);

-- Allow public read access to activity documents
CREATE POLICY "Allow public read access to activity documents" ON storage.objects
FOR SELECT USING (bucket_id = 'activity-documents');

-- Allow users to update activity documents they have access to
CREATE POLICY "Allow users to update activity documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'activity-documents' AND 
  auth.role() = 'authenticated'
);

-- Allow users to delete activity documents they have access to
CREATE POLICY "Allow users to delete activity documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'activity-documents' AND 
  auth.role() = 'authenticated'
);

-- Storage policies for transaction-documents bucket
-- Allow authenticated users to upload transaction documents
CREATE POLICY "Allow authenticated users to upload transaction documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'transaction-documents' AND 
  auth.role() = 'authenticated'
);

-- Allow public read access to transaction documents
CREATE POLICY "Allow public read access to transaction documents" ON storage.objects
FOR SELECT USING (bucket_id = 'transaction-documents');

-- Allow users to update transaction documents they have access to
CREATE POLICY "Allow users to update transaction documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'transaction-documents' AND 
  auth.role() = 'authenticated'
);

-- Allow users to delete transaction documents they have access to
CREATE POLICY "Allow users to delete transaction documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'transaction-documents' AND 
  auth.role() = 'authenticated'
);

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
