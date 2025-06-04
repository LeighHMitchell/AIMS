-- Migration Script: Unify Partners and Organizations Tables
-- Run this in Supabase SQL Editor

-- Step 1: Add missing columns to organizations table if they don't exist
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS iati_org_id TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS acronym TEXT,
ADD COLUMN IF NOT EXISTS organisation_type TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS banner TEXT,
ADD COLUMN IF NOT EXISTS country_represented TEXT;

-- Step 2: Check for conflicts before migration
SELECT 
  'Partners not in Organizations' as check_type,
  COUNT(*) as count
FROM partners p
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.id = p.id
);

-- Step 3: Migrate data from partners to organizations
-- This will insert new records and update existing ones
INSERT INTO organizations (
  id, name, type, country,
  code, iati_org_id, full_name, acronym,
  organisation_type, description, website, email,
  phone, address, logo, banner, country_represented,
  created_at, updated_at
)
SELECT 
  p.id, p.name, p.type, p.country,
  p.code, p.iati_org_id, p.full_name, p.acronym,
  p.organisation_type, p.description, p.website, p.email,
  p.phone, p.address, p.logo, p.banner, p.country_represented,
  p.created_at, p.updated_at
FROM partners p
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  country = EXCLUDED.country,
  code = EXCLUDED.code,
  iati_org_id = EXCLUDED.iati_org_id,
  full_name = EXCLUDED.full_name,
  acronym = EXCLUDED.acronym,
  organisation_type = EXCLUDED.organisation_type,
  description = EXCLUDED.description,
  website = EXCLUDED.website,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  logo = EXCLUDED.logo,
  banner = EXCLUDED.banner,
  country_represented = EXCLUDED.country_represented,
  updated_at = EXCLUDED.updated_at;

-- Step 4: Verify migration
SELECT 
  'Total Partners' as metric,
  COUNT(*) as count
FROM partners
UNION ALL
SELECT 
  'Total Organizations After Migration' as metric,
  COUNT(*) as count
FROM organizations
UNION ALL
SELECT 
  'Organizations with Partner Data' as metric,
  COUNT(*) as count
FROM organizations
WHERE code IS NOT NULL OR iati_org_id IS NOT NULL;

-- Step 5: Check for any users that might be affected
SELECT 
  u.id as user_id,
  u.email as user_email,
  u.organization_id,
  o.name as organization_name,
  CASE 
    WHEN o.id IS NULL THEN 'MISSING ORGANIZATION'
    ELSE 'OK'
  END as status
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.organization_id IS NOT NULL;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_country ON organizations(country);
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);

-- Step 7: Drop the partners table (ONLY AFTER CONFIRMING MIGRATION SUCCESS)
-- COMMENT THIS OUT UNTIL YOU'RE SURE EVERYTHING WORKS
-- DROP TABLE partners CASCADE; 