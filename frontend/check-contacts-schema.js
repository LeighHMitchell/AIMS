#!/usr/bin/env node

/**
 * Check the activity_contacts table schema to verify all required columns exist
 * Run with: node check-contacts-schema.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Required columns that the code tries to insert
const REQUIRED_COLUMNS = [
  'id', 'activity_id', 'type', 'title', 'first_name', 'middle_name', 'last_name',
  'position', 'job_title', 'department',
  'organisation', 'organisation_id',
  'phone', 'country_code', 'phone_number',
  'fax', 'fax_country_code', 'fax_number',
  'email', 'secondary_email', 'website', 'mailing_address',
  'profile_photo', 'notes',
  'is_focal_point', 'has_editing_rights', 'linked_user_id',
  'created_at', 'updated_at'
];

async function checkSchema() {
  console.log('🔍 Checking activity_contacts table schema...\n');

  try {
    // Query the schema
    const { data: columns, error } = await supabase
      .from('activity_contacts')
      .select('*')
      .limit(0);

    if (error) {
      console.error('❌ Error querying table:', error.message);
      console.log('\n⚠️  The table might not exist or you might not have permissions.');
      console.log('📋 Run this SQL in Supabase dashboard to check schema:');
      console.log('━'.repeat(60));
      console.log(`
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'activity_contacts'
AND table_schema = 'public'
ORDER BY ordinal_position;
      `);
      console.log('━'.repeat(60));
      process.exit(1);
    }

    console.log('✅ Table exists and is accessible\n');

    // Try to get a sample record to see actual columns
    const { data: sample, error: sampleError } = await supabase
      .from('activity_contacts')
      .select('*')
      .limit(1)
      .maybeSingle();

    let actualColumns = [];
    if (sample) {
      actualColumns = Object.keys(sample);
      console.log('📋 Columns found in sample record:', actualColumns.length);
      console.log(actualColumns.join(', '));
    } else if (!sampleError) {
      console.log('ℹ️  No records in table yet, cannot determine columns from data');
      console.log('📋 Run the SQL query in Supabase dashboard to see schema\n');
    }

    // Check for missing columns
    if (actualColumns.length > 0) {
      const missingColumns = REQUIRED_COLUMNS.filter(col => !actualColumns.includes(col));
      
      console.log('\n━'.repeat(60));
      
      if (missingColumns.length > 0) {
        console.log('❌ MISSING COLUMNS DETECTED:', missingColumns.length);
        console.log('━'.repeat(60));
        console.log('\nMissing columns:');
        missingColumns.forEach(col => {
          console.log(`  ❌ ${col}`);
        });
        
        console.log('\n🔧 These migrations may need to be applied:');
        if (missingColumns.some(c => ['job_title', 'department', 'website', 'mailing_address'].includes(c))) {
          console.log('  - 20250112000000_add_contact_iati_fields.sql');
        }
        if (missingColumns.some(c => ['is_focal_point', 'has_editing_rights', 'linked_user_id'].includes(c))) {
          console.log('  - 20250113000000_add_contact_roles.sql');
        }
        if (missingColumns.some(c => ['country_code', 'phone_number', 'fax_country_code', 'fax_number'].includes(c))) {
          console.log('  - 20250111000001_add_phone_fields_to_activity_contacts.sql');
        }
        if (missingColumns.includes('organisation_id')) {
          console.log('  - 20250115000003_add_organisation_id_to_activity_contacts.sql');
        }
        if (missingColumns.includes('secondary_email')) {
          console.log('  - 20250121000000_add_secondary_email_to_contacts.sql');
        }
        
        console.log('\n⚠️  THIS IS LIKELY WHY CONTACTS ARE NOT SAVING!');
        process.exit(1);
      } else {
        console.log('✅ ALL REQUIRED COLUMNS PRESENT');
        console.log('━'.repeat(60));
        console.log('\nAll required columns exist in the database.');
        console.log('The issue is likely in the API logic or a different database constraint.');
      }
    }

    console.log('\n📋 To see full schema details, run this SQL in Supabase dashboard:');
    console.log('━'.repeat(60));
    console.log(`
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'activity_contacts'
AND table_schema = 'public'
ORDER BY ordinal_position;
    `);
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

checkSchema();

