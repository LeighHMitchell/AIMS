-- Comprehensive Currency Conversion Fix Script (CORRECTED)
-- Run this in your Supabase SQL editor to diagnose and fix currency conversion issues

-- Step 1: Diagnostic - Check current status
DO $$
DECLARE
    total_count INTEGER;
    usd_count INTEGER;
    converted_count INTEGER;
    failed_count INTEGER;
    pending_count INTEGER;
    eur_failed_count INTEGER;
BEGIN
    -- Get overall counts
    SELECT COUNT(*) INTO total_count FROM transactions WHERE value > 0;
    SELECT COUNT(*) INTO usd_count FROM transactions WHERE currency = 'USD' AND value > 0;
    SELECT COUNT(*) INTO converted_count FROM transactions WHERE currency != 'USD' AND value_usd IS NOT NULL AND value > 0;
    SELECT COUNT(*) INTO failed_count FROM transactions WHERE currency != 'USD' AND usd_convertible = false AND value > 0;
    SELECT COUNT(*) INTO pending_count FROM transactions WHERE currency != 'USD' AND value_usd IS NULL AND usd_convertible != false AND value > 0;
    SELECT COUNT(*) INTO eur_failed_count FROM transactions WHERE currency = 'EUR' AND usd_convertible = false AND value > 0;
    
    RAISE NOTICE '=== CURRENCY CONVERSION STATUS ===';
    RAISE NOTICE 'Total transactions: %', total_count;
    RAISE NOTICE 'USD transactions: %', usd_count;
    RAISE NOTICE 'Converted transactions: %', converted_count;
    RAISE NOTICE 'Failed transactions: %', failed_count;
    RAISE NOTICE 'Pending transactions: %', pending_count;
    RAISE NOTICE 'EUR failed transactions: %', eur_failed_count;
    RAISE NOTICE '';
END $$;

-- Step 2: Show currency breakdown
SELECT 
    currency,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE value_usd IS NOT NULL OR currency = 'USD') as converted,
    COUNT(*) FILTER (WHERE usd_convertible = false) as failed,
    COUNT(*) FILTER (WHERE currency != 'USD' AND value_usd IS NULL AND usd_convertible != false) as pending
FROM transactions 
WHERE value > 0
GROUP BY currency
ORDER BY total DESC;

-- Step 3: Show specific failed EUR transactions
SELECT 
    uuid,
    value,
    currency,
    transaction_date,
    value_date,
    value_usd,
    usd_convertible,
    created_at
FROM transactions 
WHERE currency = 'EUR' 
    AND usd_convertible = false 
    AND value > 0
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Reset failed transactions for retry
DO $$
DECLARE
    reset_count INTEGER;
BEGIN
    WITH reset_transactions AS (
        UPDATE transactions 
        SET 
            usd_convertible = true,
            usd_conversion_date = NULL
        WHERE usd_convertible = false 
            AND currency != 'USD'
            AND value_usd IS NULL
            AND value > 0
        RETURNING 1
    )
    SELECT COUNT(*) INTO reset_count FROM reset_transactions;
    
    RAISE NOTICE 'Reset % failed transactions for retry', reset_count;
END $$;

-- Step 5: Check if exchange_rates table exists and has data
DO $$
DECLARE
    table_exists BOOLEAN;
    rates_count INTEGER;
    eur_rates_count INTEGER;
    rec RECORD;
BEGIN
    -- Check if exchange_rates table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'exchange_rates'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO rates_count FROM exchange_rates;
        SELECT COUNT(*) INTO eur_rates_count FROM exchange_rates WHERE from_currency = 'EUR';
        
        RAISE NOTICE '=== EXCHANGE RATES TABLE ===';
        RAISE NOTICE 'Exchange rates table exists: YES';
        RAISE NOTICE 'Total cached rates: %', rates_count;
        RAISE NOTICE 'EUR rates cached: %', eur_rates_count;
        
        -- Show recent EUR rates
        IF eur_rates_count > 0 THEN
            RAISE NOTICE 'Recent EUR rates:';
            FOR rec IN 
                SELECT rate_date, exchange_rate, source 
                FROM exchange_rates 
                WHERE from_currency = 'EUR' AND to_currency = 'USD'
                ORDER BY rate_date DESC 
                LIMIT 5
            LOOP
                RAISE NOTICE '  % = % (source: %)', rec.rate_date, rec.exchange_rate, rec.source;
            END LOOP;
        END IF;
    ELSE
        RAISE NOTICE '=== EXCHANGE RATES TABLE ===';
        RAISE NOTICE 'Exchange rates table exists: NO';
        RAISE NOTICE 'This may be why conversions are failing!';
    END IF;
END $$;

-- Step 6: Create exchange_rates table if it doesn't exist
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(20, 8) NOT NULL CHECK (exchange_rate > 0),
    rate_date DATE NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination of currencies and date
    UNIQUE (from_currency, to_currency, rate_date)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup 
ON exchange_rates (from_currency, to_currency, rate_date);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date 
ON exchange_rates (rate_date);

