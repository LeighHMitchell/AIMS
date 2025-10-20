-- ================================================================
-- CONVERT EXISTING TRANSACTIONS TO USD
-- ================================================================
-- This script converts existing transactions that are missing USD values
-- Uses the existing convert_pending_transactions() function
-- ================================================================

DO $$ 
DECLARE
    conversion_results RECORD;
    total_converted INTEGER := 0;
    total_failed INTEGER := 0;
    batch_size INTEGER := 50;
    max_batches INTEGER := 20; -- Prevent infinite loops
    current_batch INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONVERTING EXISTING TRANSACTIONS TO USD';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Check how many transactions need conversion
    SELECT COUNT(*) INTO total_converted
    FROM transactions 
    WHERE currency != 'USD' 
    AND value_usd IS NULL 
    AND usd_convertible != false
    AND value > 0;
    
    RAISE NOTICE 'Found % transactions that need USD conversion', total_converted;
    
    IF total_converted = 0 THEN
        RAISE NOTICE 'No transactions need conversion. Exiting.';
        RETURN;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Starting batch conversion (% transactions per batch)...', batch_size;
    RAISE NOTICE '';

    -- Process transactions in batches using the existing function
    WHILE current_batch < max_batches LOOP
        current_batch := current_batch + 1;
        
        RAISE NOTICE 'Processing batch %/%...', current_batch, max_batches;
        
        -- Call the existing conversion function
        SELECT 
            COUNT(*) FILTER (WHERE status = 'CONVERTED') as converted_count,
            COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count
        INTO conversion_results
        FROM convert_pending_transactions();
        
        IF conversion_results.converted_count = 0 AND conversion_results.failed_count = 0 THEN
            RAISE NOTICE 'No more transactions to process. Stopping.';
            EXIT;
        END IF;
        
        total_converted := total_converted + conversion_results.converted_count;
        total_failed := total_failed + conversion_results.failed_count;
        
        RAISE NOTICE 'Batch % complete: % converted, % failed', 
            current_batch, conversion_results.converted_count, conversion_results.failed_count;
        
        -- Small delay between batches
        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONVERSION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total converted: %', total_converted;
    RAISE NOTICE 'Total failed: %', total_failed;
    RAISE NOTICE 'Batches processed: %', current_batch;
    
    -- Final verification
    SELECT COUNT(*) INTO total_converted
    FROM transactions 
    WHERE currency != 'USD' 
    AND value_usd IS NULL 
    AND usd_convertible != false
    AND value > 0;
    
    RAISE NOTICE 'Remaining unconverted: %', total_converted;
    
    IF total_converted > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE 'NOTE: Some transactions could not be converted.';
        RAISE NOTICE 'This may be due to missing exchange rates for their dates/currencies.';
        RAISE NOTICE 'You can run this script again later when more exchange rates are available.';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '✅ All transactions successfully converted to USD!';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Show sample of converted transactions
SELECT 
    uuid,
    currency,
    value as original_value,
    value_usd,
    exchange_rate_used,
    usd_conversion_date,
    transaction_date
FROM transactions 
WHERE value_usd IS NOT NULL 
AND currency != 'USD'
ORDER BY usd_conversion_date DESC 
LIMIT 10;
