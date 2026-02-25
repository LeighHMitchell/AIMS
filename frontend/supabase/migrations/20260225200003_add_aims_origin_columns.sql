-- Add origin tracking columns to activities table for AIMS integration
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS origin text DEFAULT 'donor';
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS project_bank_id uuid;
