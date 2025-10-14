-- Add imported_from_iati column to activity_contacts table
-- This column tracks whether a contact was imported from IATI XML

ALTER TABLE activity_contacts 
ADD COLUMN IF NOT EXISTS imported_from_iati BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN activity_contacts.imported_from_iati IS 'Indicates if this contact was imported from IATI XML data';

-- Update existing contacts that might have been imported from IATI
-- (This is a best-effort update - we can't be 100% certain without additional tracking)
-- Contacts with specific patterns that suggest IATI import:
UPDATE activity_contacts 
SET imported_from_iati = TRUE 
WHERE 
  -- Contacts with organization names that are typically from IATI
  (organisation_name ILIKE '%UNDP%' OR 
   organisation_name ILIKE '%World Bank%' OR 
   organisation_name ILIKE '%Asian Development Bank%' OR
   organisation_name ILIKE '%European Union%' OR
   organisation_name ILIKE '%UNICEF%' OR
   organisation_name ILIKE '%UNHCR%' OR
   organisation_name ILIKE '%WHO%' OR
   organisation_name ILIKE '%Agency%' OR
   organisation_name ILIKE '%Ministry%' OR
   organisation_name ILIKE '%Department%')
  AND imported_from_iati IS NULL;

-- Set default value for any remaining NULL values
UPDATE activity_contacts 
SET imported_from_iati = FALSE 
WHERE imported_from_iati IS NULL;
