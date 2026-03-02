-- Project Bank: admin-configurable project types and sectors
-- ============================================================

-- ── Project Types ──
CREATE TABLE pb_project_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO pb_project_types (code, name, display_order) VALUES
  ('INFRA', 'Infrastructure', 1),
  ('SOC',   'Social Services', 2),
  ('ECON',  'Economic Development', 3),
  ('ENV',   'Environmental', 4),
  ('INST',  'Institutional', 5),
  ('EMER',  'Emergency & Humanitarian', 6),
  ('TA',    'Technical Assistance', 7),
  ('OTH',   'Other', 8);

-- ── PB Sectors ──
CREATE TABLE pb_sectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pb_sub_sectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sector_id UUID NOT NULL REFERENCES pb_sectors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed sectors
INSERT INTO pb_sectors (code, name, display_order) VALUES
  ('TRAN', 'Transport', 1),
  ('ENRG', 'Energy', 2),
  ('HLTH', 'Health', 3),
  ('EDUC', 'Education', 4),
  ('AGRI', 'Agriculture', 5),
  ('WATR', 'Water Resources', 6),
  ('ICT',  'ICT', 7),
  ('INDU', 'Industrial', 8),
  ('ENVR', 'Environment', 9),
  ('WASH', 'WASH', 10),
  ('GOVN', 'Governance', 11),
  ('MULT', 'Multi-sector', 12),
  ('SOCP', 'Social Protection', 13),
  ('HOUS', 'Housing', 14),
  ('BNKF', 'Banking & Finance', 15),
  ('TRAD', 'Trade', 16),
  ('TOUR', 'Tourism', 17),
  ('MINE', 'Mining', 18);

-- Seed sub-sectors
-- Transport
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Roads & Highways', 1), ('Railways', 2), ('Ports & Waterways', 3),
  ('Airports', 4), ('Urban Transit', 5), ('Rural Transport', 6)
) AS sub(name, ord)
WHERE s.code = 'TRAN';

-- Energy
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Power Generation', 1), ('Transmission & Distribution', 2), ('Renewable Energy', 3),
  ('Rural Electrification', 4), ('Oil & Gas', 5)
) AS sub(name, ord)
WHERE s.code = 'ENRG';

-- Health
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Primary Healthcare', 1), ('Hospitals', 2), ('Disease Control', 3),
  ('Maternal Health', 4), ('Nutrition', 5), ('Health Systems', 6)
) AS sub(name, ord)
WHERE s.code = 'HLTH';

-- Education
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Primary Education', 1), ('Secondary Education', 2), ('Higher Education', 3),
  ('TVET', 4), ('Teacher Training', 5)
) AS sub(name, ord)
WHERE s.code = 'EDUC';

-- Agriculture
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Crop Production', 1), ('Irrigation', 2), ('Livestock', 3),
  ('Fisheries', 4), ('Agro-processing', 5), ('Food Security', 6)
) AS sub(name, ord)
WHERE s.code = 'AGRI';

-- Water Resources
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Water Supply', 1), ('Sanitation', 2), ('Flood Control', 3), ('Watershed Management', 4)
) AS sub(name, ord)
WHERE s.code = 'WATR';

-- ICT
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Telecommunications', 1), ('E-Government', 2), ('Digital Infrastructure', 3), ('Internet Access', 4)
) AS sub(name, ord)
WHERE s.code = 'ICT';

-- Industrial
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('SEZ Development', 1), ('Manufacturing', 2), ('SME Development', 3), ('Industrial Parks', 4)
) AS sub(name, ord)
WHERE s.code = 'INDU';

-- Environment
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Forest Conservation', 1), ('Climate Adaptation', 2), ('Waste Management', 3), ('Biodiversity', 4)
) AS sub(name, ord)
WHERE s.code = 'ENVR';

-- WASH
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Water Supply', 1), ('Sanitation', 2), ('Hygiene Promotion', 3)
) AS sub(name, ord)
WHERE s.code = 'WASH';

-- Governance
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Public Admin', 1), ('Justice & Rule of Law', 2), ('Decentralization', 3), ('Statistics', 4)
) AS sub(name, ord)
WHERE s.code = 'GOVN';

-- Multi-sector
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Integrated Development', 1), ('Community Development', 2)
) AS sub(name, ord)
WHERE s.code = 'MULT';

-- Social Protection
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Social Safety Nets', 1), ('Disability Services', 2), ('Elderly Care', 3), ('Poverty Reduction', 4)
) AS sub(name, ord)
WHERE s.code = 'SOCP';

-- Housing
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Affordable Housing', 1), ('Urban Development', 2), ('Slum Upgrading', 3)
) AS sub(name, ord)
WHERE s.code = 'HOUS';

-- Banking & Finance
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Financial Inclusion', 1), ('Microfinance', 2), ('Capital Markets', 3)
) AS sub(name, ord)
WHERE s.code = 'BNKF';

-- Trade
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Trade Facilitation', 1), ('Export Promotion', 2), ('Market Access', 3)
) AS sub(name, ord)
WHERE s.code = 'TRAD';

-- Tourism
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Eco-Tourism', 1), ('Heritage Tourism', 2), ('Tourism Infrastructure', 3)
) AS sub(name, ord)
WHERE s.code = 'TOUR';

-- Mining
INSERT INTO pb_sub_sectors (sector_id, name, display_order)
SELECT s.id, sub.name, sub.ord
FROM pb_sectors s, (VALUES
  ('Mining Development', 1), ('Artisanal Mining', 2), ('Mine Safety', 3)
) AS sub(name, ord)
WHERE s.code = 'MINE';

-- Enable RLS
ALTER TABLE pb_project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE pb_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE pb_sub_sectors ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "pb_project_types_read" ON pb_project_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "pb_sectors_read" ON pb_sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "pb_sub_sectors_read" ON pb_sub_sectors FOR SELECT TO authenticated USING (true);

-- Write access for all authenticated users (admin check done in API)
CREATE POLICY "pb_project_types_write" ON pb_project_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pb_sectors_write" ON pb_sectors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pb_sub_sectors_write" ON pb_sub_sectors FOR ALL TO authenticated USING (true) WITH CHECK (true);
