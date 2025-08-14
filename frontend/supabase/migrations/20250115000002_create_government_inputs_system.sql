-- Create government_inputs table
CREATE TABLE IF NOT EXISTS government_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    
    -- Budget Classification fields
    on_budget_classification JSONB DEFAULT '{}',
    
    -- Government Financial Contribution fields
    rgc_contribution JSONB DEFAULT '{}',
    
    -- National Plan Alignment fields
    national_plan_alignment JSONB DEFAULT '{}',
    
    -- Technical Coordination fields
    technical_coordination JSONB DEFAULT '{}',
    
    -- Oversight Agreement fields
    oversight_agreement JSONB DEFAULT '{}',
    
    -- Geographic Context fields
    geographic_context JSONB DEFAULT '{}',
    
    -- Strategic Considerations fields
    strategic_considerations JSONB DEFAULT '{}',
    
    -- Evaluation Results fields
    evaluation_results JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_government_inputs_activity_id ON government_inputs(activity_id);
CREATE INDEX IF NOT EXISTS idx_government_inputs_created_at ON government_inputs(created_at);

-- Create unique constraint to ensure one government_inputs record per activity
CREATE UNIQUE INDEX IF NOT EXISTS idx_government_inputs_activity_unique ON government_inputs(activity_id);

-- Enable Row Level Security (RLS)
ALTER TABLE government_inputs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view government inputs for activities they can access" ON government_inputs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM activities a 
            WHERE a.id = government_inputs.activity_id 
            AND a.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert government inputs for their activities" ON government_inputs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM activities a 
            WHERE a.id = government_inputs.activity_id 
            AND a.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update government inputs for their activities" ON government_inputs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM activities a 
            WHERE a.id = government_inputs.activity_id 
            AND a.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete government inputs for their activities" ON government_inputs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM activities a 
            WHERE a.id = government_inputs.activity_id 
            AND a.created_by = auth.uid()
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_government_inputs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_government_inputs_updated_at
    BEFORE UPDATE ON government_inputs
    FOR EACH ROW
    EXECUTE FUNCTION update_government_inputs_updated_at();

-- Create helper function to get government inputs for an activity
CREATE OR REPLACE FUNCTION get_government_inputs(activity_uuid UUID)
RETURNS TABLE (
    id UUID,
    activity_id UUID,
    on_budget_classification JSONB,
    rgc_contribution JSONB,
    national_plan_alignment JSONB,
    technical_coordination JSONB,
    oversight_agreement JSONB,
    geographic_context JSONB,
    strategic_considerations JSONB,
    evaluation_results JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gi.id,
        gi.activity_id,
        gi.on_budget_classification,
        gi.rgc_contribution,
        gi.national_plan_alignment,
        gi.technical_coordination,
        gi.oversight_agreement,
        gi.geographic_context,
        gi.strategic_considerations,
        gi.evaluation_results,
        gi.created_at,
        gi.updated_at,
        gi.created_by,
        gi.updated_by
    FROM government_inputs gi
    WHERE gi.activity_id = activity_uuid
    AND EXISTS (
        SELECT 1 FROM activities a 
        WHERE a.id = activity_uuid 
        AND a.created_by = auth.uid()
    );
END;
$$;
