-- Fix PostgreSQL Enum Comparison Errors
-- This script fixes the validate_transaction_values() function that's causing
-- "operator does not exist: text = transaction_type_enum" errors

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS validate_transaction_values_trigger ON transactions;

-- Create an improved validation function that properly casts enum values to text
CREATE OR REPLACE FUNCTION validate_transaction_values()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate transaction_type (cast enum to text for comparison)
    IF NEW.transaction_type IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM iati_reference_values 
            WHERE field_name = 'transaction_type' 
            AND code = NEW.transaction_type::TEXT
        ) THEN
            RAISE EXCEPTION 'Invalid transaction_type: %. Valid values are: %', 
                NEW.transaction_type::TEXT, 
                (SELECT string_agg(code || ' (' || name || ')', ', ') 
                 FROM iati_reference_values 
                 WHERE field_name = 'transaction_type');
        END IF;
    END IF;

    -- Validate aid_type (cast enum to text)
    IF NEW.aid_type IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM iati_reference_values 
            WHERE field_name = 'aid_type' 
            AND code = NEW.aid_type::TEXT
        ) THEN
            RAISE EXCEPTION 'Invalid aid_type: %. Valid values include: A01, A02, B01, B02, B03, B04, C01, D01, D02, E01, E02, F01, G01, H01, H02', 
                NEW.aid_type::TEXT;
        END IF;
    END IF;

    -- Validate flow_type (cast enum to text)
    IF NEW.flow_type IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM iati_reference_values 
            WHERE field_name = 'flow_type' 
            AND code = NEW.flow_type::TEXT
        ) THEN
            RAISE EXCEPTION 'Invalid flow_type: %. Valid values are: %', 
                NEW.flow_type::TEXT,
                (SELECT string_agg(code || ' (' || name || ')', ', ') 
                 FROM iati_reference_values 
                 WHERE field_name = 'flow_type');
        END IF;
    END IF;

    -- Validate finance_type (cast enum to text)
    IF NEW.finance_type IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM iati_reference_values 
            WHERE field_name = 'finance_type' 
            AND code = NEW.finance_type::TEXT
        ) THEN
            RAISE EXCEPTION 'Invalid finance_type: %. Common values include: 100 (Grant), 110 (Standard grant), 400 (Loan), 410 (Aid loan)', 
                NEW.finance_type::TEXT;
        END IF;
    END IF;

    -- Validate disbursement_channel (cast enum to text)
    IF NEW.disbursement_channel IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM iati_reference_values 
            WHERE field_name = 'disbursement_channel' 
            AND code = NEW.disbursement_channel::TEXT
        ) THEN
            RAISE EXCEPTION 'Invalid disbursement_channel: %. Valid values are: %', 
                NEW.disbursement_channel::TEXT,
                (SELECT string_agg(code || ' (' || name || ')', ', ') 
                 FROM iati_reference_values 
                 WHERE field_name = 'disbursement_channel');
        END IF;
    END IF;

    -- Validate tied_status (cast enum to text)
    IF NEW.tied_status IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM iati_reference_values 
            WHERE field_name = 'tied_status' 
            AND code = NEW.tied_status::TEXT
        ) THEN
            RAISE EXCEPTION 'Invalid tied_status: %. Valid values are: %', 
                NEW.tied_status::TEXT,
                (SELECT string_agg(code || ' (' || name || ')', ', ') 
                 FROM iati_reference_values 
                 WHERE field_name = 'tied_status');
        END IF;
    END IF;

    -- Validate provider_org_type (cast enum to text)
    IF NEW.provider_org_type IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM iati_reference_values 
            WHERE field_name = 'organization_type' 
            AND code = NEW.provider_org_type::TEXT
        ) THEN
            RAISE EXCEPTION 'Invalid provider_org_type: %. Common values include: 10 (Government), 21 (International NGO), 40 (Multilateral), 70 (Private Sector)', 
                NEW.provider_org_type::TEXT;
        END IF;
    END IF;

    -- Validate receiver_org_type (cast enum to text)
    IF NEW.receiver_org_type IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM iati_reference_values 
            WHERE field_name = 'organization_type' 
            AND code = NEW.receiver_org_type::TEXT
        ) THEN
            RAISE EXCEPTION 'Invalid receiver_org_type: %. Common values include: 10 (Government), 21 (International NGO), 40 (Multilateral), 70 (Private Sector)', 
                NEW.receiver_org_type::TEXT;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER validate_transaction_values_trigger
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_transaction_values();

-- Alternative: If validation is still causing issues, you can temporarily disable it
-- COMMENT OUT the trigger creation above and UNCOMMENT the line below:
-- DROP TRIGGER IF EXISTS validate_transaction_values_trigger ON transactions;

COMMENT ON FUNCTION validate_transaction_values IS 'Validates transaction field values against IATI reference values with proper enum casting';

-- 1. Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Set default UUID generation
ALTER TABLE transactions 
ALTER COLUMN uuid SET DEFAULT gen_random_uuid();

-- 3. Generate UUIDs for existing rows
UPDATE transactions
SET uuid = gen_random_uuid()
WHERE uuid IS NULL;

-- 4. Make UUID NOT NULL
ALTER TABLE transactions 
ALTER COLUMN uuid SET NOT NULL; 