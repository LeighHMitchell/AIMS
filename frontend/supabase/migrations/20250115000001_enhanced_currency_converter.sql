-- Enhanced Currency Converter Migration
-- Creates tables for caching historical exchange rates from ExchangeRate.host
-- Updates supported currencies table structure

-- Create exchange_rates table for caching historical rates
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(20, 8) NOT NULL CHECK (exchange_rate > 0),
  rate_date DATE NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'exchangerate.host',
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique combination of currencies and date
  UNIQUE (from_currency, to_currency, rate_date)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup 
ON exchange_rates (from_currency, to_currency, rate_date);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date 
ON exchange_rates (rate_date);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched_at 
ON exchange_rates (fetched_at);

-- Handle supported_currencies table creation/update more carefully
DO $$
BEGIN
  -- Check if supported_currencies table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'supported_currencies') THEN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'supported_currencies' AND column_name = 'last_checked') THEN
      ALTER TABLE supported_currencies ADD COLUMN last_checked TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'supported_currencies' AND column_name = 'updated_at') THEN
      ALTER TABLE supported_currencies ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Ensure required columns exist with proper types
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'supported_currencies' AND column_name = 'code') THEN
      ALTER TABLE supported_currencies ADD COLUMN code VARCHAR(3) NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'supported_currencies' AND column_name = 'name') THEN
      ALTER TABLE supported_currencies ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'supported_currencies' AND column_name = 'is_supported') THEN
      ALTER TABLE supported_currencies ADD COLUMN is_supported BOOLEAN NOT NULL DEFAULT true;
    END IF;
    
    -- Add unique constraint on code if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE table_name = 'supported_currencies' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%code%') THEN
      ALTER TABLE supported_currencies ADD CONSTRAINT supported_currencies_code_unique UNIQUE (code);
    END IF;
    
  ELSE
    -- Create supported_currencies table from scratch
    CREATE TABLE supported_currencies (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      code VARCHAR(3) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      is_supported BOOLEAN NOT NULL DEFAULT true,
      last_checked TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
  
  -- Create indexes if they don't exist
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'supported_currencies' AND indexname = 'idx_supported_currencies_code') THEN
    CREATE INDEX idx_supported_currencies_code ON supported_currencies (code);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'supported_currencies' AND indexname = 'idx_supported_currencies_supported') THEN
    CREATE INDEX idx_supported_currencies_supported ON supported_currencies (is_supported);
  END IF;
END $$;

-- Remove old exchange_rate_cache table if it exists (from previous implementation)
DROP TABLE IF EXISTS exchange_rate_cache;

