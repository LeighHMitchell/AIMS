-- Track which FX strategy produced the stored usd_amount for a planned disbursement.
-- NULL means "not converted yet" (covers future-dated entries waiting for cron backfill
-- and entries that were genuinely unconvertible). The values mirror ConversionResult.source
-- returned by fixedCurrencyConverter in frontend/src/lib/currency-converter-fixed.ts:
--   'direct'               -> amount was already USD
--   'cache' | 'api'        -> exact-date rate (authoritative)
--   'manual'               -> user-supplied rate
--   'cache-nearby'         -> nearest cached rate within 30 days
--   'historical-fallback'  -> any cached rate on/before target (>1y old dates)
--   'current-fallback'     -> today's rate used as last resort
-- The UI treats the last three as "estimated" and shows a badge.

ALTER TABLE planned_disbursements
  ADD COLUMN IF NOT EXISTS usd_rate_source VARCHAR(32);

COMMENT ON COLUMN planned_disbursements.usd_rate_source IS
  'Source strategy used to derive usd_amount. NULL = not converted yet (future-dated or failed).';
