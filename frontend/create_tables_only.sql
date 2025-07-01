-- Create tags table for storing unique tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on tag name for fast lookups
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Create activity_tags join table
CREATE TABLE IF NOT EXISTS activity_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, tag_id)
);

-- Create indexes for activity_tags
CREATE INDEX IF NOT EXISTS idx_activity_tags_activity_id ON activity_tags(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_tags_tag_id ON activity_tags(tag_id);

-- Create policy_markers table for predefined markers
CREATE TABLE IF NOT EXISTS policy_markers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    marker_type TEXT NOT NULL CHECK (marker_type IN ('environmental', 'social_governance', 'other')),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_policy_markers table for linking activities to policy markers
CREATE TABLE IF NOT EXISTS activity_policy_markers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    policy_marker_id UUID REFERENCES policy_markers(id),
    score INTEGER NOT NULL CHECK (score IN (0, 1, 2)),
    rationale TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, policy_marker_id)
);

-- Create indexes for activity_policy_markers
CREATE INDEX IF NOT EXISTS idx_activity_policy_markers_activity_id ON activity_policy_markers(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_policy_markers_policy_marker_id ON activity_policy_markers(policy_marker_id);