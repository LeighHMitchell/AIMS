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

async function createRolodexView() {
  console.log('🏗️  Creating simple rolodex view...');
  
  try {
    // First, let's test what tables exist and their schemas
    console.log('🔍 Testing users table...');
    const { data: usersTest, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, organization_id, created_at, updated_at')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError);
      return;
    }
    
    console.log('✅ Users table accessible, sample:', usersTest[0]);
    
    console.log('🔍 Testing organizations table...');
    const { data: orgsTest, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, country')
      .limit(1);
    
    if (orgsError) {
      console.error('❌ Organizations table error:', orgsError);
      return;
    }
    
    console.log('✅ Organizations table accessible, sample:', orgsTest[0]);
    
    // Instead of creating a view, let's modify the API to work directly with users table
    console.log('📝 Testing users with organization join...');
    const { data: joinTest, error: joinError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        organization_id,
        created_at,
        updated_at,
        organizations!inner(name, country)
      `)
      .limit(5);
    
    if (joinError) {
      console.error('❌ Join test error:', joinError);
    } else {
      console.log('✅ Join test successful, data:', joinTest);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
createRolodexView().catch(console.error);