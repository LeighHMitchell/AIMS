-- Create the related_activities table first
CREATE TABLE IF NOT EXISTS public.related_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    linked_activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    relationship_type VARCHAR(1) NOT NULL CHECK (relationship_type IN ('1', '2', '3', '4', '5')),
    external_activity_title TEXT,
    external_iati_identifier TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either linked_activity_id OR external fields are provided
    CONSTRAINT linked_or_external CHECK (
        (linked_activity_id IS NOT NULL) OR 
        (external_activity_title IS NOT NULL AND external_iati_identifier IS NOT NULL)
    ),
    
    -- Prevent duplicate relationships
    CONSTRAINT unique_activity_relationship UNIQUE (source_activity_id, linked_activity_id, relationship_type),
    CONSTRAINT unique_external_relationship UNIQUE (source_activity_id, external_iati_identifier, relationship_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_related_activities_source ON public.related_activities(source_activity_id);
CREATE INDEX IF NOT EXISTS idx_related_activities_linked ON public.related_activities(linked_activity_id);
CREATE INDEX IF NOT EXISTS idx_related_activities_created_by ON public.related_activities(created_by);

-- Create a trigger to prevent circular relationships
CREATE OR REPLACE FUNCTION prevent_circular_relationships()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this would create a circular relationship
    IF NEW.linked_activity_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.related_activities
        WHERE source_activity_id = NEW.linked_activity_id
        AND linked_activity_id = NEW.source_activity_id
    ) THEN
        RAISE EXCEPTION 'Circular relationship detected between activities';
    END IF;
    
    -- Prevent self-linking
    IF NEW.linked_activity_id = NEW.source_activity_id THEN
        RAISE EXCEPTION 'An activity cannot be linked to itself';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS check_circular_relationships ON public.related_activities;
CREATE TRIGGER check_circular_relationships
    BEFORE INSERT OR UPDATE ON public.related_activities
    FOR EACH ROW
    EXECUTE FUNCTION prevent_circular_relationships();

-- Enable Row Level Security
ALTER TABLE public.related_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Related activities are viewable by everyone" ON public.related_activities;
DROP POLICY IF EXISTS "Authenticated users can create related activities" ON public.related_activities;
DROP POLICY IF EXISTS "Users can update their own related activities" ON public.related_activities;
DROP POLICY IF EXISTS "Users can delete their own related activities" ON public.related_activities;

-- Create RLS policies
-- Policy: Anyone can view related activities
CREATE POLICY "Related activities are viewable by everyone"
    ON public.related_activities FOR SELECT
    USING (true);

-- Policy: Authenticated users can create related activities
CREATE POLICY "Authenticated users can create related activities"
    ON public.related_activities FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own related activities
CREATE POLICY "Users can update their own related activities"
    ON public.related_activities FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own related activities
CREATE POLICY "Users can delete their own related activities"
    ON public.related_activities FOR DELETE
    USING (auth.uid() = created_by);

-- Now create the view
DROP VIEW IF EXISTS public.related_activities_with_details;

CREATE OR REPLACE VIEW public.related_activities_with_details AS
SELECT 
    ra.id,
    ra.source_activity_id,
    ra.linked_activity_id,
    ra.relationship_type,
    ra.external_activity_title,
    ra.external_iati_identifier,
    ra.created_by,
    ra.created_at,
    -- Source activity details
    sa.title as source_activity_title,
    sa.iati_id as source_activity_iati_id,
    -- Linked activity details (if internal)
    la.id as linked_activity_uuid,
    la.title as linked_activity_title,
    la.iati_id as linked_activity_iati_id,
    la.activity_status as linked_activity_status,
    la.publication_status as linked_activity_publication_status,
    -- Creator details
    u.email as created_by_email,
    -- Determine if external
    CASE 
        WHEN ra.linked_activity_id IS NULL THEN true
        ELSE false
    END as is_external,
    -- Get actual title and IATI ID
    CASE 
        WHEN ra.linked_activity_id IS NULL THEN ra.external_activity_title
        ELSE la.title
    END as activity_title,
    CASE 
        WHEN ra.linked_activity_id IS NULL THEN ra.external_iati_identifier
        ELSE la.iati_id
    END as iati_identifier,
    -- Relationship type label
    CASE ra.relationship_type
        WHEN '1' THEN 'Parent'
        WHEN '2' THEN 'Child'
        WHEN '3' THEN 'Sibling'
        WHEN '4' THEN 'Co-funded'
        WHEN '5' THEN 'Third-party'
        ELSE 'Unknown'
    END as relationship_type_label
FROM 
    public.related_activities ra
    LEFT JOIN public.activities sa ON ra.source_activity_id = sa.id
    LEFT JOIN public.activities la ON ra.linked_activity_id = la.id
    LEFT JOIN public.users u ON ra.created_by = u.id;

-- Grant permissions on the view
GRANT SELECT ON public.related_activities_with_details TO authenticated;
GRANT SELECT ON public.related_activities_with_details TO anon; 