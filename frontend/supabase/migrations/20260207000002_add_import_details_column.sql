-- Add import_details JSONB column to track detailed import counts per activity
-- This tracks: budgets, organizations, sectors, locations, contacts, documents imported

ALTER TABLE public.iati_import_batch_items
ADD COLUMN IF NOT EXISTS import_details JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.iati_import_batch_items.import_details IS 'Detailed import counts: {budgets, organizations, sectors, locations, contacts, documents}';
