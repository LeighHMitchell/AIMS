#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

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

async function quickTest() {
  console.log('🔍 Quick test of activity_sectors table...\n');

  try {
    // Test 1: Check if table exists
    console.log('📋 Test 1: Checking if activity_sectors table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('activity_sectors')
      .select('id')
      .limit(1);
    
    if (tableError) {
      if (tableError.code === '42P01') {
        console.log('❌ activity_sectors table does not exist');
        console.log('   You need to run the migration first');
        return;
      } else {
        console.error('❌ Error checking table:', tableError);
        return;
      }
    } else {
      console.log('✅ activity_sectors table exists');
    }

    // Test 2: Get a real activity ID
    console.log('\n📋 Test 2: Getting a real activity ID...');
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .limit(1);
    
    if (activitiesError || !activities || activities.length === 0) {
      console.log('❌ No activities found to test with');
      return;
    }

    const testActivity = activities[0];
    console.log(`   Using activity: ${testActivity.title_narrative} (${testActivity.id})`);

    // Test 3: Test the API endpoint
    console.log('\n📋 Test 3: Testing the API endpoint...');
    
    const testSectors = [
      {
        id: 'test-sector-1',
        code: '11110',
        name: 'Education policy and administrative management',
        percentage: 100,
        category: '111 - Education, Level Unspecified',
        categoryCode: '111'
      }
    ];

    const response = await fetch('http://localhost:3000/api/activities/field', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activityId: testActivity.id,
        field: 'sectors',
        value: testSectors
      })
    });

    const responseData = await response.json();
    
    if (response.ok) {
      console.log('✅ API call successful!');
      console.log('   Response:', JSON.stringify(responseData, null, 2));
    } else {
      console.log('❌ API call failed');
      console.log('   Status:', response.status);
      console.log('   Response:', JSON.stringify(responseData, null, 2));
    }

    console.log('\n🎉 Quick test completed!');

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

quickTest(); 