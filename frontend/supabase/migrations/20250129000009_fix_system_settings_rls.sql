-- Fix RLS policies for system_settings table to allow admin API access
-- The current policies are too restrictive and prevent the admin API from working

-- First, create the system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1, -- Use INTEGER instead of SERIAL for single-row table
    home_country VARCHAR(2) NOT NULL DEFAULT 'RW', -- ISO 3166-1 alpha-2 country code
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID -- Remove foreign key reference for now to avoid dependency issues
);

-- Insert default settings row if it doesn't exist
INSERT INTO system_settings (id, home_country, updated_at) 
VALUES (1, 'RW', NOW())
ON CONFLICT (id) DO NOTHING;

-- Disable RLS temporarily to allow admin operations
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with more permissive policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated users (needed for system-wide access)
CREATE POLICY "Allow read access for authenticated users" ON system_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow insert/update for service role (admin API)
CREATE POLICY "Allow service role access" ON system_settings
    FOR ALL USING (auth.role() = 'service_role');

-- Drop the old restrictive policies if they exist
DROP POLICY IF EXISTS "Super users can read system settings" ON system_settings;
DROP POLICY IF EXISTS "Super users can update system settings" ON system_settings;
DROP POLICY IF EXISTS "Super users can insert system settings" ON system_settings;

-- Add comment explaining the change
COMMENT ON TABLE system_settings IS 'Global system configuration settings - accessible by admin API and authenticated users';
