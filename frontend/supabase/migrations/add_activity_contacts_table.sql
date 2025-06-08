-- Create activity_contacts table
CREATE TABLE IF NOT EXISTS activity_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    position TEXT NOT NULL,
    organisation TEXT,
    phone TEXT,
    fax TEXT,
    email TEXT,
    profile_photo TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_activity_contacts_activity_id ON activity_contacts(activity_id);

-- Add RLS policies
ALTER TABLE activity_contacts ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read contacts
CREATE POLICY "Activity contacts are viewable by everyone"
    ON activity_contacts FOR SELECT
    USING (true);

-- Policy to allow activity creators and contributors to manage contacts
CREATE POLICY "Activity contacts can be managed by authorized users"
    ON activity_contacts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = activity_contacts.activity_id
            AND (
                a.created_by = auth.uid()
                OR a.created_by_org IN (
                    SELECT organization_id FROM users WHERE id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM activity_contributors ac
                    WHERE ac.activity_id = a.id
                    AND ac.organization_id IN (
                        SELECT organization_id FROM users WHERE id = auth.uid()
                    )
                    AND ac.status = 'accepted'
                )
            )
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activity_contacts_updated_at
    BEFORE UPDATE ON activity_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 