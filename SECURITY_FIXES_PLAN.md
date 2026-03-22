# Security Fixes Plan — Low-Hanging Fruit

Ordered by severity and ease of implementation.

---

## 1. CRITICAL — Add role checks to admin API routes

**Problem:** All 40+ `/api/admin/*` routes and `/api/users/reset-password` use `requireAuth()` which only verifies the user is logged in — any authenticated user can access admin endpoints.

**Fix:** Add a `requireAdmin()` helper to `frontend/src/lib/auth.ts` that:
1. Calls `requireAuth()` to verify authentication
2. Looks up the user's role from the `users` table
3. Returns 403 if the role is not `SUPER_USER`

Then update all admin routes to use `requireAdmin()` instead of `requireAuth()`.

**Files to change:**
- `frontend/src/lib/auth.ts` — add `requireAdmin()` function
- All files under `frontend/src/app/api/admin/` (~40 routes) — swap `requireAuth` → `requireAdmin`
- `frontend/src/app/api/users/reset-password/route.ts` — swap to `requireAdmin`

**Estimated effort:** ~1 hour

---

## 2. HIGH — Remove `.env.local` from git tracking

**Problem:** `.env.local` is committed to git with real IATI API subscription keys:
```
IATI_SUBSCRIPTION_KEY=9ff79266625d4497b6c812d67c102c75
IATI_PRIMARY_KEY=9ff79266625d4497b6c812d67c102c75
IATI_SECONDARY_KEY=6991d7cae53b4cdd9f12543b6f069831
```

**Fix:**
1. Add `.env.local` and `.env.test` to `.gitignore`
2. Run `git rm --cached .env.local .env.test` to untrack them
3. Rotate the exposed IATI API keys (manual — done by a team member with access to the IATI portal)

**Files to change:**
- `.gitignore` — add entries
- Git index — untrack the files

**Estimated effort:** 10 minutes (excluding key rotation)

---

## 3. HIGH — Add rate limiting to API routes

**Problem:** No rate limiting on any API route. Any client can hammer the server.

**Fix:** Add an in-memory rate limiter in `frontend/src/middleware.ts` using a simple sliding-window Map keyed by IP. Apply to all `/api/` routes with a generous default (e.g., 100 requests/minute per IP). This isn't production-grade (resets on deploy, per-instance), but it blocks casual abuse. For production, a Redis-backed solution or Vercel's built-in rate limiting is recommended.

**Files to change:**
- `frontend/src/middleware.ts` — add rate-limiting logic before other checks

**Estimated effort:** 30 minutes

---

## 4. MEDIUM — Add structured logging utility

**Problem:** All logging is `console.log`/`console.error` — no log levels, no structured output, no correlation IDs in logs.

**Fix:** Create `frontend/src/lib/logger.ts` that:
1. Exports `logger.info()`, `logger.warn()`, `logger.error()` methods
2. Outputs JSON-structured logs (timestamp, level, message, context)
3. Includes the request ID from middleware when available
4. Wraps `console.*` so existing code can migrate incrementally

Then migrate the most critical paths (auth, admin routes, cron jobs) to use it.

**Files to change:**
- `frontend/src/lib/logger.ts` — new file
- Admin routes and cron routes — incremental migration (can be done over time)

**Estimated effort:** 30 minutes for the utility, ongoing for migration

---

## Implementation Order

| Step | Item | Severity | Effort |
|------|------|----------|--------|
| 1 | Admin role checks | Critical | ~1 hr |
| 2 | Remove .env.local from git | High | 10 min |
| 3 | Rate limiting middleware | High | 30 min |
| 4 | Structured logging | Medium | 30 min |

**Total estimated effort: ~2.5 hours**
