-- Transaction Schema Audit Fixes Migration
-- Based on comprehensive audit of UI fields vs database schema
-- Date: 2024

BEGIN;

-- Step 1: Add financing_classification column
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS financing_classification VARCHAR(50);

COMMENT ON COLUMN transactions.financing_classification IS 'Computed or manually overridden financing classification (e.g., ODA Grant, ODA Loan, OOF Grant, OOF Loan, Other)';

-- Step 2: Add check constraint for valid financing classifications
ALTER TABLE transactions
    ADD CONSTRAINT check_financing_classification 
    CHECK (financing_classification IS NULL OR financing_classification IN (
        'ODA Grant',
        'ODA Loan', 
        'OOF Grant',
        'OOF Loan',
        'Other'
    ));

-- Step 3: Add missing metadata fields
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS fx_differs BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN transactions.created_by IS 'User who created the transaction (NULL for imports)';
COMMENT ON COLUMN transactions.fx_differs IS 'Flag indicating if FX settlement date differs from transaction date';

-- Step 4: Add missing organization type fields (if not already handled by enums)
-- These should already exist from the IATI migration, but let's ensure they're there
ALTER TABLE transactions
    ALTER COLUMN provider_org_type TYPE organization_type_enum USING provider_org_type::organization_type_enum,
    ALTER COLUMN receiver_org_type TYPE organization_type_enum USING receiver_org_type::organization_type_enum;

-- Step 5: Add activity IATI reference for better tracking
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS activity_iati_ref VARCHAR(255);

COMMENT ON COLUMN transactions.activity_iati_ref IS 'IATI identifier of the parent activity (denormalized for performance)';

-- Step 6: Update the value_date trigger to also set fx_differs
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS enforce_value_date_logic ON transactions;
CREATE TRIGGER enforce_value_date_logic
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_value_date_difference();

-- Step 7: Create index on financing_classification for reporting
CREATE INDEX IF NOT EXISTS idx_transactions_financing_classification 
    ON transactions(financing_classification)
    WHERE financing_classification IS NOT NULL;

-- Step 8: Backfill fx_differs for existing records
UPDATE transactions
SET fx_differs = CASE 
    WHEN value_date IS NOT NULL AND value_date != transaction_date THEN TRUE
    ELSE FALSE
END;

-- Step 9: Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_activity_date 
    ON transactions(activity_id, transaction_date DESC);

-- Final status report
DO $$
DECLARE
    v_total_count integer;
    v_fx_differs_count integer;
BEGIN
    SELECT COUNT(*) INTO v_total_count FROM transactions;
    SELECT COUNT(*) INTO v_fx_differs_count FROM transactions WHERE fx_differs = TRUE;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Transaction Audit Fixes Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Added financing_classification column';
    RAISE NOTICE 'Added created_by and fx_differs columns';
    RAISE NOTICE 'Added activity_iati_ref column';
    RAISE NOTICE 'Updated value_date trigger logic';
    RAISE NOTICE '';
    RAISE NOTICE 'Total transactions: %', v_total_count;
    RAISE NOTICE 'Transactions with FX differences: %', v_fx_differs_count;
    RAISE NOTICE '========================================';
END $$;

COMMIT; 