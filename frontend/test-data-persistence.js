// Test script to verify data persistence in Supabase
// Run this with: node test-data-persistence.js

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDataPersistence() {
  console.log('🔍 Testing Supabase data persistence...\n');

  try {
    // 1. Test connection
    console.log('1️⃣ Testing Supabase connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('activities')
      .select('id')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ Failed to connect to Supabase:', tablesError);
      return;
    }
    console.log('✅ Successfully connected to Supabase\n');

    // 2. Create a test activity
    console.log('2️⃣ Creating test activity...');
    const testActivity = {
      title: `Test Activity ${new Date().toISOString()}`,
      description: 'This is a test activity to verify data persistence',
      activity_status: 'planning',
      publication_status: 'draft',
      submission_status: 'draft'
    };

    const { data: createdActivity, error: createError } = await supabase
      .from('activities')
      .insert([testActivity])
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create activity:', createError);
      return;
    }
    console.log('✅ Created activity with ID:', createdActivity.id);
    console.log('   Title:', createdActivity.title);
    console.log('   Status:', createdActivity.activity_status);
    console.log('   Publication:', createdActivity.publication_status, '\n');

    // 3. Verify the activity exists
    console.log('3️⃣ Verifying activity exists in database...');
    const { data: fetchedActivity, error: fetchError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', createdActivity.id)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch activity:', fetchError);
      return;
    }
    console.log('✅ Activity found in database');
    console.log('   Created at:', fetchedActivity.created_at);
    console.log('   Updated at:', fetchedActivity.updated_at, '\n');

    // 4. Update the activity
    console.log('4️⃣ Updating activity...');
    const updateData = {
      description: 'Updated description - ' + new Date().toISOString(),
      activity_status: 'active'
    };

    const { data: updatedActivity, error: updateError } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', createdActivity.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update activity:', updateError);
      return;
    }
    console.log('✅ Updated activity');
    console.log('   New description:', updatedActivity.description);
    console.log('   New status:', updatedActivity.activity_status, '\n');

    // 5. Add a transaction
    console.log('5️⃣ Adding transaction to activity...');
    const testTransaction = {
      activity_id: createdActivity.id,
      transaction_type: '2', // Commitment
      value: 50000,
      currency: 'USD',
      transaction_date: new Date().toISOString().split('T')[0],
      provider_org_name: 'Test Donor Organization',
      receiver_org_name: 'Test Implementing Organization',
      status: 'draft'
    };

    const { data: createdTransaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([testTransaction])
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Failed to create transaction:', transactionError);
      console.error('   Details:', transactionError.details);
      console.error('   Hint:', transactionError.hint);
    } else {
      console.log('✅ Created transaction');
      console.log('   Transaction ID:', createdTransaction.uuid || createdTransaction.id);
      console.log('   Value:', createdTransaction.value, createdTransaction.currency);
      console.log('   Type:', createdTransaction.transaction_type, '\n');
    }

    // 6. Check for RLS policies
    console.log('6️⃣ Checking Row Level Security (RLS)...');
    const { data: rlsStatus } = await supabase.rpc('check_rls_status', {});
    console.log('   RLS Status:', rlsStatus || 'Unable to check');

    // 7. Clean up test data
    console.log('\n7️⃣ Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('activities')
      .delete()
      .eq('id', createdActivity.id);

    if (deleteError) {
      console.error('❌ Failed to delete test activity:', deleteError);
    } else {
      console.log('✅ Test data cleaned up successfully');
    }

    // Summary
    console.log('\n📊 PERSISTENCE TEST SUMMARY:');
    console.log('✅ Database connection: Working');
    console.log('✅ Create operations: Working');
    console.log('✅ Read operations: Working');
    console.log('✅ Update operations: Working');
    console.log(transactionError ? '❌' : '✅', 'Transaction operations:', transactionError ? 'Failed' : 'Working');
    
    if (transactionError) {
      console.log('\n⚠️  POTENTIAL ISSUES:');
      console.log('- Check if transactions table has all required columns');
      console.log('- Verify foreign key constraints are not blocking inserts');
      console.log('- Check RLS policies on transactions table');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testDataPersistence(); 