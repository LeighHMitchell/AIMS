-- Create country budget items tables for IATI country-budget-items element
-- This supports IATI 2.03 standard for budget alignment reporting

-- Drop existing tables if they exist (for clean re-run)
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS country_budget_items CASCADE;

-- Create country_budget_items table (parent)
-- One per vocabulary per activity
CREATE TABLE country_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  vocabulary TEXT NOT NULL CHECK (vocabulary IN ('1', '2', '3', '4', '5')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Ensure only one vocabulary per activity
  CONSTRAINT unique_activity_vocabulary UNIQUE(activity_id, vocabulary)
);

-- Create budget_items table (children)
-- Multiple budget items per country_budget_items
CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_budget_items_id UUID NOT NULL REFERENCES country_budget_items(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  percentage NUMERIC(5,2) CHECK (percentage >= 0 AND percentage <= 100),
  description JSONB, -- Multi-language support: {"en": "text", "fr": "texte"}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Validate description JSONB structure
  CONSTRAINT budget_items_valid_description CHECK (
    description IS NULL OR (
      jsonb_typeof(description) = 'object' AND 
      description != '{}'::jsonb
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_country_budget_items_activity_id ON country_budget_items(activity_id);
CREATE INDEX idx_country_budget_items_vocabulary ON country_budget_items(vocabulary);
CREATE INDEX idx_budget_items_country_budget_items_id ON budget_items(country_budget_items_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_country_budget_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_country_budget_items_updated_at_trigger
  BEFORE UPDATE ON country_budget_items
  FOR EACH ROW
  EXECUTE FUNCTION update_country_budget_items_updated_at();

CREATE OR REPLACE FUNCTION update_budget_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budget_items_updated_at_trigger
  BEFORE UPDATE ON budget_items
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_items_updated_at();

-- Add comments for documentation
COMMENT ON TABLE country_budget_items IS 'IATI country-budget-items element: groups budget items by vocabulary';
COMMENT ON COLUMN country_budget_items.vocabulary IS 'Budget identifier vocabulary code: 1=IATI(withdrawn), 2=Country Chart of Accounts, 3=Other Country System, 4=Reporting Organisation, 5=Other';
COMMENT ON TABLE budget_items IS 'IATI budget-item elements: individual budget line items with codes and percentages';
COMMENT ON COLUMN budget_items.code IS 'Budget identifier code from the specified vocabulary';
COMMENT ON COLUMN budget_items.percentage IS 'Percentage allocation (should sum to 100% per vocabulary)';
COMMENT ON COLUMN budget_items.description IS 'Multi-language narrative stored as JSONB, e.g., {"en": "text", "fr": "texte"}';

