-- Add validation fields to transactions table
-- This migration adds fields needed for the transaction validation workflow

-- Add validation columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validation_comments TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create indexes for better performance on validation queries
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_validated_by ON transactions(validated_by);
CREATE INDEX IF NOT EXISTS idx_transactions_rejected_by ON transactions(rejected_by);
CREATE INDEX IF NOT EXISTS idx_transactions_validated_at ON transactions(validated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_rejected_at ON transactions(rejected_at);

-- Update the transaction status enum to include all workflow statuses
-- First, check if the enum exists and what values it has
DO $$
BEGIN
    -- Add new enum values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'submitted' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_status_enum')) THEN
        ALTER TYPE transaction_status_enum ADD VALUE 'submitted';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'validated' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_status_enum')) THEN
        ALTER TYPE transaction_status_enum ADD VALUE 'validated';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_status_enum')) THEN
        ALTER TYPE transaction_status_enum ADD VALUE 'rejected';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'published' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_status_enum')) THEN
        ALTER TYPE transaction_status_enum ADD VALUE 'published';
    END IF;
END $$;

-- Update the existing update_transactions_on_publish function to handle validated transactions
CREATE OR REPLACE FUNCTION update_transactions_on_publish(p_activity_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update validated transactions to actual when activity is published
    -- Also update draft transactions that haven't gone through validation
    UPDATE transactions
    SET 
        status = 'actual'::transaction_status_enum,
        updated_at = CURRENT_TIMESTAMP
    WHERE 
        activity_id = p_activity_id
        AND status IN ('draft'::transaction_status_enum, 'validated'::transaction_status_enum);
        
    -- Log the update
    RAISE NOTICE 'Updated transactions for activity % to actual status', p_activity_id;
END;
$$;

-- Create a function to get transaction validation statistics
CREATE OR REPLACE FUNCTION get_transaction_validation_stats()
RETURNS TABLE (
    status transaction_status_enum,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.status,
        COUNT(*) as count
    FROM transactions t
    GROUP BY t.status
    ORDER BY t.status;
END;
$$;

-- Create a function to get transactions pending validation
CREATE OR REPLACE FUNCTION get_transactions_pending_validation()
RETURNS TABLE (
    transaction_id UUID,
    activity_id UUID,
    transaction_type VARCHAR,
    value NUMERIC,
    currency VARCHAR,
    transaction_date DATE,
    created_at TIMESTAMPTZ,
    activity_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.uuid as transaction_id,
        t.activity_id,
        t.transaction_type,
        t.value,
        t.currency,
        t.transaction_date,
        t.created_at,
        a.title_narrative as activity_title
    FROM transactions t
    LEFT JOIN activities a ON t.activity_id = a.id
    WHERE t.status = 'submitted'::transaction_status_enum
    ORDER BY t.created_at ASC;
END;
$$;

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION get_transaction_validation_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_transactions_pending_validation() TO authenticated;

-- Update RLS policies to include validation fields
-- Users can view validation details for transactions they have access to
-- Users with validation permissions can update validation fields

-- Add a comment to document the validation workflow
COMMENT ON COLUMN transactions.validated_by IS 'User ID who validated the transaction';
COMMENT ON COLUMN transactions.validated_at IS 'Timestamp when the transaction was validated';
COMMENT ON COLUMN transactions.rejected_by IS 'User ID who rejected the transaction';
COMMENT ON COLUMN transactions.rejected_at IS 'Timestamp when the transaction was rejected';
COMMENT ON COLUMN transactions.validation_comments IS 'Comments from validator or rejector';
COMMENT ON COLUMN transactions.updated_by IS 'User ID who last updated the transaction';

-- Create a view for transaction validation summary
CREATE OR REPLACE VIEW transaction_validation_summary AS
SELECT 
    t.uuid,
    t.activity_id,
    t.transaction_type,
    t.value,
    t.currency,
    t.status,
    t.created_at,
    t.validated_at,
    t.rejected_at,
    t.validation_comments,
    validator.email as validator_email,
    validator.first_name as validator_first_name,
    validator.last_name as validator_last_name,
    rejector.email as rejector_email,
    rejector.first_name as rejector_first_name,
    rejector.last_name as rejector_last_name,
    a.title_narrative as activity_title
FROM transactions t
LEFT JOIN auth.users validator ON t.validated_by = validator.id
LEFT JOIN auth.users rejector ON t.rejected_by = rejector.id
LEFT JOIN activities a ON t.activity_id = a.id;

-- Grant select permission on the view
GRANT SELECT ON transaction_validation_summary TO authenticated;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Transaction validation workflow migration completed successfully';
END $$;
