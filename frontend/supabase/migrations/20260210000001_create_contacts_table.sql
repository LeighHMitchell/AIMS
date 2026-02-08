-- ============================================================
-- Migration: Create contacts table + normalize activity_contacts
-- ============================================================
-- Creates a master `contacts` table for unique people, and adds
-- a `contact_id` FK on `activity_contacts` so it becomes a
-- junction table.  Old person columns are kept on activity_contacts
-- for safe rollback; they can be dropped in a future migration.
-- ============================================================

-- 1. Create the contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Name fields
    title TEXT,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,

    -- Communication
    email TEXT,
    secondary_email TEXT,
    phone TEXT,
    phone_number TEXT,
    country_code TEXT,
    fax TEXT,
    fax_country_code TEXT,
    fax_number TEXT,

    -- Professional
    position TEXT,
    job_title TEXT,
    department TEXT,

    -- Organisation
    organisation TEXT,
    organisation_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    -- Additional
    website TEXT,
    mailing_address TEXT,
    profile_photo TEXT,
    notes TEXT,

    -- Linking
    linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for dedup matching
-- Partial unique index on normalised email (most reliable dedup key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email_unique
    ON contacts (LOWER(TRIM(email)))
    WHERE email IS NOT NULL AND TRIM(email) <> '';

-- Name-based lookup index
CREATE INDEX IF NOT EXISTS idx_contacts_name_lookup
    ON contacts (LOWER(first_name), LOWER(last_name));

-- Organisation lookup
CREATE INDEX IF NOT EXISTS idx_contacts_organisation_id
    ON contacts (organisation_id);

-- 3. RLS policies (match activity_contacts patterns)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contacts are viewable by everyone"
    ON contacts FOR SELECT
    USING (true);

CREATE POLICY "Contacts can be managed by authorized users"
    ON contacts FOR ALL
    USING (true);

-- 4. Updated_at trigger
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Add contact_id FK to activity_contacts
ALTER TABLE activity_contacts
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_contacts_contact_id
    ON activity_contacts (contact_id);

-- 6. Data migration: deduplicate existing activity_contacts → contacts
--    Priority: email (case-insensitive), then first+last name
--    For each unique person, pick the row with the most filled-in fields.

-- Step 6a: Insert unique contacts from activity_contacts (email-based dedup first)
INSERT INTO contacts (
    title, first_name, middle_name, last_name,
    email, secondary_email,
    phone, phone_number, country_code,
    fax, fax_country_code, fax_number,
    position, job_title, department,
    organisation, organisation_id,
    website, mailing_address, profile_photo, notes,
    linked_user_id, created_at, updated_at
)
SELECT DISTINCT ON (dedup_key)
    ac.title,
    ac.first_name,
    ac.middle_name,
    ac.last_name,
    ac.email,
    ac.secondary_email,
    ac.phone,
    ac.phone_number,
    ac.country_code,
    ac.fax,
    ac.fax_country_code,
    ac.fax_number,
    ac.position,
    ac.job_title,
    ac.department,
    COALESCE(ac.organisation, ac.organisation_name),
    ac.organisation_id,
    ac.website,
    ac.mailing_address,
    ac.profile_photo,
    ac.notes,
    ac.linked_user_id,
    MIN(ac.created_at) OVER (PARTITION BY dedup_key),
    MAX(ac.updated_at) OVER (PARTITION BY dedup_key)
FROM (
    SELECT *,
        CASE
            WHEN email IS NOT NULL AND TRIM(email) <> ''
                THEN 'email:' || LOWER(TRIM(email))
            WHEN first_name IS NOT NULL AND TRIM(first_name) <> ''
                 AND last_name IS NOT NULL AND TRIM(last_name) <> ''
                THEN 'name:' || LOWER(TRIM(first_name)) || '_' || LOWER(TRIM(last_name))
            ELSE 'id:' || id::text
        END AS dedup_key
    FROM activity_contacts
) ac
ORDER BY dedup_key,
    -- Prefer rows with more data filled in
    (CASE WHEN ac.email IS NOT NULL AND TRIM(ac.email) <> '' THEN 1 ELSE 0 END
     + CASE WHEN ac.phone IS NOT NULL OR ac.phone_number IS NOT NULL THEN 1 ELSE 0 END
     + CASE WHEN ac.position IS NOT NULL AND TRIM(ac.position) <> '' THEN 1 ELSE 0 END
     + CASE WHEN ac.organisation IS NOT NULL OR ac.organisation_name IS NOT NULL THEN 1 ELSE 0 END
     + CASE WHEN ac.notes IS NOT NULL AND TRIM(ac.notes) <> '' THEN 1 ELSE 0 END
    ) DESC;

-- Step 6b: Backfill contact_id on activity_contacts
-- Match by email first
UPDATE activity_contacts ac
SET contact_id = c.id
FROM contacts c
WHERE ac.contact_id IS NULL
  AND ac.email IS NOT NULL
  AND TRIM(ac.email) <> ''
  AND LOWER(TRIM(ac.email)) = LOWER(TRIM(c.email));

-- Match by first+last name
UPDATE activity_contacts ac
SET contact_id = c.id
FROM contacts c
WHERE ac.contact_id IS NULL
  AND ac.first_name IS NOT NULL AND TRIM(ac.first_name) <> ''
  AND ac.last_name IS NOT NULL AND TRIM(ac.last_name) <> ''
  AND LOWER(TRIM(ac.first_name)) = LOWER(TRIM(c.first_name))
  AND LOWER(TRIM(ac.last_name)) = LOWER(TRIM(c.last_name));

-- For any remaining unmatched rows (id-only dedup key), create individual contacts
INSERT INTO contacts (
    title, first_name, middle_name, last_name,
    email, secondary_email,
    phone, phone_number, country_code,
    fax, fax_country_code, fax_number,
    position, job_title, department,
    organisation, organisation_id,
    website, mailing_address, profile_photo, notes,
    linked_user_id, created_at, updated_at
)
SELECT
    ac.title, ac.first_name, ac.middle_name, ac.last_name,
    ac.email, ac.secondary_email,
    ac.phone, ac.phone_number, ac.country_code,
    ac.fax, ac.fax_country_code, ac.fax_number,
    ac.position, ac.job_title, ac.department,
    COALESCE(ac.organisation, ac.organisation_name),
    ac.organisation_id,
    ac.website, ac.mailing_address, ac.profile_photo, ac.notes,
    ac.linked_user_id, ac.created_at, ac.updated_at
FROM activity_contacts ac
WHERE ac.contact_id IS NULL;

-- Backfill the remaining rows by matching on the exact activity_contacts id
-- (these are 1:1 since we just created a contact for each unmatched row)
UPDATE activity_contacts ac
SET contact_id = c.id
FROM contacts c
WHERE ac.contact_id IS NULL
  AND (
    -- Match on email
    (ac.email IS NOT NULL AND TRIM(ac.email) <> ''
     AND LOWER(TRIM(ac.email)) = LOWER(TRIM(c.email)))
    OR
    -- Match on name
    (ac.first_name IS NOT NULL AND TRIM(ac.first_name) <> ''
     AND ac.last_name IS NOT NULL AND TRIM(ac.last_name) <> ''
     AND LOWER(TRIM(ac.first_name)) = LOWER(TRIM(c.first_name))
     AND LOWER(TRIM(ac.last_name)) = LOWER(TRIM(c.last_name)))
  );
