#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function createAuthUser() {
  console.log('Creating auth user for testing...\n');
  
  // First check if we have a test user in public.users
  const { data: testUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test@aims.local')
    .single();
    
  if (!testUser) {
    console.error('Test user not found in public.users table');
    console.log('Please run: npm run create-test-user');
    return;
  }
  
  console.log('Found test user in public.users:', testUser.id);
  
  // Create auth user with the same ID
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testUser.email,
    password: 'test123456', // Default password for testing
    email_confirm: true,
    user_metadata: {
      name: testUser.name,
      role: testUser.role
    }
  });
  
  if (authError) {
    if (authError.message?.includes('already registered')) {
      console.log('Auth user already exists, fetching...');
      
      // Get the existing auth user
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users?.users?.find(u => u.email === testUser.email);
      
      if (existingUser) {
        console.log('\nExisting auth user found:');
        console.log('- Auth ID:', existingUser.id);
        console.log('- Email:', existingUser.email);
        
        // Update the public.users table to use the auth user ID
        console.log('\nUpdating public.users to match auth user ID...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ id: existingUser.id })
          .eq('email', 'test@aims.local');
          
        if (updateError) {
          console.error('Failed to update user ID:', updateError);
        } else {
          console.log('✅ Successfully synced user IDs');
          console.log(`   Use this ID for testing: ${existingUser.id}`);
        }
      }
    } else {
      console.error('Error creating auth user:', authError);
    }
    return;
  }
  
  console.log('✅ Auth user created successfully:');
  console.log('- Auth ID:', authData.user?.id);
  console.log('- Email:', authData.user?.email);
  
  // Now we need to update the public.users record to have the same ID as the auth user
  if (authData.user && authData.user.id !== testUser.id) {
    console.log('\nUpdating public.users to match auth user ID...');
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ id: authData.user.id })
      .eq('id', testUser.id);
      
    if (updateError) {
      console.error('Failed to update user ID:', updateError);
      console.log('You may need to manually update the user ID in the database');
    } else {
      console.log('✅ Successfully synced user IDs');
    }
  }
  
  console.log('\n📝 You can now use this user for testing linked activities');
  console.log(`   User ID: ${authData.user?.id || testUser.id}`);
  console.log(`   Email: test@aims.local`);
  console.log(`   Password: test123456`);
}

createAuthUser().catch(console.error); 