-- Remove the default value on activities.hierarchy.
--
-- Previously the column was created as `hierarchy INTEGER DEFAULT 1 CHECK (hierarchy >= 1)`,
-- which silently stamped every new activity with hierarchy = 1 even when the data-entry
-- form / IATI import left it blank. IATI treats @hierarchy as optional and defaulting to 1
-- is a fabricated value. Going forward hierarchy must be NULL unless explicitly set by the
-- user or imported from the source XML.
--
-- NOTE: this intentionally does NOT rewrite existing rows. Activities that already carry
-- hierarchy = 1 keep their value; we only stop fabricating it for new rows. The existing
-- CHECK (hierarchy >= 1) is preserved and still allows NULL (a CHECK passes on NULL).

ALTER TABLE public.activities
  ALTER COLUMN hierarchy DROP DEFAULT;
