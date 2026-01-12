-- Migration: Add USD conversion fields to organization_funding_envelopes
-- Adds value_date for exchange rate calculation and tracking fields for USD conversion

-- Add value_date column for exchange rate calculation
ALTER TABLE organization_funding_envelopes
ADD COLUMN IF NOT EXISTS value_date DATE;

-- Add year_type column for calendar vs fiscal year
ALTER TABLE organization_funding_envelopes
ADD COLUMN IF NOT EXISTS year_type TEXT DEFAULT 'calendar' CHECK (year_type IN ('calendar', 'fiscal'));

-- Add fiscal_year_start_month column
ALTER TABLE organization_funding_envelopes
ADD COLUMN IF NOT EXISTS fiscal_year_start_month INTEGER CHECK (fiscal_year_start_month IS NULL OR (fiscal_year_start_month >= 1 AND fiscal_year_start_month <= 12));

-- Add exchange rate tracking fields (same pattern as transactions)
ALTER TABLE organization_funding_envelopes
ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(18,8);

ALTER TABLE organization_funding_envelopes
ADD COLUMN IF NOT EXISTS usd_conversion_date TIMESTAMPTZ;

ALTER TABLE organization_funding_envelopes
ADD COLUMN IF NOT EXISTS usd_convertible BOOLEAN DEFAULT true;

-- Add comments for the new columns
COMMENT ON COLUMN organization_funding_envelopes.value_date IS 'Date used for exchange rate calculation when converting to USD';
COMMENT ON COLUMN organization_funding_envelopes.year_type IS 'Type of year: calendar (Jan-Dec) or fiscal (organisation-specific)';
COMMENT ON COLUMN organization_funding_envelopes.fiscal_year_start_month IS 'Month when fiscal year starts (1-12), only applicable when year_type is fiscal';
COMMENT ON COLUMN organization_funding_envelopes.exchange_rate_used IS 'Exchange rate used for USD conversion';
COMMENT ON COLUMN organization_funding_envelopes.usd_conversion_date IS 'Timestamp when USD conversion was performed';
COMMENT ON COLUMN organization_funding_envelopes.usd_convertible IS 'Whether the currency can be converted to USD';

-- Create index on value_date for potential exchange rate lookups
CREATE INDEX IF NOT EXISTS idx_org_funding_envelope_value_date ON organization_funding_envelopes(value_date);
