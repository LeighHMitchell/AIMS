-- Recycle Bin: per-row pause flag.
-- When `purge_paused = true`, the daily cron skips the row so it never
-- auto-deletes. Admins can still purge it manually via "Delete now".
-- The flag is only on top-level entities (the cron only touches those).

ALTER TABLE public.activities    ADD COLUMN IF NOT EXISTS purge_paused BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.transactions  ADD COLUMN IF NOT EXISTS purge_paused BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS purge_paused BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.contacts      ADD COLUMN IF NOT EXISTS purge_paused BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.tasks         ADD COLUMN IF NOT EXISTS purge_paused BOOLEAN NOT NULL DEFAULT false;
