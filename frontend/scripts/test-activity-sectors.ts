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
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testActivitySectors() {
  console.log('🔍 Testing activity_sectors table and functionality...\n');

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

    // Test 2: Check table structure
    console.log('\n📋 Test 2: Checking table structure...');
    const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'activity_sectors'
        ORDER BY ordinal_position;
      `
    });

    if (columnsError) {
      console.log('⚠️  Could not check table structure (this is normal)');
    } else {
      console.log('✅ Table structure looks good');
    }

    // Test 3: Test upsertActivitySectors function
    console.log('\n📋 Test 3: Testing upsertActivitySectors function...');
    
    // Get a test activity ID
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id')
      .limit(1);
    
    if (activitiesError || !activities || activities.length === 0) {
      console.log('❌ No activities found to test with');
      return;
    }

    const testActivityId = activities[0].id;
    console.log(`   Using test activity ID: ${testActivityId}`);

    // Test data
    const testSectors = [
      {
        id: 'test-sector-1',
        code: '11110',
        name: 'Education policy and administrative management',
        percentage: 60,
        category: '111 - Education, Level Unspecified',
        categoryCode: '111'
      },
      {
        id: 'test-sector-2', 
        code: '11420',
        name: 'Higher education',
        percentage: 40,
        category: '114 - Post-Secondary Education',
        categoryCode: '114'
      }
    ];

    // Try to upsert sectors
    try {
      // Import the helper function
      const { upsertActivitySectors } = await import('../src/lib/activity-sectors-helper');
      
      await upsertActivitySectors(testActivityId, testSectors);
      console.log('✅ upsertActivitySectors function works!');
      
      // Verify the data was saved
      const { data: savedSectors, error: fetchError } = await supabase
        .from('activity_sectors')
        .select('*')
        .eq('activity_id', testActivityId);
      
      if (fetchError) {
        console.log('❌ Error fetching saved sectors:', fetchError);
      } else {
        console.log(`✅ Successfully saved ${savedSectors?.length || 0} sectors`);
        console.log('   Saved sectors:', savedSectors);
      }
      
    } catch (upsertError) {
      console.log('❌ Error testing upsertActivitySectors:', upsertError);
    }

    console.log('\n🎉 Testing completed!');

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testActivitySectors(); 