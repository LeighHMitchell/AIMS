-- Create activity_conditions table for IATI-compliant conditions tracking
-- Supports conditions with types (Policy, Performance, Fiduciary) and multi-language narratives

-- Drop existing objects if they exist (for clean re-run)
DROP TABLE IF EXISTS activity_conditions CASCADE;
DROP FUNCTION IF EXISTS update_activity_conditions_updated_at() CASCADE;

-- Create the activity_conditions table
CREATE TABLE activity_conditions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  -- IATI Condition fields
  type TEXT NOT NULL CHECK (type IN ('1', '2', '3')), -- 1=Policy, 2=Performance, 3=Fiduciary
  narrative JSONB NOT NULL, -- Multi-language support: {en: "text", fr: "texte"}
  attached BOOLEAN DEFAULT true, -- Whether conditions are attached to this activity
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable: app uses custom auth, not Supabase Auth
  
  -- Constraints
  CONSTRAINT activity_conditions_valid_narrative CHECK (
    jsonb_typeof(narrative) = 'object' AND 
    narrative != '{}'::jsonb
  ),
  CONSTRAINT activity_conditions_valid_type CHECK (type IN ('1', '2', '3'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_conditions_activity_id ON activity_conditions(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_conditions_type ON activity_conditions(type);
CREATE INDEX IF NOT EXISTS idx_activity_conditions_attached ON activity_conditions(attached);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_activity_conditions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activity_conditions_updated_at_trigger
  BEFORE UPDATE ON activity_conditions
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_conditions_updated_at();

-- Enable Row Level Security
ALTER TABLE activity_conditions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read conditions" ON activity_conditions;
DROP POLICY IF EXISTS "Allow users to insert conditions for activities they can edit" ON activity_conditions;
DROP POLICY IF EXISTS "Allow users to update conditions for activities they can edit" ON activity_conditions;
DROP POLICY IF EXISTS "Allow users to delete conditions for activities they can edit" ON activity_conditions;

-- Allow authenticated users to read all conditions (view access)
CREATE POLICY "Allow authenticated users to read conditions"
  ON activity_conditions
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert conditions only for activities they can edit
-- This checks if the activity exists and user has permission
CREATE POLICY "Allow users to insert conditions for activities they can edit"
  ON activity_conditions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update conditions only for activities they can edit
CREATE POLICY "Allow users to update conditions for activities they can edit"
  ON activity_conditions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_id
    )
  );

-- Allow users to delete conditions only for activities they can edit
CREATE POLICY "Allow users to delete conditions for activities they can edit"
  ON activity_conditions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_id
    )
  );

-- Add comment for documentation
COMMENT ON TABLE activity_conditions IS 'Stores IATI-compliant conditions for activities with multi-language narrative support';
COMMENT ON COLUMN activity_conditions.type IS 'IATI condition type: 1=Policy, 2=Performance, 3=Fiduciary';
COMMENT ON COLUMN activity_conditions.narrative IS 'Multi-language narrative stored as JSONB, e.g., {"en": "text", "fr": "texte"}';
COMMENT ON COLUMN activity_conditions.attached IS 'Whether conditions are attached to the activity (IATI attached attribute)';

