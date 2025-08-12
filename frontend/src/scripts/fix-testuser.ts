#!/usr/bin/env tsx
/**
 * Script to fix testuser@aims.local by creating/updating auth user
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
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixTestUser() {
  console.log('🔧 Fixing testuser@aims.local authentication...\n');

  try {
    // First, check if user exists in our users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'testuser@aims.local')
      .single();

    if (profileError || !userProfile) {
      console.error('❌ User profile not found in users table:', profileError);
      console.log('Creating user profile...');
      
      // Create the user profile first
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          email: 'testuser@aims.local',
          first_name: 'Leigh',
          last_name: 'Mitchell',
          role: 'super_user',
          job_title: 'System Administrator',
          organisation: 'Agence Française de Développement',
          department: 'International Development',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (createError) {
        console.error('❌ Failed to create user profile:', createError);
        return;
      }
      
      console.log('✅ Created user profile');
      // userProfile = newProfile; // Not needed since we already have the profile
    } else {
      console.log('✅ Found user profile:', userProfile.email);
    }

    // Try to get the auth user
    const { data: authUser, error: authGetError } = await supabase.auth.admin.getUserById(userProfile.id);

    if (authGetError || !authUser) {
      console.log('🔧 Auth user not found, creating...');
      
      // Create auth user with a known password
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'testuser@aims.local',
        password: 'TestPass123!', // Strong password for testing
        email_confirm: true,
        user_metadata: {
          name: `${userProfile.first_name} ${userProfile.last_name}`,
          role: userProfile.role
        }
      });

      if (createError) {
        console.error('❌ Error creating auth user:', createError);
        return;
      }

      // Update profile with auth user ID if different
      if (newAuthUser.user.id !== userProfile.id) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ id: newAuthUser.user.id })
          .eq('id', userProfile.id);

        if (updateError) {
          console.error('⚠️  Error updating profile ID:', updateError);
        } else {
          console.log('✅ Synced profile ID with auth user ID');
        }
      }

      console.log('✅ Auth user created successfully!');
      console.log('📝 Login credentials:');
      console.log(`   Email: testuser@aims.local`);
      console.log(`   Password: TestPass123!`);
      console.log(`   Role: ${userProfile.role}`);
      
    } else {
      console.log('✅ Auth user already exists');
      console.log('🔧 Resetting password...');
      
      // Reset password for existing auth user
      const { error: resetError } = await supabase.auth.admin.updateUserById(authUser.user.id, {
        password: 'TestPass123!'
      });

      if (resetError) {
        console.error('❌ Error resetting password:', resetError);
        return;
      }

      console.log('✅ Password reset successfully!');
      console.log('📝 Login credentials:');
      console.log(`   Email: testuser@aims.local`);
      console.log(`   Password: TestPass123!`);
      console.log(`   Role: ${userProfile.role}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixTestUser().catch(console.error);
