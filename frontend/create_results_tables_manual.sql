-- Create IATI Results tables manually
-- Run this in your Supabase SQL Editor if the migration hasn't been applied

-- Create activity_results table
CREATE TABLE IF NOT EXISTS activity_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    
    -- IATI result attributes
    type TEXT NOT NULL CHECK (type IN ('output', 'outcome', 'impact', 'other')),
    aggregation_status BOOLEAN DEFAULT false,
    
    -- Multilingual narratives (JSON structure for i18n support)
    title JSONB NOT NULL DEFAULT '{"en": ""}',
    description JSONB DEFAULT '{"en": ""}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create result_indicators table
CREATE TABLE IF NOT EXISTS result_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES activity_results(id) ON DELETE CASCADE,
    
    -- IATI indicator attributes
    measure TEXT NOT NULL DEFAULT 'unit' CHECK (measure IN ('unit', 'percentage', 'currency', 'qualitative')),
    ascending BOOLEAN DEFAULT true,
    aggregation_status BOOLEAN DEFAULT false,
    
    -- Multilingual narratives
    title JSONB NOT NULL DEFAULT '{"en": ""}',
    description JSONB DEFAULT '{"en": ""}',
    
    -- Reference vocabulary (optional)
    reference_vocab TEXT,
    reference_code TEXT,
    reference_uri TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indicator_baselines table
CREATE TABLE IF NOT EXISTS indicator_baselines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    indicator_id UUID NOT NULL REFERENCES result_indicators(id) ON DELETE CASCADE,
    
    -- Baseline data
    baseline_year INTEGER,
    iso_date DATE,
    value DECIMAL(20, 4),
    comment TEXT,
    
    -- Location reference (optional)
    location_ref TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Constraints
    UNIQUE(indicator_id) -- One baseline per indicator
);

-- Create indicator_periods table
CREATE TABLE IF NOT EXISTS indicator_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    indicator_id UUID NOT NULL REFERENCES result_indicators(id) ON DELETE CASCADE,
    
    -- Period definition
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Target values
    target_value DECIMAL(20, 4),
    target_comment TEXT,
    target_location_ref TEXT,
    
    -- Actual values
    actual_value DECIMAL(20, 4),
    actual_comment TEXT,
    actual_location_ref TEXT,
    
    -- Disaggregation facet (optional, for later enhancement)
    facet TEXT DEFAULT 'Total',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_results_activity_id ON activity_results(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_results_type ON activity_results(type);
CREATE INDEX IF NOT EXISTS idx_result_indicators_result_id ON result_indicators(result_id);
CREATE INDEX IF NOT EXISTS idx_result_indicators_measure ON result_indicators(measure);
CREATE INDEX IF NOT EXISTS idx_indicator_baselines_indicator_id ON indicator_baselines(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_periods_indicator_id ON indicator_periods(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_periods_dates ON indicator_periods(period_start, period_end);

-- Enable Row Level Security
ALTER TABLE activity_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_results
DROP POLICY IF EXISTS "Results are viewable by everyone" ON activity_results;
CREATE POLICY "Results are viewable by everyone"
    ON activity_results FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can create results" ON activity_results;
CREATE POLICY "Authenticated users can create results"
    ON activity_results FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update results they can access" ON activity_results;
CREATE POLICY "Users can update results they can access"
    ON activity_results FOR UPDATE
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete results they can access" ON activity_results;
CREATE POLICY "Users can delete results they can access"
    ON activity_results FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- RLS Policies for result_indicators
DROP POLICY IF EXISTS "Indicators are viewable by everyone" ON result_indicators;
CREATE POLICY "Indicators are viewable by everyone"
    ON result_indicators FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can create indicators" ON result_indicators;
CREATE POLICY "Authenticated users can create indicators"
    ON result_indicators FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update indicators they can access" ON result_indicators;
CREATE POLICY "Users can update indicators they can access"
    ON result_indicators FOR UPDATE
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete indicators they can access" ON result_indicators;
CREATE POLICY "Users can delete indicators they can access"
    ON result_indicators FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- RLS Policies for indicator_baselines
DROP POLICY IF EXISTS "Baselines are viewable by everyone" ON indicator_baselines;
CREATE POLICY "Baselines are viewable by everyone"
    ON indicator_baselines FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage baselines" ON indicator_baselines;
CREATE POLICY "Authenticated users can manage baselines"
    ON indicator_baselines FOR ALL
    USING (auth.uid() IS NOT NULL);

-- RLS Policies for indicator_periods
DROP POLICY IF EXISTS "Periods are viewable by everyone" ON indicator_periods;
CREATE POLICY "Periods are viewable by everyone"
    ON indicator_periods FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage periods" ON indicator_periods;
CREATE POLICY "Authenticated users can manage periods"
    ON indicator_periods FOR ALL
    USING (auth.uid() IS NOT NULL);

-- Success message
SELECT 'Results tables created successfully!' as message;