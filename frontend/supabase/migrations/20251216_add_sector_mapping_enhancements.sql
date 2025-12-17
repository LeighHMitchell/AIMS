-- Sector Budget Mapping Enhancements
-- Adds support for category-level mappings and source tracking

-- ============================================================================
-- 1. ADD CATEGORY LEVEL FLAG TO SECTOR_BUDGET_MAPPINGS
-- ============================================================================
-- This allows mappings at both 3-digit (category) and 5-digit (specific) levels

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sector_budget_mappings' AND column_name = 'is_category_level'
  ) THEN
    ALTER TABLE sector_budget_mappings
    ADD COLUMN is_category_level BOOLEAN DEFAULT false;

    COMMENT ON COLUMN sector_budget_mappings.is_category_level IS
      'True for 3-digit DAC category mappings, false for 5-digit specific sector mappings';
  END IF;
END $$;

-- Create index for efficient category lookup
CREATE INDEX IF NOT EXISTS idx_sector_budget_mappings_category_level
ON sector_budget_mappings(is_category_level, sector_code);

-- ============================================================================
-- 2. ADD SOURCE TRACKING TO BUDGET_ITEMS
-- ============================================================================
-- Track which sector suggested each budget item for UI display

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_items' AND column_name = 'source_sector_code'
  ) THEN
    ALTER TABLE budget_items
    ADD COLUMN source_sector_code TEXT,
    ADD COLUMN source_sector_name TEXT;

    COMMENT ON COLUMN budget_items.source_sector_code IS
      'DAC sector code that suggested this budget mapping (for auto-mapped items)';
    COMMENT ON COLUMN budget_items.source_sector_name IS
      'Cached name of the source sector for display';
  END IF;
END $$;

-- ============================================================================
-- 3. UPDATE EXISTING SECTOR MAPPINGS
-- ============================================================================
-- Mark existing 5-digit sector codes as specific (not category level)

UPDATE sector_budget_mappings
SET is_category_level = false
WHERE is_category_level IS NULL;

-- Mark any 3-digit codes as category level
UPDATE sector_budget_mappings
SET is_category_level = true
WHERE LENGTH(sector_code) = 3;

-- ============================================================================
-- 4. ADD UNIQUE CONSTRAINT FOR SECTOR + CLASSIFICATION TYPE
-- ============================================================================
-- Allow one mapping per sector per classification type (functional, admin, etc.)
-- First, we need to get classification type from budget_classifications table
-- This is handled at application level since mappings can span types