-- Insert comprehensive list of supported currencies (with proper conflict handling)
DO $$
BEGIN
  -- Insert currencies one by one to handle any potential issues
  INSERT INTO supported_currencies (code, name, is_supported, last_checked) VALUES
    -- Major currencies
    ('USD', 'US Dollar', true, CURRENT_TIMESTAMP),
    ('EUR', 'Euro', true, CURRENT_TIMESTAMP),
    ('GBP', 'British Pound', true, CURRENT_TIMESTAMP),
    ('JPY', 'Japanese Yen', true, CURRENT_TIMESTAMP),
    ('AUD', 'Australian Dollar', true, CURRENT_TIMESTAMP),
    ('CAD', 'Canadian Dollar', true, CURRENT_TIMESTAMP),
    ('CHF', 'Swiss Franc', true, CURRENT_TIMESTAMP),
    ('CNY', 'Chinese Yuan', true, CURRENT_TIMESTAMP),
    ('SEK', 'Swedish Krona', true, CURRENT_TIMESTAMP),
    ('NZD', 'New Zealand Dollar', true, CURRENT_TIMESTAMP),
    
    -- Asian currencies
    ('SGD', 'Singapore Dollar', true, CURRENT_TIMESTAMP),
    ('HKD', 'Hong Kong Dollar', true, CURRENT_TIMESTAMP),
    ('KRW', 'South Korean Won', true, CURRENT_TIMESTAMP),
    ('INR', 'Indian Rupee', true, CURRENT_TIMESTAMP),
    ('THB', 'Thai Baht', true, CURRENT_TIMESTAMP),
    ('MYR', 'Malaysian Ringgit', true, CURRENT_TIMESTAMP),
    ('PHP', 'Philippine Peso', true, CURRENT_TIMESTAMP),
    ('IDR', 'Indonesian Rupiah', true, CURRENT_TIMESTAMP),
    ('VND', 'Vietnamese Dong', true, CURRENT_TIMESTAMP),
    ('LKR', 'Sri Lankan Rupee', true, CURRENT_TIMESTAMP),
    ('PKR', 'Pakistani Rupee', true, CURRENT_TIMESTAMP),
    ('BDT', 'Bangladeshi Taka', true, CURRENT_TIMESTAMP),
    ('NPR', 'Nepalese Rupee', true, CURRENT_TIMESTAMP),
    ('MMK', 'Myanmar Kyat', true, CURRENT_TIMESTAMP),
    ('KHR', 'Cambodian Riel', true, CURRENT_TIMESTAMP),
    ('LAK', 'Lao Kip', true, CURRENT_TIMESTAMP),
    
    -- European currencies
    ('NOK', 'Norwegian Krone', true, CURRENT_TIMESTAMP),
    ('DKK', 'Danish Krone', true, CURRENT_TIMESTAMP),
    ('PLN', 'Polish Zloty', true, CURRENT_TIMESTAMP),
    ('CZK', 'Czech Koruna', true, CURRENT_TIMESTAMP),
    ('HUF', 'Hungarian Forint', true, CURRENT_TIMESTAMP),
    ('RON', 'Romanian Leu', true, CURRENT_TIMESTAMP),
    ('BGN', 'Bulgarian Lev', true, CURRENT_TIMESTAMP),
    ('HRK', 'Croatian Kuna', true, CURRENT_TIMESTAMP),
    ('TRY', 'Turkish Lira', true, CURRENT_TIMESTAMP),
    ('RUB', 'Russian Ruble', true, CURRENT_TIMESTAMP),
    
    -- Americas currencies
    ('MXN', 'Mexican Peso', true, CURRENT_TIMESTAMP),
    ('BRL', 'Brazilian Real', true, CURRENT_TIMESTAMP),
    ('ARS', 'Argentine Peso', true, CURRENT_TIMESTAMP),
    ('CLP', 'Chilean Peso', true, CURRENT_TIMESTAMP),
    ('COP', 'Colombian Peso', true, CURRENT_TIMESTAMP),
    ('PEN', 'Peruvian Sol', true, CURRENT_TIMESTAMP),
    ('UYU', 'Uruguayan Peso', true, CURRENT_TIMESTAMP),
    ('BOB', 'Bolivian Boliviano', true, CURRENT_TIMESTAMP),
    ('PYG', 'Paraguayan Guarani', true, CURRENT_TIMESTAMP),
    
    -- African currencies
    ('ZAR', 'South African Rand', true, CURRENT_TIMESTAMP),
    ('NGN', 'Nigerian Naira', true, CURRENT_TIMESTAMP),
    ('GHS', 'Ghanaian Cedi', true, CURRENT_TIMESTAMP),
    ('KES', 'Kenyan Shilling', true, CURRENT_TIMESTAMP),
    ('UGX', 'Ugandan Shilling', true, CURRENT_TIMESTAMP),
    ('TZS', 'Tanzanian Shilling', true, CURRENT_TIMESTAMP),
    ('RWF', 'Rwandan Franc', true, CURRENT_TIMESTAMP),
    ('ETB', 'Ethiopian Birr', true, CURRENT_TIMESTAMP),
    ('EGP', 'Egyptian Pound', true, CURRENT_TIMESTAMP),
    ('MAD', 'Moroccan Dirham', true, CURRENT_TIMESTAMP),
    ('TND', 'Tunisian Dinar', true, CURRENT_TIMESTAMP),
    ('DZD', 'Algerian Dinar', true, CURRENT_TIMESTAMP),
    
    -- Middle East currencies
    ('AED', 'UAE Dirham', true, CURRENT_TIMESTAMP),
    ('SAR', 'Saudi Riyal', true, CURRENT_TIMESTAMP),
    ('QAR', 'Qatari Riyal', true, CURRENT_TIMESTAMP),
    ('KWD', 'Kuwaiti Dinar', true, CURRENT_TIMESTAMP),
    ('BHD', 'Bahraini Dinar', true, CURRENT_TIMESTAMP),
    ('OMR', 'Omani Rial', true, CURRENT_TIMESTAMP),
    ('JOD', 'Jordanian Dinar', true, CURRENT_TIMESTAMP),
    ('LBP', 'Lebanese Pound', true, CURRENT_TIMESTAMP),
    ('ILS', 'Israeli Shekel', true, CURRENT_TIMESTAMP),
    ('IRR', 'Iranian Rial', true, CURRENT_TIMESTAMP),
    ('IQD', 'Iraqi Dinar', true, CURRENT_TIMESTAMP),
    ('AFN', 'Afghan Afghani', true, CURRENT_TIMESTAMP),
    ('YER', 'Yemeni Rial', true, CURRENT_TIMESTAMP),
    ('SYP', 'Syrian Pound', true, CURRENT_TIMESTAMP),
    
    -- Other currencies
    ('BTN', 'Bhutanese Ngultrum', true, CURRENT_TIMESTAMP),
    ('MVR', 'Maldivian Rufiyaa', true, CURRENT_TIMESTAMP)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    is_supported = EXCLUDED.is_supported,
    last_checked = EXCLUDED.last_checked,
    updated_at = CURRENT_TIMESTAMP;
    
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting currencies: %', SQLERRM;
    -- Continue with migration even if currency insert fails
