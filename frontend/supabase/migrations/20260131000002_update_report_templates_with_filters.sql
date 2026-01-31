-- Migration: Update existing report templates to include recordTypes filter
-- This prevents the data accuracy warning from showing when templates are loaded

-- Update all existing templates to filter by Transactions only (most common use case)
-- The config column is JSONB, so we can merge the filters object
UPDATE saved_pivot_reports
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{filters}',
    COALESCE(config->'filters', '{}'::jsonb) || '{"recordTypes": ["Transaction"]}'::jsonb
)
WHERE is_template = true
  AND (
    config->'filters'->'recordTypes' IS NULL
    OR jsonb_array_length(config->'filters'->'recordTypes') = 0
  );

-- Also update any user reports that don't have recordTypes set
-- (optional - only updates reports that have no recordTypes filter)
UPDATE saved_pivot_reports
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{filters}',
    COALESCE(config->'filters', '{}'::jsonb) || '{"recordTypes": ["Transaction"]}'::jsonb
)
WHERE is_template = false
  AND (
    config->'filters'->'recordTypes' IS NULL
    OR jsonb_array_length(config->'filters'->'recordTypes') = 0
  );

-- Add comment documenting the change
COMMENT ON TABLE saved_pivot_reports IS 'Saved pivot table configurations.
Config includes filters.recordTypes to specify data type (Transaction, Planned Disbursement, Budget).
Templates should always have recordTypes set to avoid data accuracy warnings.';
