-- Add submitter information fields to land_parcels
ALTER TABLE land_parcels
  ADD COLUMN IF NOT EXISTS submitter_first_name text,
  ADD COLUMN IF NOT EXISTS submitter_last_name text,
  ADD COLUMN IF NOT EXISTS submitter_organization text;
