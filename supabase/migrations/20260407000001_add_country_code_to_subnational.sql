-- Add country_code column to subnational_breakdowns for future multi-country support
ALTER TABLE public.subnational_breakdowns
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'MM';

-- Index for querying by country
CREATE INDEX IF NOT EXISTS idx_subnational_country_code
  ON public.subnational_breakdowns(country_code);
