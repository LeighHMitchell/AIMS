-- Create custom_groups and related tables
-- This was implemented earlier but the table seems to be missing

CREATE TABLE IF NOT EXISTS public.custom_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the join table for custom groups and organizations
CREATE TABLE IF NOT EXISTS public.custom_group_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    custom_group_id UUID NOT NULL REFERENCES public.custom_groups(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    added_by UUID REFERENCES auth.users(id),
    UNIQUE(custom_group_id, organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_groups_created_by ON public.custom_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_group_organizations_group ON public.custom_group_organizations(custom_group_id);
CREATE INDEX IF NOT EXISTS idx_custom_group_organizations_org ON public.custom_group_organizations(organization_id);

-- Enable RLS
ALTER TABLE public.custom_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_group_organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_groups
CREATE POLICY "Custom groups are viewable by all authenticated users" 
    ON public.custom_groups FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Custom groups can be created by authenticated users" 
    ON public.custom_groups FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Custom groups can be updated by creator" 
    ON public.custom_groups FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = created_by);

CREATE POLICY "Custom groups can be deleted by creator" 
    ON public.custom_groups FOR DELETE 
    TO authenticated 
    USING (auth.uid() = created_by);

-- RLS Policies for custom_group_organizations
CREATE POLICY "Custom group organizations are viewable by all authenticated users" 
    ON public.custom_group_organizations FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Custom group organizations can be managed by group creator" 
    ON public.custom_group_organizations FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_groups 
            WHERE id = custom_group_id 
            AND created_by = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON public.custom_groups TO authenticated;
GRANT ALL ON public.custom_group_organizations TO authenticated;

-- Update timestamp trigger
CREATE TRIGGER update_custom_groups_updated_at BEFORE UPDATE ON public.custom_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 