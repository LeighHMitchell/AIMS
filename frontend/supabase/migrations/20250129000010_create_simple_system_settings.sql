-- Create a simple system_settings table for basic functionality
-- This is a simplified version to get the system working

-- Create the system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    home_country VARCHAR(2) NOT NULL DEFAULT 'RW',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (id, home_country) 
VALUES (1, 'RW')
ON CONFLICT (id) DO NOTHING;

-- Don't enable RLS for now - keep it simple
-- We can add RLS policies later once the basic functionality works

COMMENT ON TABLE system_settings IS 'Global system configuration settings';
COMMENT ON COLUMN system_settings.home_country IS 'Default home country for the system (ISO 3166-1 alpha-2 code)';
