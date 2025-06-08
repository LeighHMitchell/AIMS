const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql(sql) {
  try {
    // Use the REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    // Try alternative approach using direct SQL query
    console.log('Trying alternative SQL execution...');
    const { data, error: sqlError } = await supabase
      .from('_dummy_table_that_doesnt_exist')
      .select('*')
      .limit(0);
    
    // This will fail, but let's try another approach
    console.error('SQL execution error:', error.message);
    throw error;
  }
}

async function createTablesDirectly() {
  console.log('🔄 Creating tables directly...\n');

  // Create tags table
  console.log('Creating tags table...');
  try {
    await supabase.from('tags').select('id').limit(1);
    console.log('✅ Tags table already exists');
  } catch (error) {
    console.log('Tags table does not exist, manual creation needed');
  }

  // Create activity_tags table
  console.log('Creating activity_tags table...');
  try {
    await supabase.from('activity_tags').select('id').limit(1);
    console.log('✅ Activity_tags table already exists');
  } catch (error) {
    console.log('Activity_tags table does not exist, manual creation needed');
  }

  // Create activity_contributors table
  console.log('Creating activity_contributors table...');
  try {
    await supabase.from('activity_contributors').select('id').limit(1);
    console.log('✅ Activity_contributors table already exists');
  } catch (error) {
    console.log('Activity_contributors table does not exist, manual creation needed');
  }
}

async function main() {
  console.log('🚀 Checking database tables...\n');
  
  try {
    await createTablesDirectly();
    
    console.log('\n📋 Migration Summary:');
    console.log('To create the missing tables, you need to run these SQL commands in your Supabase SQL editor:');
    console.log('\n1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the contents of these files:');
    console.log('   - supabase/migrations/20250605_create_tags_tables.sql');
    console.log('   - supabase/migrations/20250605_create_contributors_table.sql');
    
  } catch (error) {
    console.error('\n💥 Check failed:', error.message);
  }
}

main(); 