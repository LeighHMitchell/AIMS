-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create planned_disbursements table for IATI-compliant planned disbursements
CREATE TABLE IF NOT EXISTS planned_disbursements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    
    -- Core IATI fields
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Organization references
    provider_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    provider_org_name VARCHAR(255),
    receiver_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    receiver_org_name VARCHAR(255),
    
    -- Additional IATI fields
    status VARCHAR(20) DEFAULT 'original' CHECK (status IN ('original', 'revised')),
    value_date DATE,
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_activity_id ON planned_disbursements(activity_id);
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_period_start ON planned_disbursements(period_start);
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_provider_org ON planned_disbursements(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_receiver_org ON planned_disbursements(receiver_org_id);

-- Add trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_planned_disbursements_updated_at ON planned_disbursements;
CREATE TRIGGER update_planned_disbursements_updated_at 
    BEFORE UPDATE ON planned_disbursements 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE planned_disbursements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "View planned disbursements" ON planned_disbursements;
DROP POLICY IF EXISTS "Create planned disbursements" ON planned_disbursements;
DROP POLICY IF EXISTS "Update planned disbursements" ON planned_disbursements;
DROP POLICY IF EXISTS "Delete planned disbursements" ON planned_disbursements;

-- Policy for viewing planned disbursements (anyone can view published activities' disbursements)
CREATE POLICY "View planned disbursements" ON planned_disbursements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = planned_disbursements.activity_id
            AND (
                a.publication_status = 'published'
                OR auth.uid() IN (
                    SELECT user_id FROM activity_permissions
                    WHERE activity_id = a.id
                )
            )
        )
    );

-- Policy for creating planned disbursements (activity editors only)
CREATE POLICY "Create planned disbursements" ON planned_disbursements
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM activity_permissions
            WHERE activity_id = planned_disbursements.activity_id
            AND user_id = auth.uid()
            AND can_edit = true
        )
    );

-- Policy for updating planned disbursements (activity editors only)
CREATE POLICY "Update planned disbursements" ON planned_disbursements
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM activity_permissions
            WHERE activity_id = planned_disbursements.activity_id
            AND user_id = auth.uid()
            AND can_edit = true
        )
    );

-- Policy for deleting planned disbursements (activity editors only)
CREATE POLICY "Delete planned disbursements" ON planned_disbursements
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM activity_permissions
            WHERE activity_id = planned_disbursements.activity_id
            AND user_id = auth.uid()
            AND can_edit = true
        )
    );

-- Add comment for documentation
COMMENT ON TABLE planned_disbursements IS 'IATI-compliant planned disbursements for activities. Represents expected future payments from provider to receiver organizations.';
COMMENT ON COLUMN planned_disbursements.status IS 'original: initial planned disbursement, revised: updated planned disbursement';
COMMENT ON COLUMN planned_disbursements.value_date IS 'The date to be used for determining exchange rates for currency conversions'; 