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
  
  const { data: users, error } = await supabase
    .from('users')
          .select('id, email, first_name, last_name, role')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  users?.forEach(u => {
  });
  
  // Check for the specific user that failed
  const { data: problemUser, error: problemError } = await supabase
    .from('users')
    .select('*')
    .eq('id', '85a65398-5d71-4633-a50b-2f167a0b6f7a')
    .single();
    
  if (problemError && problemError.code !== 'PGRST116') {
    console.error('Error checking problem user:', problemError);
  } else if (problemUser) {
  } else {
  }
  
  // Check for our test user
  const { data: testUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test@aims.local')
    .single();
    
  if (testUser) {
  } else {
  }
}

checkUsers().catch(console.error); 