END $$;

-- Add RLS policies for exchange_rates table
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policy for reading exchange rates (allow all authenticated users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exchange_rates' 
    AND policyname = 'Allow read access to exchange rates'
  ) THEN
    CREATE POLICY "Allow read access to exchange rates" ON exchange_rates
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Policy for inserting/updating exchange rates (allow service role only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exchange_rates' 
    AND policyname = 'Allow service role to manage exchange rates'
  ) THEN
    CREATE POLICY "Allow service role to manage exchange rates" ON exchange_rates
      FOR ALL TO service_role
      USING (true);
  END IF;
END $$;

-- Add RLS policies for supported_currencies table if not exists
DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'supported_currencies' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE supported_currencies ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'supported_currencies' 
    AND policyname = 'Allow read access to supported currencies'
  ) THEN
    CREATE POLICY "Allow read access to supported currencies" ON supported_currencies
      FOR SELECT TO authenticated
      USING (true);
  END IF;
      
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'supported_currencies' 
    AND policyname = 'Allow service role to manage supported currencies'
  ) THEN
    CREATE POLICY "Allow service role to manage supported currencies" ON supported_currencies
      FOR ALL TO service_role
      USING (true);
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_exchange_rates_updated_at ON exchange_rates;
CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supported_currencies_updated_at ON supported_currencies;
CREATE TRIGGER update_supported_currencies_updated_at
  BEFORE UPDATE ON supported_currencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE exchange_rates IS 'Cache for historical exchange rates from ExchangeRate.host API';
COMMENT ON COLUMN exchange_rates.exchange_rate IS 'Exchange rate from from_currency to to_currency';
COMMENT ON COLUMN exchange_rates.source IS 'Source of the exchange rate data';
COMMENT ON COLUMN exchange_rates.fetched_at IS 'When this rate was fetched from the API';

COMMENT ON TABLE supported_currencies IS 'List of currencies supported for conversion';
COMMENT ON COLUMN supported_currencies.last_checked IS 'When this currency support was last verified'; 