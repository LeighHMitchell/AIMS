-- Store the IATI recipient-country/@code on each org funding envelope so these
-- can be expressed as true IATI recipient-country-budget elements. Defaults to
-- the AIMS host country in the UI, but is selectable per row.
-- Idempotent: safe to re-run.

ALTER TABLE organization_funding_envelopes
  ADD COLUMN IF NOT EXISTS recipient_country TEXT;

COMMENT ON COLUMN organization_funding_envelopes.recipient_country IS
  'IATI recipient-country/@code (ISO 3166-1 alpha-2) the budget is earmarked for';
