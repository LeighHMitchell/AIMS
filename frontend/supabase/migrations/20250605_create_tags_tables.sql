-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    vocabulary TEXT DEFAULT '99',
    code TEXT,
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_tags junction table
CREATE TABLE IF NOT EXISTS activity_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    tagged_by UUID REFERENCES users(id),
    tagged_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, tag_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_vocabulary ON tags(vocabulary);
CREATE INDEX idx_activity_tags_activity_id ON activity_tags(activity_id);
CREATE INDEX idx_activity_tags_tag_id ON activity_tags(tag_id);

-- Add RLS policies for tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read tags
CREATE POLICY "Tags are viewable by everyone"
    ON tags FOR SELECT
    USING (true);

-- Policy to allow authenticated users to create tags
CREATE POLICY "Authenticated users can create tags"
    ON tags FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Add RLS policies for activity_tags
ALTER TABLE activity_tags ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read activity tags
CREATE POLICY "Activity tags are viewable by everyone"
    ON activity_tags FOR SELECT
    USING (true);

-- Policy to allow activity creators and contributors to manage tags
CREATE POLICY "Activity tags can be managed by authorized users"
    ON activity_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = activity_tags.activity_id
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

-- Create updated_at trigger for tags
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 