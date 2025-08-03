-- Create calendar_events table for the Aether calendar system
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT CHECK (event_type IN (
        'Activity Milestone',
        'Transaction', 
        'Working Group Meeting',
        'Donor Conference',
        'Custom'
    )) DEFAULT 'Custom',
    
    -- Related entities
    related_activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
    related_organisation_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    working_group_id UUID REFERENCES working_groups(id) ON DELETE SET NULL,
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Permissions and approval
    visibility TEXT CHECK (visibility IN ('public', 'org-only', 'private')) DEFAULT 'public',
    approved BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT calendar_events_dates_check 
        CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_visibility ON calendar_events(visibility);
CREATE INDEX IF NOT EXISTS idx_calendar_events_approved ON calendar_events(approved);
CREATE INDEX IF NOT EXISTS idx_calendar_events_activity ON calendar_events(related_activity_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org ON calendar_events(related_organisation_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view approved public events
CREATE POLICY "Public approved events are viewable by everyone"
    ON calendar_events FOR SELECT
    USING (approved = true AND visibility = 'public');

-- Policy: Users can view their own events
CREATE POLICY "Users can view own events"
    ON calendar_events FOR SELECT
    USING (created_by = auth.uid());

-- Policy: Organization members can view org-only events from their org
CREATE POLICY "Organization members can view org events"
    ON calendar_events FOR SELECT
    USING (
        approved = true 
        AND visibility = 'org-only'
        AND related_organisation_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Authenticated users can create events
CREATE POLICY "Authenticated users can create events"
    ON calendar_events FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Policy: Users can update their own events (only if not approved)
CREATE POLICY "Users can update own unapproved events"
    ON calendar_events FOR UPDATE
    USING (created_by = auth.uid() AND approved = false)
    WITH CHECK (created_by = auth.uid());

-- Policy: Users can delete their own events (only if not approved)
CREATE POLICY "Users can delete own unapproved events"
    ON calendar_events FOR DELETE
    USING (created_by = auth.uid() AND approved = false);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_events_updated_at();

-- Add table comments
COMMENT ON TABLE calendar_events IS 'Calendar events for the Aether system with approval workflow';
COMMENT ON COLUMN calendar_events.event_type IS 'Type of event for color coding and categorization';
COMMENT ON COLUMN calendar_events.visibility IS 'Who can see this event: public, org-only, or private';
COMMENT ON COLUMN calendar_events.approved IS 'Whether the event has been approved by an admin';
COMMENT ON COLUMN calendar_events.related_activity_id IS 'Optional link to an activity';
COMMENT ON COLUMN calendar_events.related_organisation_id IS 'Optional link to an organization';
COMMENT ON COLUMN calendar_events.working_group_id IS 'Optional link to a working group';