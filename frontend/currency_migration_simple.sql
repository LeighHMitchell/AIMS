-- Simple migration to add only the missing USD conversion fields
-- Run this in your Supabase SQL editor

-- Add the 4 required fields to your transactions table (only if they don't exist)
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

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_transactions_usd_convertible ON transactions(usd_convertible);
CREATE INDEX IF NOT EXISTS idx_transactions_value_usd ON transactions(value_usd) WHERE value_usd IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Currency conversion fields added successfully!';
    RAISE NOTICE 'Added 4 fields to transactions table:';
    RAISE NOTICE '- value_usd (stores USD converted amount)';
    RAISE NOTICE '- usd_convertible (indicates if currency can be converted)';
    RAISE NOTICE '- usd_conversion_date (timestamp of conversion)';
    RAISE NOTICE '- exchange_rate_used (rate used for conversion)';
END $$;