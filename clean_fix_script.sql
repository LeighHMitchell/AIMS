-- Fix problematic transaction references

-- 1. Convert empty string references to NULL (allows multiple NULL values in unique constraint)
UPDATE transactions 
SET transaction_reference = NULL 
WHERE transaction_reference = '';

-- 2. For duplicate non-empty references within the same activity, 
--    keep the first one and regenerate others
DO $$
DECLARE
    rec RECORD;
    new_ref TEXT;
    counter INTEGER;
BEGIN
    -- Find all duplicate references within activities
    FOR rec IN 
        SELECT activity_id, transaction_reference, array_agg(uuid ORDER BY created_at) as uuids
        FROM transactions 
        WHERE transaction_reference IS NOT NULL 
          AND transaction_reference != ''
        GROUP BY activity_id, transaction_reference
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first transaction, update the rest
        counter := 1;
        
        -- Skip the first UUID (keep original reference)
        FOR i IN 2..array_length(rec.uuids, 1) LOOP
            -- Generate new reference
            new_ref := rec.transaction_reference || '-DUP-' || counter::text;
            
            -- Make sure the new reference is unique
            WHILE EXISTS (
                SELECT 1 FROM transactions 
                WHERE transaction_reference = new_ref 
                AND activity_id = rec.activity_id
            ) LOOP
                counter := counter + 1;
                new_ref := rec.transaction_reference || '-DUP-' || counter::text;
            END LOOP;
            
            -- Update the duplicate transaction
            UPDATE transactions 
            SET transaction_reference = new_ref
            WHERE uuid = rec.uuids[i];
            
            RAISE NOTICE 'Updated transaction % with new reference: %', rec.uuids[i], new_ref;
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- 3. Report on the cleanup
SELECT 'Empty references converted to NULL' as action, COUNT(*) as count
FROM transactions 
WHERE transaction_reference IS NULL

UNION ALL

SELECT 'Remaining duplicate references' as action, COUNT(*) as count
FROM (
    SELECT activity_id, transaction_reference
    FROM transactions 
    WHERE transaction_reference IS NOT NULL 
      AND transaction_reference != ''
    GROUP BY activity_id, transaction_reference
    HAVING COUNT(*) > 1
) duplicates;
