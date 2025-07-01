-- IATI 2.03 Transaction Enhancements Migration
-- Adds language fields for multilingual support and ensures value_date is nullable

BEGIN;

-- Step 1: Ensure value_date is nullable (it should already be, but let's be sure)
ALTER TABLE transactions 
    ALTER COLUMN value_date DROP NOT NULL;

-- Step 2: Add language fields for multilingual support
-- These are optional but useful for IATI XML export with @xml:lang attributes
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS description_language VARCHAR(10) DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS provider_org_language VARCHAR(10) DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS receiver_org_language VARCHAR(10) DEFAULT 'en';

-- Step 3: Add comments for documentation
COMMENT ON COLUMN transactions.value_date IS 'The date on which the transaction value was set (e.g., currency exchange date). Only store if different from transaction_date';
COMMENT ON COLUMN transactions.description_language IS 'ISO 639-1 language code for the description narrative (e.g., en, fr, es)';
COMMENT ON COLUMN transactions.provider_org_language IS 'ISO 639-1 language code for the provider organization name';
COMMENT ON COLUMN transactions.receiver_org_language IS 'ISO 639-1 language code for the receiver organization name';

-- Step 4: Create index on value_date for performance
CREATE INDEX IF NOT EXISTS idx_transactions_value_date 
    ON transactions(value_date) 
    WHERE value_date IS NOT NULL;

-- Step 5: Add a check constraint to ensure value_date logic
-- This ensures value_date is only stored when it's different from transaction_date
CREATE OR REPLACE FUNCTION check_value_date_difference()
RETURNS TRIGGER AS $$
BEGIN
    -- If value_date equals transaction_date, set it to NULL
    IF NEW.value_date IS NOT NULL AND NEW.value_date = NEW.transaction_date THEN
        NEW.value_date := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS enforce_value_date_logic ON transactions;
CREATE TRIGGER enforce_value_date_logic
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_value_date_difference();

-- Step 6: Update existing records to enforce the logic
-- Set value_date to NULL where it equals transaction_date
UPDATE transactions 
SET value_date = NULL 
WHERE value_date IS NOT NULL 
  AND value_date = transaction_date;

-- Step 7: Add additional optional IATI fields for complete compliance
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS transaction_scope VARCHAR(20), -- 1=incoming, 2=outgoing, 3=incoming/outgoing
    ADD COLUMN IF NOT EXISTS humanitarian_scope_type VARCHAR(20), -- emergency, appeal, etc
    ADD COLUMN IF NOT EXISTS humanitarian_scope_code VARCHAR(50), -- specific emergency/appeal code
    ADD COLUMN IF NOT EXISTS humanitarian_scope_vocabulary VARCHAR(10); -- 1-99 for humanitarian vocabularies

-- Add comments for new fields
COMMENT ON COLUMN transactions.transaction_scope IS 'IATI transaction scope: 1=incoming, 2=outgoing, 3=incoming/outgoing';
COMMENT ON COLUMN transactions.humanitarian_scope_type IS 'Type of humanitarian scope (emergency, appeal, etc.)';
COMMENT ON COLUMN transactions.humanitarian_scope_code IS 'Code for specific humanitarian emergency or appeal';
COMMENT ON COLUMN transactions.humanitarian_scope_vocabulary IS 'Vocabulary for humanitarian scope codes';

-- Final status report
DO $$
DECLARE
    v_updated_count integer;
BEGIN
    SELECT COUNT(*) INTO v_updated_count 
    FROM transactions 
    WHERE value_date IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'IATI 2.03 Transaction Enhancements Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Added language fields for multilingual support';
    RAISE NOTICE 'Added trigger to enforce value_date logic';
    RAISE NOTICE 'Added optional humanitarian scope fields';
    RAISE NOTICE 'Transactions with NULL value_date: %', v_updated_count;
    RAISE NOTICE '========================================';
END $$;

COMMIT; 