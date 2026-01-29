-- Migration: Seed additional fiscal year definitions
-- Adds common fiscal year types to the custom_years table

-- Insert common fiscal year definitions
-- Calendar Year already exists from initial migration (20260103000000)

INSERT INTO custom_years (name, short_name, start_month, start_day, end_month, end_day, is_active, is_default, display_order)
VALUES 
  -- US Fiscal Year: October 1 - September 30
  -- FY 2025 runs from October 1, 2024 to September 30, 2025
  ('US Fiscal Year', 'US FY', 10, 1, 9, 30, true, false, 1),
  
  -- Australian Fiscal Year: July 1 - June 30
  -- FY 2024-25 runs from July 1, 2024 to June 30, 2025
  ('Australian Fiscal Year', 'AU FY', 7, 1, 6, 30, true, false, 2),
  
  -- UK Fiscal Year: April 6 - April 5 (tax year)
  -- Note: Most UK government/business use April 1 - March 31, but the tax year is April 6
  ('UK Fiscal Year', 'UK FY', 4, 6, 4, 5, true, false, 3)
ON CONFLICT (name) DO NOTHING;

-- Also add the more common UK financial year (April 1 - March 31)
INSERT INTO custom_years (name, short_name, start_month, start_day, end_month, end_day, is_active, is_default, display_order)
VALUES 
  ('UK Financial Year', 'UK Fin', 4, 1, 3, 31, true, false, 4)
ON CONFLICT (name) DO NOTHING;

-- Verify the inserts
DO $$
DECLARE
  year_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO year_count FROM custom_years WHERE is_active = true;
  RAISE NOTICE 'Total active fiscal year definitions: %', year_count;
END $$;
