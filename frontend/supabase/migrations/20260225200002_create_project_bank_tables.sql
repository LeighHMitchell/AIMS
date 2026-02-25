-- Project Bank tables: core projects, donors, appraisals, and land parcels placeholder

-- Land parcels (placeholder for Land Bank module)
CREATE TABLE IF NOT EXISTS public.land_parcels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_code text UNIQUE,
  name text,
  region text,
  hectares numeric(12,2),
  parcel_type text,
  status text DEFAULT 'available' CHECK (status IN ('available','allocated','pending','reserved','unavailable')),
  allocated_project_id uuid,
  coordinates jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Project Bank projects
CREATE TABLE IF NOT EXISTS public.project_bank_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  nominating_ministry text NOT NULL,
  sector text NOT NULL,
  region text,
  estimated_cost numeric(15,2),
  currency text DEFAULT 'USD',
  ndp_goal_id uuid REFERENCES public.national_development_goals(id) ON DELETE SET NULL,
  ndp_aligned boolean DEFAULT false,
  sdg_goals text[],
  firr numeric(5,2),
  eirr numeric(5,2),
  firr_date date,
  eirr_date date,
  status text NOT NULL DEFAULT 'nominated' CHECK (status IN ('nominated','screening','appraisal','approved','implementation','completed','rejected')),
  pathway text CHECK (pathway IN ('oda','ppp','private_supported','private_unsupported','domestic_budget')),
  vgf_amount numeric(15,2),
  vgf_calculated boolean DEFAULT false,
  land_parcel_id uuid REFERENCES public.land_parcels(id) ON DELETE SET NULL,
  total_committed numeric(15,2) DEFAULT 0,
  total_disbursed numeric(15,2) DEFAULT 0,
  funding_gap numeric(15,2) DEFAULT 0,
  aims_activity_id uuid,
  origin text DEFAULT 'projectbank',
  rejection_reason text,
  rejected_at timestamptz,
  nominated_at timestamptz DEFAULT now(),
  screened_at timestamptz,
  appraised_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- Auto-generate project codes via trigger
CREATE OR REPLACE FUNCTION generate_project_code()
RETURNS TRIGGER AS $$
DECLARE
  year_str text;
  next_num integer;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(project_code FROM 'PB-' || year_str || '-(\d+)') AS integer)
  ), 0) + 1
  INTO next_num
  FROM public.project_bank_projects
  WHERE project_code LIKE 'PB-' || year_str || '-%';

  NEW.project_code := 'PB-' || year_str || '-' || LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_project_code
  BEFORE INSERT ON public.project_bank_projects
  FOR EACH ROW
  WHEN (NEW.project_code IS NULL OR NEW.project_code = '')
  EXECUTE FUNCTION generate_project_code();

-- Donor commitments per project
CREATE TABLE IF NOT EXISTS public.project_bank_donors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.project_bank_projects(id) ON DELETE CASCADE,
  donor_name text NOT NULL,
  donor_type text CHECK (donor_type IN ('bilateral','multilateral','un_agency','private','ngo','other')),
  instrument_type text CHECK (instrument_type IN ('grant','concessional_loan','loan','equity','guarantee','ta_grant','other')),
  amount numeric(15,2),
  currency text DEFAULT 'USD',
  commitment_status text DEFAULT 'expression_of_interest' CHECK (commitment_status IN ('expression_of_interest','pipeline','pledged','committed','disbursing','disbursed','cancelled')),
  iati_identifier text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Project appraisals (FIRR/EIRR history)
CREATE TABLE IF NOT EXISTS public.project_appraisals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.project_bank_projects(id) ON DELETE CASCADE,
  appraisal_type text NOT NULL CHECK (appraisal_type IN ('preliminary_fs','detailed_fs','eirr','vgf')),
  firr_result numeric(5,2),
  eirr_result numeric(5,2),
  npv numeric(15,2),
  benefit_cost_ratio numeric(8,4),
  shadow_wage_rate numeric(8,4),
  shadow_exchange_rate numeric(8,4),
  standard_conversion_factor numeric(8,4),
  social_discount_rate numeric(5,2) DEFAULT 12.00,
  project_life_years integer,
  construction_years integer,
  cost_data jsonb,
  benefit_data jsonb,
  appraised_by text,
  appraisal_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- FK back from land_parcels to project_bank_projects
ALTER TABLE public.land_parcels
  ADD CONSTRAINT fk_land_parcel_project
  FOREIGN KEY (allocated_project_id)
  REFERENCES public.project_bank_projects(id) ON DELETE SET NULL;

-- RLS policies for project_bank_projects
ALTER TABLE public.project_bank_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects"
  ON public.project_bank_projects FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert projects"
  ON public.project_bank_projects FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON public.project_bank_projects FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete projects"
  ON public.project_bank_projects FOR DELETE
  TO authenticated USING (true);

-- RLS policies for project_bank_donors
ALTER TABLE public.project_bank_donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view donors"
  ON public.project_bank_donors FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert donors"
  ON public.project_bank_donors FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update donors"
  ON public.project_bank_donors FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete donors"
  ON public.project_bank_donors FOR DELETE
  TO authenticated USING (true);

-- RLS policies for project_appraisals
ALTER TABLE public.project_appraisals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view appraisals"
  ON public.project_appraisals FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert appraisals"
  ON public.project_appraisals FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update appraisals"
  ON public.project_appraisals FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete appraisals"
  ON public.project_appraisals FOR DELETE
  TO authenticated USING (true);

-- RLS policies for land_parcels
ALTER TABLE public.land_parcels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view parcels"
  ON public.land_parcels FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert parcels"
  ON public.land_parcels FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update parcels"
  ON public.land_parcels FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete parcels"
  ON public.land_parcels FOR DELETE
  TO authenticated USING (true);
