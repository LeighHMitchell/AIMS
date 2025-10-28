-- Add iati_import_preferences column to organizations
-- Stores fine-grained IATI import toggle preferences per organization

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS iati_import_preferences JSONB;

COMMENT ON COLUMN organizations.iati_import_preferences IS 'Per-org IATI import field toggle preferences (JSON: {version:number, fields: object})';


