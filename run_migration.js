const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Adding custom_geographies column to activities table...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE activities 
        ADD COLUMN IF NOT EXISTS custom_geographies JSONB DEFAULT '[]'::jsonb;
        
        CREATE INDEX IF NOT EXISTS idx_activities_custom_geographies ON activities USING GIN (custom_geographies);
        
        COMMENT ON COLUMN activities.custom_geographies IS 'JSON array of custom geography allocations with percentage values';
      `
    });
    
    if (error) {
      console.error('Error running migration:', error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully!');
    console.log('custom_geographies column added to activities table');
    
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();

