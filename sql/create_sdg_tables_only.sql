-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create SDG Goals reference table
CREATE TABLE IF NOT EXISTS sdg_goals (
    id INTEGER PRIMARY KEY, -- 1 to 17
    goal_name TEXT NOT NULL,
    goal_description TEXT NOT NULL,
    icon_url TEXT, -- link to official SDG icon
    color_hex TEXT -- for UI theming
);

-- Create SDG Targets reference table
CREATE TABLE IF NOT EXISTS sdg_targets (
    id TEXT PRIMARY KEY, -- e.g. "5.2"
    goal_number INTEGER NOT NULL REFERENCES sdg_goals(id),
    target_text TEXT NOT NULL,
    target_description TEXT NOT NULL
);

-- Create Activity SDG mappings table
CREATE TABLE IF NOT EXISTS activity_sdg_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    sdg_goal INTEGER CHECK (sdg_goal BETWEEN 1 AND 17) NOT NULL REFERENCES sdg_goals(id),
    sdg_target TEXT NOT NULL REFERENCES sdg_targets(id),
    contribution_percent NUMERIC CHECK (contribution_percent >= 0 AND contribution_percent <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_sdg_mappings_activity_id ON activity_sdg_mappings(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_sdg_mappings_sdg_goal ON activity_sdg_mappings(sdg_goal);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger
CREATE TRIGGER update_activity_sdg_mappings_updated_at BEFORE UPDATE
    ON activity_sdg_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE sdg_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdg_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sdg_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all operations for authenticated users" ON sdg_goals
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON sdg_targets
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON activity_sdg_mappings
    FOR ALL USING (true) WITH CHECK (true); 