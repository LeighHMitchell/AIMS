-- Create activity_sectors join table for many-to-many relationship
-- This allows activities to have multiple sectors with percentages (IATI compliant)

-- First, create the sectors table if it doesn't exist
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

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_sectors_code ON public.sectors(code);
CREATE INDEX IF NOT EXISTS idx_sectors_vocabulary ON public.sectors(vocabulary);

-- Create the activity_sectors join table
CREATE TABLE IF NOT EXISTS public.activity_sectors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) DEFAULT 100.00 CHECK (percentage >= 0 AND percentage <= 100),
    vocabulary VARCHAR(50) DEFAULT 'DAC',
    vocabulary_uri VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure unique combination of activity and sector
    UNIQUE(activity_id, sector_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_sectors_activity_id ON public.activity_sectors(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_sectors_sector_id ON public.activity_sectors(sector_id);

-- Create a trigger to ensure sector percentages don't exceed 100% per activity
CREATE OR REPLACE FUNCTION check_sector_percentages()
RETURNS TRIGGER AS $$
DECLARE
    total_percentage DECIMAL(5,2);
BEGIN
    -- Calculate total percentage for the activity
    SELECT COALESCE(SUM(percentage), 0) INTO total_percentage
    FROM activity_sectors
    WHERE activity_id = NEW.activity_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    -- Add the new/updated percentage
    total_percentage := total_percentage + NEW.percentage;
    
    -- Check if total exceeds 100%
    IF total_percentage > 100 THEN
        RAISE EXCEPTION 'Total sector percentages for activity % would exceed 100%% (current total: %%)', 
            NEW.activity_id, total_percentage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for insert and update
DROP TRIGGER IF EXISTS check_sector_percentages_trigger ON public.activity_sectors;
CREATE TRIGGER check_sector_percentages_trigger
    BEFORE INSERT OR UPDATE ON public.activity_sectors
    FOR EACH ROW
    EXECUTE FUNCTION check_sector_percentages();

-- Add some common DAC sectors if the sectors table is empty
INSERT INTO public.sectors (code, name, category, vocabulary) VALUES
    ('111', 'Education, level unspecified', 'Social Infrastructure & Services', 'DAC'),
    ('112', 'Basic education', 'Social Infrastructure & Services', 'DAC'),
    ('113', 'Secondary education', 'Social Infrastructure & Services', 'DAC'),
    ('114', 'Post-secondary education', 'Social Infrastructure & Services', 'DAC'),
    ('121', 'Health, general', 'Social Infrastructure & Services', 'DAC'),
    ('122', 'Basic health', 'Social Infrastructure & Services', 'DAC'),
    ('130', 'Population policies/programmes & reproductive health', 'Social Infrastructure & Services', 'DAC'),
    ('140', 'Water supply & sanitation', 'Social Infrastructure & Services', 'DAC'),
    ('151', 'Government & civil society-general', 'Social Infrastructure & Services', 'DAC'),
    ('152', 'Conflict, peace & security', 'Social Infrastructure & Services', 'DAC'),
    ('160', 'Other social infrastructure & services', 'Social Infrastructure & Services', 'DAC'),
    ('210', 'Transport & storage', 'Economic Infrastructure & Services', 'DAC'),
    ('220', 'Communications', 'Economic Infrastructure & Services', 'DAC'),
    ('230', 'Energy', 'Economic Infrastructure & Services', 'DAC'),
    ('240', 'Banking & financial services', 'Economic Infrastructure & Services', 'DAC'),
    ('250', 'Business & other services', 'Economic Infrastructure & Services', 'DAC'),
    ('311', 'Agriculture', 'Production Sectors', 'DAC'),
    ('312', 'Forestry', 'Production Sectors', 'DAC'),
    ('313', 'Fishing', 'Production Sectors', 'DAC'),
    ('321', 'Industry', 'Production Sectors', 'DAC'),
    ('322', 'Mineral resources & mining', 'Production Sectors', 'DAC'),
    ('323', 'Construction', 'Production Sectors', 'DAC'),
    ('331', 'Trade policy & regulations', 'Production Sectors', 'DAC'),
    ('332', 'Tourism', 'Production Sectors', 'DAC'),
    ('410', 'General environment protection', 'Multi-Sector / Cross-Cutting', 'DAC'),
    ('430', 'Other multisector', 'Multi-Sector / Cross-Cutting', 'DAC'),
    ('510', 'General budget support', 'Commodity Aid / General Programme Assistance', 'DAC'),
    ('520', 'Development food assistance', 'Commodity Aid / General Programme Assistance', 'DAC'),
    ('530', 'Other commodity assistance', 'Commodity Aid / General Programme Assistance', 'DAC'),
    ('600', 'Action relating to debt', 'Action Relating to Debt', 'DAC'),
    ('720', 'Emergency response', 'Humanitarian Aid', 'DAC'),
    ('730', 'Reconstruction relief & rehabilitation', 'Humanitarian Aid', 'DAC'),
    ('740', 'Disaster prevention & preparedness', 'Humanitarian Aid', 'DAC'),
    ('910', 'Administrative costs of donors', 'Unallocated / Unspecified', 'DAC'),
    ('920', 'Support to non-governmental organisations (NGOs)', 'Unallocated / Unspecified', 'DAC'),
    ('930', 'Refugees in donor countries', 'Unallocated / Unspecified', 'DAC'),
    ('998', 'Unallocated / Unspecified', 'Unallocated / Unspecified', 'DAC')
ON CONFLICT (code) DO NOTHING;

-- Grant permissions
GRANT ALL ON public.sectors TO authenticated;
GRANT ALL ON public.activity_sectors TO authenticated;
GRANT USAGE ON SEQUENCE activity_sectors_id_seq TO authenticated;

-- Enable RLS
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_sectors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sectors (read-only for all authenticated users)
CREATE POLICY "Sectors are viewable by all authenticated users" 
    ON public.sectors FOR SELECT 
    TO authenticated 
    USING (true);

-- Create RLS policies for activity_sectors
CREATE POLICY "Activity sectors are viewable by all authenticated users" 
    ON public.activity_sectors FOR SELECT 
    TO authenticated 
    USING (true);

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

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON public.sectors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_sectors_updated_at BEFORE UPDATE ON public.activity_sectors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 