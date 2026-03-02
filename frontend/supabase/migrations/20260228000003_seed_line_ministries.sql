-- Line Ministries: create table + seed Myanmar ministries
-- ============================================================

CREATE TABLE IF NOT EXISTS line_ministries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE line_ministries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "line_ministries_read" ON line_ministries FOR SELECT TO authenticated USING (true);
CREATE POLICY "line_ministries_write" ON line_ministries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed current Myanmar ministries
INSERT INTO line_ministries (name, code) VALUES
  ('Ministry of Agriculture, Livestock and Irrigation', 'MOALI'),
  ('Ministry of Border Affairs', 'MOBA'),
  ('Ministry of Commerce', 'MOC'),
  ('Ministry of Construction', 'MOCON'),
  ('Ministry of Cooperatives and Rural Development', 'MOCRD'),
  ('Ministry of Defence', 'MOD'),
  ('Ministry of Education', 'MOE'),
  ('Ministry of Electric Power', 'MOEP'),
  ('Ministry of Ethnic Affairs', 'MOEA'),
  ('Ministry of Foreign Affairs', 'MOFA'),
  ('Ministry of Health', 'MOH'),
  ('Ministry of Home Affairs', 'MOHA'),
  ('Ministry of Hotels and Tourism', 'MOHT'),
  ('Ministry of Immigration and Population', 'MOIP'),
  ('Ministry of Industry', 'MOI'),
  ('Ministry of Information', 'MOINF'),
  ('Ministry of Investment and Foreign Economic Relations', 'MIFER'),
  ('Ministry of Labour', 'MOL'),
  ('Ministry of Natural Resources and Environmental Conservation', 'MONREC'),
  ('Ministry of Planning and Finance', 'MOPF'),
  ('Ministry of Religious Affairs and Culture', 'MORAC'),
  ('Ministry of Social Welfare, Relief and Resettlement', 'MOSWRR'),
  ('Ministry of Transport and Communications', 'MOTC'),
  ('Nay Pyi Taw Council', 'NPTC'),
  ('Union Attorney General''s Office', 'UAGO'),
  ('Union Auditor General''s Office', 'OAGO'),
  ('Central Bank of Myanmar', 'CBM')
ON CONFLICT DO NOTHING;
