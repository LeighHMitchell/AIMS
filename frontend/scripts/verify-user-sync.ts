import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyUserSync() {
  console.log('🔍 Verifying user synchronization status...\n');

  try {
    // Check current state of leigh.h.mitchell@icloud.com
    console.log('Checking leigh.h.mitchell@icloud.com:');
    
    // Check auth
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const leighAuth = authUsers?.users.find(u => u.email === 'leigh.h.mitchell@icloud.com');
    
    if (leighAuth) {
      console.log('✅ Auth account exists:');
      console.log(`  Auth ID: ${leighAuth.id}`);
      
      // Check profile
      const { data: leighProfile } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('id', leighAuth.id)
        .single();
      
      if (leighProfile) {
        console.log('✅ Profile exists and is linked:');
        console.log(`  Name: ${leighProfile.first_name} ${leighProfile.last_name}`);
        console.log(`  Email: ${leighProfile.email}`);
        console.log(`  Organization: ${leighProfile.organizations?.name} (${leighProfile.organizations?.acronym})`);
      } else {
        console.log('❌ No profile found for this auth ID');
        
        // Check if there's a profile with this email but different ID
        const { data: orphanProfile } = await supabase
          .from('users')
          .select('*, organizations(*)')
          .eq('email', 'leigh.h.mitchell@icloud.com')
          .single();
        
        if (orphanProfile) {
          console.log('⚠️  Found profile with same email but different ID:');
          console.log(`  Profile ID: ${orphanProfile.id}`);
          console.log(`  Name: ${orphanProfile.first_name} ${orphanProfile.last_name}`);
          console.log(`  Organization: ${orphanProfile.organizations?.name} (${orphanProfile.organizations?.acronym})`);
        }
      }
    } else {
      console.log('❌ No auth account for leigh.h.mitchell@icloud.com');
    }
    
    // Check testuser@aims.local
    console.log('\nChecking testuser@aims.local:');
    const testAuth = authUsers?.users.find(u => u.email === 'testuser@aims.local');
    
    if (testAuth) {
      console.log('✅ Auth account exists:');
      console.log(`  Auth ID: ${testAuth.id}`);
      
      const { data: testProfile } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('id', testAuth.id)
        .single();
      
      if (testProfile) {
        console.log('✅ Profile exists:');
        console.log(`  Name: ${testProfile.first_name} ${testProfile.last_name}`);
        console.log(`  Email: ${testProfile.email}`);
        console.log(`  Organization: ${testProfile.organizations?.name} (${testProfile.organizations?.acronym})`);
      }
    }
    
    // List all profiles without matching auth
    console.log('\n' + '='.repeat(60));
    console.log('Checking for orphaned profiles (profiles without auth):');
    console.log('='.repeat(60));
    
    const { data: allProfiles } = await supabase
      .from('users')
      .select('id, email, first_name, last_name');
    
    if (allProfiles && authUsers) {
      for (const profile of allProfiles) {
        const hasAuth = authUsers.users.some(a => a.id === profile.id);
        if (!hasAuth) {
          console.log(`❌ No auth for: ${profile.email} (${profile.first_name} ${profile.last_name})`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('RECOMMENDATION:');
    console.log('='.repeat(60));
    console.log('You should now be able to login with:');
    console.log('1. testuser@aims.local - to access Leigh Mitchell profile');
    console.log('2. leigh.h.mitchell@icloud.com - if a password has been set');
    console.log('\nThe organization acronym (AfDB) should display after login.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run verification
verifyUserSync();