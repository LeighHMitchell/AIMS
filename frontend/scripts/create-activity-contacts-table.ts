import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createActivityContactsTable() {
  console.log('🏗️  Creating activity_contacts table...');
  
  try {
    // Test if table already exists
    const { data: testData, error: testError } = await supabase
      .from('activity_contacts')
      .select('id')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Table already exists');
      return;
    }
    
    // Table doesn't exist, create it using raw SQL
    const { error } = await supabase.rpc('exec_sql', { 
      sql: `
        CREATE TABLE IF NOT EXISTS activity_contacts (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
            type TEXT,
            title TEXT,
            first_name TEXT NOT NULL,
            middle_name TEXT,
            last_name TEXT NOT NULL,
            position TEXT,
            organisation TEXT,
            phone TEXT,
            fax TEXT,
            email TEXT,
            profile_photo TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_activity_contacts_activity_id ON activity_contacts(activity_id);
        CREATE INDEX IF NOT EXISTS idx_activity_contacts_email ON activity_contacts(email);
      `
    });
    
    if (error) {
      console.error('❌ Error creating table:', error);
    } else {
      console.log('✅ Table created successfully');
    }
    
    // Test the table
    const { data: newTestData, error: newTestError } = await supabase
      .from('activity_contacts')
      .select('id')
      .limit(1);
    
    if (newTestError) {
      console.error('❌ Table test failed:', newTestError);
    } else {
      console.log('✅ Table test successful');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
createActivityContactsTable().catch(console.error);