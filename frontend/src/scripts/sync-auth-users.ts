#!/usr/bin/env node
/**
 * Script to synchronize Supabase auth.users with the users table
 * This ensures all authenticated users have corresponding records in the users table
 * 
 * Usage: npm run sync-users
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get directory path in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function syncAuthUsers() {
  console.log('🔄 Starting auth user synchronization...\n');

  try {
    // Get all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Failed to fetch auth users:', authError);
      return;
    }

    const authUsers = authData?.users || [];
    console.log(`📊 Found ${authUsers.length} auth users\n`);

    // Get all existing users from the users table
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email');
      
    if (usersError) {
      console.error('❌ Failed to fetch users table:', usersError);
      return;
    }

    const existingUserIds = new Set(existingUsers?.map(u => u.id) || []);
    
    // Find auth users that don't have records in the users table
    const missingUsers = authUsers.filter(authUser => !existingUserIds.has(authUser.id));
    
    if (missingUsers.length === 0) {
      console.log('✅ All auth users already have records in the users table');
      return;
    }

    console.log(`⚠️  Found ${missingUsers.length} auth users without records in users table\n`);

    // Create user records for missing auth users
    for (const authUser of missingUsers) {
      console.log(`Creating user record for: ${authUser.email || authUser.id}`);
      
      const userData = {
        id: authUser.id,
        email: authUser.email || `user_${authUser.id.substring(0, 8)}@aims.local`,
        name: authUser.user_metadata?.name || 
              authUser.email?.split('@')[0] || 
              `User ${authUser.id.substring(0, 8)}`,
        role: authUser.user_metadata?.role || 'orphan'
      };

      const { error: insertError } = await supabase
        .from('users')
        .insert(userData);
        
      if (insertError) {
        console.error(`   ❌ Failed to create user: ${insertError.message}`);
        
        // If organization_id is required and causing issues, try without it
        if (insertError.message.includes('organization_id')) {
          console.log('   🔄 Retrying without organization_id...');
          
          const { error: retryError } = await supabase
            .from('users')
            .insert({
              ...userData,
              organization_id: null // Explicitly set to null
            });
            
          if (retryError) {
            console.error(`   ❌ Retry failed: ${retryError.message}`);
          } else {
            console.log('   ✅ User created successfully (without organization)');
          }
        }
      } else {
        console.log('   ✅ User created successfully');
      }
    }

    console.log('\n✅ User synchronization complete');

    // Show summary
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
      
    console.log(`\n📊 Summary:`);
    console.log(`   Total auth users: ${authUsers.length}`);
    console.log(`   Total users in table: ${count || 0}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the sync
syncAuthUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 