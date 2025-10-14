-- Note: This migration was originally intended to add linked_contact_id for user_contact table
-- However, the user_contact table does not exist in this database schema
-- The system already has linked_user_id (FK to users table) which serves the same purpose
-- This migration is kept for documentation but performs no actions

-- The activity_contacts table already has all necessary fields:
-- - linked_user_id (UUID FK to users.id) - for linking to system users
-- - is_focal_point (BOOLEAN) - for focal point designation
-- - has_editing_rights (BOOLEAN) - for editing permissions
-- All IATI fields are present: job_title, department, website, mailing_address

-- Verification: Confirm all required columns exist
DO $$ 
BEGIN
    RAISE NOTICE 'Verifying activity_contacts schema...';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'linked_user_id'
    ) THEN
        RAISE NOTICE '✓ linked_user_id column exists';
    ELSE
        RAISE WARNING '✗ linked_user_id column missing';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'is_focal_point'
    ) THEN
        RAISE NOTICE '✓ is_focal_point column exists';
    ELSE
        RAISE WARNING '✗ is_focal_point column missing';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activity_contacts' 
        AND column_name = 'has_editing_rights'
    ) THEN
        RAISE NOTICE '✓ has_editing_rights column exists';
    ELSE
        RAISE WARNING '✗ has_editing_rights column missing';
    END IF;
END $$;