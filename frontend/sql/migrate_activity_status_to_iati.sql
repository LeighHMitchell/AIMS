-- Migration: Convert activity statuses to IATI-compliant values
-- Valid IATI Activity Status Codes:
-- 1 = Pipeline (planning/scoping)
-- 2 = Implementation (active/ongoing)
-- 3 = Finalisation (pending final sign-off)
-- 4 = Closed (completed)
-- 5 = Cancelled
-- 6 = Suspended

-- Create a backup table before migration
CREATE TABLE IF NOT EXISTS activities_status_backup AS
SELECT id, activity_status, updated_at
FROM activities;

-- Log current status distribution
DO $$
DECLARE
    status_count RECORD;
BEGIN
    RAISE NOTICE 'Current activity status distribution:';
    FOR status_count IN 
        SELECT activity_status, COUNT(*) as count
        FROM activities
        GROUP BY activity_status
        ORDER BY activity_status
    LOOP
        RAISE NOTICE 'Status: %, Count: %', COALESCE(status_count.activity_status, 'NULL'), status_count.count;
    END LOOP;
END $$;

-- Update non-compliant statuses to IATI codes
UPDATE activities
SET 
    activity_status = CASE
        -- Map text statuses to IATI codes
        WHEN LOWER(activity_status) = 'planning' THEN '1'
        WHEN LOWER(activity_status) = 'pipeline' THEN '1'
        WHEN LOWER(activity_status) = 'planned' THEN '1'
        
        WHEN LOWER(activity_status) = 'active' THEN '2'
        WHEN LOWER(activity_status) = 'ongoing' THEN '2'
        WHEN LOWER(activity_status) = 'in progress' THEN '2'
        WHEN LOWER(activity_status) = 'implementation' THEN '2'
        WHEN LOWER(activity_status) = 'implementing' THEN '2'
        
        WHEN LOWER(activity_status) = 'finalisation' THEN '3'
        WHEN LOWER(activity_status) = 'finalizing' THEN '3'
        WHEN LOWER(activity_status) = 'finalized' THEN '3'
        
        WHEN LOWER(activity_status) = 'completed' THEN '4'
        WHEN LOWER(activity_status) = 'finished' THEN '4'
        WHEN LOWER(activity_status) = 'done' THEN '4'
        WHEN LOWER(activity_status) = 'closed' THEN '4'
        WHEN LOWER(activity_status) = 'complete' THEN '4'
        
        WHEN LOWER(activity_status) = 'cancelled' THEN '5'
        WHEN LOWER(activity_status) = 'canceled' THEN '5'
        WHEN LOWER(activity_status) = 'terminated' THEN '5'
        
        WHEN LOWER(activity_status) = 'suspended' THEN '6'
        WHEN LOWER(activity_status) = 'paused' THEN '6'
        WHEN LOWER(activity_status) = 'on hold' THEN '6'
        
        -- Keep valid IATI codes as-is
        WHEN activity_status IN ('1', '2', '3', '4', '5', '6') THEN activity_status
        
        -- Default unknown statuses to implementation
        ELSE '2'
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE activity_status IS NULL 
   OR activity_status NOT IN ('1', '2', '3', '4', '5', '6');

-- Log migration results
DO $$
DECLARE
    total_records INTEGER;
    records_updated INTEGER;
    status_change RECORD;
BEGIN
    SELECT COUNT(*) INTO total_records FROM activities;
    
    SELECT COUNT(*) INTO records_updated 
    FROM activities a
    JOIN activities_status_backup b ON a.id = b.id
    WHERE a.activity_status != COALESCE(b.activity_status, '');
    
    RAISE NOTICE '';
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE 'Total records checked: %', total_records;
    RAISE NOTICE 'Records updated: %', records_updated;
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    
    FOR status_change IN 
        SELECT 
            b.activity_status as old_status,
            a.activity_status as new_status,
            COUNT(*) as count
        FROM activities a
        JOIN activities_status_backup b ON a.id = b.id
        WHERE a.activity_status != COALESCE(b.activity_status, '')
        GROUP BY b.activity_status, a.activity_status
        ORDER BY b.activity_status
    LOOP
        RAISE NOTICE '  % -> % (%  records)', 
            COALESCE(status_change.old_status, 'NULL'), 
            status_change.new_status, 
            status_change.count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'New status distribution:';
    FOR status_change IN 
        SELECT activity_status, COUNT(*) as count
        FROM activities
        GROUP BY activity_status
        ORDER BY activity_status
    LOOP
        RAISE NOTICE 'Status: %, Count: %', status_change.activity_status, status_change.count;
    END LOOP;
END $$;

-- Add a CHECK constraint to ensure only valid IATI codes are used
ALTER TABLE activities
DROP CONSTRAINT IF EXISTS valid_iati_activity_status;

ALTER TABLE activities
ADD CONSTRAINT valid_iati_activity_status 
CHECK (activity_status IN ('1', '2', '3', '4', '5', '6') OR activity_status IS NULL);

-- Create an enum type for better type safety (optional)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'iati_activity_status') THEN
        CREATE TYPE iati_activity_status AS ENUM ('1', '2', '3', '4', '5', '6');
    END IF;
END $$;

-- Add a comment explaining the status codes
COMMENT ON COLUMN activities.activity_status IS 
'IATI Activity Status codes: 1=Pipeline, 2=Implementation, 3=Finalisation, 4=Closed, 5=Cancelled, 6=Suspended';

-- Create a view for easy status lookup
CREATE OR REPLACE VIEW activity_status_lookup AS
SELECT * FROM (VALUES
    ('1', 'Pipeline', 'The activity is being scoped or planned'),
    ('2', 'Implementation', 'The activity is currently being implemented'),
    ('3', 'Finalisation', 'Implementation is over, pending final sign-off or M&E'),
    ('4', 'Closed', 'Activity and finances are complete'),
    ('5', 'Cancelled', 'The activity has been cancelled'),
    ('6', 'Suspended', 'The activity has been temporarily suspended')
) AS t (code, name, description);

-- Optional: Drop the backup table after verification
-- DROP TABLE activities_status_backup; 