-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Forward Spending Survey table (one per activity)
CREATE TABLE IF NOT EXISTS forward_spending_survey (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    extraction_date DATE NOT NULL,
    priority INTEGER CHECK (priority >= 1 AND priority <= 5),
    phaseout_year INTEGER CHECK (phaseout_year >= 2000 AND phaseout_year <= 2100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT one_fss_per_activity UNIQUE(activity_id)
);

-- FSS Forecasts table (multiple forecasts per FSS)
CREATE TABLE IF NOT EXISTS fss_forecasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fss_id UUID NOT NULL REFERENCES forward_spending_survey(id) ON DELETE CASCADE,
    forecast_year INTEGER NOT NULL CHECK (forecast_year >= 2000 AND forecast_year <= 2100),
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    value_date DATE,
    usd_amount DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT one_forecast_per_year UNIQUE(fss_id, forecast_year)
);

-- Indexes for performance
CREATE INDEX idx_fss_activity_id ON forward_spending_survey(activity_id);
CREATE INDEX idx_fss_extraction_date ON forward_spending_survey(extraction_date);
CREATE INDEX idx_fss_forecasts_fss_id ON fss_forecasts(fss_id);
CREATE INDEX idx_fss_forecasts_year ON fss_forecasts(forecast_year);

-- Triggers for updated_at
CREATE TRIGGER update_fss_updated_at 
    BEFORE UPDATE ON forward_spending_survey 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fss_forecasts_updated_at 
    BEFORE UPDATE ON fss_forecasts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE forward_spending_survey ENABLE ROW LEVEL SECURITY;
ALTER TABLE fss_forecasts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read FSS data
CREATE POLICY "Users can view FSS" ON forward_spending_survey
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view FSS forecasts" ON fss_forecasts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to manage FSS data (based on activity permissions)
CREATE POLICY "Users can insert FSS" ON forward_spending_survey
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update FSS" ON forward_spending_survey
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete FSS" ON forward_spending_survey
    FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for forecasts
CREATE POLICY "Users can insert forecasts" ON fss_forecasts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update forecasts" ON fss_forecasts
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete forecasts" ON fss_forecasts
    FOR DELETE USING (auth.role() = 'authenticated');

