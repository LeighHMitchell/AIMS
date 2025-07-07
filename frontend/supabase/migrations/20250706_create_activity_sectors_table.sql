-- Create activity_sectors table for storing sector allocations
-- This migration handles existing objects gracefully

-- Create activity_sectors table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_sectors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Sector information
    sector_code VARCHAR(10) NOT NULL,
    sector_name TEXT NOT NULL,
    sector_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    -- Category information
    sector_category_code VARCHAR(10),
    sector_category_name TEXT,
    category_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Additional metadata
    type TEXT DEFAULT 'secondary' CHECK (type IN ('primary', 'secondary')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_percentage CHECK (sector_percentage >= 0 AND sector_percentage <= 100),
    CONSTRAINT valid_category_percentage CHECK (category_percentage >= 0 AND category_percentage <= 100),
    UNIQUE(activity_id, sector_code)
);

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_sectors' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE activity_sectors ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_activity_sectors_activity_id;
DROP INDEX IF EXISTS idx_activity_sectors_sector_code;
DROP INDEX IF EXISTS idx_activity_sectors_user_id;

-- Create indexes
CREATE INDEX idx_activity_sectors_activity_id ON activity_sectors(activity_id);
CREATE INDEX idx_activity_sectors_sector_code ON activity_sectors(sector_code);
CREATE INDEX idx_activity_sectors_user_id ON activity_sectors(user_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view activity sectors" ON activity_sectors;
DROP POLICY IF EXISTS "Users can insert activity sectors" ON activity_sectors;
DROP POLICY IF EXISTS "Users can update activity sectors" ON activity_sectors;
DROP POLICY IF EXISTS "Users can delete activity sectors" ON activity_sectors;

-- Enable RLS
ALTER TABLE activity_sectors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view activity sectors" ON activity_sectors
    FOR SELECT USING (true);

CREATE POLICY "Users can insert activity sectors" ON activity_sectors
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update activity sectors" ON activity_sectors
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete activity sectors" ON activity_sectors
    FOR DELETE USING (true);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_activity_sectors_updated_at ON activity_sectors;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_activity_sectors_updated_at
    BEFORE UPDATE ON activity_sectors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create helper function for upserting activity sectors
CREATE OR REPLACE FUNCTION upsert_activity_sectors(
    p_activity_id UUID,
    p_sectors JSONB,
    p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    sector_record JSONB;
BEGIN
    -- Delete existing sectors for this activity
    DELETE FROM activity_sectors WHERE activity_id = p_activity_id;
    
    -- Insert new sectors
    FOR sector_record IN SELECT * FROM jsonb_array_elements(p_sectors)
    LOOP
        INSERT INTO activity_sectors (
            activity_id,
            user_id,
            sector_code,
            sector_name,
            sector_percentage,
            sector_category_code,
            sector_category_name,
            category_percentage,
            type
        ) VALUES (
            p_activity_id,
            p_user_id,
            (sector_record->>'code')::VARCHAR(10),
            sector_record->>'name',
            COALESCE((sector_record->>'percentage')::DECIMAL(5,2), 0),
            (sector_record->>'categoryCode')::VARCHAR(10),
            sector_record->>'category',
            COALESCE((sector_record->>'categoryPercentage')::DECIMAL(5,2), 0),
            COALESCE(sector_record->>'type', 'secondary')
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE activity_sectors IS 'Sector allocations for activities with percentages';
COMMENT ON COLUMN activity_sectors.sector_code IS 'DAC sector code (e.g., 11110 for Education)';
COMMENT ON COLUMN activity_sectors.sector_name IS 'Human-readable sector name';
COMMENT ON COLUMN activity_sectors.sector_percentage IS 'Percentage allocation for this sector (0-100)';
COMMENT ON COLUMN activity_sectors.sector_category_code IS 'DAC category code (e.g., 111 for Education)';
COMMENT ON COLUMN activity_sectors.sector_category_name IS 'Human-readable category name';
COMMENT ON COLUMN activity_sectors.category_percentage IS 'Percentage allocation within the category (0-100)';
COMMENT ON COLUMN activity_sectors.type IS 'primary: main sector, secondary: additional sector'; 