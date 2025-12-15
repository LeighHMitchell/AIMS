-- Aid on Budget Feature: Budget Classifications and Sector Mapping Tables
-- This enables mapping IATI aid data to country-specific budget classifications

-- ============================================================================
-- 1. BUDGET CLASSIFICATIONS TABLE (Chart of Accounts)
-- ============================================================================
-- Master table for country budget codes (administrative, functional, economic)

CREATE TABLE IF NOT EXISTS budget_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_local TEXT,                    -- Name in local language
  description TEXT,
  classification_type TEXT NOT NULL CHECK (classification_type IN ('administrative', 'functional', 'economic', 'programme')),
  parent_id UUID REFERENCES budget_classifications(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,   -- Hierarchy level (1=top, 2=child, etc.)
  is_active BOOLEAN DEFAULT true,     -- For soft-delete/deprecation
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure unique code within each classification type
  CONSTRAINT unique_budget_code_type UNIQUE(code, classification_type)
);

-- Create indexes
CREATE INDEX idx_budget_classifications_parent ON budget_classifications(parent_id);
CREATE INDEX idx_budget_classifications_type ON budget_classifications(classification_type);
CREATE INDEX idx_budget_classifications_code ON budget_classifications(code);
CREATE INDEX idx_budget_classifications_active ON budget_classifications(is_active) WHERE is_active = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_budget_classifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budget_classifications_updated_at_trigger
  BEFORE UPDATE ON budget_classifications
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_classifications_updated_at();

-- Add comments
COMMENT ON TABLE budget_classifications IS 'Country Chart of Accounts: Hierarchical budget classification codes';
COMMENT ON COLUMN budget_classifications.classification_type IS 'Type: administrative (ministries), functional (COFOG), economic (expense types), programme';
COMMENT ON COLUMN budget_classifications.level IS 'Hierarchy level: 1=root, 2=child, 3=grandchild, etc.';
COMMENT ON COLUMN budget_classifications.name_local IS 'Name in local/national language';

-- ============================================================================
-- 2. SECTOR TO BUDGET MAPPING TABLE
-- ============================================================================
-- Maps DAC sector codes to budget classifications

CREATE TABLE IF NOT EXISTS sector_budget_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_code TEXT NOT NULL,          -- DAC 5-digit sector code
  sector_name TEXT,                   -- Cached for display
  budget_classification_id UUID NOT NULL REFERENCES budget_classifications(id) ON DELETE CASCADE,
  percentage NUMERIC(5,2) DEFAULT 100 CHECK (percentage > 0 AND percentage <= 100),
  is_default BOOLEAN DEFAULT true,    -- Whether this is the default mapping
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Prevent duplicate mappings of same sector to same budget code
  CONSTRAINT unique_sector_budget_mapping UNIQUE(sector_code, budget_classification_id)
);

-- Create indexes
CREATE INDEX idx_sector_budget_mappings_sector ON sector_budget_mappings(sector_code);
CREATE INDEX idx_sector_budget_mappings_budget ON sector_budget_mappings(budget_classification_id);
CREATE INDEX idx_sector_budget_mappings_default ON sector_budget_mappings(is_default) WHERE is_default = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_sector_budget_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sector_budget_mappings_updated_at_trigger
  BEFORE UPDATE ON sector_budget_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_sector_budget_mappings_updated_at();

-- Add comments
COMMENT ON TABLE sector_budget_mappings IS 'Maps DAC sector codes to country budget classifications';
COMMENT ON COLUMN sector_budget_mappings.sector_code IS 'OECD DAC 5-digit sector code';
COMMENT ON COLUMN sector_budget_mappings.percentage IS 'Percentage of sector that maps to this budget code (for many-to-many)';
COMMENT ON COLUMN sector_budget_mappings.is_default IS 'True if this is the default mapping for auto-assignment';

-- ============================================================================
-- 3. EXTEND COUNTRY_BUDGET_ITEMS TABLE
-- ============================================================================
-- Add columns to track mapping source (manual vs auto-mapped)

DO $$
BEGIN
  -- Add mapping_source column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'country_budget_items' AND column_name = 'mapping_source'
  ) THEN
    ALTER TABLE country_budget_items ADD COLUMN mapping_source TEXT DEFAULT 'manual'
      CHECK (mapping_source IN ('manual', 'auto', 'imported'));
  END IF;

  -- Add auto_mapped_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'country_budget_items' AND column_name = 'auto_mapped_at'
  ) THEN
    ALTER TABLE country_budget_items ADD COLUMN auto_mapped_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

