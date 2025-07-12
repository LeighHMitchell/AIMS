import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function refreshTransactionSummaries() {
  try {
    console.log('🔄 Refreshing transaction summaries...');
    
    // First, check if the materialized view exists
    const { data: checkView, error: checkError } = await supabase
      .from('activity_transaction_summaries')
      .select('activity_id')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Materialized view does not exist or is not accessible:', checkError.message);
      console.log('\n📝 Please run the performance optimization migration first:');
      console.log('   Go to your Supabase dashboard > SQL Editor');
      console.log('   Paste and run the contents of: supabase/migrations/20250711_performance_optimization_indexes.sql');
      return;
    }
    
    // Get current count
    const { count: beforeCount } = await supabase
      .from('activity_transaction_summaries')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Current records in view: ${beforeCount || 0}`);
    
    // Try to refresh the materialized view
    const { error: refreshError } = await supabase.rpc('refresh_activity_transaction_summaries');
    
    if (refreshError) {
      // If the function doesn't exist, try a direct refresh
      console.log('⚠️  refresh_activity_transaction_summaries function not found, creating it...');
      
      // Create the refresh function
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION refresh_activity_transaction_summaries()
        RETURNS void AS $$
        BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY activity_transaction_summaries;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      // Note: This won't work directly, need to use Supabase dashboard
      console.log('\n📝 Please run this SQL in your Supabase dashboard:');
      console.log(createFunctionSQL);
      console.log('\nThen run this script again.');
      return;
    }
    
    console.log('✅ Materialized view refresh completed');
    
    // Get new count
    const { count: afterCount } = await supabase
      .from('activity_transaction_summaries')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Records after refresh: ${afterCount || 0}`);
    
    // Test with a sample
    const { data: sampleData, error: sampleError } = await supabase
      .from('activity_transaction_summaries')
      .select('*')
      .gt('total_transactions', 0)
      .limit(5);
    
    if (sampleData && sampleData.length > 0) {
      console.log('\n📋 Sample transaction summaries:');
      sampleData.forEach((summary, index) => {
        console.log(`\n${index + 1}. Activity ${summary.activity_id}:`);
        console.log(`   - Total transactions: ${summary.total_transactions}`);
        console.log(`   - Commitments: $${summary.commitments?.toLocaleString() || 0}`);
        console.log(`   - Disbursements: $${summary.disbursements?.toLocaleString() || 0}`);
        console.log(`   - Expenditures: $${summary.expenditures?.toLocaleString() || 0}`);
        console.log(`   - Inflows: $${summary.inflows?.toLocaleString() || 0}`);
      });
    }
    
    console.log('\n✨ Transaction summaries are up to date!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

refreshTransactionSummaries().catch(console.error);