-- Create land_asset_types table and seed default rows
CREATE TABLE IF NOT EXISTS public.land_asset_types (
  name text PRIMARY KEY,
  description text,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.land_asset_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view asset types" ON public.land_asset_types;
CREATE POLICY "Authenticated users can view asset types"
  ON public.land_asset_types FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage asset types" ON public.land_asset_types;
CREATE POLICY "Authenticated users can manage asset types"
  ON public.land_asset_types FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Seed default asset types
INSERT INTO public.land_asset_types (name, description, display_order, is_active)
VALUES
  ('Land', 'Undeveloped land parcels', 1, true),
  ('Building', 'Structures and built facilities', 2, true),
  ('Infrastructure', 'Roads, bridges, utilities, and other infrastructure', 3, true),
  ('Mixed Use', 'Parcels with combined land and building assets', 4, true),
  ('Other', 'Other asset types not covered above', 5, true)
ON CONFLICT (name) DO NOTHING;
