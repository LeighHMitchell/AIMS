# Plan 005 operator steps

1. Apply frontend/supabase/migrations/20260612010000_save_activity_transactions_rpc.sql
   to the Supabase project (SQL editor or `supabase db push`). Deploy order is safe
   either way: the code falls back to the legacy path until the function exists
   (log marker: "[AIMS] save_activity_transactions RPC missing").
   ALSO apply 20260612000000_is_humanitarian_nullable.sql (plan 007) if not yet applied.
2. Post-deploy verification (authenticated session):
   a. Open an activity with ≥2 transactions; delete one, add one, save; reload →
      exactly the expected set remains.
   b. Rollback proof: save a payload with one constraint-violating transaction
      (e.g. currency >3 chars). Expect HTTP 400 AND the activity's transaction set
      unchanged on reload (previously the deleted rows would be lost).
   c. Concurrency: two sessions saving the same activity no longer lose rows.
3. Once verified, schedule deletion of legacySaveTransactions (follow-up).

## Behavior note

When a save request lacks an organization ID, transactions are now neither saved nor deleted. Previously, because the filtering step produced an empty `validTransactions` array, the code fell through to the `else` branch which called the RPC with an empty list — effectively deleting all existing transactions even though the client had sent rows. The fix keys the delete-all path on the client's explicit intent (`body.transactions.length === 0`) rather than on the filtered set size: if the client sends a non-empty list but every row is skipped due to a missing organization ID, existing transactions are left unchanged and a warning is surfaced via the `warnings` array. This is strictly safer — unsaved new rows no longer cause accidental deletion of existing rows via the uuid diff inside the RPC.
