-- IATI Transaction Migration - Resume from Partial Application
-- Use this if the main migration partially failed

-- First, let's check what exists
DO $$
DECLARE
    v_transactions_iati_exists boolean;
    v_transactions_backup_exists boolean;
BEGIN
    -- Check if transactions_iati exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions_iati'
    ) INTO v_transactions_iati_exists;
    
    -- Check if transactions_backup exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions_backup'
    ) INTO v_transactions_backup_exists;
    
    -- If transactions_iati exists but hasn't been renamed to transactions yet
    IF v_transactions_iati_exists THEN
        -- First backup the current transactions table if not already done
        IF NOT v_transactions_backup_exists AND EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'transactions'
        ) THEN
            ALTER TABLE transactions RENAME TO transactions_backup;
        END IF;
        
        -- Drop the current transactions table if it still exists
        DROP TABLE IF EXISTS transactions;
        
        -- Rename transactions_iati to transactions
        ALTER TABLE transactions_iati RENAME TO transactions;
    END IF;
END $$;

-- Continue with indexes (using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_transactions_activity_id ON transactions(activity_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_org_id ON transactions(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_org_id ON transactions(receiver_org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_sector_code ON transactions(sector_code);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient_country ON transactions(recipient_country_code);

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE
    ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'IATI-compliant financial transactions for activities';
COMMENT ON COLUMN transactions.transaction_type IS 'IATI transaction type code';
COMMENT ON COLUMN transactions.status IS 'Transaction status: draft or actual';
COMMENT ON COLUMN transactions.disbursement_channel IS 'IATI disbursement channel code';
COMMENT ON COLUMN transactions.sector_vocabulary IS '1=DAC 5 Digit, 2=DAC 3 Digit';
COMMENT ON COLUMN transactions.recipient_region_vocab IS '1=UN M49, 2=OECD DAC';
COMMENT ON COLUMN transactions.is_humanitarian IS 'Flag for humanitarian transactions';

-- Final check
DO $$
BEGIN
    RAISE NOTICE 'Migration resume completed. Checking final state...';
    
    -- Check if transactions table exists with uuid column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'uuid'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✓ Transactions table has been successfully migrated to IATI format';
    ELSE
        RAISE WARNING '✗ Transactions table may not be in the expected IATI format';
    END IF;
    
    -- Check if indexes exist
    IF EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'transactions' 
        AND indexname = 'idx_transactions_activity_id'
        AND schemaname = 'public'
    ) THEN
        RAISE NOTICE '✓ Indexes have been created';
    ELSE
        RAISE WARNING '✗ Some indexes may be missing';
    END IF;
END $$; 