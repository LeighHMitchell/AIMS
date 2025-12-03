-- Add channel_code column to activity_financing_terms table
-- This stores the CRS channel code from the <channel-code> element in <crs-add>

ALTER TABLE activity_financing_terms
ADD COLUMN IF NOT EXISTS channel_code VARCHAR(10);

COMMENT ON COLUMN activity_financing_terms.channel_code IS 
'CRS channel code from IATI <crs-add>/<channel-code> element. OECD-DAC channel of delivery code.';

-- Create index for potential lookups
CREATE INDEX IF NOT EXISTS idx_activity_financing_terms_channel_code 
ON activity_financing_terms(channel_code) 
WHERE channel_code IS NOT NULL;




