-- Add organization_id column to transactions table if it doesn't exist
-- This column is used to track which organization created the transaction

BEGIN;

-- Check if organization_id column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE transactions
        ADD COLUMN organization_id UUID REFERENCES organizations(id);
        
        COMMENT ON COLUMN transactions.organization_id IS 'Organization that created/owns this transaction';
        
        -- Create index for performance
        CREATE INDEX idx_transactions_organization_id ON transactions(organization_id);
        
        RAISE NOTICE 'Added organization_id column to transactions table';
    ELSE
        RAISE NOTICE 'organization_id column already exists in transactions table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name = 'organization_id';

COMMIT; 