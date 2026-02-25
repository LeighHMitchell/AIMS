-- National Development Goals table
-- Configurable goals (e.g. MSDP) used for Project Bank alignment assessment

CREATE TABLE IF NOT EXISTS public.national_development_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  plan_name text NOT NULL DEFAULT 'MSDP',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed MSDP goals
INSERT INTO public.national_development_goals (code, name, description, plan_name, display_order) VALUES
  ('MSDP-1', 'Peace & Stability', 'Goal 1 — Peace and stability', 'MSDP', 1),
  ('MSDP-2', 'Economic Stability', 'Goal 2 — Economic stability and growth', 'MSDP', 2),
  ('MSDP-3', 'Job Creation', 'Goal 3 — Job creation and private sector development', 'MSDP', 3),
  ('MSDP-4', 'Human Resources', 'Goal 4 — Human resources and social development', 'MSDP', 4),
  ('MSDP-5', 'Natural Resources', 'Goal 5 — Natural resources and environment', 'MSDP', 5)
ON CONFLICT (code) DO NOTHING;

-- RLS policies
ALTER TABLE public.national_development_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view goals"
  ON public.national_development_goals FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert goals"
  ON public.national_development_goals FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update goals"
  ON public.national_development_goals FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete goals"
  ON public.national_development_goals FOR DELETE
  TO authenticated USING (true);
