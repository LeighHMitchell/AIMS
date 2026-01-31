-- Add organization fields to calendar_events table
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS organizer_organization_id UUID,
ADD COLUMN IF NOT EXISTS organizer_organization_name VARCHAR(255);

-- Create calendar_event_documents table for file attachments
CREATE TABLE IF NOT EXISTS calendar_event_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by_id UUID NOT NULL,
    uploaded_by_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) DEFAULT 'other' CHECK (document_type IN ('agenda', 'minutes', 'background', 'presentation', 'handout', 'other')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_event_documents_event_id ON calendar_event_documents(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_documents_uploaded_by ON calendar_event_documents(uploaded_by_id);

-- Add RLS policies for calendar_event_documents
ALTER TABLE calendar_event_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view documents for approved events
CREATE POLICY "Anyone can view documents for approved events" ON calendar_event_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM calendar_events
            WHERE calendar_events.id = calendar_event_documents.event_id
            AND calendar_events.status = 'approved'
        )
    );

-- Policy: Event organizers can view their own event documents
CREATE POLICY "Organizers can view own event documents" ON calendar_event_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM calendar_events
            WHERE calendar_events.id = calendar_event_documents.event_id
            AND calendar_events.organizer_id::text = auth.uid()::text
        )
    );

-- Policy: Authenticated users can upload documents to events they organize
CREATE POLICY "Organizers can upload documents" ON calendar_event_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM calendar_events
            WHERE calendar_events.id = calendar_event_documents.event_id
            AND calendar_events.organizer_id::text = auth.uid()::text
        )
    );

-- Policy: Document uploaders can delete their own documents
CREATE POLICY "Uploaders can delete own documents" ON calendar_event_documents
    FOR DELETE USING (uploaded_by_id::text = auth.uid()::text);

-- Policy: Admins can manage all documents
CREATE POLICY "Admins can manage all documents" ON calendar_event_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create updated_at trigger for documents
CREATE TRIGGER update_calendar_event_documents_updated_at
    BEFORE UPDATE ON calendar_event_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for calendar documents if it doesn't exist
-- Note: This needs to be done via Supabase dashboard or API, not SQL
-- INSERT INTO storage.buckets (id, name, public) VALUES ('calendar-documents', 'calendar-documents', false) ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE calendar_event_documents IS 'Stores documents attached to calendar events (agendas, minutes, presentations, etc.)';
COMMENT ON COLUMN calendar_events.organizer_organization_id IS 'UUID of the organization the event organizer belongs to';
COMMENT ON COLUMN calendar_events.organizer_organization_name IS 'Name of the organization the event organizer belongs to';
