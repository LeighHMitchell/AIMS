-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(255),
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_id ON activity_logs(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anyone to create logs (for now - you might want to restrict this)
CREATE POLICY "Anyone can create activity logs" ON activity_logs
    FOR INSERT
    WITH CHECK (true);

-- Allow anyone to read logs (you might want to restrict based on role)
CREATE POLICY "Anyone can read activity logs" ON activity_logs
    FOR SELECT
    USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_activity_logs_updated_at BEFORE UPDATE ON activity_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 