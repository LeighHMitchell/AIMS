-- COMPREHENSIVE TAGS TABLE FIX
-- This script will diagnose and fix all issues with the tags table

-- STEP 1: Check current tags table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tags' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: Check if tags table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tags'
);

-- STEP 3: Fix the code column if it exists and is NOT NULL
DO $$ 
BEGIN
    -- Check if code column exists and is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' 
        AND column_name = 'code'
        AND table_schema = 'public'
        AND is_nullable = 'NO'
    ) THEN
        -- Make code column nullable or add a default value
        ALTER TABLE public.tags 
        ALTER COLUMN code DROP NOT NULL;
        
        -- Set a default value for existing records that might have NULL codes
        UPDATE public.tags 
        SET code = LOWER(REPLACE(REPLACE(name, ' ', '-'), '_', '-'))
        WHERE code IS NULL;
        
        RAISE NOTICE 'Fixed code column - made nullable and set default values';
    END IF;
END $$;

-- STEP 4: Add missing created_by column if needed
DO $$ 
BEGIN
    -- Check if created_by column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' 
        AND column_name = 'created_by'
        AND table_schema = 'public'
    ) THEN
        -- Add the missing column
        ALTER TABLE public.tags 
        ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_tags_created_by ON public.tags(created_by);
        
        RAISE NOTICE 'Added created_by column to tags table';
    ELSE
        RAISE NOTICE 'created_by column already exists';
    END IF;
END $$;

-- STEP 5: Ensure other required columns exist
DO $$ 
BEGIN
    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' 
        AND column_name = 'created_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tags 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE 'Added created_at column';
    END IF;
    
    -- Add updated_at if missing  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tags 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE 'Added updated_at column';
    END IF;
END $$;

-- STEP 6: Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_code ON public.tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_created_by ON public.tags(created_by);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);

-- STEP 7: Set up Row Level Security
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;

-- Create RLS policies
CREATE POLICY "Tags are viewable by everyone" 
    ON public.tags FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can create tags" 
    ON public.tags FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own tags" 
    ON public.tags FOR UPDATE 
    USING (created_by = auth.uid() OR created_by IS NULL);

-- STEP 8: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- STEP 9: Final verification - show the fixed table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tags' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 10: Show any existing tags
SELECT COUNT(*) as existing_tag_count FROM public.tags; 