COMMENT ON COLUMN country_budget_items.mapping_source IS 'How mapping was created: manual, auto (from sector mappings), imported';
COMMENT ON COLUMN country_budget_items.auto_mapped_at IS 'When auto-mapping was last applied';

-- ============================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE budget_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_budget_mappings ENABLE ROW LEVEL SECURITY;

-- Budget Classifications: Read access for all authenticated users, write for admins
CREATE POLICY "budget_classifications_select_policy" ON budget_classifications
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "budget_classifications_insert_policy" ON budget_classifications
  FOR INSERT TO authenticated
  WITH CHECK (true);  -- Will be restricted by app-level admin checks

CREATE POLICY "budget_classifications_update_policy" ON budget_classifications
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "budget_classifications_delete_policy" ON budget_classifications
  FOR DELETE TO authenticated
  USING (true);

-- Sector Budget Mappings: Same pattern
CREATE POLICY "sector_budget_mappings_select_policy" ON sector_budget_mappings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sector_budget_mappings_insert_policy" ON sector_budget_mappings
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "sector_budget_mappings_update_policy" ON sector_budget_mappings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sector_budget_mappings_delete_policy" ON sector_budget_mappings
  FOR DELETE TO authenticated
  USING (true);

-- ============================================================================
-- 5. SEED DATA: Sample Chart of Accounts (COFOG-based Functional Classification)
-- ============================================================================

-- Insert root-level functional classifications (COFOG)
INSERT INTO budget_classifications (code, name, description, classification_type, level, sort_order) VALUES
  ('01', 'General Public Services', 'Executive and legislative organs, financial and fiscal affairs, external affairs', 'functional', 1, 1),
  ('02', 'Defence', 'Military defence, civil defence, foreign military aid', 'functional', 1, 2),
  ('03', 'Public Order and Safety', 'Police services, fire-protection services, law courts, prisons', 'functional', 1, 3),
  ('04', 'Economic Affairs', 'General economic, commercial and labour affairs', 'functional', 1, 4),
  ('05', 'Environmental Protection', 'Waste management, pollution abatement, protection of biodiversity', 'functional', 1, 5),
  ('06', 'Housing and Community Amenities', 'Housing development, community development, water supply', 'functional', 1, 6),
  ('07', 'Health', 'Medical products, appliances and equipment, outpatient and hospital services', 'functional', 1, 7),
  ('08', 'Recreation, Culture and Religion', 'Recreational and sporting services, cultural services', 'functional', 1, 8),
  ('09', 'Education', 'Pre-primary, primary, secondary, tertiary and non-tertiary education', 'functional', 1, 9),
  ('10', 'Social Protection', 'Sickness and disability, old age, family and children, unemployment', 'functional', 1, 10)
ON CONFLICT (code, classification_type) DO NOTHING;

-- Insert second-level classifications (children of Education - 09)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('091', 'Pre-Primary and Primary Education', 'Pre-primary education, primary education', 1),
  ('092', 'Secondary Education', 'Lower-secondary, upper-secondary education', 2),
  ('093', 'Post-Secondary Non-Tertiary Education', 'Post-secondary non-tertiary education', 3),
  ('094', 'Tertiary Education', 'First stage, second stage of tertiary education', 4),
  ('095', 'Education Not Definable by Level', 'Subsidiary services, education n.e.c.', 5),
  ('096', 'Education Services Subsidiary', 'Subsidiary services to education', 6)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '09' AND parent.classification_type = 'functional'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Insert second-level classifications (children of Health - 07)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('071', 'Medical Products, Appliances and Equipment', 'Pharmaceutical products, other medical products, therapeutic appliances', 1),
  ('072', 'Outpatient Services', 'General and specialist medical services, dental, paramedical', 2),
  ('073', 'Hospital Services', 'General and specialized hospital services, medical and maternity centres', 3),
  ('074', 'Public Health Services', 'Public health services', 4),
  ('075', 'R&D Health', 'Research and development related to health', 5),
  ('076', 'Health Services n.e.c.', 'Health administration and insurance, health n.e.c.', 6)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '07' AND parent.classification_type = 'functional'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Insert Economic Classification (sample)
INSERT INTO budget_classifications (code, name, description, classification_type, level, sort_order) VALUES
  ('E1', 'Compensation of Employees', 'Wages, salaries, and allowances for employees', 'economic', 1, 1),
  ('E2', 'Use of Goods and Services', 'Operating costs, supplies, maintenance', 'economic', 1, 2),
  ('E3', 'Consumption of Fixed Capital', 'Depreciation of fixed assets', 'economic', 1, 3),
  ('E4', 'Interest', 'Interest payments on loans and debt', 'economic', 1, 4),
  ('E5', 'Subsidies', 'Subsidies to corporations and enterprises', 'economic', 1, 5),
  ('E6', 'Grants', 'Grants to other government units, international organizations', 'economic', 1, 6),
  ('E7', 'Social Benefits', 'Social security, social assistance benefits', 'economic', 1, 7),
  ('E8', 'Other Expenses', 'Property expense, other miscellaneous expenses', 'economic', 1, 8)
