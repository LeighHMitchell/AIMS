-- Update the insert_iati_transaction function to include activity_iati_ref
CREATE OR REPLACE FUNCTION insert_iati_transaction(
    p_activity_id UUID,
    p_activity_iati_ref TEXT DEFAULT NULL,
    p_transaction_type TEXT,
    p_transaction_date DATE,
    p_value NUMERIC,
    p_currency TEXT,
    p_status TEXT DEFAULT 'actual',
    p_value_date DATE DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_provider_org_name TEXT DEFAULT NULL,
    p_receiver_org_name TEXT DEFAULT NULL,
    p_disbursement_channel TEXT DEFAULT NULL,
    p_flow_type TEXT DEFAULT NULL,
    p_finance_type TEXT DEFAULT NULL,
    p_aid_type TEXT DEFAULT NULL,
    p_tied_status TEXT DEFAULT NULL,
    p_sector_code TEXT DEFAULT NULL,
    p_sector_vocabulary TEXT DEFAULT NULL,
    p_recipient_country_code TEXT DEFAULT NULL,
    p_recipient_region_code TEXT DEFAULT NULL,
    p_recipient_region_vocab TEXT DEFAULT NULL,
    p_is_humanitarian BOOLEAN DEFAULT FALSE
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
        activity_iati_ref,
        transaction_type,
        transaction_date,
        value,
        currency,
        status,
        value_date,
        description,
        provider_org_name,
        receiver_org_name,
        disbursement_channel,
        flow_type,
        finance_type,
        aid_type,
        tied_status,
        sector_code,
        sector_vocabulary,
        recipient_country_code,
        recipient_region_code,
        recipient_region_vocab,
        is_humanitarian
    ) VALUES (
        p_activity_id,
        p_activity_iati_ref,
        p_transaction_type::transaction_type_enum,
        p_transaction_date,
        p_value,
        p_currency,
        p_status::transaction_status_enum,
        p_value_date,
        p_description,
        p_provider_org_name,
        p_receiver_org_name,
        CASE 
            WHEN p_disbursement_channel IS NOT NULL 
            THEN p_disbursement_channel::disbursement_channel_enum 
            ELSE NULL 
        END,
        CASE 
            WHEN p_flow_type IS NOT NULL 
            THEN p_flow_type::flow_type_enum 
            ELSE NULL 
        END,
        CASE 
            WHEN p_finance_type IS NOT NULL 
            THEN p_finance_type::finance_type_enum 
            ELSE NULL 
        END,
        CASE 
            WHEN p_aid_type IS NOT NULL 
            THEN p_aid_type::aid_type_enum 
            ELSE NULL 
        END,
        CASE 
            WHEN p_tied_status IS NOT NULL 
            THEN p_tied_status::tied_status_enum 
            ELSE NULL 
        END,
        p_sector_code,
        p_sector_vocabulary,
        p_recipient_country_code,
        p_recipient_region_code,
        p_recipient_region_vocab,
        p_is_humanitarian
    )
    RETURNING uuid INTO v_uuid;
    
    RETURN v_uuid;
END;
$$;

-- Also update the get function to include activity_iati_ref
CREATE OR REPLACE FUNCTION get_activity_transactions(activity_uuid UUID)
RETURNS TABLE (
    uuid UUID,
    activity_id UUID,
    activity_iati_ref TEXT,
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
    tied_status TEXT,
    is_humanitarian BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.uuid,
        t.activity_id,
        t.activity_iati_ref,
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
        t.tied_status::TEXT,
        t.is_humanitarian
    FROM transactions t
    WHERE t.activity_id = activity_uuid
    ORDER BY t.transaction_date DESC;
END;
$$; 