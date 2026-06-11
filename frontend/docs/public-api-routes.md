# Public (Unauthenticated) API Routes

Any mutating route not in this list must call `requireAuth`, `requireSuperUser`, or
`verifyCronSecret`. CI enforces this via `scripts/check-route-auth.mjs`.

## Bucket P — Intentionally unauthenticated by design

| Route | Reason |
|---|---|
| `api/auth/login` | Auth entry-point — cannot require a session to log in |
| `api/auth/login-local` | Local dev auth entry-point — cannot require a session |
| `api/auth/logout` | Session termination — no session cookie to verify |
| `api/auth/register` | Account creation — no session exists yet |
| `api/waitlist` | Pre-registration — no session exists yet |

## Step-2 exception — gated with requireSuperUser instead of deleted

| Route | Reason |
|---|---|
| `api/test-email-change` | Called from the `/test-email-change` debug page; gated with `requireSuperUser` so only admins can reach it |

## Notes

- Routes in the program-logics subtree (`api/program-logics/[logicId]/**`) authenticate
  via the `loadForRead` / `loadForWrite` helpers in
  `src/lib/program-logic/route-helpers.ts`, which call `requireAuth` internally.
  The CI script recognises these wrappers alongside the top-level auth helpers.
- The `api/activities/[id]/submit` and `api/activities/[id]/validate` routes have a
  **residual authz gap**: the role check still reads role from the request body (legacy
  filesystem-backed data path). `requireAuth` ensures the caller is authenticated;
  a future migration to Supabase-backed activity status should replace this with
  `canEditActivity` from `@/lib/activity-permissions-server`.
