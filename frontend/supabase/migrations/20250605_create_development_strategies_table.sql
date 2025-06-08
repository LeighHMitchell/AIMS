-- Create development_strategies table
CREATE TABLE IF NOT EXISTS development_strategies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic Information
    title TEXT NOT NULL,
    document_type TEXT NOT NULL, -- 'Bilateral Partnership Plan', 'Regional Strategy', etc.
    status TEXT NOT NULL CHECK (status IN (
        'Published', 'Active', 'Completed', 
        'Draft – Internal Only', 'Under Government Consultation', 'Pending Publication / Approval'
    )),
    
    -- Time Information
    start_date DATE,
    end_date DATE,
    start_year INTEGER,
    end_year INTEGER,
    start_month INTEGER, -- 1-12 for month/year entries
    end_month INTEGER,
    estimated_start_date DATE, -- For strategies under development
    estimated_end_date DATE,
    expected_publication_date DATE,
    
    -- Content & Metadata
    thematic_pillars TEXT[], -- Array of tags/priorities
    languages TEXT[] DEFAULT ARRAY['English'], -- Array of languages
    public_link TEXT,
    notes TEXT, -- Private notes for internal use
    
    -- File Information
    has_file BOOLEAN DEFAULT false,
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    file_url TEXT,
    
    -- Visibility & Access
    public BOOLEAN DEFAULT false,
    
    -- Government Relations
    government_counterparts TEXT[], -- Array of government contacts/departments
    
    -- Audit Information
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_edited_by UUID REFERENCES users(id),
    
    -- Indexing
    CONSTRAINT valid_date_range CHECK (
        CASE 
            WHEN start_date IS NOT NULL AND end_date IS NOT NULL 
            THEN start_date <= end_date
            ELSE true
        END
    ),
    CONSTRAINT valid_year_range CHECK (
        CASE 
            WHEN start_year IS NOT NULL AND end_year IS NOT NULL 
            THEN start_year <= end_year
            ELSE true
        END
    )
);

-- Create indexes for better performance
CREATE INDEX idx_development_strategies_organization ON development_strategies(organization_id);
CREATE INDEX idx_development_strategies_status ON development_strategies(status);
CREATE INDEX idx_development_strategies_public ON development_strategies(public);
CREATE INDEX idx_development_strategies_dates ON development_strategies(start_date, end_date);
CREATE INDEX idx_development_strategies_years ON development_strategies(start_year, end_year);
CREATE INDEX idx_development_strategies_created_at ON development_strategies(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_development_strategies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_development_strategies_updated_at
    BEFORE UPDATE ON development_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_development_strategies_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE development_strategies ENABLE ROW LEVEL SECURITY;

-- Policy for reading public strategies
CREATE POLICY "Public strategies are viewable by everyone" ON development_strategies
    FOR SELECT USING (public = true AND has_file = true);

-- Policy for reading all strategies by organization members, super users, and government users
CREATE POLICY "Organization members can view their strategies" ON development_strategies
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM user_organizations 
            WHERE organization_id = development_strategies.organization_id
        )
        OR 
        auth.uid() IN (
            SELECT id FROM users 
            WHERE role IN ('super_user', 'government_user')
        )
    );

-- Policy for inserting strategies
CREATE POLICY "Organization members can create strategies" ON development_strategies
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM user_organizations 
            WHERE organization_id = development_strategies.organization_id
        )
        OR 
        auth.uid() IN (
            SELECT id FROM users 
            WHERE role IN ('super_user', 'government_user')
        )
    );

-- Policy for updating strategies
CREATE POLICY "Organization members can update their strategies" ON development_strategies
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM user_organizations 
            WHERE organization_id = development_strategies.organization_id
        )
        OR 
        auth.uid() IN (
            SELECT id FROM users 
            WHERE role IN ('super_user', 'government_user')
        )
    );

-- Policy for deleting strategies
CREATE POLICY "Organization members can delete their strategies" ON development_strategies
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM user_organizations 
            WHERE organization_id = development_strategies.organization_id
        )
        OR 
        auth.uid() IN (
            SELECT id FROM users 
            WHERE role IN ('super_user', 'government_user')
        )
    );

-- Create view for strategy analytics
CREATE OR REPLACE VIEW strategy_analytics AS
SELECT 
    o.name as organization_name,
    o.id as organization_id,
    COUNT(*) as total_strategies,
    COUNT(CASE WHEN public = true THEN 1 END) as public_strategies,
    COUNT(CASE WHEN has_file = true THEN 1 END) as strategies_with_files,
    COUNT(CASE WHEN status = 'Published' THEN 1 END) as published_strategies,
    COUNT(CASE WHEN status LIKE '%Draft%' OR status LIKE '%Consultation%' OR status LIKE '%Pending%' THEN 1 END) as draft_strategies,
    COUNT(CASE WHEN expected_publication_date < NOW() AND status != 'Published' THEN 1 END) as overdue_strategies
FROM development_strategies ds
JOIN organizations o ON ds.organization_id = o.id
GROUP BY o.id, o.name; 