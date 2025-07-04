-- Migration: Add missing default IATI fields to activities table
-- Run this in Supabase SQL editor or via migration

-- Check if columns exist before adding them
DO $$
BEGIN
    -- Add default_aid_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'default_aid_type'
    ) THEN
        ALTER TABLE activities ADD COLUMN default_aid_type VARCHAR(10) NULL;
        RAISE NOTICE 'Added default_aid_type column';
    ELSE
        RAISE NOTICE 'default_aid_type column already exists';
    END IF;

    -- Add default_finance_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'default_finance_type'
    ) THEN
        ALTER TABLE activities ADD COLUMN default_finance_type VARCHAR(10) NULL;
        RAISE NOTICE 'Added default_finance_type column';
    ELSE
        RAISE NOTICE 'default_finance_type column already exists';
    END IF;

    -- Add default_flow_type if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'default_flow_type'
    ) THEN
        ALTER TABLE activities ADD COLUMN default_flow_type VARCHAR(10) NULL;
        RAISE NOTICE 'Added default_flow_type column';
    ELSE
        RAISE NOTICE 'default_flow_type column already exists';
    END IF;

    -- Check default_currency exists (should already exist)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'default_currency'
    ) THEN
        ALTER TABLE activities ADD COLUMN default_currency VARCHAR(3) NULL;
        RAISE NOTICE 'Added default_currency column';
    ELSE
        RAISE NOTICE 'default_currency column already exists';
    END IF;

    -- Check default_tied_status exists (should already exist)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'default_tied_status'
    ) THEN
        ALTER TABLE activities ADD COLUMN default_tied_status VARCHAR(1) NULL;
        RAISE NOTICE 'Added default_tied_status column';
    ELSE
        RAISE NOTICE 'default_tied_status column already exists';
    END IF;
END $$;