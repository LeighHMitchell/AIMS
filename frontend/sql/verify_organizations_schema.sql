-- Verify Organizations Table Schema
-- This script checks that all required columns exist for IATI import organization handling
-- Run this in your Supabase SQL Editor

DO $$
DECLARE
    v_columns TEXT;
    v_missing_columns TEXT[] := '{}';
    v_column_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== Verifying Organizations Table Schema ===';
    RAISE NOTICE '';
    
    -- Get all columns in organizations table
    SELECT string_agg(column_name || ' (' || data_type || ')', ', ')
    INTO v_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations';
    
    RAISE NOTICE 'Current columns in organizations table:';
    RAISE NOTICE '%', v_columns;
    RAISE NOTICE '';
    
    -- Check for required columns
    RAISE NOTICE '=== Checking Required Columns ===';
    
    -- Check id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'id'
    ) INTO v_column_exists;
    IF v_column_exists THEN
        RAISE NOTICE '✓ id column exists';
    ELSE
        RAISE NOTICE '✗ id column MISSING';
        v_missing_columns := array_append(v_missing_columns, 'id');
    END IF;
    
    -- Check name
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'name'
    ) INTO v_column_exists;
    IF v_column_exists THEN
        RAISE NOTICE '✓ name column exists';
    ELSE
        RAISE NOTICE '✗ name column MISSING';
        v_missing_columns := array_append(v_missing_columns, 'name');
    END IF;
    
    -- Check iati_org_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'iati_org_id'
    ) INTO v_column_exists;
    IF v_column_exists THEN
        RAISE NOTICE '✓ iati_org_id column exists';
    ELSE
        RAISE NOTICE '✗ iati_org_id column MISSING';
        v_missing_columns := array_append(v_missing_columns, 'iati_org_id');
    END IF;
    
    -- Check type
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'type'
    ) INTO v_column_exists;
    IF v_column_exists THEN
        RAISE NOTICE '✓ type column exists';
    ELSE
        RAISE NOTICE '✗ type column MISSING (optional - Organisation_Type_Code may be used instead)';
    END IF;
    
    -- Check Organisation_Type_Code
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'Organisation_Type_Code'
    ) INTO v_column_exists;
    IF v_column_exists THEN
        RAISE NOTICE '✓ Organisation_Type_Code column exists';
    ELSE
        RAISE NOTICE '✗ Organisation_Type_Code column MISSING (optional - type may be used instead)';
    END IF;
    
    -- Check country
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'country'
    ) INTO v_column_exists;
    IF v_column_exists THEN
        RAISE NOTICE '✓ country column exists';
    ELSE
        RAISE NOTICE '✗ country column MISSING';
        v_missing_columns := array_append(v_missing_columns, 'country');
    END IF;
    
    -- Check alias_refs
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'alias_refs'
    ) INTO v_column_exists;
    IF v_column_exists THEN
        RAISE NOTICE '✓ alias_refs column exists';
    ELSE
        RAISE NOTICE '✗ alias_refs column MISSING';
        v_missing_columns := array_append(v_missing_columns, 'alias_refs');
    END IF;
    
    -- Check created_at
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'created_at'
    ) INTO v_column_exists;
    IF v_column_exists THEN
        RAISE NOTICE '✓ created_at column exists';
    ELSE
        RAISE NOTICE '✗ created_at column MISSING';
        v_missing_columns := array_append(v_missing_columns, 'created_at');
    END IF;
    
    -- Check updated_at
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'updated_at'
    ) INTO v_column_exists;
    IF v_column_exists THEN
        RAISE NOTICE '✓ updated_at column exists';
    ELSE
        RAISE NOTICE '✗ updated_at column MISSING';
        v_missing_columns := array_append(v_missing_columns, 'updated_at');
    END IF;
    
    RAISE NOTICE '';
    
    -- Summary
    IF array_length(v_missing_columns, 1) > 0 THEN
        RAISE NOTICE '=== MISSING COLUMNS DETECTED ===';
        RAISE NOTICE 'The following columns are missing: %', array_to_string(v_missing_columns, ', ');
        RAISE NOTICE '';
        RAISE NOTICE '=== RUN THESE ALTER TABLE STATEMENTS ===';
        
        IF 'iati_org_id' = ANY(v_missing_columns) THEN
            RAISE NOTICE 'ALTER TABLE organizations ADD COLUMN IF NOT EXISTS iati_org_id TEXT;';
        END IF;
        
        IF 'type' = ANY(v_missing_columns) THEN
            RAISE NOTICE 'ALTER TABLE organizations ADD COLUMN IF NOT EXISTS type TEXT;';
        END IF;
        
        IF 'country' = ANY(v_missing_columns) THEN
            RAISE NOTICE 'ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country TEXT;';
        END IF;
        
        IF 'alias_refs' = ANY(v_missing_columns) THEN
            RAISE NOTICE 'ALTER TABLE organizations ADD COLUMN IF NOT EXISTS alias_refs TEXT[];';
        END IF;
        
        IF 'created_at' = ANY(v_missing_columns) THEN
            RAISE NOTICE 'ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();';
        END IF;
        
        IF 'updated_at' = ANY(v_missing_columns) THEN
            RAISE NOTICE 'ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();';
        END IF;
    ELSE
        RAISE NOTICE '=== ✓ ALL REQUIRED COLUMNS EXIST ===';
        RAISE NOTICE 'The organizations table has all required columns for IATI import.';
    END IF;
    
END $$;


