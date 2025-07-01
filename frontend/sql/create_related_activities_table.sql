-- Related Activities Table for IATI-compliant activity linking
-- Supports relationship types 1-5 as per IATI standard 2.03+

-- Drop existing objects if they exist (for re-running)
DROP VIEW IF EXISTS related_activities_with_details CASCADE;
DROP TABLE IF EXISTS related_activities CASCADE;
DROP TYPE IF EXISTS related_activity_type CASCADE;

-- Create enum for relationship types
CREATE TYPE related_activity_type AS ENUM ('1', '2', '3', '4', '5');

-- Create the related_activities table
CREATE TABLE IF NOT EXISTS related_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source_activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    linked_activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    iati_identifier TEXT NOT NULL, -- Always required for IATI compliance
    relationship_type related_activity_type NOT NULL,
    is_external BOOLEAN DEFAULT FALSE, -- TRUE when linked_activity_id is null (external activity)
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT no_self_linking CHECK (source_activity_id != linked_activity_id),
    CONSTRAINT valid_link CHECK (
        (linked_activity_id IS NOT NULL AND is_external = FALSE) OR 
        (linked_activity_id IS NULL AND is_external = TRUE)
    ),
    -- Prevent duplicate relationships between same activities
    CONSTRAINT unique_relationship UNIQUE (source_activity_id, linked_activity_id, relationship_type)
);

-- Create indexes for performance
CREATE INDEX idx_related_activities_source ON related_activities(source_activity_id);
CREATE INDEX idx_related_activities_linked ON related_activities(linked_activity_id);
CREATE INDEX idx_related_activities_type ON related_activities(relationship_type);
CREATE INDEX idx_related_activities_external ON related_activities(is_external);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_related_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_related_activities_updated_at
    BEFORE UPDATE ON related_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_related_activities_updated_at();

-- RLS Policies
ALTER TABLE related_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all related activities for activities they can access
CREATE POLICY "Users can view related activities" ON related_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = related_activities.source_activity_id
            -- Add your activity access logic here based on your existing RLS
        )
    );

-- Policy: Users can create related activities for activities they own/manage
CREATE POLICY "Users can create related activities" ON related_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = source_activity_id
            -- Add your activity ownership/management check here
        )
    );

-- Policy: Users can update/delete related activities they created
CREATE POLICY "Users can manage their related activities" ON related_activities
    FOR ALL
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Function to check for circular relationships
CREATE OR REPLACE FUNCTION check_circular_relationship()
RETURNS TRIGGER AS $$
DECLARE
    has_circular BOOLEAN;
BEGIN
    -- Check if this would create a circular relationship
    WITH RECURSIVE relationship_chain AS (
        -- Start with the new relationship
        SELECT NEW.linked_activity_id as activity_id, 1 as depth
        WHERE NEW.linked_activity_id IS NOT NULL
        
        UNION ALL
        
        -- Follow the chain
        SELECT ra.linked_activity_id, rc.depth + 1
        FROM relationship_chain rc
        JOIN related_activities ra ON ra.source_activity_id = rc.activity_id
        WHERE ra.linked_activity_id IS NOT NULL
        AND rc.depth < 10 -- Prevent infinite recursion
    )
    SELECT EXISTS (
        SELECT 1 FROM relationship_chain 
        WHERE activity_id = NEW.source_activity_id
    ) INTO has_circular;
    
    IF has_circular THEN
        RAISE EXCEPTION 'Circular relationship detected';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_circular_relationships
    BEFORE INSERT OR UPDATE ON related_activities
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_relationship();

-- Helper view for easier querying
CREATE OR REPLACE VIEW related_activities_with_details AS
SELECT 
    ra.*,
    source_act.title as source_activity_title,
    source_act.iati_id as source_iati_id,
    linked_act.title as linked_activity_title,
    linked_act.iati_id as linked_iati_id,
    CASE ra.relationship_type
        WHEN '1' THEN 'Parent'
        WHEN '2' THEN 'Child'
        WHEN '3' THEN 'Sibling'
        WHEN '4' THEN 'Co-funded'
        WHEN '5' THEN 'Third-party report'
    END as relationship_type_label,
    u.email as created_by_email
FROM related_activities ra
JOIN activities source_act ON ra.source_activity_id = source_act.id
LEFT JOIN activities linked_act ON ra.linked_activity_id = linked_act.id
LEFT JOIN auth.users u ON ra.created_by = u.id;

-- Grant permissions
GRANT ALL ON related_activities TO authenticated;
GRANT SELECT ON related_activities_with_details TO authenticated; 