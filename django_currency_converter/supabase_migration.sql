-- Migration to add USD conversion fields to your transactions table
-- Run this in your Supabase SQL editor

-- Add the 4 required fields to your transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS value_usd DECIMAL(20,2),
ADD COLUMN IF NOT EXISTS usd_convertible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS usd_conversion_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(20,6);

-- Add helpful comments
COMMENT ON COLUMN transactions.value_usd IS 'Transaction value converted to USD using historical exchange rate';
COMMENT ON COLUMN transactions.usd_convertible IS 'Indicates if the currency can be converted to USD';
COMMENT ON COLUMN transactions.usd_conversion_date IS 'Timestamp when USD conversion was performed';
COMMENT ON COLUMN transactions.exchange_rate_used IS 'Exchange rate used for USD conversion';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_usd_convertible ON transactions(usd_convertible);
CREATE INDEX IF NOT EXISTS idx_transactions_value_usd ON transactions(value_usd) WHERE value_usd IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);

-- Create the supporting tables for the currency converter

-- Table to cache exchange rates
CREATE TABLE IF NOT EXISTS exchange_rate_cache (
    id SERIAL PRIMARY KEY,
    currency VARCHAR(3) NOT NULL,
    date DATE NOT NULL,
    rate_to_usd DECIMAL(20,6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(currency, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rate_cache_currency_date ON exchange_rate_cache(currency, date);

-- Table to track supported currencies
CREATE TABLE IF NOT EXISTS supported_currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_supported BOOLEAN DEFAULT true,
    last_checked TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for supported currencies
CREATE INDEX IF NOT EXISTS idx_supported_currencies_code ON supported_currencies(code);
CREATE INDEX IF NOT EXISTS idx_supported_currencies_supported ON supported_currencies(is_supported);

-- Insert common supported currencies
INSERT INTO supported_currencies (code, name, is_supported) VALUES
('USD', 'US Dollar', true),
('EUR', 'Euro', true),
('GBP', 'British Pound', true),
('JPY', 'Japanese Yen', true),
('AUD', 'Australian Dollar', true),
('CAD', 'Canadian Dollar', true),
('CHF', 'Swiss Franc', true),
('CNY', 'Chinese Yuan', true),
('SEK', 'Swedish Krona', true),
('NZD', 'New Zealand Dollar', true),
('MXN', 'Mexican Peso', true),
('SGD', 'Singapore Dollar', true),
('HKD', 'Hong Kong Dollar', true),
('NOK', 'Norwegian Krone', true),
('INR', 'Indian Rupee', true),
('BRL', 'Brazilian Real', true),
('ZAR', 'South African Rand', true),
('KRW', 'South Korean Won', true),
('THB', 'Thai Baht', true),
('MYR', 'Malaysian Ringgit', true)
ON CONFLICT (code) DO NOTHING;

-- Create a function to check if a transaction needs USD conversion
CREATE OR REPLACE FUNCTION needs_usd_conversion(transaction_row transactions)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        transaction_row.value_usd IS NULL AND 
        transaction_row.currency != 'USD' AND
        transaction_row.value IS NOT NULL AND
        transaction_row.value > 0
    );
END;
$$ LANGUAGE plpgsql;

-- Create a view to show conversion status
CREATE OR REPLACE VIEW transaction_conversion_status AS
SELECT 
    t.*,
    CASE 
        WHEN t.currency = 'USD' THEN 'native_usd'
        WHEN t.value_usd IS NOT NULL THEN 'converted'
        WHEN t.usd_convertible = false THEN 'unconvertible'
        ELSE 'pending'
    END as conversion_status,
    CASE 
        WHEN t.exchange_rate_used IS NOT NULL AND t.currency != 'USD' 
        THEN '1 ' || t.currency || ' = ' || t.exchange_rate_used || ' USD'
        ELSE NULL
    END as exchange_rate_display
FROM transactions t;

-- Create a function to get conversion statistics
CREATE OR REPLACE FUNCTION get_conversion_stats()
RETURNS TABLE(
    total_transactions BIGINT,
    converted_transactions BIGINT,
    unconvertible_transactions BIGINT,
    pending_transactions BIGINT,
    usd_transactions BIGINT,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE value_usd IS NOT NULL AND currency != 'USD') as converted_transactions,
        COUNT(*) FILTER (WHERE usd_convertible = false) as unconvertible_transactions,
        COUNT(*) FILTER (WHERE value_usd IS NULL AND usd_convertible = true AND currency != 'USD') as pending_transactions,
        COUNT(*) FILTER (WHERE currency = 'USD') as usd_transactions,
        CASE 
            WHEN COUNT(*) FILTER (WHERE currency != 'USD' AND usd_convertible = true) > 0 
            THEN ROUND(
                (COUNT(*) FILTER (WHERE value_usd IS NOT NULL AND currency != 'USD')::NUMERIC / 
                 COUNT(*) FILTER (WHERE currency != 'USD' AND usd_convertible = true)::NUMERIC) * 100, 
                2
            )
            ELSE 0
        END as conversion_rate
    FROM transactions;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for the conversion status view
CREATE INDEX IF NOT EXISTS idx_transactions_conversion_status ON transactions(
    CASE 
        WHEN currency = 'USD' THEN 'native_usd'
        WHEN value_usd IS NOT NULL THEN 'converted'
        WHEN usd_convertible = false THEN 'unconvertible'
        ELSE 'pending'
    END
);

-- Update trigger to maintain updated_at on exchange_rate_cache
CREATE OR REPLACE FUNCTION update_exchange_rate_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exchange_rate_cache_updated_at
    BEFORE UPDATE ON exchange_rate_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_exchange_rate_cache_updated_at();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Currency conversion migration completed successfully!';
    RAISE NOTICE 'Added 4 fields to transactions table:';
    RAISE NOTICE '- value_usd (stores USD converted amount)';
    RAISE NOTICE '- usd_convertible (indicates if currency can be converted)';
    RAISE NOTICE '- usd_conversion_date (timestamp of conversion)';
    RAISE NOTICE '- exchange_rate_used (rate used for conversion)';
    RAISE NOTICE '';
    RAISE NOTICE 'Created supporting tables:';
    RAISE NOTICE '- exchange_rate_cache (caches exchange rates)';
    RAISE NOTICE '- supported_currencies (tracks supported currencies)';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now run: SELECT * FROM get_conversion_stats();';
END $$;