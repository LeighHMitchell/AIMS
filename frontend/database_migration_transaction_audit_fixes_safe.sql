-- Transaction Schema Audit Fixes Migration (Safe Version)
-- This version checks for existing columns and constraints before adding them

BEGIN;

-- Step 1: Add financing_classification column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' 
                   AND column_name = 'financing_classification') THEN
        ALTER TABLE transactions
            ADD COLUMN financing_classification VARCHAR(50);
        COMMENT ON COLUMN transactions.financing_classification IS 'Computed or manually overridden financing classification';
    END IF;
END $$;

-- Step 2: Add check constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_table_usage 
                   WHERE table_name = 'transactions' 
                   AND constraint_name = 'check_financing_classification') THEN
        ALTER TABLE transactions
            ADD CONSTRAINT check_financing_classification 
            CHECK (financing_classification IS NULL OR financing_classification IN (
                'ODA Grant',
                'ODA Loan', 
                'OOF Grant',
                'OOF Loan',
                'Other'
            ));
    END IF;
END $$;

-- Step 3: Add created_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' 
                   AND column_name = 'created_by') THEN
        ALTER TABLE transactions
            ADD COLUMN created_by UUID REFERENCES auth.users(id);
        COMMENT ON COLUMN transactions.created_by IS 'User who created the transaction (NULL for imports)';
    END IF;
END $$;

-- Step 4: Add fx_differs column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' 
                   AND column_name = 'fx_differs') THEN
        ALTER TABLE transactions
            ADD COLUMN fx_differs BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN transactions.fx_differs IS 'Flag indicating if FX settlement date differs from transaction date';
    END IF;
END $$;

-- Step 5: Add activity_iati_ref column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' 
                   AND column_name = 'activity_iati_ref') THEN
        ALTER TABLE transactions
            ADD COLUMN activity_iati_ref VARCHAR(255);
        COMMENT ON COLUMN transactions.activity_iati_ref IS 'IATI identifier of the parent activity';
    END IF;
END $$;

-- Step 6: Create or replace the value_date trigger function
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

-- Step 7: Drop and recreate the trigger
DROP TRIGGER IF EXISTS enforce_value_date_logic ON transactions;
CREATE TRIGGER enforce_value_date_logic
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_value_date_difference();

-- Step 8: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_transactions_financing_classification 
    ON transactions(financing_classification)
    WHERE financing_classification IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_activity_date 
    ON transactions(activity_id, transaction_date DESC);

-- Step 9: Backfill fx_differs for existing records
UPDATE transactions
SET fx_differs = CASE 
    WHEN value_date IS NOT NULL AND value_date != transaction_date THEN TRUE
    ELSE FALSE
END
WHERE fx_differs IS NULL;

-- Step 10: Check what columns we have now
DO $$
DECLARE
    v_columns text;
BEGIN
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO v_columns
    FROM information_schema.columns
    WHERE table_name = 'transactions'
    AND column_name IN (
        'financing_classification', 
        'fx_differs', 
        'created_by', 
        'activity_iati_ref',
        'provider_org_type',
        'receiver_org_type',
        'provider_org_ref',
        'receiver_org_ref',
        'value_date',
        'transaction_reference',
        'disbursement_channel',
        'flow_type',
        'finance_type',
        'aid_type',
        'tied_status',
        'is_humanitarian'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Transaction Table Update Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Columns verified: %', v_columns;
    RAISE NOTICE '========================================';
END $$;

COMMIT; 