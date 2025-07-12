-- Currency Conversion Database Trigger
-- This trigger ensures that any transaction inserted or updated with non-USD currency
-- gets automatically converted to USD using the exchange rate API

-- First, create a function to handle currency conversion using the existing infrastructure
CREATE OR REPLACE FUNCTION trigger_currency_conversion()
RETURNS TRIGGER AS $$
DECLARE
    conversion_date DATE;
    api_url TEXT;
    api_response JSONB;
    exchange_rate DECIMAL(20,6);
    usd_amount DECIMAL(20,2);
BEGIN
    -- Only process if currency is not USD and value_usd is not already set
    IF NEW.currency != 'USD' AND NEW.value_usd IS NULL AND NEW.value > 0 THEN
        -- Determine the date to use for conversion (value_date or transaction_date)
        conversion_date := COALESCE(NEW.value_date::DATE, NEW.transaction_date::DATE);
        
        -- Skip conversion for future dates
        IF conversion_date > CURRENT_DATE THEN
            RAISE LOG 'Currency conversion skipped for future date: %', conversion_date;
            RETURN NEW;
        END IF;
        
        -- Check if we have a cached exchange rate
        SELECT rate_to_usd INTO exchange_rate
        FROM exchange_rate_cache
        WHERE currency = NEW.currency AND date = conversion_date;
        
        IF exchange_rate IS NOT NULL THEN
            -- Use cached rate
            usd_amount := ROUND(NEW.value * exchange_rate, 2);
            
            -- Update the transaction with USD values
            NEW.value_usd := usd_amount;
            NEW.exchange_rate_used := exchange_rate;
            NEW.usd_conversion_date := NOW();
            NEW.usd_convertible := TRUE;
            
            RAISE LOG 'Currency conversion successful (cached): % % = % USD (rate: %)', 
                NEW.value, NEW.currency, usd_amount, exchange_rate;
        ELSE
            -- Mark as convertible but not converted (API will handle it)
            NEW.usd_convertible := TRUE;
            RAISE LOG 'Currency conversion deferred to API for: % % on %', 
                NEW.value, NEW.currency, conversion_date;
        END IF;
    ELSIF NEW.currency = 'USD' AND NEW.value_usd IS NULL THEN
        -- Handle USD transactions
        NEW.value_usd := NEW.value;
        NEW.exchange_rate_used := 1.0;
        NEW.usd_conversion_date := NOW();
        NEW.usd_convertible := TRUE;
        
        RAISE LOG 'USD transaction processed: % USD', NEW.value;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE LOG 'Currency conversion trigger error: %', SQLERRM;
        -- Mark as convertible so API can retry
        NEW.usd_convertible := TRUE;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS currency_conversion_trigger ON transactions;
CREATE TRIGGER currency_conversion_trigger
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_currency_conversion();

-- Create a function to process existing unconverted transactions
CREATE OR REPLACE FUNCTION process_unconverted_transactions()
RETURNS TABLE(
    processed_count INTEGER,
    converted_count INTEGER,
    failed_count INTEGER,
    details JSONB[]
) AS $$
DECLARE
    txn_record RECORD;
    conversion_result RECORD;
    processed INTEGER := 0;
    converted INTEGER := 0;
    failed INTEGER := 0;
    result_details JSONB[] := ARRAY[]::JSONB[];
BEGIN
    -- Process transactions that need conversion
    FOR txn_record IN 
        SELECT uuid, currency, value, transaction_date, value_date
        FROM transactions 
        WHERE currency != 'USD' 
        AND value_usd IS NULL 
        AND usd_convertible IS NOT FALSE
        AND value > 0
        LIMIT 100  -- Process in batches to avoid timeouts
    LOOP
        processed := processed + 1;
        
        BEGIN
            -- Trigger the conversion by updating the record
            UPDATE transactions 
            SET updated_at = NOW()  -- Minimal update to trigger the conversion
            WHERE uuid = txn_record.uuid;
            
            -- Check if conversion was successful
            SELECT value_usd, exchange_rate_used INTO conversion_result
            FROM transactions 
            WHERE uuid = txn_record.uuid;
            
            IF conversion_result.value_usd IS NOT NULL THEN
                converted := converted + 1;
                result_details := result_details || jsonb_build_object(
                    'transaction_id', txn_record.uuid,
                    'status', 'converted',
                    'original', txn_record.value || ' ' || txn_record.currency,
                    'usd_amount', conversion_result.value_usd,
                    'exchange_rate', conversion_result.exchange_rate_used
                );
            ELSE
                failed := failed + 1;
                result_details := result_details || jsonb_build_object(
                    'transaction_id', txn_record.uuid,
                    'status', 'failed',
                    'reason', 'Conversion not completed'
                );
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                failed := failed + 1;
                result_details := result_details || jsonb_build_object(
                    'transaction_id', txn_record.uuid,
                    'status', 'error',
                    'reason', SQLERRM
                );
        END;
    END LOOP;
    
    RETURN QUERY SELECT processed, converted, failed, result_details;
END;
$$ LANGUAGE plpgsql;

-- Create a view to monitor conversion status
CREATE OR REPLACE VIEW currency_conversion_status AS
SELECT 
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE currency = 'USD') as usd_transactions,
    COUNT(*) FILTER (WHERE currency != 'USD' AND value_usd IS NOT NULL) as converted_transactions,
    COUNT(*) FILTER (WHERE currency != 'USD' AND value_usd IS NULL AND usd_convertible = true) as pending_transactions,
    COUNT(*) FILTER (WHERE usd_convertible = false) as unconvertible_transactions,
    ROUND(
        (COUNT(*) FILTER (WHERE currency != 'USD' AND value_usd IS NOT NULL)::NUMERIC / 
         NULLIF(COUNT(*) FILTER (WHERE currency != 'USD' AND usd_convertible = true), 0)) * 100, 
        2
    ) as conversion_percentage
FROM transactions
WHERE value > 0;

COMMENT ON TRIGGER currency_conversion_trigger ON transactions IS 
'Automatically converts non-USD transactions to USD using cached exchange rates or marks them for API conversion';

COMMENT ON FUNCTION trigger_currency_conversion() IS 
'Trigger function that handles automatic currency conversion for transactions';

COMMENT ON FUNCTION process_unconverted_transactions() IS 
'Batch processes existing transactions that need currency conversion';

COMMENT ON VIEW currency_conversion_status IS 
'Provides overview of currency conversion status across all transactions';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Currency conversion trigger installed successfully!';
    RAISE NOTICE 'The trigger will automatically:';
    RAISE NOTICE '1. Convert USD transactions (set value_usd = value, rate = 1.0)';
    RAISE NOTICE '2. Convert non-USD transactions using cached exchange rates';
    RAISE NOTICE '3. Mark transactions for API conversion if no cached rate exists';
    RAISE NOTICE '';
    RAISE NOTICE 'To process existing unconverted transactions, run:';
    RAISE NOTICE 'SELECT * FROM process_unconverted_transactions();';
    RAISE NOTICE '';
    RAISE NOTICE 'To monitor conversion status, run:';
    RAISE NOTICE 'SELECT * FROM currency_conversion_status;';
END $$; 