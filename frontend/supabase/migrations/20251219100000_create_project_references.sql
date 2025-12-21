-- Migration: Create project_references table
-- Purpose: Link activities to government project codes, donor project codes, and internal references
-- for budget reconciliation and aid-on-budget tracking

-- Create the project_references table
CREATE TABLE IF NOT EXISTS project_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent activity reference
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

  -- Reference details
  reference_type TEXT NOT NULL CHECK (reference_type IN ('government', 'donor', 'internal')),
  code TEXT NOT NULL,
  name TEXT,

  -- Vocabulary for classification (free-text)
  vocabulary TEXT,  -- e.g., 'national_pip', 'ministry_code', 'donor_reference'
  vocabulary_uri TEXT,  -- Optional: URI for the vocabulary standard

  -- Primary flag
  is_primary BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT unique_activity_reference UNIQUE(activity_id, reference_type, code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_refs_activity ON project_references(activity_id);
CREATE INDEX IF NOT EXISTS idx_project_refs_type ON project_references(reference_type);
CREATE INDEX IF NOT EXISTS idx_project_refs_code ON project_references(code);
CREATE INDEX IF NOT EXISTS idx_project_refs_vocabulary ON project_references(vocabulary) WHERE vocabulary IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_refs_primary ON project_references(activity_id, is_primary) WHERE is_primary = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_references_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_references_updated_at_trigger
  BEFORE UPDATE ON project_references
  FOR EACH ROW
  EXECUTE FUNCTION update_project_references_updated_at();

-- Enable Row Level Security
ALTER TABLE project_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all authenticated users can read and modify)
CREATE POLICY "project_references_select_policy" ON project_references
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "project_references_insert_policy" ON project_references
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "project_references_update_policy" ON project_references
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "project_references_delete_policy" ON project_references
  FOR DELETE TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE project_references IS 'Links activities to government projects, donor projects, or internal project codes for budget classification and reconciliation';
COMMENT ON COLUMN project_references.reference_type IS 'Type of reference: government (national project codes), donor (development partner references), internal (system references)';
COMMENT ON COLUMN project_references.code IS 'The project reference code/identifier';
COMMENT ON COLUMN project_references.name IS 'Human-readable name for the project reference';
COMMENT ON COLUMN project_references.vocabulary IS 'Standard/system used for the reference (e.g., national_pip, ministry_code)';
COMMENT ON COLUMN project_references.vocabulary_uri IS 'Optional URI defining the vocabulary standard';
COMMENT ON COLUMN project_references.is_primary IS 'True if this is the primary/main project reference for the activity';
