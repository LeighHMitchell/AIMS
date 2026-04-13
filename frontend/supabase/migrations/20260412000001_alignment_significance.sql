-- ============================================
-- ACTIVITY PLAN ALIGNMENT: significance + rationale
-- Replaces percentage model with significance (principal/significant) + narrative rationale.
-- Inspired by the IATI policy marker significance pattern.
-- ============================================

-- Add new columns
ALTER TABLE activity_national_priorities
  ADD COLUMN IF NOT EXISTS significance VARCHAR(20) DEFAULT 'significant'
    CHECK (significance IN ('principal', 'significant'));

ALTER TABLE activity_national_priorities
  ADD COLUMN IF NOT EXISTS rationale TEXT;

-- Migrate existing percentage data to significance:
--   percentage >= 50 → principal
--   percentage < 50  → significant
UPDATE activity_national_priorities
SET significance = CASE
  WHEN percentage IS NULL THEN 'significant'
  WHEN percentage >= 50 THEN 'principal'
  ELSE 'significant'
END
WHERE significance IS NULL OR significance = 'significant';

-- Make significance NOT NULL now that all rows have a value
ALTER TABLE activity_national_priorities
  ALTER COLUMN significance SET NOT NULL;

-- Drop the old percentage CHECK constraint and make it nullable (keep column for backward compat)
ALTER TABLE activity_national_priorities
  ALTER COLUMN percentage DROP NOT NULL;
