-- Function to update transaction status when activity is published
CREATE OR REPLACE FUNCTION update_transactions_on_publish(p_activity_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update all draft transactions to actual when activity is published
    UPDATE transactions
    SET 
        status = 'actual'::transaction_status_enum,
        updated_at = CURRENT_TIMESTAMP
    WHERE 
        activity_id = p_activity_id
        AND status = 'draft'::transaction_status_enum;
END;
$$;

-- Function to update transaction status when activity is unpublished
CREATE OR REPLACE FUNCTION update_transactions_on_unpublish(p_activity_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Optionally update transactions back to draft when unpublished
    -- This is a policy decision - you may want to keep them as actual
    -- For now, we'll leave them as actual even when unpublished
    -- Uncomment below if you want to revert to draft:
    
    -- UPDATE transactions
    -- SET 
    --     status = 'draft'::transaction_status_enum,
    --     updated_at = CURRENT_TIMESTAMP
    -- WHERE 
    --     activity_id = p_activity_id
    --     AND status = 'actual'::transaction_status_enum;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_transactions_on_publish TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_transactions_on_unpublish TO anon, authenticated; 