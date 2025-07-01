# Database Migration Instructions

To fix the IATI sync error and enable multiple sectors per activity, you need to run these migrations in your Supabase SQL editor.

## Steps:

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run each of these SQL commands in order:

### Step 1: Create the sectors table (if it doesn't exist)

```sql
-- Create sectors table
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
```

### Step 2: Create the activity_sectors join table

```sql
-- Create activity_sectors join table
CREATE TABLE IF NOT EXISTS public.activity_sectors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) DEFAULT 100.00 CHECK (percentage >= 0 AND percentage <= 100),
    vocabulary VARCHAR(50) DEFAULT 'DAC',
    vocabulary_uri VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(activity_id, sector_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_sectors_activity_id ON public.activity_sectors(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_sectors_sector_id ON public.activity_sectors(sector_id);
```

### Step 3: Insert common DAC sectors

```sql
-- Insert common DAC sectors
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
```

### Step 4: Enable Row Level Security (RLS)

```sql
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
```

### Step 5: Create update timestamp trigger

```sql
-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON public.sectors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_sectors_updated_at BEFORE UPDATE ON public.activity_sectors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Verification

After running these migrations, you can verify they worked by running:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sectors', 'activity_sectors');

-- Check sector count
SELECT COUNT(*) FROM public.sectors;

-- Check if join table is working
SELECT * FROM public.activity_sectors LIMIT 1;
```

## Next Steps

Once these migrations are complete:
1. The IATI sync should work without errors
2. Activities can have multiple sectors with percentages
3. The system will be IATI-compliant for sector data 