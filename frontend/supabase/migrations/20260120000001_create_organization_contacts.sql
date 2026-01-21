-- Create organization_contacts table
CREATE TABLE IF NOT EXISTS organization_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    job_title TEXT,
    department TEXT,
    email TEXT,
    phone TEXT,
    phone_number TEXT,
    country_code TEXT,
    website TEXT,
    mailing_address TEXT,
    profile_photo TEXT,
    notes TEXT,
    linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for faster queries
CREATE INDEX idx_organization_contacts_organization_id ON organization_contacts(organization_id);
CREATE INDEX idx_organization_contacts_linked_user_id ON organization_contacts(linked_user_id);
CREATE INDEX idx_organization_contacts_type ON organization_contacts(type);
CREATE INDEX idx_organization_contacts_is_primary ON organization_contacts(is_primary);

-- Add RLS policies
ALTER TABLE organization_contacts ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read contacts (public org profile)
CREATE POLICY "Organization contacts are viewable by everyone"
    ON organization_contacts FOR SELECT
    USING (true);

-- Policy to allow users linked to the organization to manage contacts
CREATE POLICY "Organization contacts can be managed by org members"
    ON organization_contacts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.organization_id = organization_contacts.organization_id
        )
    );

-- Create updated_at trigger (reuse if exists)
CREATE OR REPLACE FUNCTION update_organization_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_contacts_updated_at
    BEFORE UPDATE ON organization_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_contacts_updated_at();

-- Comment on table
COMMENT ON TABLE organization_contacts IS 'Contacts associated with organizations, displayed on public organization profile pages';
COMMENT ON COLUMN organization_contacts.type IS 'Contact type: general, program_management, financial, communications, focal_point';
COMMENT ON COLUMN organization_contacts.linked_user_id IS 'Optional link to a user account in the system';
COMMENT ON COLUMN organization_contacts.is_primary IS 'Whether this is the primary contact for the organization';
COMMENT ON COLUMN organization_contacts.display_order IS 'Order in which contacts are displayed';
