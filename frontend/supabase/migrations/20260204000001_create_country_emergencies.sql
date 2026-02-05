-- Migration: Create country_emergencies table
-- Purpose: Manage country-identified emergencies for humanitarian scope vocabulary 98

-- Create the country_emergencies table
CREATE TABLE IF NOT EXISTS country_emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Emergency details
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  start_date DATE,
  end_date DATE,
  location TEXT,
  description TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_country_emergencies_code ON country_emergencies(code);
CREATE INDEX IF NOT EXISTS idx_country_emergencies_active ON country_emergencies(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_country_emergencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_country_emergencies_updated_at_trigger
  BEFORE UPDATE ON country_emergencies
  FOR EACH ROW
  EXECUTE FUNCTION update_country_emergencies_updated_at();

-- Enable Row Level Security
ALTER TABLE country_emergencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all authenticated users can CRUD; admin check at API level)
CREATE POLICY "country_emergencies_select_policy" ON country_emergencies
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "country_emergencies_insert_policy" ON country_emergencies
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "country_emergencies_update_policy" ON country_emergencies
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "country_emergencies_delete_policy" ON country_emergencies
  FOR DELETE TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE country_emergencies IS 'Country-identified emergencies for humanitarian scope vocabulary 98';
COMMENT ON COLUMN country_emergencies.name IS 'Human-readable name of the emergency';
COMMENT ON COLUMN country_emergencies.code IS 'Unique emergency code (e.g., MMR-CYCLONE-2024)';
COMMENT ON COLUMN country_emergencies.start_date IS 'When the emergency started';
COMMENT ON COLUMN country_emergencies.end_date IS 'When the emergency ended (null if ongoing)';
COMMENT ON COLUMN country_emergencies.location IS 'Geographic location or affected area';
COMMENT ON COLUMN country_emergencies.description IS 'Detailed description of the emergency';
COMMENT ON COLUMN country_emergencies.is_active IS 'Whether the emergency is currently active and available for selection';
