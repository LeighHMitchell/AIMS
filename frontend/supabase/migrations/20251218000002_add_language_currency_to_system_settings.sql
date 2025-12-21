-- Add default_language and default_currency columns to system_settings table

-- Add the new columns
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS default_language VARCHAR(5) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'USD';

-- Update existing row with defaults if columns were just added
UPDATE system_settings
SET default_language = COALESCE(default_language, 'en'),
    default_currency = COALESCE(default_currency, 'USD')
WHERE id = 1;

COMMENT ON COLUMN system_settings.default_language IS 'Default language for the system interface (ISO 639-1 code)';
COMMENT ON COLUMN system_settings.default_currency IS 'Default currency for financial data (ISO 4217 code)';
