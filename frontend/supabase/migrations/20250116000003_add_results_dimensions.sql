-- Migration: Add Dimensions for Disaggregation
-- Description: Create tables to store disaggregation dimensions for baselines and periods

-- Drop existing tables if they exist (to ensure clean migration)
DROP TABLE IF EXISTS period_dimensions CASCADE;
DROP TABLE IF EXISTS baseline_dimensions CASCADE;

-- Dimensions for baselines
CREATE TABLE baseline_dimensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_id UUID NOT NULL REFERENCES indicator_baselines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ensure unique dimension name per baseline
    CONSTRAINT unique_baseline_dimension UNIQUE(baseline_id, name, value)
);

-- Dimensions for periods (separate for target and actual)
CREATE TABLE period_dimensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES indicator_periods(id) ON DELETE CASCADE,
    dimension_type TEXT NOT NULL CHECK (dimension_type IN ('target', 'actual')),
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ensure unique dimension name per period and type
    CONSTRAINT unique_period_dimension UNIQUE(period_id, dimension_type, name, value)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_baseline_dims_baseline ON baseline_dimensions(baseline_id);
CREATE INDEX IF NOT EXISTS idx_baseline_dims_name ON baseline_dimensions(name);
CREATE INDEX IF NOT EXISTS idx_period_dims_period ON period_dimensions(period_id);
CREATE INDEX IF NOT EXISTS idx_period_dims_type ON period_dimensions(dimension_type);
CREATE INDEX IF NOT EXISTS idx_period_dims_name ON period_dimensions(name);

-- Add RLS policies
ALTER TABLE baseline_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_dimensions ENABLE ROW LEVEL SECURITY;

-- Baseline dimensions policies
CREATE POLICY "Users can view baseline dimensions"
    ON baseline_dimensions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM indicator_baselines ib
            JOIN result_indicators ri ON ib.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ib.id = baseline_dimensions.baseline_id
        )
    );

CREATE POLICY "Users can insert baseline dimensions"
    ON baseline_dimensions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM indicator_baselines ib
            JOIN result_indicators ri ON ib.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ib.id = baseline_dimensions.baseline_id
        )
    );

CREATE POLICY "Users can update baseline dimensions"
    ON baseline_dimensions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM indicator_baselines ib
            JOIN result_indicators ri ON ib.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ib.id = baseline_dimensions.baseline_id
        )
    );

CREATE POLICY "Users can delete their own baseline dimensions"
    ON baseline_dimensions FOR DELETE
    USING (created_by = auth.uid());

-- Period dimensions policies
CREATE POLICY "Users can view period dimensions"
    ON period_dimensions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM indicator_periods ip
            JOIN result_indicators ri ON ip.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ip.id = period_dimensions.period_id
        )
    );

CREATE POLICY "Users can insert period dimensions"
    ON period_dimensions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM indicator_periods ip
            JOIN result_indicators ri ON ip.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ip.id = period_dimensions.period_id
        )
    );

CREATE POLICY "Users can update period dimensions"
    ON period_dimensions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM indicator_periods ip
            JOIN result_indicators ri ON ip.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ip.id = period_dimensions.period_id
        )
    );

CREATE POLICY "Users can delete their own period dimensions"
    ON period_dimensions FOR DELETE
    USING (created_by = auth.uid());

