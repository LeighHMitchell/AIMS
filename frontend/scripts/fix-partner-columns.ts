import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function addMissingColumns() {
  console.log('Adding missing columns to partners table...\n');
  
  const sql = `
    ALTER TABLE partners
    ADD COLUMN IF NOT EXISTS code text,
    ADD COLUMN IF NOT EXISTS iati_org_id text,
    ADD COLUMN IF NOT EXISTS full_name text,
    ADD COLUMN IF NOT EXISTS acronym text,
    ADD COLUMN IF NOT EXISTS organisation_type text,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS logo text,
    ADD COLUMN IF NOT EXISTS banner text,
    ADD COLUMN IF NOT EXISTS country_represented text;
  `;
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, we need to run this manually in Supabase SQL editor
      console.error('Error executing SQL:', error);
      console.log('\n⚠️  Please run this SQL manually in your Supabase SQL editor:\n');
      console.log(sql);
      console.log('\nGo to: https://supabase.com/dashboard/project/lhiayyjwkjkjkxvhcenw/sql/new');
      return;
    }
    
    console.log('✅ Successfully added missing columns!');
    
    // Verify columns were added
    const { data: testData, error: testError } = await supabase
      .from('partners')
      .select('*')
      .limit(1);
      
    if (!testError && testData && testData.length > 0) {
      console.log('\nPartner table now has these columns:');
      console.log(Object.keys(testData[0]).join(', '));
    }
  } catch (err) {
    console.error('Error:', err);
    console.log('\n⚠️  Please run this SQL manually in your Supabase SQL editor:\n');
    console.log(sql);
    console.log('\nGo to: https://supabase.com/dashboard/project/lhiayyjwkjkjkxvhcenw/sql/new');
  }
}

// Run the script
addMissingColumns().catch(console.error); 