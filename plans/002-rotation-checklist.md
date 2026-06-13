# Rotation checklist (operator action required)

The following credentials were committed to git history (from commit ed560b03
onward) and must be treated as burned even though the files are now untracked:

- [ ] IATI API keys — log in to the IATI API Gateway portal
      (https://developer.iatistandard.org), regenerate the subscription's
      primary and secondary keys, and update IATI_API_KEY /
      IATI_SUBSCRIPTION_KEY / IATI_PRIMARY_KEY / IATI_SECONDARY_KEY in:
      local .env.local (untracked) AND Vercel project env vars (if set there).
- [ ] Test account password (TEST_EMAIL/TEST_PASSWORD in .env.test history) —
      reset this user's password in Supabase Auth, update local .env/.env.test.
- [ ] Confirm the Supabase anon/service keys in the *tracked* history were
      placeholders (verified during audit: 18/26-char values, not JWTs) — no
      Supabase rotation required from this incident.
- [ ] Decide on git-history purge (git filter-repo) vs rotation-only.
      Rotation-only is sufficient for security; purge is cosmetic once keys
      are rotated.
- [ ] After rotation: verify IATI sync still works
      (GET /api/iati/search or run the iati-sync cron manually with CRON_SECRET).
