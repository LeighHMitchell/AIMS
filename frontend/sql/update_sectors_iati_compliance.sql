-- Update sectors table for IATI compliance
-- Ensure sectors table has necessary fields for IATI sync

-- Add IATI-specific fields to sectors table if they don't exist
ALTER TABLE sectors
ADD COLUMN IF NOT EXISTS iati_vocabulary TEXT DEFAULT 'DAC',
ADD COLUMN IF NOT EXISTS iati_vocabulary_uri TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add constraint for vocabulary values
ALTER TABLE sectors DROP CONSTRAINT IF EXISTS check_iati_vocabulary;
ALTER TABLE sectors ADD CONSTRAINT check_iati_vocabulary 
  CHECK (iati_vocabulary IN ('DAC', 'DAC-3', 'ISO', 'NTEE', 'NACE', 'COFOG', 'RO', 'RO2', 'OECD-DAC-CRS'));

-- Add comments for documentation
COMMENT ON COLUMN sectors.iati_vocabulary IS 'IATI vocabulary used for this sector (default: DAC)';
COMMENT ON COLUMN sectors.iati_vocabulary_uri IS 'URI reference for the vocabulary';
COMMENT ON COLUMN sectors.is_active IS 'Whether this sector code is currently active';
COMMENT ON COLUMN sectors.last_updated IS 'Last time this sector information was updated';

-- Create index for vocabulary lookup
CREATE INDEX IF NOT EXISTS idx_sectors_vocabulary ON sectors(iati_vocabulary);
CREATE INDEX IF NOT EXISTS idx_sectors_active ON sectors(is_active);

-- Update existing sectors to ensure they have proper vocabulary set
UPDATE sectors 
SET iati_vocabulary = 'DAC' 
WHERE iati_vocabulary IS NULL;

-- Add a junction table for activity-sector relationships with IATI compliance
CREATE TABLE IF NOT EXISTS activity_sectors_iati (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  sector_code TEXT NOT NULL,
  sector_name TEXT,
  vocabulary TEXT DEFAULT 'DAC',
  vocabulary_uri TEXT,
  percentage DECIMAL(5,2) CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(activity_id, sector_code, vocabulary)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_sectors_iati_activity ON activity_sectors_iati(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_sectors_iati_sector ON activity_sectors_iati(sector_code);
CREATE INDEX IF NOT EXISTS idx_activity_sectors_iati_vocabulary ON activity_sectors_iati(vocabulary);

-- Add RLS policies
ALTER TABLE activity_sectors_iati ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sector allocations for activities they can access
CREATE POLICY "Users can view activity sectors" ON activity_sectors_iati
  FOR SELECT
  USING (
    activity_id IN (
      SELECT id FROM activities 
      WHERE created_by = auth.uid() 
         OR created_by_org IN (
           SELECT organization_id FROM user_organizations 
           WHERE user_id = auth.uid()
         )
    )
  );

-- Policy: Users can manage sector allocations for activities they can edit
CREATE POLICY "Users can manage activity sectors" ON activity_sectors_iati
  FOR ALL
  USING (
    activity_id IN (
      SELECT id FROM activities 
      WHERE created_by = auth.uid() 
         OR created_by_org IN (
           SELECT organization_id FROM user_organizations 
           WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
         )
    )
  );

-- Create a view to simplify sector queries with IATI metadata
CREATE OR REPLACE VIEW v_activity_sectors_with_iati AS
SELECT 
  asi.id,
  asi.activity_id,
  asi.sector_code,
  asi.sector_name,
  asi.vocabulary,
  asi.vocabulary_uri,
  asi.percentage,
  s.dac5_name,
  s.dac3_code,
  s.dac3_name,
  s.description,
  asi.created_at,
  asi.updated_at
FROM activity_sectors_iati asi
LEFT JOIN sectors s ON asi.sector_code = s.dac5_code AND asi.vocabulary = 'DAC'
ORDER BY asi.activity_id, asi.percentage DESC NULLS LAST; 