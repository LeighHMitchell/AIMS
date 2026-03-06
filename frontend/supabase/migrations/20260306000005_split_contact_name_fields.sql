-- Split contact_officer into first/last name, and proponent_name into first/last name
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS contact_officer_first_name text,
  ADD COLUMN IF NOT EXISTS contact_officer_last_name text,
  ADD COLUMN IF NOT EXISTS proponent_first_name text,
  ADD COLUMN IF NOT EXISTS proponent_last_name text;

-- Migrate existing data: split on first space
UPDATE project_bank_projects
SET
  contact_officer_first_name = CASE
    WHEN contact_officer IS NOT NULL AND contact_officer != '' THEN split_part(contact_officer, ' ', 1)
    ELSE NULL
  END,
  contact_officer_last_name = CASE
    WHEN contact_officer IS NOT NULL AND contact_officer != '' AND position(' ' in contact_officer) > 0
      THEN substring(contact_officer from position(' ' in contact_officer) + 1)
    ELSE NULL
  END
WHERE contact_officer IS NOT NULL AND contact_officer != '';

UPDATE project_bank_projects
SET
  proponent_first_name = CASE
    WHEN proponent_name IS NOT NULL AND proponent_name != '' THEN split_part(proponent_name, ' ', 1)
    ELSE NULL
  END,
  proponent_last_name = CASE
    WHEN proponent_name IS NOT NULL AND proponent_name != '' AND position(' ' in proponent_name) > 0
      THEN substring(proponent_name from position(' ' in proponent_name) + 1)
    ELSE NULL
  END
WHERE proponent_name IS NOT NULL AND proponent_name != '';
