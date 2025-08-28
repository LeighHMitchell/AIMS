-- Create government endorsements table for tracking official government approval/validation
CREATE TABLE IF NOT EXISTS government_endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    
    -- Core endorsement data
    effective_date DATE,
    validation_status TEXT CHECK (validation_status IN ('validated', 'rejected', 'more_info_requested')),
    validating_authority TEXT,
    validation_notes TEXT,
    validation_date DATE,
    
    -- Document metadata (IATI-compliant)
    document_title TEXT,
    document_description TEXT,
    document_url TEXT,
    document_category TEXT DEFAULT 'A09', -- IATI code for "Memorandum of understanding"
    document_language TEXT DEFAULT 'en',
    document_date DATE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure one endorsement per activity
    UNIQUE(activity_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_government_endorsements_activity_id ON government_endorsements(activity_id);
CREATE INDEX IF NOT EXISTS idx_government_endorsements_validation_status ON government_endorsements(validation_status);
CREATE INDEX IF NOT EXISTS idx_government_endorsements_effective_date ON government_endorsements(effective_date);

-- Enable RLS
ALTER TABLE government_endorsements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow government users and super users to view all endorsements
CREATE POLICY "Government users can view endorsements" ON government_endorsements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND (user_profiles.role LIKE '%gov_%' OR user_profiles.role = 'super_user')
        )
    );

-- Allow activity contributors and government users to view endorsements for their activities
CREATE POLICY "Activity contributors can view their endorsements" ON government_endorsements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM activity_contributors ac
            JOIN user_profiles up ON up.id = auth.uid()
            WHERE ac.activity_id = government_endorsements.activity_id
            AND ac.user_id = auth.uid()
        )
    );

-- Allow government users to insert/update endorsements
CREATE POLICY "Government users can manage endorsements" ON government_endorsements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND (user_profiles.role LIKE '%gov_%' OR user_profiles.role = 'super_user')
        )
    );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_government_endorsements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_government_endorsements_updated_at
    BEFORE UPDATE ON government_endorsements
    FOR EACH ROW
    EXECUTE FUNCTION update_government_endorsements_updated_at();

-- Create trigger for created_by on insert
CREATE OR REPLACE FUNCTION set_government_endorsements_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_government_endorsements_created_by
    BEFORE INSERT ON government_endorsements
    FOR EACH ROW
    EXECUTE FUNCTION set_government_endorsements_created_by();

-- Add helpful comments
COMMENT ON TABLE government_endorsements IS 'Stores government endorsement/validation data for activities';
COMMENT ON COLUMN government_endorsements.effective_date IS 'Official date when the agreement/MOU takes effect';
COMMENT ON COLUMN government_endorsements.validation_status IS 'Current validation status: validated, rejected, or more_info_requested';
COMMENT ON COLUMN government_endorsements.validating_authority IS 'Government ministry/department confirming endorsement';
COMMENT ON COLUMN government_endorsements.validation_notes IS 'Conditions, clarifications, or explanatory notes';
COMMENT ON COLUMN government_endorsements.validation_date IS 'Date when government reviewed/approved';
COMMENT ON COLUMN government_endorsements.document_title IS 'Title of the MOU/agreement document';
COMMENT ON COLUMN government_endorsements.document_description IS 'Optional description of the document';
COMMENT ON COLUMN government_endorsements.document_url IS 'URL/path to the uploaded document';
COMMENT ON COLUMN government_endorsements.document_category IS 'IATI document category code (default: A09 for MOU)';
