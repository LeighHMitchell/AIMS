-- Create calendar_events table for community event management
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start TIMESTAMPTZ NOT NULL,
    "end" TIMESTAMPTZ,
    location VARCHAR(255),
    type VARCHAR(50) DEFAULT 'other' CHECK (type IN ('meeting', 'deadline', 'workshop', 'conference', 'other')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
    organizer_id UUID NOT NULL,
    organizer_name VARCHAR(255) NOT NULL,
    attendees TEXT[], -- Array of attendee emails/names
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events (start);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events (status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events (type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer ON calendar_events (organizer_id);

-- Add RLS policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view approved events
CREATE POLICY "Anyone can view approved events" ON calendar_events
    FOR SELECT USING (status = 'approved');

-- Policy: Users can create events (pending approval)
CREATE POLICY "Users can create events" ON calendar_events
    FOR INSERT WITH CHECK (status = 'pending');

-- Policy: Users can view their own events
CREATE POLICY "Users can view own events" ON calendar_events
    FOR SELECT USING (organizer_id::text = auth.uid()::text);

-- Policy: Admins can manage all events
CREATE POLICY "Admins can manage all events" ON calendar_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON calendar_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
