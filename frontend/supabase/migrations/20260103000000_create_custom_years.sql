-- Custom Years: Define custom fiscal/financial year periods
-- Migration: 20260103000000_create_custom_years.sql

-- Create custom_years table for storing fiscal year definitions
CREATE TABLE IF NOT EXISTS custom_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,              -- "Australian Fiscal Year"
  short_name VARCHAR(20),                   -- "AU FY" (for badges/toggles)
  start_month INTEGER NOT NULL,             -- 1-12 (July = 7)
  start_day INTEGER NOT NULL DEFAULT 1,     -- 1-31
  end_month INTEGER NOT NULL,               -- 1-12 (June = 6)
  end_day INTEGER NOT NULL,                 -- 1-31
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,         -- Only one can be default
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Ensure unique names
  CONSTRAINT custom_years_name_unique UNIQUE (name),
  
  -- Validate month range (1-12)
  CONSTRAINT custom_years_valid_start_month CHECK (start_month >= 1 AND start_month <= 12),
  CONSTRAINT custom_years_valid_end_month CHECK (end_month >= 1 AND end_month <= 12),
  
  -- Validate day range (1-31)
  CONSTRAINT custom_years_valid_start_day CHECK (start_day >= 1 AND start_day <= 31),
  CONSTRAINT custom_years_valid_end_day CHECK (end_day >= 1 AND end_day <= 31)
);

-- Create partial unique index to ensure only one default year
CREATE UNIQUE INDEX IF NOT EXISTS custom_years_unique_default 
  ON custom_years (is_default) WHERE is_default = true;

-- Create index for common queries
CREATE INDEX IF NOT EXISTS custom_years_active_idx ON custom_years (is_active);
CREATE INDEX IF NOT EXISTS custom_years_display_order_idx ON custom_years (display_order);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_years_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS custom_years_updated_at_trigger ON custom_years;
CREATE TRIGGER custom_years_updated_at_trigger
  BEFORE UPDATE ON custom_years
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_years_updated_at();

-- Enable RLS
ALTER TABLE custom_years ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, only authenticated users can modify
CREATE POLICY "custom_years_select_policy" ON custom_years
  FOR SELECT USING (true);

CREATE POLICY "custom_years_insert_policy" ON custom_years
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "custom_years_update_policy" ON custom_years
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "custom_years_delete_policy" ON custom_years
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Seed with Calendar Year as built-in default
INSERT INTO custom_years (name, short_name, start_month, start_day, end_month, end_day, is_active, is_default, display_order)
VALUES ('Calendar Year', 'CY', 1, 1, 12, 31, true, true, 0)
ON CONFLICT (name) DO NOTHING;
