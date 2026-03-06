-- Convert sector_strategy_reference from text to jsonb (array of strings)
-- to support multiple government planning document selections.

-- Migrate existing text values into single-element JSON arrays
ALTER TABLE project_bank_projects
  ALTER COLUMN sector_strategy_reference TYPE jsonb
  USING CASE
    WHEN sector_strategy_reference IS NOT NULL AND sector_strategy_reference != ''
      THEN jsonb_build_array(sector_strategy_reference)
    ELSE NULL
  END;
