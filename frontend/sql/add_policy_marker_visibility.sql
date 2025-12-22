-- Migration: Add visibility controls to policy markers
-- This adds default_visibility to policy_markers and visibility override to activity_policy_markers

-- Step 1: Add default_visibility column to policy_markers table
-- This stores the default visibility setting for custom markers (public, organization, hidden)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'policy_markers' 
        AND column_name = 'default_visibility'
    ) THEN
        ALTER TABLE policy_markers 
        ADD COLUMN default_visibility TEXT DEFAULT 'public' 
        CHECK (default_visibility IN ('public', 'organization', 'hidden'));
        
        -- Set all existing custom markers to 'public' (IATI standard markers don't need this)
        UPDATE policy_markers 
        SET default_visibility = 'public' 
        WHERE is_iati_standard = false OR is_iati_standard IS NULL;
        
        RAISE NOTICE 'Added default_visibility column to policy_markers table';
    ELSE
        RAISE NOTICE 'Column default_visibility already exists in policy_markers table';
    END IF;
END $$;

-- Step 2: Add visibility column to activity_policy_markers table
-- This allows per-activity override of the default visibility
-- NULL means inherit from policy_markers.default_visibility
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_policy_markers' 
        AND column_name = 'visibility'
    ) THEN
        ALTER TABLE activity_policy_markers 
        ADD COLUMN visibility TEXT 
        CHECK (visibility IN ('public', 'organization', 'hidden'));
        
        -- All existing activity_policy_markers get NULL (inherit default)
        -- No update needed as NULL is the default
        
        RAISE NOTICE 'Added visibility column to activity_policy_markers table';
    ELSE
        RAISE NOTICE 'Column visibility already exists in activity_policy_markers table';
    END IF;
END $$;

-- Step 3: Create index on visibility for efficient filtering
CREATE INDEX IF NOT EXISTS idx_activity_policy_markers_visibility 
ON activity_policy_markers(visibility);

-- Step 4: Create index on default_visibility for efficient filtering
CREATE INDEX IF NOT EXISTS idx_policy_markers_default_visibility 
ON policy_markers(default_visibility);
