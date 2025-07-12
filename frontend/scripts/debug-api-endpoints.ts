import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugApiEndpoints() {
  console.log('🔍 Debugging API endpoints...\n');
  
  // Test 1: Check activities endpoint directly
  console.log('1. Testing activities data...');
  try {
    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .limit(3);
    
    if (error) {
      console.log('❌ Activities query error:', error.message);
    } else {
      console.log(`✅ Activities loaded: ${activities?.length || 0} records`);
      if (activities && activities.length > 0) {
        console.log('   Sample activity:', {
          id: activities[0].id,
          title: activities[0].title_narrative,
          status: activities[0].activity_status
        });
      }
    }
  } catch (err) {
    console.log('❌ Activities test failed:', err);
  }

  // Test 2: Check materialized view
  console.log('\n2. Testing materialized view...');
  try {
    const { data: summaries, error } = await supabase
      .from('activity_transaction_summaries')
      .select('*')
      .limit(3);
    
    if (error) {
      console.log('❌ Materialized view error:', error.message);
    } else {
      console.log(`✅ Materialized view working: ${summaries?.length || 0} records`);
      if (summaries && summaries.length > 0) {
        console.log('   Sample summary:', summaries[0]);
      }
    }
  } catch (err) {
    console.log('❌ Materialized view test failed:', err);
  }

  // Test 3: Check transactions table
  console.log('\n3. Testing transactions...');
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .limit(3);
    
    if (error) {
      console.log('❌ Transactions query error:', error.message);
    } else {
      console.log(`✅ Transactions loaded: ${transactions?.length || 0} records`);
      if (transactions && transactions.length > 0) {
        console.log('   Sample transaction:', {
          uuid: transactions[0].uuid,
          activity_id: transactions[0].activity_id,
          type: transactions[0].transaction_type,
          value: transactions[0].value,
          status: transactions[0].status
        });
      }
    }
  } catch (err) {
    console.log('❌ Transactions test failed:', err);
  }

  // Test 4: Check which activities have transactions
  console.log('\n4. Checking activities with transactions...');
  try {
    const { data: activitiesWithTransactions, error } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        transactions(uuid, transaction_type, value, status)
      `)
      .limit(5);
    
    if (error) {
      console.log('❌ Activities with transactions error:', error.message);
    } else {
      console.log(`✅ Checked ${activitiesWithTransactions?.length || 0} activities for transactions`);
      activitiesWithTransactions?.forEach((activity, i) => {
        const txCount = activity.transactions?.length || 0;
        console.log(`   ${i + 1}. ${activity.title_narrative}: ${txCount} transactions`);
      });
    }
  } catch (err) {
    console.log('❌ Activities with transactions test failed:', err);
  }

  // Test 5: Test API endpoint format
  console.log('\n5. Testing optimized API format...');
  try {
    // Simulate what the optimized API should return
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        other_identifier,
        iati_identifier,
        title_narrative,
        description_narrative,
        created_by_org_name,
        created_by_org_acronym,
        activity_status,
        publication_status,
        submission_status,
        reporting_org_id,
        created_at,
        updated_at
      `)
      .limit(3);

    if (activitiesError) {
      console.log('❌ Optimized API format test error:', activitiesError.message);
    } else {
      console.log(`✅ Optimized API format working: ${activities?.length || 0} records`);
      
      if (activities && activities.length > 0) {
        // Get transaction summaries for these activities
        const activityIds = activities.map(a => a.id);
        const { data: summaries } = await supabase
          .from('activity_transaction_summaries')
          .select('*')
          .in('activity_id', activityIds);
        
        console.log(`   Found summaries for ${summaries?.length || 0} activities`);
        
        // Show combined result
        const combined = activities.map(activity => {
          const summary = summaries?.find(s => s.activity_id === activity.id) || {
            commitments: 0,
            disbursements: 0,
            expenditures: 0,
            inflows: 0,
            total_transactions: 0
          };
          
          return {
            id: activity.id,
            title: activity.title_narrative,
            partnerId: activity.other_identifier,
            iatiIdentifier: activity.iati_identifier,
            activityStatus: activity.activity_status,
            publicationStatus: activity.publication_status,
            submissionStatus: activity.submission_status,
            ...summary
          };
        });
        
        console.log('   Sample combined result:', combined[0]);
      }
    }
  } catch (err) {
    console.log('❌ Optimized API format test failed:', err);
  }

  console.log('\n✨ Diagnostic complete!');
}

debugApiEndpoints();