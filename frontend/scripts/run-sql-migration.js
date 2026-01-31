const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

async function runSQL() {
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
  if (!projectRef) {
    console.error('Could not extract project ref from URL');
    process.exit(1);
  }

  console.log('Running SQL migration via REST API...');

  const sql = `
-- Add organization columns to calendar_events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS organizer_organization_id UUID;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS organizer_organization_name VARCHAR(255);

-- Create calendar_event_documents table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calendar_event_documents_event_id ON calendar_event_documents(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_documents_uploaded_by ON calendar_event_documents(uploaded_by_id);

-- Disable RLS for easier access
ALTER TABLE calendar_event_documents DISABLE ROW LEVEL SECURITY;
  `;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Try the postgres endpoint instead
      console.log('Trying alternative method...');

      // Use supabase-js to run each statement
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Test if columns exist now
      const { error: colError } = await supabase
        .from('calendar_events')
        .select('organizer_organization_id')
        .limit(1);

      if (colError) {
        console.log('Columns still need to be added. Please run the SQL manually in Supabase Dashboard.');
        console.log('Go to: SQL Editor in Supabase Dashboard');
        console.log('\nSQL to run:');
        console.log(sql);
      } else {
        console.log('Organization columns already exist!');
      }

      // Test if table exists
      const { error: tableError } = await supabase
        .from('calendar_event_documents')
        .select('id')
        .limit(1);

      if (tableError && tableError.message.includes('does not exist')) {
        console.log('\ncalendar_event_documents table needs to be created.');
      } else {
        console.log('calendar_event_documents table exists!');
      }
    } else {
      console.log('SQL executed successfully!');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nPlease run the SQL manually in Supabase Dashboard SQL Editor.');
  }
}

runSQL().catch(console.error);
