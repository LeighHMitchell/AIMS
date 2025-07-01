-- Check if activity_sectors table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'activity_sectors'
) as table_exists;

-- If it exists, show its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'activity_sectors'
ORDER BY ordinal_position;

-- Check for any indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'activity_sectors';

-- Check for any foreign key constraints
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='activity_sectors';

-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS activity_sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    sector_code TEXT NOT NULL,
    sector_name TEXT,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    type TEXT DEFAULT 'secondary',
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_activity_sectors_activity_id ON activity_sectors(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_sectors_sector_code ON activity_sectors(sector_code);

-- Add RLS policies if not already present
ALTER TABLE activity_sectors ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY IF NOT EXISTS "activity_sectors_read_policy" 
ON activity_sectors FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to insert/update/delete sectors for activities they can edit
CREATE POLICY IF NOT EXISTS "activity_sectors_write_policy" 
ON activity_sectors FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM activities 
        WHERE activities.id = activity_sectors.activity_id
    )
);

-- Test query to see if any sectors exist
SELECT COUNT(*) as total_sectors FROM activity_sectors;

-- Show a few sample sectors
SELECT 
    a.title as activity_title,
    s.*
FROM activity_sectors s
JOIN activities a ON a.id = s.activity_id
ORDER BY s.created_at DESC
LIMIT 10; 