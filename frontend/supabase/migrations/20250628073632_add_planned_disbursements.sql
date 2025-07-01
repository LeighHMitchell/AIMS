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
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
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

-- Enable RLS but with simpler policies for now
ALTER TABLE planned_disbursements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view planned disbursements" ON planned_disbursements;
DROP POLICY IF EXISTS "Authenticated users can create planned disbursements" ON planned_disbursements;
DROP POLICY IF EXISTS "Authenticated users can update planned disbursements" ON planned_disbursements;
DROP POLICY IF EXISTS "Authenticated users can delete planned disbursements" ON planned_disbursements;

-- Simple policies - you can enhance these based on your specific requirements
-- Allow all authenticated users to view all planned disbursements
CREATE POLICY "Anyone can view planned disbursements" ON planned_disbursements
    FOR SELECT
    USING (true);

-- Allow authenticated users to create planned disbursements
CREATE POLICY "Authenticated users can create planned disbursements" ON planned_disbursements
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update planned disbursements
CREATE POLICY "Authenticated users can update planned disbursements" ON planned_disbursements
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete planned disbursements
CREATE POLICY "Authenticated users can delete planned disbursements" ON planned_disbursements
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Add comment for documentation
COMMENT ON TABLE planned_disbursements IS 'IATI-compliant planned disbursements for activities. Represents expected future payments from provider to receiver organizations.';
COMMENT ON COLUMN planned_disbursements.status IS 'original: initial planned disbursement, revised: updated planned disbursement';
COMMENT ON COLUMN planned_disbursements.value_date IS 'The date to be used for determining exchange rates for currency conversions'; 