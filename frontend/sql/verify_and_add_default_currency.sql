-- Verify and Add default_currency to organizations table
-- This script checks if the column exists and adds it if missing

-- Check if the column exists
DO $$ 
BEGIN
    -- Check if default_currency column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'default_currency'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE organizations ADD COLUMN default_currency TEXT DEFAULT 'USD';
        RAISE NOTICE 'Added default_currency column to organizations table';
    ELSE
        RAISE NOTICE 'default_currency column already exists in organizations table';
    END IF;

    -- Check if default_language column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'default_language'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE organizations ADD COLUMN default_language TEXT DEFAULT 'en';
        RAISE NOTICE 'Added default_language column to organizations table';
    ELSE
        RAISE NOTICE 'default_language column already exists in organizations table';
    END IF;

    -- Check if reporting_org_ref column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'reporting_org_ref'
    ) THEN
        ALTER TABLE organizations ADD COLUMN reporting_org_ref TEXT;
        RAISE NOTICE 'Added reporting_org_ref column to organizations table';
    ELSE
        RAISE NOTICE 'reporting_org_ref column already exists in organizations table';
    END IF;

    -- Check if reporting_org_type column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'reporting_org_type'
    ) THEN
        ALTER TABLE organizations ADD COLUMN reporting_org_type TEXT;
        RAISE NOTICE 'Added reporting_org_type column to organizations table';
    ELSE
        RAISE NOTICE 'reporting_org_type column already exists in organizations table';
    END IF;

    -- Check if reporting_org_name column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'reporting_org_name'
    ) THEN
        ALTER TABLE organizations ADD COLUMN reporting_org_name TEXT;
        RAISE NOTICE 'Added reporting_org_name column to organizations table';
    ELSE
        RAISE NOTICE 'reporting_org_name column already exists in organizations table';
    END IF;

    -- Check if reporting_org_secondary_reporter column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'reporting_org_secondary_reporter'
    ) THEN
        ALTER TABLE organizations ADD COLUMN reporting_org_secondary_reporter BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added reporting_org_secondary_reporter column to organizations table';
    ELSE
        RAISE NOTICE 'reporting_org_secondary_reporter column already exists in organizations table';
    END IF;

    -- Check if last_updated_datetime column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'last_updated_datetime'
    ) THEN
        ALTER TABLE organizations ADD COLUMN last_updated_datetime TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added last_updated_datetime column to organizations table';
    ELSE
        RAISE NOTICE 'last_updated_datetime column already exists in organizations table';
    END IF;
END $$;

-- Add comments for the IATI fields
COMMENT ON COLUMN organizations.reporting_org_ref IS 'IATI reporting organization reference identifier';
COMMENT ON COLUMN organizations.reporting_org_type IS 'IATI organization type code for reporting org';
COMMENT ON COLUMN organizations.reporting_org_name IS 'Name of the reporting organization';
COMMENT ON COLUMN organizations.reporting_org_secondary_reporter IS 'Whether this is a secondary reporter';
COMMENT ON COLUMN organizations.last_updated_datetime IS 'IATI last-updated-datetime attribute';
COMMENT ON COLUMN organizations.default_currency IS 'IATI default currency code';
COMMENT ON COLUMN organizations.default_language IS 'IATI default language code';

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name IN (
    'default_currency', 
    'default_language',
    'reporting_org_ref',
    'reporting_org_type',
    'reporting_org_name',
    'reporting_org_secondary_reporter',
    'last_updated_datetime'
)
ORDER BY column_name;

-- Show a sample of current data
SELECT 
    id,
    name,
    default_currency,
    default_language
FROM organizations 
LIMIT 5;










