/**
 * Check Finance and Flow Type Data in Transactions
 *
 * This script checks how many transactions have finance_type and flow_type populated
 */

import { getSupabaseAdmin } from '../src/lib/supabase';

async function checkFinanceFlowTypes() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   Finance & Flow Type Data Check             ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Could not get Supabase admin client');
    return;
  }

  try {
    // Get all transactions
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select('uuid, finance_type, flow_type, status')
      .eq('status', 'actual');

    if (allError) {
      console.error('❌ Error fetching transactions:', allError);
      return;
    }

    const total = allTransactions?.length || 0;
    const withFinanceType = allTransactions?.filter(t => t.finance_type !== null && t.finance_type !== undefined).length || 0;
    const withFlowType = allTransactions?.filter(t => t.flow_type !== null && t.flow_type !== undefined).length || 0;
    const withBoth = allTransactions?.filter(t => t.finance_type && t.flow_type).length || 0;

    console.log('Transaction Summary:');
    console.log(`  Total actual transactions: ${total}`);
    console.log(`  With finance_type: ${withFinanceType} (${total > 0 ? Math.round(withFinanceType/total*100) : 0}%)`);
    console.log(`  With flow_type: ${withFlowType} (${total > 0 ? Math.round(withFlowType/total*100) : 0}%)`);
    console.log(`  With both: ${withBoth} (${total > 0 ? Math.round(withBoth/total*100) : 0}%)`);
    console.log('');

    // Get sample of transactions with both fields
    const { data: sampleTransactions, error: sampleError } = await supabase
      .from('transactions')
      .select('uuid, finance_type, flow_type, value, value_usd, currency, transaction_date, transaction_type')
      .eq('status', 'actual')
      .not('finance_type', 'is', null)
      .not('flow_type', 'is', null)
      .limit(5);

    if (sampleError) {
      console.error('❌ Error fetching sample:', sampleError);
    } else if (sampleTransactions && sampleTransactions.length > 0) {
      console.log('Sample transactions with finance_type and flow_type:');
      sampleTransactions.forEach((t: any, i) => {
        console.log(`  ${i+1}. UUID: ${t.uuid.substring(0, 8)}...`);
        console.log(`     finance_type: ${t.finance_type}, flow_type: ${t.flow_type}`);
        console.log(`     value: ${t.value} ${t.currency}, value_usd: ${t.value_usd}, date: ${t.transaction_date}`);
        console.log(`     transaction_type: ${t.transaction_type}`);
        console.log('');
      });

      // Check for missing USD values
      const missingUSD = sampleTransactions.filter((t: any) => !t.value_usd && t.currency !== 'USD');
      if (missingUSD.length > 0) {
        console.log(`⚠️  ${missingUSD.length} transaction(s) missing USD conversion!`);
        console.log('   These will not appear in the Financial Flows chart.');
      }
    } else {
      console.log('⚠️  No transactions found with both finance_type and flow_type populated');
    }

    // Get unique finance_type and flow_type values
    const uniqueFinanceTypes = new Set(allTransactions?.filter(t => t.finance_type).map(t => t.finance_type));
    const uniqueFlowTypes = new Set(allTransactions?.filter(t => t.flow_type).map(t => t.flow_type));

    console.log('');
    console.log('Unique values found:');
    console.log(`  finance_type codes: [${Array.from(uniqueFinanceTypes).join(', ')}]`);
    console.log(`  flow_type codes: [${Array.from(uniqueFlowTypes).join(', ')}]`);
    console.log('');

    if (withBoth === 0) {
      console.log('⚠️  No transactions have both finance_type and flow_type populated.');
      console.log('   The Financial Flows by Finance Type chart will show "No data available"');
      console.log('');
      console.log('To fix this:');
      console.log('  1. Import IATI XML files that include these fields');
      console.log('  2. Manually add finance_type and flow_type to existing transactions');
      console.log('  3. Ensure IATI import is mapping these fields correctly');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkFinanceFlowTypes().then(() => {
  console.log('✅ Check complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
