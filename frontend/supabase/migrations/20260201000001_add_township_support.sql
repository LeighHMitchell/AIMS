-- Add township-level support to subnational_breakdowns table
-- This migration adds columns to support township-level allocations while maintaining
-- backwards compatibility with existing region-level data.

-- Add new columns (non-breaking, backwards compatible)
ALTER TABLE public.subnational_breakdowns
  ADD COLUMN IF NOT EXISTS allocation_level TEXT DEFAULT 'region'
    CHECK (allocation_level IN ('region', 'township'));

ALTER TABLE public.subnational_breakdowns
  ADD COLUMN IF NOT EXISTS st_pcode TEXT;

ALTER TABLE public.subnational_breakdowns
  ADD COLUMN IF NOT EXISTS ts_pcode TEXT;

-- Indexes for pcode lookups
CREATE INDEX IF NOT EXISTS idx_subnational_st_pcode
  ON public.subnational_breakdowns(st_pcode);

CREATE INDEX IF NOT EXISTS idx_subnational_ts_pcode
  ON public.subnational_breakdowns(ts_pcode);

CREATE INDEX IF NOT EXISTS idx_subnational_allocation_level
  ON public.subnational_breakdowns(allocation_level);

-- Backfill existing records to have 'region' allocation_level
UPDATE public.subnational_breakdowns
SET allocation_level = 'region'
WHERE allocation_level IS NULL;

-- Add comment to document the columns
COMMENT ON COLUMN public.subnational_breakdowns.allocation_level IS 'Level of allocation: region (State/Region) or township';
COMMENT ON COLUMN public.subnational_breakdowns.st_pcode IS 'MIMU State/Region PCode (e.g., MMR001 for Kachin)';
COMMENT ON COLUMN public.subnational_breakdowns.ts_pcode IS 'MIMU Township PCode (e.g., MMR001001 for Bhamo), only set for township-level allocations';
