-- Align organisation funding envelopes with the IATI recipient-country-budget
-- element: annual organisation-level budgets for the AIMS deployment country.
--
-- Changes:
--   1. status -> IATI's two values ('indicative' | 'committed').
--      Existing 'actual' and 'current' rows migrate to 'committed'.
--   2. flow_direction / organization_role are no longer collected (the budget is
--      implicitly the org's budget for the deployment country). Relax their
--      NOT NULL constraints so new rows can omit them. Columns are retained for
--      back-compat with historical rows; their CHECKs still pass on NULL.
--
-- Idempotent: safe to re-run.

-- 1. Drop the OLD status CHECK first — otherwise the data migration below
--    (which writes 'committed') would violate the still-active old constraint.
ALTER TABLE organization_funding_envelopes
  DROP CONSTRAINT IF EXISTS organization_funding_envelopes_status_check;

-- 2. Migrate existing status values to IATI's two values.
UPDATE organization_funding_envelopes
   SET status = 'committed'
 WHERE status IN ('actual', 'current');

-- 3. Add the new IATI status CHECK.
ALTER TABLE organization_funding_envelopes
  ADD CONSTRAINT organization_funding_envelopes_status_check
  CHECK (status IN ('indicative', 'committed'));

COMMENT ON COLUMN organization_funding_envelopes.status IS
  'IATI recipient-country-budget @status: indicative (planned/forecast) or committed (firm/contracted)';

-- 2. Relax classification columns that are no longer collected.
ALTER TABLE organization_funding_envelopes
  ALTER COLUMN flow_direction DROP NOT NULL;

ALTER TABLE organization_funding_envelopes
  ALTER COLUMN organization_role DROP NOT NULL;
