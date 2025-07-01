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

async function checkForeignKey() {
  console.log('Checking foreign key constraint for related_activities.created_by...\n');
  
  // Query to check the foreign key constraint
  const { data, error } = await supabase.rpc('get_foreign_key_info', {
    table_name: 'related_activities',
    column_name: 'created_by'
  }).single();
  
  if (error) {
    console.log('Could not run RPC, trying direct query...');
    
    // Try a direct SQL query to get constraint info
    const query = `
      SELECT 
        tc.constraint_name,
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'related_activities'
        AND kcu.column_name = 'created_by';
    `;
    
    const { data: constraintData, error: constraintError } = await supabase
      .rpc('sql_query', { query })
      .single();
      
    if (constraintError) {
      console.error('Could not query constraint information directly');
      console.log('This is expected - we may not have access to system tables');
    } else {
      console.log('Foreign key constraint info:', constraintData);
    }
  } else {
    console.log('Foreign key info:', data);
  }
  
  // Let's also check if the user exists in auth.users
  console.log('\nChecking auth.users table...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 50
  });
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
  } else {
    console.log(`Found ${authUsers.users.length} users in auth.users`);
    
    // Check if john@example.com exists in auth.users
    const johnInAuth = authUsers.users.find(u => u.email === 'john@example.com');
    console.log('\njohn@example.com in auth.users?', !!johnInAuth);
    if (johnInAuth) {
      console.log('Auth user ID:', johnInAuth.id);
    }
  }
}

checkForeignKey().catch(console.error); 