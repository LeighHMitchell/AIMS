-- Organization Types Table Initialization Script
-- This script creates and populates the organization_types table with the required data structure

-- Create the organization_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS organization_types (
    code VARCHAR(10) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on sort_order for efficient ordering
CREATE INDEX IF NOT EXISTS idx_organization_types_sort_order ON organization_types(sort_order);

-- Create an index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_organization_types_is_active ON organization_types(is_active);

-- Insert or update the organization types data
INSERT INTO organization_types (code, label, description, is_active, sort_order)
VALUES 
    ('23', 'Bilateral', 'National development agencies representing a single government', true, 1),
    ('22', 'Multilateral', 'Intergovernmental organisations with a global or regional mandate', true, 2),
    ('10', 'Government', 'Ministries, line departments, or state authorities', true, 3),
    ('30', 'Private Sector', 'For-profit businesses, contractors, or service providers', true, 4),
    ('15', 'NGO', 'Civil society or non-profit organisations', true, 5),
    ('20', 'Public Sector', 'State-owned enterprises, public institutions, or local authorities', true, 6),
    ('21', 'Public–Private Partnership', 'Formal joint arrangements between public and private sectors', true, 7),
    ('40', 'Academic, Training, and Research', 'Higher education institutions or research and policy institutes', true, 8),
    ('60', 'Foundation', 'Charitable or grant-making organisations funded by private or public sources', true, 9),
    ('70', 'Other', 'Organisations that do not fit clearly into the listed categories', true, 10)
ON CONFLICT (code) 
DO UPDATE SET 
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_organization_types_updated_at ON organization_types;
CREATE TRIGGER update_organization_types_updated_at 
    BEFORE UPDATE ON organization_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the data was inserted correctly
SELECT 
    code,
    label,
    description,
    is_active,
    sort_order,
    created_at,
    updated_at
FROM organization_types 
ORDER BY sort_order; 