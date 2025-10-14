#!/usr/bin/env node

/**
 * Test inserting a contact directly into the database
 * Run with: node test-contact-insert.js <activity-id>
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Get activity ID from command line or use default
const activityId = process.argv[2] || '634c2682-a81a-4b66-aca2-eb229c0e9581';

async function testInsert() {
  console.log('🧪 Testing direct contact insert...\n');
  console.log('Activity ID:', activityId);

  try {
    // First, delete any test contacts
    console.log('\n1️⃣ Cleaning up any existing test contacts...');
    const { error: deleteError } = await supabase
      .from('activity_contacts')
      .delete()
      .eq('activity_id', activityId)
      .eq('email', 'test@test.com');

    if (deleteError) {
      console.log('⚠️  Could not delete old test contacts:', deleteError.message);
    } else {
      console.log('✅ Cleaned up old test contacts');
    }

    // Test 1: Insert with minimal data
    console.log('\n2️⃣ Test 1: Minimal contact (required fields only)...');
    const minimalContact = {
      activity_id: activityId,
      type: '1',
      first_name: 'Test',
      last_name: 'User',
      position: null
    };

    const { data: result1, error: error1 } = await supabase
      .from('activity_contacts')
      .insert(minimalContact)
      .select()
      .single();

    if (error1) {
      console.error('❌ Failed to insert minimal contact!');
      console.error('Error:', error1.message);
      console.error('Details:', error1.details);
      console.error('Hint:', error1.hint);
      console.log('\n⚠️  THIS IS WHY CONTACTS ARE NOT SAVING!');
      process.exit(1);
    }

    console.log('✅ Minimal contact inserted successfully');
    console.log('Contact ID:', result1.id);

    // Clean up
    await supabase
      .from('activity_contacts')
      .delete()
      .eq('id', result1.id);

    // Test 2: Insert with all IATI fields
    console.log('\n3️⃣ Test 2: Full contact (with all IATI fields)...');
    const fullContact = {
      activity_id: activityId,
      type: '1',
      first_name: 'A.',
      last_name: 'Example',
      position: null,
      job_title: 'Transparency Lead',
      organisation: 'Agency A',
      organisation_id: null,
      department: 'Department B',
      email: 'transparency@example.org',
      phone: '0044111222333444',
      country_code: '+44',
      phone_number: '111222333444',
      website: 'http://www.example.org',
      mailing_address: 'Transparency House, The Street, Town, City, Postcode',
      is_focal_point: false,
      has_editing_rights: false
    };

    const { data: result2, error: error2 } = await supabase
      .from('activity_contacts')
      .insert(fullContact)
      .select()
      .single();

    if (error2) {
      console.error('❌ Failed to insert full contact!');
      console.error('Error:', error2.message);
      console.error('Details:', error2.details);
      console.error('Hint:', error2.hint);
      console.log('\n⚠️  THIS IS WHY XML IMPORTS ARE NOT SAVING!');
      process.exit(1);
    }

    console.log('✅ Full contact inserted successfully');
    console.log('Contact ID:', result2.id);

    // Verify we can fetch it back
    console.log('\n4️⃣ Verifying contact can be fetched...');
    const { data: fetched, error: fetchError } = await supabase
      .from('activity_contacts')
      .select('*')
      .eq('id', result2.id)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch contact back!');
      console.error('Error:', fetchError.message);
    } else {
      console.log('✅ Contact fetched successfully');
      console.log('Name:', fetched.first_name, fetched.last_name);
      console.log('Job Title:', fetched.job_title);
      console.log('Department:', fetched.department);
      console.log('Email:', fetched.email);
    }

    // Clean up
    console.log('\n5️⃣ Cleaning up test contact...');
    await supabase
      .from('activity_contacts')
      .delete()
      .eq('id', result2.id);
    console.log('✅ Test contact removed');

    console.log('\n━'.repeat(60));
    console.log('✅ ALL DATABASE TESTS PASSED!');
    console.log('━'.repeat(60));
    console.log('\nThe database can accept contacts correctly.');
    console.log('The issue must be in the API logic or how data is being sent.');
    console.log('\n📋 Next steps:');
    console.log('1. Check server console logs when saving a contact');
    console.log('2. Check browser Network tab for API errors');
    console.log('3. Add more detailed logging to the API endpoints');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testInsert();

