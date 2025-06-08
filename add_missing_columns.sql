-- Add missing columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS org_classification_override boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS org_classification_manual text;

-- Update existing records to have default values
UPDATE organizations 
SET org_classification_override = false 
WHERE org_classification_override IS NULL; 