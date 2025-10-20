-- Add social media columns to organizations table
-- Date: 2025-10-20
-- Description: Add social media handle/URL columns for organization profiles

DO $$
BEGIN
    -- Add Twitter/X handle or URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'social_twitter'
    ) THEN
        ALTER TABLE organizations ADD COLUMN social_twitter TEXT;
        COMMENT ON COLUMN organizations.social_twitter IS 'Twitter/X handle or URL';
    END IF;

    -- Add Facebook URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'social_facebook'
    ) THEN
        ALTER TABLE organizations ADD COLUMN social_facebook TEXT;
        COMMENT ON COLUMN organizations.social_facebook IS 'Facebook page URL';
    END IF;

    -- Add LinkedIn URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'social_linkedin'
    ) THEN
        ALTER TABLE organizations ADD COLUMN social_linkedin TEXT;
        COMMENT ON COLUMN organizations.social_linkedin IS 'LinkedIn company page URL';
    END IF;

    -- Add Instagram handle or URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'social_instagram'
    ) THEN
        ALTER TABLE organizations ADD COLUMN social_instagram TEXT;
        COMMENT ON COLUMN organizations.social_instagram IS 'Instagram handle or URL';
    END IF;

    -- Add YouTube channel URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'social_youtube'
    ) THEN
        ALTER TABLE organizations ADD COLUMN social_youtube TEXT;
        COMMENT ON COLUMN organizations.social_youtube IS 'YouTube channel URL';
    END IF;
END $$;

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name IN ('social_twitter', 'social_facebook', 'social_linkedin', 'social_instagram', 'social_youtube')
ORDER BY column_name;

