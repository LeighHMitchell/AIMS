-- Country-Specific Sector Vocabularies
-- Allows recipient countries to define their own sector classifications
-- and map them to OECD DAC sectors for automatic budget classification inference

-- ============================================================================
-- Table 1: Country Sector Vocabularies
-- Stores vocabulary definitions (e.g., "Tonga National Sector Classification")
-- ============================================================================

CREATE TABLE IF NOT EXISTS country_sector_vocabularies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL,  -- Short code like "TNG" or "99-TNG"
  name VARCHAR(255) NOT NULL,  -- Full name like "Tonga National Sector Classification"
  description TEXT,
  country_code VARCHAR(2),  -- ISO 3166-1 alpha-2 country code (optional)
  version VARCHAR(50),  -- Version identifier
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,  -- If true, this is the primary vocabulary for the country
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT unique_vocabulary_code UNIQUE(code)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_country_sector_vocabularies_code ON country_sector_vocabularies(code);
CREATE INDEX IF NOT EXISTS idx_country_sector_vocabularies_active ON country_sector_vocabularies(is_active) WHERE is_active = true;

-- ============================================================================
-- Table 2: Country Sectors
-- Stores individual sectors within a vocabulary
-- ============================================================================

CREATE TABLE IF NOT EXISTS country_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL REFERENCES country_sector_vocabularies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,  -- Sector code (e.g., "AGR-01", "HEALTH-001")
  name VARCHAR(255) NOT NULL,  -- Sector name
  description TEXT,
  parent_code VARCHAR(50),  -- For hierarchical sectors, reference to parent
  level INTEGER DEFAULT 1,  -- Hierarchy level (1 = top level, 2 = sub-sector, etc.)
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT unique_sector_code_per_vocabulary UNIQUE(vocabulary_id, code)
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_country_sectors_vocabulary ON country_sectors(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_country_sectors_code ON country_sectors(vocabulary_id, code);
CREATE INDEX IF NOT EXISTS idx_country_sectors_parent ON country_sectors(vocabulary_id, parent_code);
CREATE INDEX IF NOT EXISTS idx_country_sectors_active ON country_sectors(is_active) WHERE is_active = true;

-- ============================================================================
-- Table 3: Country Sector to DAC Mappings
-- Maps country-specific sectors to OECD DAC sectors
-- A country sector can map to multiple DAC sectors (many-to-many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS country_sector_dac_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_sector_id UUID NOT NULL REFERENCES country_sectors(id) ON DELETE CASCADE,
  dac_sector_code VARCHAR(10) NOT NULL,  -- OECD DAC 5-digit code
  dac_sector_name VARCHAR(255),  -- Cached for display purposes
  percentage NUMERIC(5,2) DEFAULT 100,  -- If mapping to multiple DAC sectors, split by percentage
  is_primary BOOLEAN DEFAULT true,  -- The primary DAC mapping for this country sector
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT unique_country_dac_mapping UNIQUE(country_sector_id, dac_sector_code)
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_country_sector_dac_mappings_sector ON country_sector_dac_mappings(country_sector_id);
CREATE INDEX IF NOT EXISTS idx_country_sector_dac_mappings_dac ON country_sector_dac_mappings(dac_sector_code);

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================

-- Vocabulary updated_at trigger
CREATE OR REPLACE FUNCTION update_country_sector_vocabulary_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS country_sector_vocabulary_updated_at ON country_sector_vocabularies;
CREATE TRIGGER country_sector_vocabulary_updated_at
  BEFORE UPDATE ON country_sector_vocabularies
  FOR EACH ROW
  EXECUTE FUNCTION update_country_sector_vocabulary_timestamp();

-- Sector updated_at trigger
CREATE OR REPLACE FUNCTION update_country_sector_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS country_sector_updated_at ON country_sectors;
CREATE TRIGGER country_sector_updated_at
  BEFORE UPDATE ON country_sectors
  FOR EACH ROW
  EXECUTE FUNCTION update_country_sector_timestamp();

-- Mapping updated_at trigger
CREATE OR REPLACE FUNCTION update_country_sector_dac_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS country_sector_dac_mapping_updated_at ON country_sector_dac_mappings;
CREATE TRIGGER country_sector_dac_mapping_updated_at
  BEFORE UPDATE ON country_sector_dac_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_country_sector_dac_mapping_timestamp();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE country_sector_vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_sector_dac_mappings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read on country_sector_vocabularies"
  ON country_sector_vocabularies FOR SELECT
  USING (true);

CREATE POLICY "Allow public read on country_sectors"
  ON country_sectors FOR SELECT
  USING (true);

CREATE POLICY "Allow public read on country_sector_dac_mappings"
  ON country_sector_dac_mappings FOR SELECT
  USING (true);

-- Allow authenticated users to manage (for admin purposes)
CREATE POLICY "Allow authenticated insert on country_sector_vocabularies"
  ON country_sector_vocabularies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on country_sector_vocabularies"
  ON country_sector_vocabularies FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated delete on country_sector_vocabularies"
  ON country_sector_vocabularies FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on country_sectors"
  ON country_sectors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on country_sectors"
  ON country_sectors FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated delete on country_sectors"
  ON country_sectors FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on country_sector_dac_mappings"
  ON country_sector_dac_mappings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on country_sector_dac_mappings"
  ON country_sector_dac_mappings FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated delete on country_sector_dac_mappings"
  ON country_sector_dac_mappings FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE country_sector_vocabularies IS 'Country-specific sector vocabulary definitions';
COMMENT ON TABLE country_sectors IS 'Individual sectors within a country-specific vocabulary';
COMMENT ON TABLE country_sector_dac_mappings IS 'Mappings from country sectors to OECD DAC sectors';

COMMENT ON COLUMN country_sector_vocabularies.code IS 'Short code for the vocabulary, used as IATI sector-vocabulary value';
COMMENT ON COLUMN country_sector_vocabularies.is_default IS 'If true, this vocabulary is the default for the country';
COMMENT ON COLUMN country_sectors.level IS 'Hierarchy level: 1=category, 2=sub-sector, 3=detail, etc.';
COMMENT ON COLUMN country_sector_dac_mappings.percentage IS 'For split mappings, the percentage allocated to this DAC sector';
COMMENT ON COLUMN country_sector_dac_mappings.is_primary IS 'Indicates the primary DAC sector mapping when multiple exist';
