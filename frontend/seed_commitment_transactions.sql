-- Seed script to add commitment transactions (type '2') for the 10 most recently updated activities
-- This will populate the "% Committed Spent" column
-- Note: Amounts capped at $10M to avoid integer overflow in amount_minor trigger

WITH activity_spending AS (
    -- Calculate total spent (disbursements + expenditures) per activity
    SELECT
        a.id as activity_id,
        a.title_narrative,
        a.default_currency,
        a.planned_start_date,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('3', '4') THEN t.value ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('3', '4') THEN t.value_usd ELSE 0 END), 0) as total_spent_usd,
        COUNT(CASE WHEN t.transaction_type = '2' THEN 1 END) as existing_commitments
    FROM activities a
    LEFT JOIN transactions t ON a.id = t.activity_id
    GROUP BY a.id, a.title_narrative, a.default_currency, a.planned_start_date
    ORDER BY a.updated_at DESC
    LIMIT 10
),
commitment_amounts AS (
    -- Calculate commitment amounts (spending + 20-50% buffer, or minimum $100k if no spending)
    -- Cap at $10M to avoid integer overflow in amount_minor calculation
    SELECT
        activity_id,
        title_narrative,
        COALESCE(default_currency, 'USD') as currency,
        planned_start_date,
        total_spent,
        total_spent_usd,
        existing_commitments,
        LEAST(
            CASE
                WHEN total_spent_usd > 0 THEN
                    -- Commitment = spending * random multiplier between 1.2 and 1.5
                    total_spent_usd * (1.2 + (random() * 0.3))
                ELSE
                    -- No spending yet, create commitment between $100k and $500k
                    100000 + (random() * 400000)
            END,
            10000000  -- Cap at $10M to avoid integer overflow
        ) as commitment_amount_usd,
        LEAST(
            CASE
                WHEN total_spent > 0 THEN
                    total_spent * (1.2 + (random() * 0.3))
                ELSE
                    100000 + (random() * 400000)
            END,
            10000000  -- Cap at $10M
        ) as commitment_amount
    FROM activity_spending
    WHERE existing_commitments = 0  -- Only add if no commitments exist
)
INSERT INTO transactions (
    uuid,
    activity_id,
    transaction_type,
    transaction_date,
    value,
    value_usd,
    currency,
    status,
    description,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid() as uuid,
    ca.activity_id,
    '2' as transaction_type,  -- Outgoing Commitment
    COALESCE(ca.planned_start_date, CURRENT_DATE - INTERVAL '1 year') as transaction_date,
    ROUND(ca.commitment_amount::numeric, 2) as value,
    ROUND(ca.commitment_amount_usd::numeric, 2) as value_usd,
    ca.currency,
    'actual' as status,
    'Initial project commitment' as description,
    NOW() as created_at,
    NOW() as updated_at
FROM commitment_amounts ca;

-- Verify what was inserted
SELECT
    t.activity_id,
    LEFT(a.title_narrative, 40) as title,
    t.transaction_type,
    t.value,
    t.value_usd,
    t.currency,
    t.transaction_date,
    t.description
FROM transactions t
JOIN activities a ON t.activity_id = a.id
WHERE t.transaction_type = '2'
AND t.created_at > NOW() - INTERVAL '1 minute'
ORDER BY t.created_at DESC;

-- Show the updated % Committed Spent calculation
SELECT
    a.id,
    LEFT(a.title_narrative, 35) as title,
    COALESCE(SUM(CASE WHEN t.transaction_type = '2' THEN t.value_usd END), 0) as commitments_usd,
    COALESCE(SUM(CASE WHEN t.transaction_type IN ('3', '4') THEN t.value_usd END), 0) as spent_usd,
    CASE
        WHEN COALESCE(SUM(CASE WHEN t.transaction_type = '2' THEN t.value_usd END), 0) > 0
        THEN ROUND(
            (COALESCE(SUM(CASE WHEN t.transaction_type IN ('3', '4') THEN t.value_usd END), 0) /
             COALESCE(SUM(CASE WHEN t.transaction_type = '2' THEN t.value_usd END), 1)) * 100,
            1
        )
        ELSE NULL
    END as percent_committed_spent
FROM activities a
LEFT JOIN transactions t ON a.id = t.activity_id
GROUP BY a.id, a.title_narrative
ORDER BY a.updated_at DESC
LIMIT 10;
