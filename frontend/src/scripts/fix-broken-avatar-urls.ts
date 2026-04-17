#!/usr/bin/env tsx

/**
 * Script to fix broken avatar URLs in production
 * 
 * This script finds all users with avatar URLs pointing to local filesystem
 * and either removes them or updates them to use a default avatar.
 * 
 * Usage: npm run fix-avatar-urls
 */

import { getSupabaseAdmin } from '../lib/supabase';

async function main() {

  // Initialize Supabase client
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Failed to initialize Supabase client');
    console.error('   Check your Supabase environment variables');
    process.exit(1);
  }

  try {
    // 1. Find all users with local filesystem avatar URLs
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, avatar_url')
      .like('avatar_url', '/uploads/profiles/%');

    if (fetchError) {
      throw new Error(`Database fetch error: ${fetchError.message}`);
    }

    if (!users || users.length === 0) {
      return;
    }


    // 2. Update each user to remove broken avatar URL
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

      try {
        // Option 1: Remove the avatar URL entirely (set to null)
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            avatar_url: null,
            updated_at: new Date().toISOString() 
          })
          .eq('id', user.id);

        if (updateError) {
          throw new Error(`Update error: ${updateError.message}`);
        }

        successCount++;
      } catch (error) {
        console.error(`   ❌ Failed to update: ${error}\n`);
        errorCount++;
      }
    }

    // 3. Summary


  } catch (error) {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  }
}

// Run the fix
main().catch(console.error);
