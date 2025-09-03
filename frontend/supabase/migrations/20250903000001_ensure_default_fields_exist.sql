-- Ensure all default fields exist in activities table
-- This migration adds any missing default columns for the Finances tab

-- Add default_aid_type if it doesn't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_aid_type VARCHAR(10) NULL;
COMMENT ON COLUMN activities.default_aid_type IS 'Default IATI Aid Type code for transactions';

-- Add default_finance_type if it doesn't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_finance_type VARCHAR(10) NULL;
COMMENT ON COLUMN activities.default_finance_type IS 'Default IATI Finance Type code for transactions';

-- Add default_flow_type if it doesn't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_flow_type VARCHAR(10) NULL;
COMMENT ON COLUMN activities.default_flow_type IS 'Default IATI Flow Type code for transactions';

-- Add default_currency if it doesn't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) NULL;
COMMENT ON COLUMN activities.default_currency IS 'Default ISO 3-letter currency code for transactions';

-- Add default_tied_status if it doesn't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_tied_status VARCHAR(10) NULL;
COMMENT ON COLUMN activities.default_tied_status IS 'Default tied status for transactions';

-- Add modality fields if they don't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_modality VARCHAR(10) NULL;
COMMENT ON COLUMN activities.default_modality IS 'Default calculated modality based on aid type and finance type';

ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_modality_override BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN activities.default_modality_override IS 'Whether the default modality has been manually overridden';