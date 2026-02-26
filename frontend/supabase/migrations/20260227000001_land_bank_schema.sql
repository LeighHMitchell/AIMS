-- Land Bank module: full schema for parcel registry, allocation workflow, and audit history
-- Idempotent — safe to re-run

-- 1. Land parcel classifications lookup table
CREATE TABLE IF NOT EXISTS public.land_parcel_classifications (
  name text PRIMARY KEY,
  description text,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.land_parcel_classifications (name, description, display_order) VALUES
  ('Agricultural', 'Land designated for farming, livestock, and related activities', 1),
  ('Industrial', 'Land designated for manufacturing, warehousing, and industrial operations', 2),
  ('Commercial', 'Land designated for commercial activities, offices, and retail', 3),
  ('Residential', 'Land designated for housing and residential development', 4),
  ('Mixed-Use', 'Land designated for combined residential, commercial, and/or industrial use', 5),
  ('Special Economic Zone', 'Land within designated Special Economic Zones (SEZs)', 6)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.land_parcel_classifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view classifications" ON public.land_parcel_classifications;
CREATE POLICY "Authenticated users can view classifications"
  ON public.land_parcel_classifications FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage classifications" ON public.land_parcel_classifications;
CREATE POLICY "Authenticated users can manage classifications"
  ON public.land_parcel_classifications FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- 2. Drop existing FK from project_bank_projects before recreating land_parcels
ALTER TABLE public.project_bank_projects
  DROP CONSTRAINT IF EXISTS project_bank_projects_land_parcel_id_fkey;

-- Drop the old reverse FK too
DO $$ BEGIN
  ALTER TABLE public.land_parcels DROP CONSTRAINT IF EXISTS fk_land_parcel_project;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 3. Drop and recreate land_parcels with full schema
DROP TABLE IF EXISTS public.land_parcel_history CASCADE;
DROP TABLE IF EXISTS public.land_parcel_projects CASCADE;
DROP TABLE IF EXISTS public.allocation_requests CASCADE;
DROP TABLE IF EXISTS public.land_parcels CASCADE;

CREATE TABLE public.land_parcels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_code text UNIQUE NOT NULL,
  name text NOT NULL,
  state_region text NOT NULL,
  township text,
  geometry jsonb,
  size_hectares numeric(12,2) CHECK (size_hectares > 0),
  classification text REFERENCES public.land_parcel_classifications(name) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'reserved', 'allocated', 'disputed')),
  allocated_to uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  lease_start_date date,
  lease_end_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_land_parcels_status ON public.land_parcels(status);
CREATE INDEX idx_land_parcels_state_region ON public.land_parcels(state_region);
CREATE INDEX idx_land_parcels_classification ON public.land_parcels(classification);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_land_parcel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_land_parcels_updated_at ON public.land_parcels;
CREATE TRIGGER trg_land_parcels_updated_at
  BEFORE UPDATE ON public.land_parcels
  FOR EACH ROW EXECUTE FUNCTION update_land_parcel_updated_at();

-- 4. Parcel code auto-generation trigger
-- Generates codes like YGN-0001, MDY-0002 based on state_region
CREATE OR REPLACE FUNCTION generate_parcel_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix text;
  seq_num int;
  new_code text;
BEGIN
  -- Only generate if parcel_code was not provided or is empty
  IF NEW.parcel_code IS NOT NULL AND NEW.parcel_code != '' THEN
    RETURN NEW;
  END IF;

  -- Map state/region to 3-letter prefix
  prefix := CASE NEW.state_region
    WHEN 'Yangon' THEN 'YGN'
    WHEN 'Mandalay' THEN 'MDY'
    WHEN 'Naypyitaw' THEN 'NPT'
    WHEN 'Kachin' THEN 'KCN'
    WHEN 'Kayah' THEN 'KYH'
    WHEN 'Kayin' THEN 'KYN'
    WHEN 'Chin' THEN 'CHN'
    WHEN 'Mon' THEN 'MON'
    WHEN 'Rakhine' THEN 'RKN'
    WHEN 'Shan' THEN 'SHN'
    WHEN 'Sagaing' THEN 'SGG'
    WHEN 'Tanintharyi' THEN 'TNT'
    WHEN 'Bago' THEN 'BGO'
    WHEN 'Magway' THEN 'MGW'
    WHEN 'Ayeyarwady' THEN 'AYW'
    ELSE 'UNK'
  END;

  -- Get next sequence number for this prefix
  SELECT COALESCE(MAX(
    CASE
      WHEN parcel_code ~ ('^' || prefix || '-[0-9]+$')
      THEN CAST(SUBSTRING(parcel_code FROM LENGTH(prefix) + 2) AS int)
      ELSE 0
    END
  ), 0) + 1 INTO seq_num
  FROM public.land_parcels
  WHERE parcel_code LIKE prefix || '-%';

  new_code := prefix || '-' || LPAD(seq_num::text, 4, '0');
  NEW.parcel_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_parcel_code ON public.land_parcels;
