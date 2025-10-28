-- Find transaction by ID
SELECT 
    t.id,
    t.transaction_type,
    t.transaction_date,
    t.value,
    t.currency,
    t.description,
    t.provider_org_ref,
    t.provider_org_name,
    t.receiver_org_ref,
    t.receiver_org_name,
    t.activity_id,
    t.created_at,
    t.updated_at,
    -- Get activity details
    a.title as activity_title,
    a.iati_identifier as activity_iati_id
FROM transactions t
LEFT JOIN activities a ON t.activity_id = a.id
WHERE t.id = '9f76b2ce-40a2-47df-ba64-26527fa21df3';

