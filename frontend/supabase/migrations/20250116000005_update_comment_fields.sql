-- Migration: Update Comment Fields for Multilingual Support
-- Description: Convert baseline and period comment fields to JSONB for multilingual narratives

-- Convert baseline comment to JSONB for multilingual support (only if it's TEXT type)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'indicator_baselines' 
        AND column_name = 'comment' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE indicator_baselines 
            ALTER COLUMN comment TYPE JSONB USING 
            CASE 
                WHEN comment IS NULL THEN NULL
                WHEN comment = '' THEN NULL
                ELSE jsonb_build_object('en', comment)
            END;
    END IF;
END $$;

-- Handle period comments - check what exists and update accordingly
DO $$ 
BEGIN
    -- If target_comment exists as TEXT, convert to JSONB
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'indicator_periods' 
        AND column_name = 'target_comment' 
        AND data_type = 'text'
    ) THEN
        -- Rename old column
        ALTER TABLE indicator_periods RENAME COLUMN target_comment TO target_comment_old;
        
        -- Add new JSONB column
        ALTER TABLE indicator_periods ADD COLUMN target_comment JSONB;
        
        -- Migrate data
        UPDATE indicator_periods 
        SET target_comment = jsonb_build_object('en', target_comment_old)
        WHERE target_comment_old IS NOT NULL AND target_comment_old != '';
        
        -- Drop old column
        ALTER TABLE indicator_periods DROP COLUMN target_comment_old;
    END IF;
    
    -- Add actual_comment if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'indicator_periods' 
        AND column_name = 'actual_comment'
    ) THEN
        ALTER TABLE indicator_periods ADD COLUMN actual_comment JSONB;
    END IF;
END $$;

-- Add comments to columns
COMMENT ON COLUMN indicator_baselines.comment IS 'Multilingual narrative for baseline explanation (JSONB format: {"en": "text", "fr": "texte"})';
COMMENT ON COLUMN indicator_periods.target_comment IS 'Multilingual narrative for target explanation (JSONB format: {"en": "text", "fr": "texte"})';
COMMENT ON COLUMN indicator_periods.actual_comment IS 'Multilingual narrative for actual value explanation (JSONB format: {"en": "text", "fr": "texte"})';

