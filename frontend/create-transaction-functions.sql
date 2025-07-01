-- Create RPC functions to bypass schema cache issues
-- Run this in Supabase SQL Editor

-- Function to get transactions with all new fields
CREATE OR REPLACE FUNCTION get_activity_transactions(activity_uuid UUID)
RETURNS TABLE (
    uuid UUID,
    activity_id UUID,
    transaction_type TEXT,
    transaction_date DATE,
    value NUMERIC,
    currency TEXT,
    status TEXT,
    provider_org_name TEXT,
    receiver_org_name TEXT,
    disbursement_channel TEXT,
    flow_type TEXT,
    finance_type TEXT,
    aid_type TEXT,
    tied_status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.uuid,
        t.activity_id,
        t.transaction_type::TEXT,
        t.transaction_date,
        t.value,
        t.currency,
        t.status::TEXT,
        t.provider_org_name,
        t.receiver_org_name,
        t.disbursement_channel::TEXT,
        t.flow_type::TEXT,
        t.finance_type::TEXT,
        t.aid_type::TEXT,
        t.tied_status::TEXT
    FROM transactions t
    WHERE t.activity_id = activity_uuid
    ORDER BY t.transaction_date DESC;
END;
$$;

-- Function to insert IATI transactions
CREATE OR REPLACE FUNCTION insert_iati_transaction(
    p_activity_id UUID,
    p_transaction_type TEXT,
    p_transaction_date DATE,
    p_value NUMERIC,
    p_currency TEXT,
    p_description TEXT DEFAULT NULL,
    p_disbursement_channel TEXT DEFAULT NULL,
    p_flow_type TEXT DEFAULT NULL,
    p_finance_type TEXT DEFAULT NULL,
    p_aid_type TEXT DEFAULT NULL,
    p_tied_status TEXT DEFAULT NULL,
    p_provider_org_name TEXT DEFAULT NULL,
    p_receiver_org_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uuid UUID;
BEGIN
    INSERT INTO transactions (
        activity_id,
        transaction_type,
        transaction_date,
        value,
        currency,
        status,
        description,
        disbursement_channel,
        flow_type,
        finance_type,
        aid_type,
        tied_status,
        provider_org_name,
        receiver_org_name
    ) VALUES (
        p_activity_id,
        p_transaction_type::transaction_type_enum,
        p_transaction_date,
        p_value,
        p_currency,
        'actual'::transaction_status_enum,
        p_description,
        p_disbursement_channel::disbursement_channel_enum,
        p_flow_type::flow_type_enum,
        p_finance_type::finance_type_enum,
        p_aid_type::aid_type_enum,
        p_tied_status::tied_status_enum,
        p_provider_org_name,
        p_receiver_org_name
    )
    RETURNING uuid INTO v_uuid;
    
    RETURN v_uuid;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_activity_transactions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_iati_transaction TO anon, authenticated;

-- Test the functions
SELECT * FROM get_activity_transactions('cd88c764-896d-47f8-aca1-989620a47c24'::UUID) LIMIT 5; 