CREATE TRIGGER trg_generate_parcel_code
  BEFORE INSERT ON public.land_parcels
  FOR EACH ROW EXECUTE FUNCTION generate_parcel_code();

-- 5. Allocation requests table
CREATE TABLE public.allocation_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id uuid NOT NULL REFERENCES public.land_parcels(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  purpose text,
  proposed_start_date date,
  proposed_end_date date,
  linked_project_id uuid REFERENCES public.project_bank_projects(id) ON DELETE SET NULL,
  -- Scoring (gov reviewer fills in)
  priority_score_purpose int CHECK (priority_score_purpose BETWEEN 1 AND 5),
  priority_score_track_record int CHECK (priority_score_track_record BETWEEN 1 AND 5),
  priority_score_feasibility int CHECK (priority_score_feasibility BETWEEN 1 AND 5),
  total_score int GENERATED ALWAYS AS (
    COALESCE(priority_score_purpose, 0) +
    COALESCE(priority_score_track_record, 0) +
    COALESCE(priority_score_feasibility, 0)
  ) STORED,
  reviewer_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_allocation_requests_parcel ON public.allocation_requests(parcel_id);
CREATE INDEX idx_allocation_requests_status ON public.allocation_requests(status);

DROP TRIGGER IF EXISTS trg_allocation_requests_updated_at ON public.allocation_requests;
CREATE TRIGGER trg_allocation_requests_updated_at
  BEFORE UPDATE ON public.allocation_requests
  FOR EACH ROW EXECUTE FUNCTION update_land_parcel_updated_at();

-- 6. Land parcel ↔ project junction table
CREATE TABLE public.land_parcel_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id uuid NOT NULL REFERENCES public.land_parcels(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.project_bank_projects(id) ON DELETE CASCADE,
  linked_at timestamptz DEFAULT now(),
  linked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(parcel_id, project_id)
);

-- 7. Audit / history table
CREATE TABLE public.land_parcel_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id uuid NOT NULL REFERENCES public.land_parcels(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_land_parcel_history_parcel ON public.land_parcel_history(parcel_id);

-- 8. Re-add FK from project_bank_projects.land_parcel_id → land_parcels
ALTER TABLE public.project_bank_projects
  DROP CONSTRAINT IF EXISTS project_bank_projects_land_parcel_id_fkey;

ALTER TABLE public.project_bank_projects
  ADD CONSTRAINT project_bank_projects_land_parcel_id_fkey
  FOREIGN KEY (land_parcel_id)
  REFERENCES public.land_parcels(id) ON DELETE SET NULL;

-- 9. RLS policies (permissive authenticated — role enforcement in API layer)
ALTER TABLE public.land_parcels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view parcels" ON public.land_parcels;
CREATE POLICY "Authenticated users can view parcels"
  ON public.land_parcels FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert parcels" ON public.land_parcels;
CREATE POLICY "Authenticated users can insert parcels"
  ON public.land_parcels FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update parcels" ON public.land_parcels;
CREATE POLICY "Authenticated users can update parcels"
  ON public.land_parcels FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete parcels" ON public.land_parcels;
CREATE POLICY "Authenticated users can delete parcels"
  ON public.land_parcels FOR DELETE
  TO authenticated USING (true);

ALTER TABLE public.allocation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view allocation requests" ON public.allocation_requests;
CREATE POLICY "Authenticated users can view allocation requests"
  ON public.allocation_requests FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert allocation requests" ON public.allocation_requests;
CREATE POLICY "Authenticated users can insert allocation requests"
  ON public.allocation_requests FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update allocation requests" ON public.allocation_requests;
CREATE POLICY "Authenticated users can update allocation requests"
  ON public.allocation_requests FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete allocation requests" ON public.allocation_requests;
CREATE POLICY "Authenticated users can delete allocation requests"
  ON public.allocation_requests FOR DELETE
  TO authenticated USING (true);

ALTER TABLE public.land_parcel_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view parcel projects" ON public.land_parcel_projects;
CREATE POLICY "Authenticated users can view parcel projects"
  ON public.land_parcel_projects FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage parcel projects" ON public.land_parcel_projects;
CREATE POLICY "Authenticated users can manage parcel projects"
  ON public.land_parcel_projects FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.land_parcel_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view parcel history" ON public.land_parcel_history;
CREATE POLICY "Authenticated users can view parcel history"
  ON public.land_parcel_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert parcel history" ON public.land_parcel_history;
CREATE POLICY "Authenticated users can insert parcel history"
  ON public.land_parcel_history FOR INSERT
  TO authenticated WITH CHECK (true);
