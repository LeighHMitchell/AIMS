-- Add missing columns to partners table
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS code text,
ADD COLUMN IF NOT EXISTS iati_org_id text,
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS acronym text,
ADD COLUMN IF NOT EXISTS organisation_type text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS logo text,
ADD COLUMN IF NOT EXISTS banner text,
ADD COLUMN IF NOT EXISTS country_represented text; 