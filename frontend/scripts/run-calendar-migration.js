const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running calendar migration...');

  // Check if organization columns exist
  console.log('Checking organization columns...');

  const { data: testData, error: testError } = await supabase
    .from('calendar_events')
    .select('organizer_organization_id, organizer_organization_name')
    .limit(1);

  if (testError && testError.message.includes('does not exist')) {
    console.log('Organization columns need to be added via SQL');
  } else {
    console.log('Organization columns exist or query succeeded');
  }

  // Check if documents table exists
  console.log('Checking calendar_event_documents table...');

  const { data: docsCheck, error: docsError } = await supabase
    .from('calendar_event_documents')
    .select('id')
    .limit(1);

  if (docsError && docsError.message.includes('does not exist')) {
    console.log('calendar_event_documents table needs to be created');
  } else {
    console.log('calendar_event_documents table exists');
  }

  // Create storage bucket
  console.log('Creating storage bucket...');
  const { error: bucketError } = await supabase.storage.createBucket('calendar-documents', {
    public: false,
    fileSizeLimit: 10485760 // 10MB
  });

  if (bucketError) {
    if (bucketError.message.includes('already exists')) {
      console.log('Storage bucket already exists');
    } else {
      console.error('Error creating bucket:', bucketError.message);
    }
  } else {
    console.log('Storage bucket created successfully');
  }

  console.log('\n========================================');
  console.log('Please run the following SQL in Supabase:');
  console.log('========================================\n');

  console.log(`
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

-- Disable RLS for easier access (or configure proper policies)
ALTER TABLE calendar_event_documents DISABLE ROW LEVEL SECURITY;
  `);

  console.log('\nMigration check completed!');
}

runMigration().catch(console.error);
