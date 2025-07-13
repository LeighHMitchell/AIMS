-- Migration: Add usd_amount column to planned_disbursements
ALTER TABLE planned_disbursements
ADD COLUMN usd_amount numeric;

-- Optionally, you may want to backfill this column for existing rows using your currency conversion logic in a separate script. 