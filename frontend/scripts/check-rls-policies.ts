/**
 * Check RLS policies on activity_relationships table
 * Run with: npx tsx scripts/check-rls-policies.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

async function checkRLS() {
  console.log('🔐 Checking RLS policies...\n');

  // Test with service role (bypasses RLS)
  console.log('1️⃣ Testing with SERVICE ROLE (bypasses RLS):');
  const serviceClient = createClient(supabaseUrl!, supabaseServiceKey!);
  const { data: serviceData, error: serviceError, count: serviceCount } = await serviceClient
    .from('activity_relationships')
    .select('*', { count: 'exact' });
  
  if (serviceError) {
    console.log('   Error:', serviceError.message);
  } else {
    console.log(`   ✅ Found ${serviceCount} records`);
  }

  // Test with anon key (uses RLS)
  console.log('\n2️⃣ Testing with ANON KEY (uses RLS):');
  const anonClient = createClient(supabaseUrl!, supabaseAnonKey!);
  const { data: anonData, error: anonError, count: anonCount } = await anonClient
    .from('activity_relationships')
    .select('*', { count: 'exact' });
  
  if (anonError) {
    console.log('   ❌ Error:', anonError.message);
    console.log('   This suggests RLS is blocking anonymous access');
  } else {
    console.log(`   ✅ Found ${anonCount} records`);
  }

  // Check the related_activities table structure
  console.log('\n3️⃣ Checking related_activities table structure:');
  const { data: relActData, error: relActError } = await serviceClient
    .from('related_activities')
    .select('*')
    .limit(1);
  
  if (relActError) {
    if (relActError.message.includes('does not exist')) {
      console.log('   Table does not exist');
    } else {
      console.log('   Error:', relActError.message);
    }
  } else {
    console.log('   Table exists');
    if (relActData && relActData.length > 0) {
      console.log('   Columns:', Object.keys(relActData[0]));
    } else {
      // Query column info
      const { data: colData } = await serviceClient
        .from('related_activities')
        .select('id')
        .limit(0);
      console.log('   (Empty table, cannot determine columns from data)');
    }
  }

  // Test the activities table access
  console.log('\n4️⃣ Testing activities table access with ANON KEY:');
  const { count: actCount, error: actError } = await anonClient
    .from('activities')
    .select('*', { count: 'exact', head: true });
  
  if (actError) {
    console.log('   ❌ Error:', actError.message);
  } else {
    console.log(`   ✅ Can access ${actCount} activities`);
  }

  console.log('\n✅ Check complete!');
}

checkRLS();
