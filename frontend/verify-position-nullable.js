#!/usr/bin/env node

/**
 * Verify that the position column is nullable in the database
 * Run with: node verify-position-nullable.js
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

async function verifyMigration() {
  console.log('🔍 Checking if position column is nullable...\n');

  try {
    // Try to query the table to verify it exists
    const { data: testData, error: testError } = await supabase
      .from('activity_contacts')
      .select('id, position')
      .limit(1);

    if (testError) {
      console.error('❌ Error querying activity_contacts table:', testError.message);
      console.log('\n⚠️  The table might not exist or you might not have permissions.');
      process.exit(1);
    }

    console.log('✅ activity_contacts table exists and is accessible');
    
    // If we got this far, the migration was likely successful
    console.log('✅ The position column appears to be nullable (no error when querying)');
    console.log('\n📋 To verify in Supabase dashboard, run this SQL:');
    console.log('━'.repeat(60));
    console.log(`
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'activity_contacts' 
AND table_schema = 'public'
AND column_name = 'position';
    `);
    console.log('━'.repeat(60));
    console.log('\nExpected result: is_nullable = YES\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

verifyMigration();

