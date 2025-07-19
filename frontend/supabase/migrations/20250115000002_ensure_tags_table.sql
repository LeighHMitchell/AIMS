-- Ensure tags table exists with proper structure and permissions
-- This migration ensures users can create and manage their own tags

-- Create tags table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_created_by ON public.tags(created_by);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON public.tags(created_at);

-- Create activity_tags junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.activity_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, tag_id)
);

-- Create indexes for activity_tags
CREATE INDEX IF NOT EXISTS idx_activity_tags_activity_id ON public.activity_tags(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_tags_tag_id ON public.activity_tags(tag_id);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Activity tags are viewable by everyone" ON public.activity_tags;
DROP POLICY IF EXISTS "Authenticated users can manage activity tags" ON public.activity_tags;

-- Create RLS policies for tags
CREATE POLICY "Tags are viewable by everyone" 
    ON public.tags FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can create tags" 
    ON public.tags FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own tags" 
    ON public.tags FOR UPDATE 
    USING (created_by = auth.uid());

-- Create RLS policies for activity_tags  
CREATE POLICY "Activity tags are viewable by everyone" 
    ON public.activity_tags FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can manage activity tags" 
    ON public.activity_tags FOR ALL 
    USING (
        auth.uid() IS NOT NULL AND (
            -- Allow if user created the activity
            EXISTS (
                SELECT 1 FROM public.activities 
                WHERE id = activity_tags.activity_id 
                AND created_by = auth.uid()
            )
            -- Or if user is a contributor to the activity
            OR EXISTS (
                SELECT 1 FROM public.activity_contributors ac
                JOIN public.activities a ON a.id = ac.activity_id
                WHERE ac.activity_id = activity_tags.activity_id
                AND ac.organization_id IN (
                    SELECT organization_id FROM public.users WHERE id = auth.uid()
                )
                AND ac.status = 'accepted'
            )
        )
    );

-- Create updated_at trigger for tags
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 