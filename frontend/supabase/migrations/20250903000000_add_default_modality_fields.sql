-- Add default_modality and default_modality_override columns to activities table
-- This aligns the Supabase schema with the Django backend schema

-- Add default_modality column (integer field for modality codes 1-5)
ALTER TABLE activities 
ADD COLUMN default_modality integer;

-- Add default_modality_override column (boolean field)
ALTER TABLE activities 
ADD COLUMN default_modality_override boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN activities.default_modality IS 'Default aid modality code: 1=Grant, 2=Loan, 3=Grant-TA, 4=Loan-TA, 5=Other';
COMMENT ON COLUMN activities.default_modality_override IS 'Whether to override automatic modality calculation';
