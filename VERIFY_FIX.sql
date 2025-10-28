-- Verify the activity's finance type was cleared
SELECT 
    id,
    title_narrative,
    default_finance_type,
    CASE 
        WHEN default_finance_type IS NULL THEN '✓ Cleared - Ready to publish'
        ELSE '⚠ Still has value: ' || default_finance_type
    END as status
FROM activities 
WHERE id = '6590cc6d-7842-4d88-ab83-09eb22001f57';

