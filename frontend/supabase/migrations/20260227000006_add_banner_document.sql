-- Create land_parcel_documents table (was missing from original schema)
CREATE TABLE IF NOT EXISTS public.land_parcel_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id uuid NOT NULL REFERENCES public.land_parcels(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  description text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_land_parcel_documents_parcel
  ON public.land_parcel_documents(parcel_id);

ALTER TABLE public.land_parcel_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view parcel documents" ON public.land_parcel_documents;
CREATE POLICY "Authenticated users can view parcel documents"
  ON public.land_parcel_documents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert parcel documents" ON public.land_parcel_documents;
CREATE POLICY "Authenticated users can insert parcel documents"
  ON public.land_parcel_documents FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete parcel documents" ON public.land_parcel_documents;
CREATE POLICY "Authenticated users can delete parcel documents"
  ON public.land_parcel_documents FOR DELETE
  TO authenticated USING (true);

-- Add banner document reference to land_parcels
ALTER TABLE public.land_parcels
  ADD COLUMN IF NOT EXISTS banner_document_id uuid REFERENCES public.land_parcel_documents(id) ON DELETE SET NULL;
