-- Create activity_contacts table to store contacts for activities
-- This table stores contact information for people associated with activities

CREATE TABLE IF NOT EXISTS activity_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    type TEXT,
    title TEXT,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    position TEXT,
    organisation TEXT,
    phone TEXT,
    fax TEXT,
    email TEXT,
    profile_photo TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_contacts_activity_id ON activity_contacts(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_contacts_email ON activity_contacts(email);

-- Grant access to the table
GRANT ALL ON activity_contacts TO authenticated;
GRANT ALL ON activity_contacts TO service_role;

COMMENT ON TABLE activity_contacts IS 'Contact information for people associated with activities';