-- Add vocabulary_uri column to tags table for full IATI compliance
-- This allows storing the vocabulary-uri attribute from IATI XML tag elements

-- Add vocabulary_uri column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' AND column_name = 'vocabulary_uri'
    ) THEN
        ALTER TABLE tags ADD COLUMN vocabulary_uri TEXT;
    END IF;
END $$;

-- Ensure vocabulary column exists (should be from earlier migration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' AND column_name = 'vocabulary'
    ) THEN
        ALTER TABLE tags ADD COLUMN vocabulary TEXT DEFAULT '99';
    END IF;
END $$;

-- Ensure code column exists (should be from earlier migration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' AND column_name = 'code'
    ) THEN
        ALTER TABLE tags ADD COLUMN code TEXT;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tags_vocabulary_uri ON tags(vocabulary_uri);
CREATE INDEX IF NOT EXISTS idx_tags_code ON tags(code);
CREATE INDEX IF NOT EXISTS idx_tags_vocabulary ON tags(vocabulary);

-- Add index for tagged_by if column exists in activity_tags
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_tags' AND column_name = 'tagged_by'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_activity_tags_tagged_by ON activity_tags(tagged_by);
    END IF;
END $$;

-- Add composite unique constraint for name + vocabulary to prevent duplicates
-- This constraint allows same tag name with different vocabularies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tags_name_vocabulary_unique'
    ) THEN
        -- First, remove any duplicate entries
        DELETE FROM tags a USING tags b 
        WHERE a.id > b.id 
        AND a.name = b.name 
        AND COALESCE(a.vocabulary, '99') = COALESCE(b.vocabulary, '99');
        
        -- Then add the constraint
        ALTER TABLE tags ADD CONSTRAINT tags_name_vocabulary_unique 
        UNIQUE (name, vocabulary);
    END IF;
END $$;

-- Add check constraint for valid vocabulary values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tags_vocabulary_check'
    ) THEN
        ALTER TABLE tags ADD CONSTRAINT tags_vocabulary_check 
        CHECK (vocabulary IN ('1', '2', '3', '98', '99') OR vocabulary IS NULL);
    END IF;
END $$;

-- Add length constraints for data integrity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tags_name_length'
    ) THEN
        ALTER TABLE tags ADD CONSTRAINT tags_name_length 
        CHECK (length(name) > 0 AND length(name) <= 255);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tags_code_length'
    ) THEN
        ALTER TABLE tags ADD CONSTRAINT tags_code_length 
        CHECK (code IS NULL OR (length(code) > 0 AND length(code) <= 100));
    END IF;
END $$;

-- Add comments to document the fields
COMMENT ON COLUMN tags.vocabulary IS 'IATI vocabulary code: 1 = IATI standard, 99 = custom/reporting organization. Valid values: 1, 2, 3, 98, 99';
COMMENT ON COLUMN tags.vocabulary_uri IS 'URI for custom vocabulary definitions (typically used with vocabulary=99)';
COMMENT ON COLUMN tags.code IS 'Tag code from IATI XML or auto-generated from name. Must be alphanumeric (a-z, A-Z, 0-9) with hyphens only.';
COMMENT ON CONSTRAINT tags_name_vocabulary_unique ON tags IS 'Ensures unique combination of tag name and vocabulary';

