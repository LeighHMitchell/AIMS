-- Drop legacy organization columns that have been replaced
-- This script removes short_name (replaced by acronym) and identifier (replaced by iati_org_id)

-- Step 1: Drop both columns in one command
ALTER TABLE organizations 
DROP COLUMN short_name CASCADE,
DROP COLUMN identifier CASCADE;

-- Step 2: Verify the columns are gone and show current structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
AND table_schema = 'public'
AND column_name IN ('name', 'acronym', 'iati_org_id', 'short_name', 'identifier')
ORDER BY ordinal_position;

-- Step 3: Show message about what columns should be used instead
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'The following columns should now be used:';
    RAISE NOTICE '- acronym (instead of short_name)';
    RAISE NOTICE '- iati_org_id (instead of identifier)';
    RAISE NOTICE '';
END $$; ra