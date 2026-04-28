-- Add an internal description field to activity_budgets.
-- IATI 2.03 does not define a description on <budget>, so this stays
-- internal-only: not populated by IATI import, not emitted in IATI export.

ALTER TABLE activity_budgets
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN activity_budgets.description IS
  'Internal-only description/notes for this budget entry. Not part of IATI 2.03 and not round-tripped through IATI import/export.';
