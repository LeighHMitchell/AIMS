#!/usr/bin/env tsx

/**
 * Script: Fix User Auth Account Mismatch
 * 
 * This script fixes cases where a user has a Supabase Auth account
 * but it's not properly linked to their profile in the users table.
 * 
 * Usage: npm run fix-user-auth -- email@example.com
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables manually from .env.local
function loadEnvVars() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
  } catch (error) {
    console.error('Failed to load .env.local:', error);
  }
}

// Load environment variables
loadEnvVars();

// Create Supabase admin client directly
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
    console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function fixUserAuthMismatch(email: string) {
  console.log(`🔧 Fixing auth account mismatch for: ${email}\n`);

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Failed to initialize Supabase client');
    process.exit(1);
  }

  try {
    // 1. Find the user profile
    console.log('📋 Looking for user profile...');
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      console.error('❌ User profile not found:', profileError?.message);
      return;
    }

    console.log(`✅ Found profile: ${userProfile.first_name} ${userProfile.last_name}`);
    console.log(`   Current profile ID: ${userProfile.id}`);

    // 2. Look for auth users with this email
    console.log('\n🔍 Searching for auth accounts with this email...');
    
    // List all auth users (we'll filter by email)
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Failed to list auth users:', listError.message);
      return;
    }

    const matchingAuthUsers = authUsers.users.filter(user => user.email === email);
    
    if (matchingAuthUsers.length === 0) {
      console.log('❌ No auth account found with this email');
      console.log('   Creating new auth account...');
      
      // Create new auth account
      const tempPassword = generateTempPassword();
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: `${userProfile.first_name} ${userProfile.last_name}`,
          role: userProfile.role
        }
      });

      if (createError || !newAuthUser.user) {
        console.error('❌ Failed to create auth account:', createError?.message);
        return;
      }

      console.log('✅ Created new auth account');
      console.log(`🔑 Temporary password: ${tempPassword}`);
      
      // Update profile with correct auth ID
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          id: newAuthUser.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (updateError) {
        console.error('❌ Failed to update profile ID:', updateError.message);
        return;
      }

      console.log('✅ Profile ID synced with auth account');
      console.log('\n🎉 Account fixed! User can now log in with:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${tempPassword}`);
      
    } else if (matchingAuthUsers.length === 1) {
      const authUser = matchingAuthUsers[0];
      console.log(`✅ Found auth account: ${authUser.id}`);
      
      if (authUser.id === userProfile.id) {
        console.log('✅ Profile and auth IDs already match - account should work!');
        console.log('   Try logging in or use password reset if needed.');
      } else {
        console.log(`⚠️  ID mismatch detected:`);
        console.log(`   Profile ID: ${userProfile.id}`);
        console.log(`   Auth ID: ${authUser.id}`);
        console.log('\n🔄 Syncing profile ID with auth ID...');
        
        // Update profile to match auth ID
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            id: authUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('email', email);

        if (updateError) {
          console.error('❌ Failed to sync profile ID:', updateError.message);
          console.log('\n🔄 Trying alternative approach: Reset password...');
          
          // Alternative: Reset password to create new link
          const newPassword = generateTempPassword();
          const { error: resetError } = await supabase.auth.admin.updateUserById(authUser.id, {
            password: newPassword
          });

          if (resetError) {
            console.error('❌ Failed to reset password:', resetError.message);
            return;
          }

          console.log('✅ Password reset successful');
          console.log(`🔑 New password: ${newPassword}`);
        } else {
          console.log('✅ Profile ID synced successfully');
        }

        console.log('\n🎉 Account fixed! User can now log in.');
      }
      
    } else {
      console.log(`⚠️  Multiple auth accounts found (${matchingAuthUsers.length})`);
      console.log('   This requires manual cleanup. Auth account IDs:');
      matchingAuthUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.id} (created: ${user.created_at})`);
      });
    }

  } catch (error) {
    console.error('💥 Error fixing account:', error);
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%';
  
  let password = '';
  
  // Ensure at least one uppercase, lowercase, number, and symbol
  password += 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)];
  password += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)];
  password += '23456789'[Math.floor(Math.random() * 8)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest
  for (let i = 4; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address:');
  console.error('   npm run fix-user-auth -- david.whitman@usaid.gov');
  process.exit(1);
}

// Run the fix
fixUserAuthMismatch(email).catch(console.error);
