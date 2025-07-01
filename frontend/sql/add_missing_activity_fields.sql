-- Add missing fields to activities table for IATI compliance
-- These fields are referenced in the frontend but missing from the database

-- Add default_aid_type column
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS default_aid_type TEXT;

-- Add flow_type column  
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS flow_type TEXT;

-- Add comments for documentation
COMMENT ON COLUMN activities.default_aid_type IS 'Default aid type for the activity (IATI aid type codes)';
COMMENT ON COLUMN activities.flow_type IS 'Flow type for the activity (IATI flow type codes)';

-- Common IATI aid type codes:
-- A01: General budget support
-- A02: Sector budget support
-- B01: Core support to NGOs, other private bodies, PPPs
-- B02: Core contributions to multilateral institutions
-- C01: Project-type interventions
-- D01: Donor country personnel
-- D02: Other technical assistance
-- E01: Scholarships/training in donor country
-- F01: Debt relief
-- G01: Administrative costs

-- Common IATI flow type codes:
-- 10: ODA (Official Development Assistance)
-- 20: OOF (Other Official Flows)
-- 30: Private grants
-- 35: Private market
-- 40: Non flow
-- 50: Other flows 