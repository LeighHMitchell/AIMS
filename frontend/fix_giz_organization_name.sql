-- Fix GIZ organization name to remove acronym from name field
-- The acronym should be stored separately in the acronym field
-- Also ensure the acronym field is properly populated

-- First, let's see the current state
SELECT 
    id, 
    name, 
    acronym, 
    code,
    created_at,
    updated_at
FROM organizations 
WHERE code = 'XM-DAC-41126' 
   OR name ILIKE '%Deutsche Gesellschaft für Internationale Zusammenarbeit%'
   OR acronym = 'GIZ';

-- Update GIZ organization to fix the name and ensure acronym is set
UPDATE organizations 
SET 
    name = 'Deutsche Gesellschaft für Internationale Zusammenarbeit',
    acronym = 'GIZ',
    updated_at = NOW()
WHERE 
    code = 'XM-DAC-41126' 
    OR name ILIKE '%Deutsche Gesellschaft für Internationale Zusammenarbeit%'
    OR (acronym = 'GIZ' AND name ILIKE '%Deutsche%');

-- Verify the update
SELECT 
    id, 
    name, 
    acronym, 
    code,
    is_development_partner,
    cooperation_modality,
    updated_at
FROM organizations 
WHERE code = 'XM-DAC-41126' 
   OR name ILIKE '%Deutsche Gesellschaft für Internationale Zusammenarbeit%'
   OR acronym = 'GIZ';