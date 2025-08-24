#!/usr/bin/env tsx

/**
 * Test script to verify contributor nomination functionality
 * This script tests the API endpoints and database operations
 */

import { createClient } from '@supabase/supabase-js';

// Configuration - update these values for your environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

async function testContributorNomination() {
  console.log('🧪 Testing Contributor Nomination...\n');

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // 1. Check if activity_contributors table exists and has the right columns
    console.log('1️⃣ Checking database schema...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'activity_contributors')
      .order('ordinal_position');
    
    if (tableError) {
      console.error('❌ Error checking table schema:', tableError);
      return;
    }
    
    console.log('✅ Table columns found:');
    tableInfo?.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
    });
    
    // 2. Check if nominated_by_name column exists
    const hasNominatedByName = tableInfo?.some(col => col.column_name === 'nominated_by_name');
    if (!hasNominatedByName) {
      console.error('❌ nominated_by_name column is missing!');
      console.log('💡 Run the migration: 20250129000000_ensure_contributor_name_columns.sql');
      return;
    }
    console.log('✅ nominated_by_name column exists');
    
    // 3. Check existing contributors
    console.log('\n2️⃣ Checking existing contributors...');
    const { data: contributors, error: contributorsError } = await supabase
      .from('activity_contributors')
      .select('id, organization_name, nominated_by, nominated_by_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (contributorsError) {
      console.error('❌ Error fetching contributors:', contributorsError);
      return;
    }
    
    if (contributors && contributors.length > 0) {
      console.log(`✅ Found ${contributors.length} contributors:`);
      contributors.forEach((contributor, index) => {
        console.log(`   ${index + 1}. ${contributor.organization_name || 'Unknown Org'}`);
        console.log(`      Nominated by: ${contributor.nominated_by_name || 'Unknown User'} (ID: ${contributor.nominated_by || 'NULL'})`);
        console.log(`      Status: ${contributor.status}`);
        console.log(`      Created: ${new Date(contributor.created_at).toLocaleDateString()}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No contributors found in the database');
    }
    
    // 4. Check for contributors with "Unknown User" names
    console.log('3️⃣ Checking for contributors with "Unknown User" names...');
    const { data: unknownUsers, count: unknownCount } = await supabase
      .from('activity_contributors')
      .select('*', { count: 'exact' })
      .or('nominated_by_name.eq.Unknown User,nominated_by_name.is.null')
      .not('nominated_by', 'is', null);
    
    if (unknownCount && unknownCount > 0) {
      console.log(`⚠️  Found ${unknownCount} contributors with missing/unknown names`);
      console.log('💡 Run the migration: 20250129000001_fix_existing_contributor_names.sql');
      
      if (unknownUsers && unknownUsers.length > 0) {
        console.log('   Examples:');
        unknownUsers.slice(0, 3).forEach((contributor, index) => {
          console.log(`   ${index + 1}. ${contributor.organization_name || 'Unknown Org'} - ${contributor.nominated_by_name || 'NULL'} (User ID: ${contributor.nominated_by})`);
        });
      }
    } else {
      console.log('✅ All contributors have proper user names');
    }
    
    // 5. Test user lookup functionality
    console.log('\n4️⃣ Testing user lookup functionality...');
    if (contributors && contributors.length > 0) {
      const contributorWithUser = contributors.find(c => c.nominated_by);
      if (contributorWithUser) {
        // Check what columns exist in the users table first
        const { data: tableInfo, error: tableError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'users')
          .in('column_name', ['id', 'email', 'first_name', 'last_name', 'role']);
        
        if (tableError) {
          console.log('⚠️  Could not check users table structure');
        } else {
          const availableColumns = tableInfo?.map(col => col.column_name) || [];
          console.log('✅ Available user columns:', availableColumns);
          
          // Build select query based on available columns
          let selectQuery = 'id';
          if (availableColumns.includes('email')) selectQuery += ', email';
          if (availableColumns.includes('first_name')) selectQuery += ', first_name';
          if (availableColumns.includes('last_name')) selectQuery += ', last_name';
          if (availableColumns.includes('role')) selectQuery += ', role';
          
          const { data: user, error: userError } = await supabase
            .from('users')
            .select(selectQuery)
            .eq('id', contributorWithUser.nominated_by)
            .single();
          
          if (userError) {
            console.log('⚠️  Could not fetch user details (this is normal if RLS is enabled)');
          } else if (user) {
            const userData = user as any; // Type assertion for dynamic column access
            console.log('✅ User details found:');
            console.log(`   ID: ${userData.id}`);
            if (availableColumns.includes('first_name') && userData.first_name) {
              console.log(`   First Name: ${userData.first_name}`);
            }
            if (availableColumns.includes('last_name') && userData.last_name) {
              console.log(`   Last Name: ${userData.last_name}`);
            }
            if (availableColumns.includes('email') && userData.email) {
              console.log(`   Email: ${userData.email}`);
            }
            if (availableColumns.includes('role') && userData.role) {
              console.log(`   Role: ${userData.role}`);
            }
          }
        }
      }
    }
    
    console.log('\n🎯 Test Summary:');
    console.log('✅ Database schema check: PASSED');
    console.log(`✅ Contributors found: ${contributors?.length || 0}`);
    console.log(`✅ Contributors with proper names: ${contributors ? contributors.filter(c => c.nominated_by_name && c.nominated_by_name !== 'Unknown User').length : 0}`);
    console.log(`⚠️  Contributors needing name fixes: ${unknownCount || 0}`);
    
    if (unknownCount && unknownCount > 0) {
      console.log('\n🔧 Next steps:');
      console.log('1. Run the migration: 20250129000001_fix_existing_contributor_names.sql');
      console.log('2. Test creating a new contributor to verify the fix works');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testContributorNomination()
    .then(() => {
      console.log('\n✨ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testContributorNomination };
