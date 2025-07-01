-- Complete Transaction Migration - Only Missing Parts
-- This migration adds only what's missing after partial application

BEGIN;

-- Step 1: Add created_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' 
                   AND column_name = 'created_by') THEN
        ALTER TABLE transactions
            ADD COLUMN created_by UUID REFERENCES auth.users(id);
        COMMENT ON COLUMN transactions.created_by IS 'User who created the transaction (NULL for imports)';
        RAISE NOTICE 'Added created_by column';
    ELSE
        RAISE NOTICE 'created_by column already exists';
    END IF;
END $$;

-- Step 2: Add fx_differs column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' 
                   AND column_name = 'fx_differs') THEN
        ALTER TABLE transactions
            ADD COLUMN fx_differs BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN transactions.fx_differs IS 'Flag indicating if FX settlement date differs from transaction date';
        RAISE NOTICE 'Added fx_differs column';
    ELSE
        RAISE NOTICE 'fx_differs column already exists';
    END IF;
END $$;

-- Step 3: Add activity_iati_ref column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' 
                   AND column_name = 'activity_iati_ref') THEN
        ALTER TABLE transactions
            ADD COLUMN activity_iati_ref VARCHAR(255);
        COMMENT ON COLUMN transactions.activity_iati_ref IS 'IATI identifier of the parent activity';
        RAISE NOTICE 'Added activity_iati_ref column';
    ELSE
        RAISE NOTICE 'activity_iati_ref column already exists';
    END IF;
END $$;

-- Step 4: Create or replace the value_date trigger function
CREATE OR REPLACE FUNCTION check_value_date_difference()
RETURNS TRIGGER AS $$
BEGIN
    -- If value_date equals transaction_date, set it to NULL
    IF NEW.value_date IS NOT NULL AND NEW.value_date = NEW.transaction_date THEN
        NEW.value_date := NULL;
        NEW.fx_differs := FALSE;
    ELSIF NEW.value_date IS NOT NULL AND NEW.value_date != NEW.transaction_date THEN
        NEW.fx_differs := TRUE;
    ELSE
        NEW.fx_differs := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Drop and recreate the trigger
DROP TRIGGER IF EXISTS enforce_value_date_logic ON transactions;
CREATE TRIGGER enforce_value_date_logic
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_value_date_difference();

-- Step 6: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_transactions_financing_classification 
    ON transactions(financing_classification)
    WHERE financing_classification IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_activity_date 
    ON transactions(activity_id, transaction_date DESC);

-- Step 7: Backfill fx_differs for existing records (only if column was just added)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'transactions' 
               AND column_name = 'fx_differs') THEN
        UPDATE transactions
        SET fx_differs = CASE 
            WHEN value_date IS NOT NULL AND value_date != transaction_date THEN TRUE
            ELSE FALSE
        END
        WHERE fx_differs IS NULL;
        RAISE NOTICE 'Updated fx_differs values for existing records';
    END IF;
END $$;

-- Final verification
DO $$
DECLARE
    v_missing_cols text;
    v_existing_cols text;
BEGIN
    -- Check what columns we have now
    SELECT string_agg(column_name, ', ' ORDER BY column_name)
    INTO v_existing_cols
    FROM information_schema.columns
    WHERE table_name = 'transactions'
    AND column_name IN (
        'financing_classification', 
        'fx_differs', 
        'created_by', 
        'activity_iati_ref'
    );
    
    -- Check what might still be missing
    WITH required_cols AS (
        SELECT unnest(ARRAY['financing_classification', 'fx_differs', 'created_by', 'activity_iati_ref']) as col
    ),
    existing AS (
        SELECT column_name as col
        FROM information_schema.columns
        WHERE table_name = 'transactions'
    )
    SELECT string_agg(r.col, ', ')
    INTO v_missing_cols
    FROM required_cols r
    LEFT JOIN existing e ON r.col = e.col
    WHERE e.col IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Transaction Migration Status';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Existing columns: %', COALESCE(v_existing_cols, 'none');
    RAISE NOTICE 'Missing columns: %', COALESCE(v_missing_cols, 'none');
    RAISE NOTICE '========================================';
END $$;

COMMIT; 