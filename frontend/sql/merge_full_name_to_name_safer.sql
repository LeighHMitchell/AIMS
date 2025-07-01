-- Safest Migration: Merge full_name into name field
-- This version carefully avoids any duplicate column issues

-- Step 1: Check current state
DO $$
DECLARE
    has_full_name_col BOOLEAN;
    has_name_col BOOLEAN;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'full_name'
        AND table_schema = 'public'
    ) INTO has_full_name_col;
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'name'
        AND table_schema = 'public'
    ) INTO has_name_col;
    
    -- Report status
    RAISE NOTICE 'Organizations table - has name column: %, has full_name column: %', has_name_col, has_full_name_col;
    
    -- Only proceed if both columns exist
    IF has_name_col AND has_full_name_col THEN
        RAISE NOTICE 'Both columns exist, proceeding with migration...';
    ELSIF NOT has_full_name_col THEN
        RAISE NOTICE 'No full_name column found - migration may already be complete!';
        RETURN;
    ELSIF NOT has_name_col THEN
        RAISE EXCEPTION 'No name column found - this is unexpected!';
    END IF;
END $$;

-- Step 2: Do the actual migration
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Only update if full_name column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'full_name'
        AND table_schema = 'public'
    ) THEN
        -- Update organizations where name is empty but full_name has a value
        UPDATE organizations
        SET name = full_name
        WHERE (name IS NULL OR name = '') 
        AND full_name IS NOT NULL 
        AND full_name != '';
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % organizations with full_name -> name', updated_count;
        
        -- Also ensure no completely empty names
        UPDATE organizations
        SET name = 'Unknown Organization'
        WHERE name IS NULL OR name = '';
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % organizations with default name', updated_count;
    END IF;
END $$;

-- Step 3: Show sample results (without causing duplicate column issues)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'full_name'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Migration complete. To verify results, run: SELECT id, name FROM organizations LIMIT 10;';
        RAISE NOTICE 'To drop the full_name column, run: drop_full_name_column.sql';
    ELSE
        RAISE NOTICE 'No full_name column found - migration appears to be already complete.';
    END IF;
END $$; 