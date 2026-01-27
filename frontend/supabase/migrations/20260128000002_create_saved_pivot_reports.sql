-- Migration: Create saved_pivot_reports table
-- Stores user-created pivot report configurations for later reuse

-- Create the saved_pivot_reports table
CREATE TABLE IF NOT EXISTS saved_pivot_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    -- JSONB config stores: { rows, cols, vals, aggregatorName, rendererName, filters, valueFilter }
    config JSONB NOT NULL DEFAULT '{}',
    -- Template reports are system-provided examples
    is_template BOOLEAN DEFAULT false,
    -- Public reports can be viewed by all users
    is_public BOOLEAN DEFAULT false,
    -- User who created the report
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    -- Organization the report belongs to (for org-level sharing)
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_saved_pivot_reports_created_by ON saved_pivot_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_pivot_reports_organization_id ON saved_pivot_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_pivot_reports_is_template ON saved_pivot_reports(is_template);
CREATE INDEX IF NOT EXISTS idx_saved_pivot_reports_is_public ON saved_pivot_reports(is_public);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_pivot_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS saved_pivot_reports_updated_at ON saved_pivot_reports;
CREATE TRIGGER saved_pivot_reports_updated_at
    BEFORE UPDATE ON saved_pivot_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_pivot_reports_updated_at();

-- Enable Row Level Security
ALTER TABLE saved_pivot_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT: Users can see their own reports, public reports, and templates
CREATE POLICY "Users can view own, public, and template reports"
    ON saved_pivot_reports FOR SELECT
    TO authenticated
    USING (
        created_by = auth.uid()
        OR is_public = true
        OR is_template = true
        OR organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- INSERT: Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
    ON saved_pivot_reports FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND created_by = auth.uid()
    );

-- UPDATE: Users can update their own reports, admins can update templates
CREATE POLICY "Users can update own reports"
    ON saved_pivot_reports FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR (
            is_template = true
            AND EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.role IN ('admin', 'super_admin', 'super_user')
            )
        )
    );

-- DELETE: Users can delete their own reports, admins can delete templates
CREATE POLICY "Users can delete own reports"
    ON saved_pivot_reports FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR (
            is_template = true
            AND EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.role IN ('admin', 'super_admin', 'super_user')
            )
        )
    );

-- Add comment for documentation
COMMENT ON TABLE saved_pivot_reports IS 'Stores saved pivot report configurations for the custom report builder feature';

-- Insert some default template reports
INSERT INTO saved_pivot_reports (name, description, config, is_template, is_public) VALUES
(
    'Disbursements by Year and Partner',
    'Shows total disbursements broken down by fiscal year and development partner',
    '{
        "rows": ["fiscal_year"],
        "cols": ["reporting_org_name"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Funding by Sector',
    'Shows funding distribution across different sectors',
    '{
        "rows": ["sector_category"],
        "cols": ["transaction_type"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table Heatmap"
    }'::jsonb,
    true,
    true
),
(
    'Activity Status Summary',
    'Overview of activities by status and development partner',
    '{
        "rows": ["activity_status"],
        "cols": ["reporting_org_name"],
        "vals": [],
        "aggregatorName": "Count",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
),
(
    'Quarterly Transaction Analysis',
    'Transaction values by quarter and type',
    '{
        "rows": ["fiscal_year", "fiscal_quarter"],
        "cols": ["transaction_type"],
        "vals": ["transaction_value_usd"],
        "aggregatorName": "Sum",
        "rendererName": "Table"
    }'::jsonb,
    true,
    true
);
