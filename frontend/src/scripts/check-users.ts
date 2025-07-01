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

async function checkUsers() {
  console.log('Checking users in the database...\n');
  
  const { data: users, error } = await supabase
    .from('users')
          .select('id, email, first_name, last_name, role')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log(`Found ${users?.length || 0} users:`);
  users?.forEach(u => {
    console.log(`- ID: ${u.id}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Name: ${u.first_name} ${u.last_name}`);
    console.log(`  Role: ${u.role}\n`);
  });
  
  // Check for the specific user that failed
  console.log('Checking for problematic user ID: 85a65398-5d71-4633-a50b-2f167a0b6f7a');
  const { data: problemUser, error: problemError } = await supabase
    .from('users')
    .select('*')
    .eq('id', '85a65398-5d71-4633-a50b-2f167a0b6f7a')
    .single();
    
  if (problemError && problemError.code !== 'PGRST116') {
    console.error('Error checking problem user:', problemError);
  } else if (problemUser) {
    console.log('Problem user exists:', problemUser);
  } else {
    console.log('Problem user does NOT exist in the database');
  }
  
  // Check for our test user
  console.log('\nChecking for test user (test@aims.local):');
  const { data: testUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test@aims.local')
    .single();
    
  if (testUser) {
    console.log('Test user found:', testUser);
  } else {
    console.log('Test user NOT found');
  }
}

checkUsers().catch(console.error); 