ON CONFLICT (code, classification_type) DO NOTHING;

-- Insert Administrative Classification (sample ministries)
INSERT INTO budget_classifications (code, name, description, classification_type, level, sort_order) VALUES
  ('MOF', 'Ministry of Finance', 'Ministry responsible for fiscal policy and government revenue', 'administrative', 1, 1),
  ('MOH', 'Ministry of Health', 'Ministry responsible for health services and policy', 'administrative', 1, 2),
  ('MOE', 'Ministry of Education', 'Ministry responsible for education services and policy', 'administrative', 1, 3),
  ('MOFPED', 'Ministry of Finance, Planning & Economic Development', 'Combined finance and planning ministry', 'administrative', 1, 4),
  ('MOAIF', 'Ministry of Agriculture, Industry and Fisheries', 'Ministry for productive sectors', 'administrative', 1, 5),
  ('MoWE', 'Ministry of Water and Environment', 'Ministry for water resources and environment', 'administrative', 1, 6),
  ('MoWT', 'Ministry of Works and Transport', 'Ministry for infrastructure and transport', 'administrative', 1, 7),
  ('OPM', 'Office of the Prime Minister', 'Executive coordination and disaster management', 'administrative', 1, 8)
ON CONFLICT (code, classification_type) DO NOTHING;

-- ============================================================================
-- 6. SAMPLE SECTOR-TO-BUDGET MAPPINGS
-- ============================================================================

-- Map some common DAC sectors to functional budget classifications
-- Education sectors -> Education functional code
INSERT INTO sector_budget_mappings (sector_code, sector_name, budget_classification_id, percentage)
SELECT
  sector.code,
  sector.name,
  bc.id,
  100
FROM (VALUES
  ('11110', 'Education policy and administrative management'),
  ('11120', 'Education facilities and training'),
  ('11130', 'Teacher training'),
  ('11220', 'Primary education'),
  ('11230', 'Basic life skills for adults'),
  ('11231', 'Basic life skills for youth'),
  ('11232', 'Primary education equivalent for adults'),
  ('11240', 'Early childhood education'),
  ('11320', 'Secondary education'),
  ('11330', 'Vocational training'),
  ('11420', 'Higher education'),
  ('11430', 'Advanced technical and managerial training')
) AS sector(code, name)
CROSS JOIN budget_classifications bc
WHERE bc.code = '09' AND bc.classification_type = 'functional'
ON CONFLICT (sector_code, budget_classification_id) DO NOTHING;

-- Health sectors -> Health functional code
INSERT INTO sector_budget_mappings (sector_code, sector_name, budget_classification_id, percentage)
SELECT
  sector.code,
  sector.name,
  bc.id,
  100
FROM (VALUES
  ('12110', 'Health policy and administrative management'),
  ('12181', 'Medical education/training'),
  ('12182', 'Medical research'),
  ('12191', 'Medical services'),
  ('12220', 'Basic health care'),
  ('12230', 'Basic health infrastructure'),
  ('12240', 'Basic nutrition'),
  ('12250', 'Infectious disease control'),
  ('12261', 'Health education'),
  ('12262', 'Malaria control'),
  ('12263', 'Tuberculosis control'),
  ('12281', 'Health personnel development'),
  ('13010', 'Population policy and administrative management'),
  ('13020', 'Reproductive health care'),
  ('13030', 'Family planning'),
  ('13040', 'STD control including HIV/AIDS'),
  ('13081', 'Personnel development for population')
) AS sector(code, name)
CROSS JOIN budget_classifications bc
WHERE bc.code = '07' AND bc.classification_type = 'functional'
ON CONFLICT (sector_code, budget_classification_id) DO NOTHING;

-- Water and Sanitation -> Housing and Community Amenities
INSERT INTO sector_budget_mappings (sector_code, sector_name, budget_classification_id, percentage)
SELECT
  sector.code,
  sector.name,
  bc.id,
  100
