-- Organisations can record two addresses: a headquarters / home-country address
-- and a separate in-country office address.
--
-- The existing `address` column becomes the headquarters / home-country address
-- (no data migration needed — its meaning is unchanged, only the label in the UI).
-- This adds `country_office_address` for the in-country office address.
-- Idempotent: safe to re-run.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS country_office_address TEXT;

COMMENT ON COLUMN organizations.address IS 'Headquarters / home-country (mailing) address of the organisation';
COMMENT ON COLUMN organizations.country_office_address IS 'In-country office address (e.g. the local/regional office in the country of operation)';
