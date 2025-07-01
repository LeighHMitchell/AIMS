import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

async function testContactsTable() {
  console.log('🧪 Testing activity_contacts table...');
  
  try {
    // Test if table exists
    const { data, error } = await supabase
      .from('activity_contacts')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Table error:', error.message);
      
      if (error.message.includes('does not exist')) {
        console.log('📝 Table does not exist. Need to create it.');
        console.log('Creating table...');
        
        // Try to create the table
        const { error: createError } = await supabase.rpc('exec_sql', {
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
          `
        });
        
        if (createError) {
          console.error('❌ Failed to create table:', createError);
        } else {
          console.log('✅ Table created successfully');
        }
      }
    } else {
      console.log('✅ Table exists and accessible');
      console.log('📊 Sample data:', data);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testContactsTable().catch(console.error);