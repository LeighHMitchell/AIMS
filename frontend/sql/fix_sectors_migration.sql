-- Fix sectors migration
-- This script safely creates the necessary tables and handles existing data

-- First, check if sectors table exists and has the correct structure
DO $$ 
BEGIN
    -- Create sectors table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sectors') THEN
        CREATE TABLE IF NOT EXISTS public.sectors (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            code VARCHAR(10) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            vocabulary VARCHAR(50) DEFAULT 'DAC',
            parent_code VARCHAR(10),
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_sectors_code ON public.sectors(code);
        CREATE INDEX IF NOT EXISTS idx_sectors_vocabulary ON public.sectors(vocabulary);
    END IF;
END $$;

-- Insert common DAC sectors (only if table is empty)
INSERT INTO public.sectors (code, name, category, vocabulary) VALUES
    ('111', 'Education, level unspecified', 'Social Infrastructure & Services', 'DAC'),
    ('112', 'Basic education', 'Social Infrastructure & Services', 'DAC'),
    ('113', 'Secondary education', 'Social Infrastructure & Services', 'DAC'),
    ('121', 'Health, general', 'Social Infrastructure & Services', 'DAC'),
    ('122', 'Basic health', 'Social Infrastructure & Services', 'DAC'),
    ('130', 'Population policies/programmes & reproductive health', 'Social Infrastructure & Services', 'DAC'),
    ('140', 'Water supply & sanitation', 'Social Infrastructure & Services', 'DAC'),
    ('151', 'Government & civil society-general', 'Social Infrastructure & Services', 'DAC'),
    ('210', 'Transport & storage', 'Economic Infrastructure & Services', 'DAC'),
    ('220', 'Communications', 'Economic Infrastructure & Services', 'DAC'),
    ('230', 'Energy', 'Economic Infrastructure & Services', 'DAC'),
    ('311', 'Agriculture', 'Production Sectors', 'DAC'),
    ('321', 'Industry', 'Production Sectors', 'DAC'),
    ('410', 'General environment protection', 'Multi-Sector / Cross-Cutting', 'DAC'),
    ('720', 'Emergency response', 'Humanitarian Aid', 'DAC'),
    ('998', 'Unallocated / Unspecified', 'Unallocated / Unspecified', 'DAC')
ON CONFLICT (code) DO NOTHING;

-- Now create activity_sectors table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_sectors') THEN
        CREATE TABLE public.activity_sectors (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            activity_id UUID NOT NULL,
            sector_id UUID NOT NULL,
            percentage DECIMAL(5,2) DEFAULT 100.00 CHECK (percentage >= 0 AND percentage <= 100),
            vocabulary VARCHAR(50) DEFAULT 'DAC',
            vocabulary_uri VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(activity_id, sector_id)
        );
        
        -- Add foreign keys separately to handle if they fail
        BEGIN
            ALTER TABLE public.activity_sectors 
            ADD CONSTRAINT fk_activity_sectors_activity 
            FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Foreign key to activities already exists or failed: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE public.activity_sectors 
            ADD CONSTRAINT fk_activity_sectors_sector 
            FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Foreign key to sectors already exists or failed: %', SQLERRM;
        END;
        
        -- Create indexes
        CREATE INDEX idx_activity_sectors_activity_id ON public.activity_sectors(activity_id);
        CREATE INDEX idx_activity_sectors_sector_id ON public.activity_sectors(sector_id);
    END IF;
END $$;

-- Add foreign key constraint if missing
ALTER TABLE public.activity_sectors 
DROP CONSTRAINT IF EXISTS fk_activity_sectors_sector;

ALTER TABLE public.activity_sectors 
ADD CONSTRAINT fk_activity_sectors_sector 
FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE CASCADE;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Create custom_groups table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_groups') THEN
        CREATE TABLE public.custom_groups (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            created_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_custom_groups_created_by ON public.custom_groups(created_by);
    END IF;
END $$;

-- Create custom_group_organizations table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_group_organizations') THEN
        CREATE TABLE public.custom_group_organizations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            custom_group_id UUID NOT NULL REFERENCES public.custom_groups(id) ON DELETE CASCADE,
            organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
            added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            added_by UUID REFERENCES auth.users(id),
            UNIQUE(custom_group_id, organization_id)
        );
        
        CREATE INDEX idx_custom_group_organizations_group ON public.custom_group_organizations(custom_group_id);
        CREATE INDEX idx_custom_group_organizations_org ON public.custom_group_organizations(organization_id);
    END IF;
END $$;

-- Enable RLS (safe to run multiple times)
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_group_organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DO $$ 
BEGIN
    -- Sectors policies
    DROP POLICY IF EXISTS "Sectors are viewable by all authenticated users" ON public.sectors;
    CREATE POLICY "Sectors are viewable by all authenticated users" 
        ON public.sectors FOR SELECT 
        TO authenticated 
        USING (true);
    
    -- Activity sectors policies
    DROP POLICY IF EXISTS "Activity sectors are viewable by all authenticated users" ON public.activity_sectors;
    CREATE POLICY "Activity sectors are viewable by all authenticated users" 
        ON public.activity_sectors FOR SELECT 
        TO authenticated 
        USING (true);
    
    DROP POLICY IF EXISTS "Activity sectors can be created by activity owners" ON public.activity_sectors;
    CREATE POLICY "Activity sectors can be created by activity owners" 
        ON public.activity_sectors FOR INSERT 
        TO authenticated 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.activities 
                WHERE id = activity_id 
                AND (created_by = auth.uid() OR created_by_org IN (
                    SELECT organization_id FROM public.user_organizations 
                    WHERE user_id = auth.uid()
                ))
            )
        );
    
    DROP POLICY IF EXISTS "Activity sectors can be updated by activity owners" ON public.activity_sectors;
    CREATE POLICY "Activity sectors can be updated by activity owners" 
        ON public.activity_sectors FOR UPDATE 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.activities 
                WHERE id = activity_id 
                AND (created_by = auth.uid() OR created_by_org IN (
                    SELECT organization_id FROM public.user_organizations 
                    WHERE user_id = auth.uid()
                ))
            )
        );
    
    DROP POLICY IF EXISTS "Activity sectors can be deleted by activity owners" ON public.activity_sectors;
    CREATE POLICY "Activity sectors can be deleted by activity owners" 
        ON public.activity_sectors FOR DELETE 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.activities 
                WHERE id = activity_id 
                AND (created_by = auth.uid() OR created_by_org IN (
                    SELECT organization_id FROM public.user_organizations 
                    WHERE user_id = auth.uid()
                ))
            )
        );
    
    -- Custom groups policies
    DROP POLICY IF EXISTS "Custom groups are viewable by all authenticated users" ON public.custom_groups;
    CREATE POLICY "Custom groups are viewable by all authenticated users" 
        ON public.custom_groups FOR SELECT 
        TO authenticated 
        USING (true);
    
    DROP POLICY IF EXISTS "Custom groups can be created by authenticated users" ON public.custom_groups;
    CREATE POLICY "Custom groups can be created by authenticated users" 
        ON public.custom_groups FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = created_by);
    
    DROP POLICY IF EXISTS "Custom groups can be updated by creator" ON public.custom_groups;
    CREATE POLICY "Custom groups can be updated by creator" 
        ON public.custom_groups FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = created_by);
    
    DROP POLICY IF EXISTS "Custom groups can be deleted by creator" ON public.custom_groups;
    CREATE POLICY "Custom groups can be deleted by creator" 
        ON public.custom_groups FOR DELETE 
        TO authenticated 
        USING (auth.uid() = created_by);
    
    -- Custom group organizations policies
    DROP POLICY IF EXISTS "Custom group organizations are viewable by all authenticated users" ON public.custom_group_organizations;
    CREATE POLICY "Custom group organizations are viewable by all authenticated users" 
        ON public.custom_group_organizations FOR SELECT 
        TO authenticated 
        USING (true);
    
    DROP POLICY IF EXISTS "Custom group organizations can be managed by group creator" ON public.custom_group_organizations;
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
END $$;

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (safe to run multiple times)
DROP TRIGGER IF EXISTS update_sectors_updated_at ON public.sectors;
CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON public.sectors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_activity_sectors_updated_at ON public.activity_sectors;
CREATE TRIGGER update_activity_sectors_updated_at BEFORE UPDATE ON public.activity_sectors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_custom_groups_updated_at ON public.custom_groups;
CREATE TRIGGER update_custom_groups_updated_at BEFORE UPDATE ON public.custom_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Final verification
SELECT 
    'Tables created:' as status,
    COUNT(*) as table_count,
    string_agg(table_name, ', ') as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sectors', 'activity_sectors', 'custom_groups', 'custom_group_organizations');

SELECT 
    'Sectors loaded:' as status,
    COUNT(*) as sector_count 
FROM public.sectors; 