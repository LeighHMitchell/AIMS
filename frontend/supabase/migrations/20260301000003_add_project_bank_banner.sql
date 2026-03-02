-- Add banner image and position to project_bank_projects
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS banner TEXT,
  ADD COLUMN IF NOT EXISTS banner_position INTEGER DEFAULT 50;

COMMENT ON COLUMN project_bank_projects.banner IS 'Base64-encoded banner image for the project';
COMMENT ON COLUMN project_bank_projects.banner_position IS 'Y position percentage (0-100) for banner image cropping. 0=top, 50=center, 100=bottom';
