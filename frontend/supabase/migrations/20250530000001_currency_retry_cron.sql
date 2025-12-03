-- ================================================================
-- CURRENCY CONVERSION RETRY CRON JOB
-- ================================================================
-- This migration sets up a scheduled job to retry failed currency conversions
-- 
-- NOTE: Supabase's pg_cron extension can call SQL functions directly.
-- For calling an HTTP endpoint, you would need to use the pg_net extension
-- or set up an external cron service (e.g., Vercel Cron, GitHub Actions).
-- ================================================================

-- ================================================================
-- OPTION 1: Direct SQL-based retry (runs within Postgres)
-- This approach runs the conversion retry logic directly in the database
-- using a stored procedure.
-- ================================================================

-- Create a function to retry failed conversions
-- Note: This is a placeholder - actual conversion logic would need 
-- access to exchange rate APIs which isn't available from within Postgres.
-- Instead, use the API endpoint approach below.

CREATE OR REPLACE FUNCTION retry_pending_currency_conversions()
RETURNS TABLE (
  pending_transactions bigint,
  pending_budgets bigint,
  pending_disbursements bigint,
  total_pending bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::bigint FROM transactions WHERE usd_convertible = false AND exchange_rate_manual IS NOT TRUE),
    (SELECT COUNT(*)::bigint FROM activity_budgets WHERE usd_convertible = false AND exchange_rate_manual IS NOT TRUE),
    (SELECT COUNT(*)::bigint FROM planned_disbursements WHERE usd_convertible = false AND exchange_rate_manual IS NOT TRUE),
    (
      (SELECT COUNT(*) FROM transactions WHERE usd_convertible = false AND exchange_rate_manual IS NOT TRUE) +
      (SELECT COUNT(*) FROM activity_budgets WHERE usd_convertible = false AND exchange_rate_manual IS NOT TRUE) +
      (SELECT COUNT(*) FROM planned_disbursements WHERE usd_convertible = false AND exchange_rate_manual IS NOT TRUE)
    )::bigint;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION retry_pending_currency_conversions IS 
  'Returns count of records pending currency conversion retry. Use GET /api/currency/retry-failed to check status, POST to trigger retry.';

-- ================================================================
-- OPTION 2: HTTP-based retry using pg_net (Recommended for Supabase)
-- ================================================================
-- 
-- To set up hourly retry via Supabase:
-- 
-- 1. Enable pg_cron extension in your Supabase project settings
-- 
-- 2. Use Supabase Edge Functions with scheduled triggers:
--    Create a new Edge Function that calls your retry endpoint
-- 
-- 3. Or use an external cron service like:
--    - Vercel Cron (if hosting on Vercel)
--    - GitHub Actions (free scheduled workflows)
--    - cron-job.org (free cron service)
-- 
-- Example Vercel Cron configuration (add to vercel.json):
-- {
--   "crons": [
--     {
--       "path": "/api/currency/retry-failed",
--       "schedule": "0 * * * *"
--     }
--   ]
-- }
-- 
-- Example GitHub Actions workflow (.github/workflows/retry-currency.yml):
-- name: Retry Currency Conversions
-- on:
--   schedule:
--     - cron: '0 * * * *'  # Every hour
-- jobs:
--   retry:
--     runs-on: ubuntu-latest
--     steps:
--       - name: Call retry endpoint
--         run: |
--           curl -X POST "${{ secrets.APP_URL }}/api/currency/retry-failed" \
--             -H "Content-Type: application/json"
-- ================================================================

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CURRENCY RETRY CRON SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'A function has been created to check pending conversions.';
  RAISE NOTICE '';
  RAISE NOTICE 'To trigger a retry:';
  RAISE NOTICE '  POST /api/currency/retry-failed';
  RAISE NOTICE '';
  RAISE NOTICE 'To check pending count:';
  RAISE NOTICE '  GET /api/currency/retry-failed';
  RAISE NOTICE '  or: SELECT * FROM retry_pending_currency_conversions();';
  RAISE NOTICE '';
  RAISE NOTICE 'For automated hourly retries, set up:';
  RAISE NOTICE '  - Vercel Cron (recommended if using Vercel)';
  RAISE NOTICE '  - GitHub Actions scheduled workflow';
  RAISE NOTICE '  - Or any external cron service';
  RAISE NOTICE '';
END $$;



