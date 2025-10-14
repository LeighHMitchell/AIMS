-- ========================================
-- Check and Fix Tag Constraints
-- ========================================

-- === STEP 1: Check Current Constraints ===
SELECT 
    'Current Constraints on Tags Table' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.tags'::regclass
ORDER BY conname;

-- === STEP 2: Identify the Problem ===
-- If you see: UNIQUE (name) ← This is the problem!
-- We need: UNIQUE (name, vocabulary) instead

-- === STEP 3: Fix the Constraint ===

-- Drop the old UNIQUE constraint on just name (if it exists)
DO $$
BEGIN
    -- Check for UNIQUE constraint on name only
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.tags'::regclass 
        AND contype = 'u'
        AND pg_get_constraintdef(oid) = 'UNIQUE (name)'
    ) THEN
        RAISE NOTICE 'Found UNIQUE constraint on name only - dropping it';
        ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;
        RAISE NOTICE 'Dropped old constraint';
    END IF;
END $$;

-- Add the correct composite UNIQUE constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tags_name_vocabulary_unique'
    ) THEN
        RAISE NOTICE 'Adding composite UNIQUE constraint on (name, vocabulary)';
        ALTER TABLE tags ADD CONSTRAINT tags_name_vocabulary_unique 
        UNIQUE (name, vocabulary);
        RAISE NOTICE 'Constraint added successfully';
    ELSE
        RAISE NOTICE 'Composite constraint already exists';
    END IF;
END $$;

-- === STEP 4: Verify the Fix ===
SELECT 
    'Constraints After Fix' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.tags'::regclass
AND contype = 'u'  -- Only show UNIQUE constraints
ORDER BY conname;

-- === STEP 5: Test Tag Creation ===
-- Try creating two tags with same name but different vocabulary
BEGIN;

-- Create tag 1
INSERT INTO tags (name, vocabulary, code)
VALUES ('test same name', '1', 'TEST-1');

-- Create tag 2 (same name, different vocabulary - should work now!)
INSERT INTO tags (name, vocabulary, code)
VALUES ('test same name', '99', 'TEST-2');

SELECT 'Test Tags Created' as info, name, vocabulary, code 
FROM tags 
WHERE name = 'test same name';

-- Clean up
ROLLBACK;

-- === SUMMARY ===
SELECT 'Fix Applied Successfully' as status;

