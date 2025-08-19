-- Create system_settings table for global application settings
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    home_country VARCHAR(2) NOT NULL DEFAULT 'RW', -- ISO 3166-1 alpha-2 country code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings row
INSERT INTO system_settings (id, home_country, updated_at) 
VALUES (1, 'RW', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only super users can read system settings
CREATE POLICY "Super users can read system settings" ON system_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_user'
        )
    );

-- Only super users can update system settings
CREATE POLICY "Super users can update system settings" ON system_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_user'
        )
    );

-- Only super users can insert system settings
CREATE POLICY "Super users can insert system settings" ON system_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_user'
        )
    );

-- Add comment for documentation
COMMENT ON TABLE system_settings IS 'Global system configuration settings';
COMMENT ON COLUMN system_settings.home_country IS 'Default home country for the system (ISO 3166-1 alpha-2 code)';
