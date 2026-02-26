-- Land Bank v2 Extensions
-- Adds: line_ministries table + seed, land_asset_types lookup, land_parcel_documents,
--        new columns on land_parcels, and storage bucket for parcel documents.

-- ============================================================
-- 1a. line_ministries table (idempotent)
-- ============================================================
CREATE TABLE IF NOT EXISTS line_ministries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE line_ministries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'line_ministries' AND policyname = 'line_ministries_select'
  ) THEN
    CREATE POLICY line_ministries_select ON line_ministries FOR SELECT USING (true);
  END IF;
END $$;

-- Seed Myanmar ministries
INSERT INTO line_ministries (name, code, display_order) VALUES
  ('Ministry of Planning and Finance', 'MOPF', 1),
  ('Ministry of Agriculture, Livestock and Irrigation', 'MOALI', 2),
  ('Ministry of Commerce', 'MOC', 3),
  ('Ministry of Education', 'MOE', 4),
  ('Ministry of Electricity and Energy', 'MOEE', 5),
  ('Ministry of Health and Sports', 'MOHS', 6),
  ('Ministry of Industry', 'MOI', 7),
  ('Ministry of Labour, Immigration and Population', 'MOLIP', 8),
  ('Ministry of Natural Resources and Environmental Conservation', 'MONREC', 9),
  ('Ministry of Transport and Communications', 'MOTC', 10),
  ('Ministry of Construction', 'MCOM', 11),
  ('Ministry of Hotels and Tourism', 'MOHT', 12),
  ('Ministry of Social Welfare, Relief and Resettlement', 'MOSWRR', 13),
  ('Ministry of Investment and Foreign Economic Relations', 'MIFER', 14),
  ('Ministry of Ethnic Affairs', 'MOEA', 15)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 1b. land_asset_types lookup table
-- ============================================================
CREATE TABLE IF NOT EXISTS land_asset_types (
  name text PRIMARY KEY,
  description text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE land_asset_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'land_asset_types' AND policyname = 'land_asset_types_select'
  ) THEN
    CREATE POLICY land_asset_types_select ON land_asset_types FOR SELECT USING (true);
  END IF;
END $$;

INSERT INTO land_asset_types (name, description, display_order) VALUES
  ('Vacant Land', 'Undeveloped land without structures', 1),
  ('Factory', 'Industrial manufacturing facility', 2),
  ('Warehouse', 'Storage and logistics facility', 3),
  ('Office Building', 'Commercial office space', 4),
  ('Mixed-Use Complex', 'Combined residential/commercial/industrial use', 5),
  ('Other', 'Other asset type', 6)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 1c. ALTER land_parcels — add new columns
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'land_parcels' AND column_name = 'controlling_ministry_id') THEN
    ALTER TABLE land_parcels ADD COLUMN controlling_ministry_id uuid REFERENCES line_ministries(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'land_parcels' AND column_name = 'asset_type') THEN
    ALTER TABLE land_parcels ADD COLUMN asset_type text REFERENCES land_asset_types(name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'land_parcels' AND column_name = 'title_status') THEN
    ALTER TABLE land_parcels ADD COLUMN title_status text DEFAULT 'Unregistered'
      CHECK (title_status IN ('Clear', 'Pending Verification', 'Under Review', 'Title Disputed', 'Unregistered'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'land_parcels' AND column_name = 'ndp_goal_id') THEN
    ALTER TABLE land_parcels ADD COLUMN ndp_goal_id uuid REFERENCES national_development_goals(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'land_parcels' AND column_name = 'secondary_ndp_goals') THEN
    ALTER TABLE land_parcels ADD COLUMN secondary_ndp_goals text[] DEFAULT '{}';
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_land_parcels_ministry ON land_parcels(controlling_ministry_id);
CREATE INDEX IF NOT EXISTS idx_land_parcels_asset_type ON land_parcels(asset_type);
CREATE INDEX IF NOT EXISTS idx_land_parcels_title_status ON land_parcels(title_status);
CREATE INDEX IF NOT EXISTS idx_land_parcels_ndp_goal ON land_parcels(ndp_goal_id);


-- ============================================================
-- 1d. land_parcel_documents table
-- ============================================================
CREATE TABLE IF NOT EXISTS land_parcel_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'title_deed', 'survey_report', 'environmental_assessment',
    'valuation_report', 'legal_opinion', 'other'
  )),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  description text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_land_parcel_documents_parcel ON land_parcel_documents(parcel_id);

ALTER TABLE land_parcel_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'land_parcel_documents' AND policyname = 'land_parcel_documents_select'
  ) THEN
    CREATE POLICY land_parcel_documents_select ON land_parcel_documents FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'land_parcel_documents' AND policyname = 'land_parcel_documents_insert'
  ) THEN
    CREATE POLICY land_parcel_documents_insert ON land_parcel_documents FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'land_parcel_documents' AND policyname = 'land_parcel_documents_delete'
  ) THEN
    CREATE POLICY land_parcel_documents_delete ON land_parcel_documents FOR DELETE TO authenticated USING (true);
  END IF;
END $$;


-- ============================================================
-- 1e. Storage bucket for land parcel documents
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'land-parcel-documents',
  'land-parcel-documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf','image/png','image/jpeg','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;
