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

async function checkAuthUsers() {
  console.log('🔍 Checking authentication system vs users table...\n');

  try {
    // 1. Check auth.users for testuser@aims.local
    console.log('Step 1: Checking auth.users table for testuser@aims.local');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
    } else {
      const testUser = authUsers.users.find(u => u.email === 'testuser@aims.local');
      if (testUser) {
        console.log('✅ Found testuser@aims.local in auth.users:');
        console.log(`  ID: ${testUser.id}`);
        console.log(`  Email: ${testUser.email}`);
        console.log(`  Created: ${testUser.created_at}`);
        console.log(`  Last Sign In: ${testUser.last_sign_in_at}`);
        
        // Check if this user exists in the users table
        console.log('\nStep 2: Checking if auth user exists in users table...');
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', testUser.id)
          .single();
        
        if (userData) {
          console.log('✅ User exists in users table');
          console.log(`  Email in users table: ${userData.email}`);
        } else {
          console.log('❌ User NOT found in users table!');
          console.log('  This explains why you can login but don\'t see the user in the table.');
        }
      } else {
        console.log('❌ testuser@aims.local NOT found in auth.users');
      }
    }

    // 2. List all users in the users table
    console.log('\nStep 3: All users in users table:');
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .order('email');
    
    if (allUsers) {
      console.log(`Found ${allUsers.length} users in users table:`);
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.first_name} ${u.last_name})`);
      });
    }

    // 3. Check for orphaned auth users (in auth but not in users table)
    console.log('\nStep 4: Checking for orphaned auth users...');
    if (authUsers) {
      const orphaned = [];
      for (const authUser of authUsers.users) {
        const { data: exists } = await supabase
          .from('users')
          .select('id')
          .eq('id', authUser.id)
          .single();
        
        if (!exists) {
          orphaned.push(authUser.email);
        }
      }
      
      if (orphaned.length > 0) {
        console.log('⚠️  Found orphaned auth users (can login but no profile):');
        orphaned.forEach(email => console.log(`  - ${email}`));
      } else {
        console.log('✅ All auth users have corresponding profiles');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the check
checkAuthUsers();