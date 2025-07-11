-- Fix Transaction Persistence Issues
-- This script addresses all known issues with transaction saving

-- 1. Make organization_id nullable if it isn't already
DO $$
BEGIN
    -- Check if organization_id is NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'organization_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE transactions ALTER COLUMN organization_id DROP NOT NULL;
        RAISE NOTICE 'Made organization_id nullable in transactions table';
    ELSE
        RAISE NOTICE 'organization_id is already nullable';
    END IF;
END $$;

-- 2. Add created_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE transactions ADD COLUMN created_by UUID REFERENCES users(id);
        RAISE NOTICE 'Added created_by column to transactions table';
    ELSE
        RAISE NOTICE 'created_by column already exists';
    END IF;
END $$;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON transactions(organization_id);

-- 4. Update transactions with NULL organization_id to use activity's reporting_org_id
UPDATE transactions t
SET organization_id = a.reporting_org_id
FROM activities a
WHERE t.activity_id = a.id 
AND t.organization_id IS NULL
AND a.reporting_org_id IS NOT NULL;

-- 5. Create a function to validate transaction data
CREATE OR REPLACE FUNCTION validate_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure required fields are present
    IF NEW.transaction_type IS NULL THEN
        RAISE EXCEPTION 'Transaction type is required';
    END IF;
    
    IF NEW.value IS NULL OR NEW.value <= 0 THEN
        RAISE EXCEPTION 'Transaction value must be greater than 0';
    END IF;
    
    IF NEW.transaction_date IS NULL THEN
        RAISE EXCEPTION 'Transaction date is required';
    END IF;
    
    IF NEW.currency IS NULL THEN
        RAISE EXCEPTION 'Currency is required';
    END IF;
    
    -- If organization_id is null, try to get it from the activity
    IF NEW.organization_id IS NULL THEN
        SELECT reporting_org_id INTO NEW.organization_id
        FROM activities
        WHERE id = NEW.activity_id;
        
        IF NEW.organization_id IS NULL THEN
            RAISE WARNING 'Transaction has no organization_id and activity has no reporting_org_id';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for validation (disabled by default, enable if needed)
-- CREATE TRIGGER validate_transaction_before_insert
-- BEFORE INSERT OR UPDATE ON transactions
-- FOR EACH ROW
-- EXECUTE FUNCTION validate_transaction();

-- 7. Add comments for documentation
COMMENT ON COLUMN transactions.organization_id IS 'Organization that owns this transaction. Can be NULL for imported transactions.';
COMMENT ON COLUMN transactions.created_by IS 'User who created this transaction. NULL for imported transactions.';

-- 8. Report on current state
DO $$
DECLARE
    total_count INTEGER;
    null_org_count INTEGER;
    null_activity_org_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM transactions;
    SELECT COUNT(*) INTO null_org_count FROM transactions WHERE organization_id IS NULL;
    
    SELECT COUNT(*) INTO null_activity_org_count 
    FROM transactions t
    JOIN activities a ON t.activity_id = a.id
    WHERE t.organization_id IS NULL AND a.reporting_org_id IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Transaction Organization Status ===';
    RAISE NOTICE 'Total transactions: %', total_count;
    RAISE NOTICE 'Transactions without organization_id: %', null_org_count;
    RAISE NOTICE 'Transactions where activity also has no organization: %', null_activity_org_count;
    RAISE NOTICE '======================================';
END $$;