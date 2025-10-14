-- Migration: Add JSONB columns for multiple IATI transaction elements
-- Created: 2025-01-07
-- Purpose: Support multiple sectors, aid types, countries, and regions per transaction

-- Add JSONB columns for multiple elements
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS sectors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS aid_types JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recipient_countries JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recipient_regions JSONB DEFAULT '[]'::jsonb;

-- Add GIN indexes for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_transactions_sectors_gin ON transactions USING GIN (sectors);
CREATE INDEX IF NOT EXISTS idx_transactions_aid_types_gin ON transactions USING GIN (aid_types);
CREATE INDEX IF NOT EXISTS idx_transactions_countries_gin ON transactions USING GIN (recipient_countries);
CREATE INDEX IF NOT EXISTS idx_transactions_regions_gin ON transactions USING GIN (recipient_regions);

-- Add validation function for sector percentages
CREATE OR REPLACE FUNCTION validate_transaction_sector_percentages()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage NUMERIC := 0;
  has_percentages BOOLEAN := FALSE;
  sector_count INTEGER := 0;
BEGIN
  -- Only validate if sectors array is not empty
  IF NEW.sectors IS NOT NULL AND jsonb_array_length(NEW.sectors) > 0 THEN
    sector_count := jsonb_array_length(NEW.sectors);
    
    -- Check if any sector has a percentage
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.sectors) AS elem
      WHERE elem->>'percentage' IS NOT NULL
    ) INTO has_percentages;
    
    IF has_percentages THEN
      -- Sum all percentages
      SELECT COALESCE(SUM((elem->>'percentage')::NUMERIC), 0)
      INTO total_percentage
      FROM jsonb_array_elements(NEW.sectors) AS elem
      WHERE elem->>'percentage' IS NOT NULL;
      
      -- Validate sum equals 100 (with 0.01 tolerance for rounding)
      IF ABS(total_percentage - 100) > 0.01 THEN
        RAISE EXCEPTION 'Transaction sector percentages must sum to 100%%, got %', total_percentage;
      END IF;
      
      -- Ensure all sectors have percentages if any do
      IF (SELECT COUNT(*) FROM jsonb_array_elements(NEW.sectors) AS elem 
          WHERE elem->>'percentage' IS NULL) > 0 THEN
        RAISE WARNING 'Some sectors have percentages while others do not. All sectors should have percentages or none should.';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add validation function for region percentages
CREATE OR REPLACE FUNCTION validate_transaction_region_percentages()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage NUMERIC := 0;
  has_percentages BOOLEAN := FALSE;
BEGIN
  -- Only validate if regions array is not empty
  IF NEW.recipient_regions IS NOT NULL AND jsonb_array_length(NEW.recipient_regions) > 0 THEN
    -- Check if any region has a percentage
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.recipient_regions) AS elem
      WHERE elem->>'percentage' IS NOT NULL
    ) INTO has_percentages;
    
    IF has_percentages THEN
      -- Sum all percentages
      SELECT COALESCE(SUM((elem->>'percentage')::NUMERIC), 0)
      INTO total_percentage
      FROM jsonb_array_elements(NEW.recipient_regions) AS elem
      WHERE elem->>'percentage' IS NOT NULL;
      
      -- Validate sum equals 100 (with 0.01 tolerance for rounding)
      IF ABS(total_percentage - 100) > 0.01 THEN
        RAISE EXCEPTION 'Transaction region percentages must sum to 100%%, got %', total_percentage;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add validation function for country percentages
CREATE OR REPLACE FUNCTION validate_transaction_country_percentages()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage NUMERIC := 0;
  has_percentages BOOLEAN := FALSE;
BEGIN
  -- Only validate if countries array is not empty
  IF NEW.recipient_countries IS NOT NULL AND jsonb_array_length(NEW.recipient_countries) > 0 THEN
    -- Check if any country has a percentage
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.recipient_countries) AS elem
      WHERE elem->>'percentage' IS NOT NULL
    ) INTO has_percentages;
    
    IF has_percentages THEN
      -- Sum all percentages
      SELECT COALESCE(SUM((elem->>'percentage')::NUMERIC), 0)
      INTO total_percentage
      FROM jsonb_array_elements(NEW.recipient_countries) AS elem
      WHERE elem->>'percentage' IS NOT NULL;
      
      -- Validate sum equals 100 (with 0.01 tolerance for rounding)
      IF ABS(total_percentage - 100) > 0.01 THEN
        RAISE EXCEPTION 'Transaction country percentages must sum to 100%%, got %', total_percentage;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add validation function to check country XOR region (not both)
CREATE OR REPLACE FUNCTION validate_transaction_geography()
RETURNS TRIGGER AS $$
DECLARE
  has_countries BOOLEAN := FALSE;
  has_regions BOOLEAN := FALSE;
BEGIN
  -- Check if countries are specified (new JSONB or old single field)
  has_countries := (NEW.recipient_countries IS NOT NULL AND jsonb_array_length(NEW.recipient_countries) > 0)
                   OR NEW.recipient_country_code IS NOT NULL;
  
  -- Check if regions are specified (new JSONB or old single field)
  has_regions := (NEW.recipient_regions IS NOT NULL AND jsonb_array_length(NEW.recipient_regions) > 0)
                 OR NEW.recipient_region_code IS NOT NULL;
  
  -- Warn if both are specified (IATI recommends only one)
  IF has_countries AND has_regions THEN
    RAISE WARNING 'Transaction has both recipient countries and regions. IATI Standard recommends specifying either recipient-country OR recipient-region, not both.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS validate_transaction_sectors_trigger ON transactions;
CREATE TRIGGER validate_transaction_sectors_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_sector_percentages();

DROP TRIGGER IF EXISTS validate_transaction_regions_trigger ON transactions;
CREATE TRIGGER validate_transaction_regions_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_region_percentages();

DROP TRIGGER IF EXISTS validate_transaction_countries_trigger ON transactions;
CREATE TRIGGER validate_transaction_countries_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_country_percentages();

DROP TRIGGER IF EXISTS validate_transaction_geography_trigger ON transactions;
CREATE TRIGGER validate_transaction_geography_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_geography();

-- Add comments for documentation
COMMENT ON COLUMN transactions.sectors IS 'Array of transaction sectors with optional percentages: [{"code": "11220", "vocabulary": "1", "percentage": 50, "narrative": "Primary education"}, ...]';
COMMENT ON COLUMN transactions.aid_types IS 'Array of aid types: [{"code": "A01", "vocabulary": "1"}, {"code": "1", "vocabulary": "2"}, ...]';
COMMENT ON COLUMN transactions.recipient_countries IS 'Array of recipient countries with optional percentages: [{"code": "TZ", "percentage": 60}, {"code": "KE", "percentage": 40}, ...]';
COMMENT ON COLUMN transactions.recipient_regions IS 'Array of recipient regions with optional percentages: [{"code": "298", "vocabulary": "1", "percentage": 100, "narrative": "Africa"}, ...]';

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added JSONB columns for multiple transaction elements (sectors, aid_types, countries, regions) with validation triggers';
END $$;
