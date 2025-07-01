#!/usr/bin/env node
/**
 * Script to migrate users from Django to Supabase
 * 
 * Usage: npm run migrate-users
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
const djangoUrl = 'http://localhost:8000';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DjangoUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  profile: {
    phone?: string;
    organization?: string;
    role?: string;
    profile_picture?: string;
  };
}

async function fetchDjangoUsers(): Promise<DjangoUser[]> {
  console.log('📡 Fetching users from Django...');
  
  try {
    const response = await fetch(`${djangoUrl}/projects/api/users/`);
    if (!response.ok) {
      throw new Error(`Django API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Found ${data.length} users in Django`);
    return data;
  } catch (error) {
    console.error('❌ Error fetching Django users:', error);
    throw error;
  }
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

async function createSupabaseUser(djangoUser: DjangoUser): Promise<void> {
  console.log(`👤 Creating user: ${djangoUser.email}`);
  
  try {
    // Create auth user with temporary password
    const tempPassword = `TempPass${Date.now()}!`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: djangoUser.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        migrated_from_django: true,
        django_id: djangoUser.id
      }
    });
    
    if (authError) {
      console.error(`❌ Auth creation failed for ${djangoUser.email}:`, authError);
      return;
    }
    
    // Create user profile
    const profileData = {
      id: authData.user.id,
      email: djangoUser.email,
      first_name: djangoUser.first_name || '',
      last_name: djangoUser.last_name || '',
      role: djangoUser.is_superuser ? 'super_user' : 'dev_partner_tier_1',
      organization_id: null, // Will need to be set separately
      organisation: djangoUser.profile?.organization || null,
      department: null,
      job_title: djangoUser.profile?.role || null,
      telephone: djangoUser.profile?.phone || null,
      website: null,
      mailing_address: null,
      avatar_url: null,
      bio: null,
      preferred_language: 'en',
      reporting_org_id: null,
      position: null,
      phone: djangoUser.profile?.phone || null,
      created_at: djangoUser.date_joined,
      updated_at: new Date().toISOString()
    };
    
    const { error: profileError } = await supabase
      .from('users')
      .insert(profileData);
    
    if (profileError) {
      console.error(`❌ Profile creation failed for ${djangoUser.email}:`, profileError);
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return;
    }
    
    console.log(`✅ Successfully created user: ${djangoUser.email} (Password: ${tempPassword})`);
  } catch (error) {
    console.error(`❌ Error creating user ${djangoUser.email}:`, error);
  }
}

async function main() {
  console.log('🚀 Starting Django to Supabase user migration...\n');
  
  try {
    // Fetch users from Django
    const djangoUsers = await fetchDjangoUsers();
    
    // Check existing Supabase users
    const existingEmails = await checkExistingSupabaseUsers();
    
    // Filter out existing users
    const newUsers = djangoUsers.filter(user => !existingEmails.has(user.email));
    
    if (newUsers.length === 0) {
      console.log('✅ All users already exist in Supabase');
      return;
    }
    
    console.log(`\n📋 Migrating ${newUsers.length} new users to Supabase...\n`);
    
    // Create users in Supabase
    for (const user of newUsers) {
      await createSupabaseUser(user);
    }
    
    console.log('\n🎉 Migration completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Update frontend to use Supabase auth instead of Django');
    console.log('2. Test login with migrated users');
    console.log('3. Remove Django user management code');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main(); 