-- Split fs_conductor individual name into first/last, add address
-- Split fs_conductor contact person into first/last, add title
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS fs_conductor_individual_first_name text,
  ADD COLUMN IF NOT EXISTS fs_conductor_individual_last_name text,
  ADD COLUMN IF NOT EXISTS fs_conductor_individual_address text,
  ADD COLUMN IF NOT EXISTS fs_conductor_contact_person_first_name text,
  ADD COLUMN IF NOT EXISTS fs_conductor_contact_person_last_name text,
  ADD COLUMN IF NOT EXISTS fs_conductor_contact_person_title text;

-- Migrate existing data: split individual name on first space
UPDATE project_bank_projects
SET
  fs_conductor_individual_first_name = split_part(fs_conductor_individual_name, ' ', 1),
  fs_conductor_individual_last_name = CASE
    WHEN position(' ' in fs_conductor_individual_name) > 0
    THEN substring(fs_conductor_individual_name from position(' ' in fs_conductor_individual_name) + 1)
    ELSE NULL
  END
WHERE fs_conductor_individual_name IS NOT NULL
  AND fs_conductor_individual_first_name IS NULL;

-- Migrate existing data: split contact person on first space
UPDATE project_bank_projects
SET
  fs_conductor_contact_person_first_name = split_part(fs_conductor_contact_person, ' ', 1),
  fs_conductor_contact_person_last_name = CASE
    WHEN position(' ' in fs_conductor_contact_person) > 0
    THEN substring(fs_conductor_contact_person from position(' ' in fs_conductor_contact_person) + 1)
    ELSE NULL
  END
WHERE fs_conductor_contact_person IS NOT NULL
  AND fs_conductor_contact_person_first_name IS NULL;
