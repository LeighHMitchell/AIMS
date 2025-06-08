const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration to change partner_id from UUID to TEXT...');
  
  const { data, error } = await supabase.rpc('query', {
    query_text: `
      -- Change partner_id from UUID to TEXT to allow non-UUID values
      ALTER TABLE activities 
      ALTER COLUMN partner_id TYPE TEXT;
      
      -- Add a comment to document the change
      COMMENT ON COLUMN activities.partner_id IS 'Partner-specific identifier for the activity (can be any text value)';
    `
  });
  
  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  console.log('Migration completed successfully!');
  console.log('The partner_id column now accepts any text value.');
}

runMigration(); 