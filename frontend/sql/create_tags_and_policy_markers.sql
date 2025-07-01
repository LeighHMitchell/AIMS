-- Create tags table for storing unique tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES users(id),
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
    score INTEGER NOT NULL CHECK (score IN (0, 1, 2)), -- 0=not targeted, 1=significant, 2=principal
    rationale TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, policy_marker_id)
);

-- Create indexes for activity_policy_markers
CREATE INDEX IF NOT EXISTS idx_activity_policy_markers_activity_id ON activity_policy_markers(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_policy_markers_policy_marker_id ON activity_policy_markers(policy_marker_id);

-- Insert predefined policy markers
INSERT INTO policy_markers (code, name, description, marker_type, display_order) VALUES
-- Environmental (Rio Markers)
('climate_mitigation', 'Climate Change Mitigation', 'Activities that contribute to the objective of stabilization of greenhouse gas concentrations', 'environmental', 1),
('climate_adaptation', 'Climate Change Adaptation', 'Activities that intend to reduce the vulnerability of human or natural systems to climate change', 'environmental', 2),
('biodiversity', 'Biodiversity', 'Activities that promote conservation, sustainable use, or access and benefit sharing of biodiversity', 'environmental', 3),
('desertification', 'Desertification', 'Activities that combat desertification or mitigate effects of drought', 'environmental', 4),
('environment', 'Aid to Environment', 'Activities that support environmental protection or enhancement', 'environmental', 5),

-- Social & Governance
('gender_equality', 'Gender Equality', 'Activities that have gender equality and women''s empowerment as policy objectives', 'social_governance', 6),
('good_governance', 'Good Governance', 'Activities that support democratic governance and civil society', 'social_governance', 7),
('participatory_dev', 'Participatory Development', 'Activities that emphasize stakeholder participation in design and implementation', 'social_governance', 8),
('human_rights', 'Human Rights', 'Activities that support or promote human rights', 'social_governance', 9),
('rule_of_law', 'Rule of Law', 'Activities that strengthen legal and judicial systems', 'social_governance', 10),
('trade_development', 'Trade Development', 'Activities that build trade capacity and support trade facilitation', 'social_governance', 11),

-- Other Cross-Cutting Issues
('disability', 'Disability Inclusion', 'Activities that promote inclusion of persons with disabilities', 'other', 12),
('nutrition', 'Nutrition', 'Activities that address nutrition outcomes', 'other', 13),
('peacebuilding', 'Peacebuilding / Conflict Sensitivity', 'Activities that contribute to peace and conflict prevention', 'other', 14),
('rural_development', 'Rural Development', 'Activities focused on rural areas and communities', 'other', 15),
('urban_development', 'Urban Development', 'Activities focused on urban areas and cities', 'other', 16),
('digitalization', 'Digitalization / Technology', 'Activities that leverage digital technologies', 'other', 17),
('private_sector', 'Private Sector Engagement', 'Activities that engage or strengthen private sector', 'other', 18)
ON CONFLICT (code) DO NOTHING;