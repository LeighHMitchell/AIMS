-- Aid Effectiveness Options: Admin-managed dropdown options for country-specific fields
-- Migration: 20260221000000_create_aid_effectiveness_options.sql

-- Create aid_effectiveness_options table
CREATE TABLE IF NOT EXISTS aid_effectiveness_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,              -- e.g. 'includedInNationalPlan', 'linkedToGovFramework'
  label VARCHAR(255) NOT NULL,                -- Display label for the option
  description TEXT,                           -- Optional description/help text
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique labels within each category
  CONSTRAINT ae_options_category_label_unique UNIQUE (category, label)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS ae_options_category_idx ON aid_effectiveness_options (category);
CREATE INDEX IF NOT EXISTS ae_options_active_idx ON aid_effectiveness_options (is_active);
CREATE INDEX IF NOT EXISTS ae_options_sort_idx ON aid_effectiveness_options (category, sort_order);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ae_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ae_options_updated_at_trigger ON aid_effectiveness_options;
CREATE TRIGGER ae_options_updated_at_trigger
  BEFORE UPDATE ON aid_effectiveness_options
  FOR EACH ROW
  EXECUTE FUNCTION update_ae_options_updated_at();

-- Enable RLS
ALTER TABLE aid_effectiveness_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, only authenticated users can modify
CREATE POLICY "ae_options_select_policy" ON aid_effectiveness_options
  FOR SELECT USING (true);

CREATE POLICY "ae_options_insert_policy" ON aid_effectiveness_options
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ae_options_update_policy" ON aid_effectiveness_options
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "ae_options_delete_policy" ON aid_effectiveness_options
  FOR DELETE USING (auth.uid() IS NOT NULL);
