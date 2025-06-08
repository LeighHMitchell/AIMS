-- Create activity_contributors table
CREATE TABLE IF NOT EXISTS activity_contributors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'nominated' CHECK (status IN ('nominated', 'accepted', 'declined', 'requested')),
    nominated_by UUID REFERENCES users(id),
    nominated_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    can_edit_own_data BOOLEAN DEFAULT true,
    can_view_other_drafts BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, organization_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_activity_contributors_activity_id ON activity_contributors(activity_id);
CREATE INDEX idx_activity_contributors_organization_id ON activity_contributors(organization_id);
CREATE INDEX idx_activity_contributors_status ON activity_contributors(status);
CREATE INDEX idx_activity_contributors_nominated_by ON activity_contributors(nominated_by);

-- Add RLS policies
ALTER TABLE activity_contributors ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read contributors
CREATE POLICY "Activity contributors are viewable by everyone"
    ON activity_contributors FOR SELECT
    USING (true);

-- Policy to allow activity creators to manage contributors
CREATE POLICY "Activity creators can manage contributors"
    ON activity_contributors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = activity_contributors.activity_id
            AND (
                a.created_by = auth.uid()
                OR a.created_by_org IN (
                    SELECT organization_id FROM users WHERE id = auth.uid()
                )
            )
        )
    );

-- Policy to allow organizations to respond to their own nominations
CREATE POLICY "Organizations can respond to their nominations"
    ON activity_contributors FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND status = 'nominated'
    );

-- Create updated_at trigger
CREATE TRIGGER update_activity_contributors_updated_at
    BEFORE UPDATE ON activity_contributors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 