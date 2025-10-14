-- Migration: Add Location References
-- Description: Create tables to store geographic location references for baselines and periods

-- Drop existing tables if they exist (to ensure clean migration)
DROP TABLE IF EXISTS period_locations CASCADE;
DROP TABLE IF EXISTS baseline_locations CASCADE;

-- Locations for baselines
CREATE TABLE baseline_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_id UUID NOT NULL REFERENCES indicator_baselines(id) ON DELETE CASCADE,
    location_ref TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ensure unique location ref per baseline
    CONSTRAINT unique_baseline_location UNIQUE(baseline_id, location_ref)
);

-- Locations for periods (separate for target and actual)
CREATE TABLE period_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES indicator_periods(id) ON DELETE CASCADE,
    location_type TEXT NOT NULL CHECK (location_type IN ('target', 'actual')),
    location_ref TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ensure unique location ref per period and type
    CONSTRAINT unique_period_location UNIQUE(period_id, location_type, location_ref)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_baseline_locs_baseline ON baseline_locations(baseline_id);
CREATE INDEX IF NOT EXISTS idx_baseline_locs_ref ON baseline_locations(location_ref);
CREATE INDEX IF NOT EXISTS idx_period_locs_period ON period_locations(period_id);
CREATE INDEX IF NOT EXISTS idx_period_locs_type ON period_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_period_locs_ref ON period_locations(location_ref);

-- Add RLS policies
ALTER TABLE baseline_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_locations ENABLE ROW LEVEL SECURITY;

-- Baseline locations policies
CREATE POLICY "Users can view baseline locations"
    ON baseline_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM indicator_baselines ib
            JOIN result_indicators ri ON ib.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ib.id = baseline_locations.baseline_id
        )
    );

CREATE POLICY "Users can insert baseline locations"
    ON baseline_locations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM indicator_baselines ib
            JOIN result_indicators ri ON ib.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ib.id = baseline_locations.baseline_id
        )
    );

CREATE POLICY "Users can update baseline locations"
    ON baseline_locations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM indicator_baselines ib
            JOIN result_indicators ri ON ib.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ib.id = baseline_locations.baseline_id
        )
    );

CREATE POLICY "Users can delete their own baseline locations"
    ON baseline_locations FOR DELETE
    USING (created_by = auth.uid());

-- Period locations policies
CREATE POLICY "Users can view period locations"
    ON period_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM indicator_periods ip
            JOIN result_indicators ri ON ip.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ip.id = period_locations.period_id
        )
    );

CREATE POLICY "Users can insert period locations"
    ON period_locations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM indicator_periods ip
            JOIN result_indicators ri ON ip.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ip.id = period_locations.period_id
        )
    );

CREATE POLICY "Users can update period locations"
    ON period_locations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM indicator_periods ip
            JOIN result_indicators ri ON ip.indicator_id = ri.id
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ip.id = period_locations.period_id
        )
    );

CREATE POLICY "Users can delete their own period locations"
    ON period_locations FOR DELETE
    USING (created_by = auth.uid());