FROM (VALUES
  ('14010', 'Water sector policy and administrative management'),
  ('14015', 'Water resources conservation'),
  ('14020', 'Water supply and sanitation - large systems'),
  ('14021', 'Water supply - large systems'),
  ('14022', 'Sanitation - large systems'),
  ('14030', 'Basic drinking water supply and basic sanitation'),
  ('14031', 'Basic drinking water supply'),
  ('14032', 'Basic sanitation'),
  ('14040', 'River basins development'),
  ('14050', 'Waste management/disposal'),
  ('14081', 'Education and training in water supply and sanitation')
) AS sector(code, name)
CROSS JOIN budget_classifications bc
WHERE bc.code = '06' AND bc.classification_type = 'functional'
ON CONFLICT (sector_code, budget_classification_id) DO NOTHING;

-- Agriculture -> Economic Affairs
INSERT INTO sector_budget_mappings (sector_code, sector_name, budget_classification_id, percentage)
SELECT
  sector.code,
  sector.name,
  bc.id,
  100
FROM (VALUES
  ('31110', 'Agricultural policy and administrative management'),
  ('31120', 'Agricultural development'),
  ('31130', 'Agricultural land resources'),
  ('31140', 'Agricultural water resources'),
  ('31150', 'Agricultural inputs'),
  ('31161', 'Food crop production'),
  ('31162', 'Industrial crops/export crops'),
  ('31163', 'Livestock'),
  ('31164', 'Agrarian reform'),
  ('31165', 'Agricultural alternative development'),
  ('31166', 'Agricultural extension'),
  ('31181', 'Agricultural education/training'),
  ('31182', 'Agricultural research'),
  ('31191', 'Agricultural services'),
  ('31192', 'Plant and post-harvest protection'),
  ('31193', 'Agricultural financial services'),
  ('31194', 'Agricultural co-operatives'),
  ('31195', 'Livestock/veterinary services')
) AS sector(code, name)
CROSS JOIN budget_classifications bc
WHERE bc.code = '04' AND bc.classification_type = 'functional'
ON CONFLICT (sector_code, budget_classification_id) DO NOTHING;

-- Government and Civil Society -> General Public Services
INSERT INTO sector_budget_mappings (sector_code, sector_name, budget_classification_id, percentage)
SELECT
  sector.code,
  sector.name,
  bc.id,
  100
FROM (VALUES
  ('15110', 'Public sector policy and administrative management'),
  ('15111', 'Public finance management'),
  ('15112', 'Decentralisation and support to subnational government'),
  ('15113', 'Anti-corruption organisations and institutions'),
  ('15114', 'Domestic revenue mobilisation'),
  ('15116', 'Tax collection'),
  ('15117', 'Budget planning'),
  ('15118', 'National audit'),
  ('15119', 'Debt and aid management'),
  ('15120', 'Public sector financial management'),
  ('15121', 'Foreign affairs'),
  ('15122', 'Diplomatic missions'),
  ('15123', 'Administration of developing countries delegations'),
  ('15124', 'General personnel services'),
  ('15125', 'Central procurement'),
  ('15126', 'Other general public services'),
  ('15127', 'National monitoring and evaluation'),
  ('15130', 'Legal and judicial development'),
  ('15131', 'Justice, law and order policy, planning and administration'),
  ('15132', 'Police'),
  ('15133', 'Fire and rescue services'),
  ('15134', 'Judicial affairs'),
  ('15135', 'Ombudsman'),
  ('15136', 'Immigration'),
  ('15137', 'Prisons'),
  ('15142', 'Macroeconomic policy'),
  ('15143', 'Meteorological services'),
  ('15144', 'National standards development'),
  ('15150', 'Democratic participation and civil society'),
  ('15151', 'Elections'),
  ('15152', 'Legislatures and political parties'),
  ('15153', 'Media and free flow of information'),
  ('15160', 'Human rights'),
  ('15170', 'Womens equality organisations'),
  ('15180', 'Ending violence against women and girls'),
  ('15190', 'Facilitation of orderly, safe, regular and responsible migration')
) AS sector(code, name)
CROSS JOIN budget_classifications bc
WHERE bc.code = '01' AND bc.classification_type = 'functional'
ON CONFLICT (sector_code, budget_classification_id) DO NOTHING;

-- Environment -> Environmental Protection
INSERT INTO sector_budget_mappings (sector_code, sector_name, budget_classification_id, percentage)
SELECT
  sector.code,
  sector.name,
  bc.id,
  100
FROM (VALUES
  ('41010', 'Environmental policy and administrative management'),
  ('41020', 'Biosphere protection'),
  ('41030', 'Bio-diversity'),
  ('41040', 'Site preservation'),
  ('41050', 'Flood prevention/control'),
  ('41081', 'Environmental education/training'),
  ('41082', 'Environmental research')
) AS sector(code, name)
CROSS JOIN budget_classifications bc
WHERE bc.code = '05' AND bc.classification_type = 'functional'
ON CONFLICT (sector_code, budget_classification_id) DO NOTHING;

