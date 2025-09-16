#!/usr/bin/env node
/**
 * Script to create test users in Supabase
 * 
 * Usage: npm run create-test-users
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organization: string;
}

async function checkExistingSupabaseUsers(): Promise<Set<string>> {
  console.log('🔍 Checking existing Supabase users...');
  
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;
    
    const { data: profileUsers, error: profileError } = await supabase
      .from('users')
      .select('email');
    if (profileError) throw profileError;
    
    const existingEmails = new Set([
      ...authUsers.users.map(u => u.email!),
      ...profileUsers.map(u => u.email)
    ]);
    
    console.log(`✅ Found ${existingEmails.size} existing users in Supabase`);
    return existingEmails;
  } catch (error) {
    console.error('❌ Error checking existing users:', error);
    throw error;
  }
}

async function createTestUser(testUser: TestUser): Promise<void> {
  console.log(`👤 Creating test user: ${testUser.email}`);
  
  try {
    // Create auth user
    const tempPassword = 'TestPassword123!';
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        test_user: true
      }
    });
    
    if (authError) {
      console.error(`❌ Auth creation failed for ${testUser.email}:`, authError);
      return;
    }
    
    // Create user profile
    const profileData = {
      id: authData.user.id,
      email: testUser.email,
      first_name: testUser.firstName,
      last_name: testUser.lastName,
      role: testUser.role,
      organisation: testUser.organization,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error: profileError } = await supabase
      .from('users')
      .insert(profileData);
    
    if (profileError) {
      console.error(`❌ Profile creation failed for ${testUser.email}:`, profileError);
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return;
    }
    
    console.log(`✅ Successfully created test user: ${testUser.email} (Password: ${tempPassword})`);
  } catch (error) {
    console.error(`❌ Error creating user ${testUser.email}:`, error);
  }
}

async function main() {
  console.log('🚀 Creating test users in Supabase...\n');
  
  const testUsers: TestUser[] = [
    {
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_user',
      organization: 'Test Organization'
    },
    {
      email: 'user@test.com',
      firstName: 'Regular',
      lastName: 'User',
      role: 'dev_partner_tier_1',
      organization: 'Test Organization'
    },
    {
      email: 'gov@test.com',
      firstName: 'Government',
      lastName: 'Partner',
      role: 'gov_partner_tier_1',
      organization: 'Government Ministry'
    }
  ];
  
  try {
    // Check existing users
    const existingEmails = await checkExistingSupabaseUsers();
    
    // Filter out existing users
    const newUsers = testUsers.filter(user => !existingEmails.has(user.email));
    
    if (newUsers.length === 0) {
      console.log('✅ All test users already exist in Supabase');
      return;
    }
    
    console.log(`\n📋 Creating ${newUsers.length} new test users...\n`);
    
    // Create users in Supabase
    for (const user of newUsers) {
      await createTestUser(user);
    }
    
    console.log('\n🎉 Test users created successfully!');
    console.log('\n📝 You can now test login with these users');
    console.log('Default password for all test users: TestPassword123!');
    
  } catch (error) {
    console.error('❌ Failed to create test users:', error);
    process.exit(1);
  }
}

main();
