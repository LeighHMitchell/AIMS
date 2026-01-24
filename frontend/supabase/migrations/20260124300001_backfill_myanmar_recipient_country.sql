-- Migration: Backfill Myanmar as default recipient country for activities
-- Purpose: Set Myanmar (MM) as the recipient country for activities that don't have one
-- This is specific to Myanmar AIMS deployment

-- First ensure the columns exist (in case previous migration hasn't run)
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS recipient_countries JSONB DEFAULT '[]'::jsonb;

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS recipient_regions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS custom_geographies JSONB DEFAULT '[]'::jsonb;

-- Backfill Myanmar as recipient country for activities that don't have any recipient countries set
UPDATE activities
SET recipient_countries = jsonb_build_array(
  jsonb_build_object(
    'id', 'country-' || gen_random_uuid()::text,
    'country', jsonb_build_object(
      'code', 'MM',
      'name', 'Myanmar',
      'iso2', 'MM',
      'withdrawn', false
    ),
    'percentage', 100,
    'vocabulary', 'A4'
  )
)
WHERE (recipient_countries IS NULL OR recipient_countries = '[]'::jsonb)
  AND (recipient_regions IS NULL OR recipient_regions = '[]'::jsonb);

-- Log migration results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM activities 
  WHERE recipient_countries IS NOT NULL 
    AND recipient_countries != '[]'::jsonb
    AND recipient_countries->0->>'country' IS NOT NULL
    AND (recipient_countries->0->'country'->>'code') = 'MM';
    
  RAISE NOTICE 'Activities with Myanmar as recipient country: %', updated_count;
END $$;