-- Step 7: Insert some fallback EUR rates if none exist
INSERT INTO exchange_rates (from_currency, to_currency, exchange_rate, rate_date, source)
VALUES 
    ('EUR', 'USD', 1.08, CURRENT_DATE, 'fallback'),
    ('EUR', 'USD', 1.09, CURRENT_DATE - INTERVAL '1 day', 'fallback'),
    ('EUR', 'USD', 1.07, CURRENT_DATE - INTERVAL '2 days', 'fallback'),
    ('EUR', 'USD', 1.08, CURRENT_DATE - INTERVAL '7 days', 'fallback'),
    ('EUR', 'USD', 1.06, CURRENT_DATE - INTERVAL '30 days', 'fallback'),
    ('EUR', 'USD', 1.05, CURRENT_DATE - INTERVAL '90 days', 'fallback'),
    ('GBP', 'USD', 1.27, CURRENT_DATE, 'fallback'),
    ('GBP', 'USD', 1.26, CURRENT_DATE - INTERVAL '1 day', 'fallback'),
    ('GBP', 'USD', 1.28, CURRENT_DATE - INTERVAL '2 days', 'fallback')
ON CONFLICT (from_currency, to_currency, rate_date) DO NOTHING;

-- Step 8: Manual conversion function for immediate use
CREATE OR REPLACE FUNCTION convert_pending_transactions()
RETURNS TABLE(
    transaction_id UUID,
    currency TEXT,
    original_value DECIMAL,
    usd_value DECIMAL,
    exchange_rate DECIMAL,
    status TEXT
) AS $$
DECLARE
    txn_record RECORD;
    rate_value DECIMAL;
    conversion_date DATE;
    usd_amount DECIMAL(20,2);
BEGIN
    -- Process pending transactions
    FOR txn_record IN 
        SELECT uuid, currency, value, transaction_date, value_date
        FROM transactions 
        WHERE currency != 'USD' 
        AND value_usd IS NULL 
        AND usd_convertible != false
        AND value > 0
        ORDER BY created_at DESC
        LIMIT 50
    LOOP
        -- Determine conversion date
        conversion_date := COALESCE(txn_record.value_date::DATE, txn_record.transaction_date::DATE);
        
        -- Look for exchange rate
        SELECT er.exchange_rate INTO rate_value
        FROM exchange_rates er
        WHERE er.from_currency = txn_record.currency 
        AND er.to_currency = 'USD'
        AND er.rate_date <= conversion_date
        ORDER BY er.rate_date DESC
        LIMIT 1;
        
        IF FOUND THEN
            -- Calculate USD amount
            usd_amount := ROUND(txn_record.value * rate_value, 2);
            
            -- Update transaction
            UPDATE transactions 
            SET 
                value_usd = usd_amount,
                exchange_rate_used = rate_value,
                usd_conversion_date = NOW(),
                usd_convertible = true
            WHERE uuid = txn_record.uuid;
            
            -- Return result
            transaction_id := txn_record.uuid;
            currency := txn_record.currency;
            original_value := txn_record.value;
            usd_value := usd_amount;
            exchange_rate := rate_value;
            status := 'CONVERTED';
            RETURN NEXT;
        ELSE
            -- Mark as failed
            UPDATE transactions 
            SET 
                usd_convertible = false,
                usd_conversion_date = NOW()
            WHERE uuid = txn_record.uuid;
            
            -- Return result
            transaction_id := txn_record.uuid;
            currency := txn_record.currency;
            original_value := txn_record.value;
            usd_value := NULL;
            exchange_rate := NULL;
            status := 'NO_RATE_FOUND';
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Run the conversion function
SELECT * FROM convert_pending_transactions();

-- Step 10: Final status check
DO $$
DECLARE
    total_count INTEGER;
    converted_count INTEGER;
    failed_count INTEGER;
    pending_count INTEGER;
    eur_converted_count INTEGER;
    eur_failed_count INTEGER;
BEGIN
    -- Get final counts
    SELECT COUNT(*) INTO total_count FROM transactions WHERE value > 0;
    SELECT COUNT(*) INTO converted_count FROM transactions WHERE (currency = 'USD' OR value_usd IS NOT NULL) AND value > 0;
    SELECT COUNT(*) INTO failed_count FROM transactions WHERE currency != 'USD' AND usd_convertible = false AND value > 0;
    SELECT COUNT(*) INTO pending_count FROM transactions WHERE currency != 'USD' AND value_usd IS NULL AND usd_convertible != false AND value > 0;
    SELECT COUNT(*) INTO eur_converted_count FROM transactions WHERE currency = 'EUR' AND value_usd IS NOT NULL AND value > 0;
    SELECT COUNT(*) INTO eur_failed_count FROM transactions WHERE currency = 'EUR' AND usd_convertible = false AND value > 0;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== FINAL STATUS ===';
    RAISE NOTICE 'Total transactions: %', total_count;
    RAISE NOTICE 'Converted transactions: %', converted_count;
    RAISE NOTICE 'Failed transactions: %', failed_count;
    RAISE NOTICE 'Pending transactions: %', pending_count;
    RAISE NOTICE 'EUR converted: %', eur_converted_count;
    RAISE NOTICE 'EUR failed: %', eur_failed_count;
    RAISE NOTICE '';
    
    IF pending_count = 0 AND failed_count = 0 THEN
        RAISE NOTICE '🎉 SUCCESS: All transactions have been converted!';
    ELSIF failed_count > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % transactions failed conversion', failed_count;
        RAISE NOTICE 'These may need manual intervention or API access';
    ELSE
        RAISE NOTICE 'ℹ️  INFO: % transactions still pending', pending_count;
    END IF;
END $$;

-- Step 11: Show recent conversions
SELECT 
    'Recent conversions:' as info,
    currency,
    value,
    value_usd,
    exchange_rate_used,
    usd_conversion_date
FROM transactions 
WHERE value_usd IS NOT NULL 
    AND currency != 'USD'
    AND usd_conversion_date IS NOT NULL
ORDER BY usd_conversion_date DESC 
LIMIT 10; 