/**
 * Check transactions for a specific activity
 */

import { getSupabaseAdmin } from '../src/lib/supabase';

async function checkActivityTransactions() {
  const activityIdentifier = 'AA-AAA-123456789-ABC123';

  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   Activity Transaction Check                 ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
  console.log(`Checking activity: ${activityIdentifier}`);
  console.log('');

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Could not get Supabase admin client');
    return;
  }

  try {
    // First, find the activity by identifier
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, iati_identifier')
      .eq('iati_identifier', activityIdentifier)
      .single();

    if (activityError) {
      console.error('❌ Error fetching activity:', activityError);
      return;
    }

    if (!activity) {
      console.error('❌ Activity not found');
      return;
    }

    console.log(`✓ Found activity: ${activity.iati_identifier}`);
    console.log(`  ID: ${activity.id}`);
    console.log('');

    // Get all transactions for this activity
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('uuid, transaction_type, transaction_date, value, currency, value_usd, finance_type, flow_type, status')
      .eq('activity_id', activity.id);

    if (transactionsError) {
      console.error('❌ Error fetching transactions:', transactionsError);
      return;
    }

    if (!transactions || transactions.length === 0) {
      console.log('⚠️  No transactions found for this activity');
      return;
    }

    console.log(`Found ${transactions.length} transaction(s):`);
    console.log('');

    transactions.forEach((t: any, i) => {
      console.log(`Transaction ${i + 1}:`);
      console.log(`  UUID: ${t.uuid}`);
      console.log(`  Type: ${t.transaction_type}`);
      console.log(`  Date: ${t.transaction_date}`);
      console.log(`  Status: ${t.status}`);
      console.log(`  Value: ${t.value} ${t.currency}`);
      console.log(`  USD Value: ${t.value_usd || 'NOT SET'}`);
      console.log(`  Finance Type: ${t.finance_type || 'NOT SET'}`);
      console.log(`  Flow Type: ${t.flow_type || 'NOT SET'}`);

      // Check if this will show in the chart
      const hasFinanceType = !!t.finance_type;
      const hasFlowType = !!t.flow_type;
      const hasUsdValue = !!t.value_usd || (t.currency === 'USD' && t.value);
      const isActual = t.status === 'actual';

      console.log(`  Will show in chart: ${hasFinanceType && hasFlowType && hasUsdValue && isActual ? '✓ YES' : '✗ NO'}`);

      if (!hasFinanceType || !hasFlowType || !hasUsdValue || !isActual) {
        console.log(`  Reasons:`);
        if (!hasFinanceType) console.log(`    - Missing finance_type`);
        if (!hasFlowType) console.log(`    - Missing flow_type`);
        if (!hasUsdValue) console.log(`    - Missing USD value`);
        if (!isActual) console.log(`    - Status is not 'actual' (currently: ${t.status})`);
      }
      console.log('');
    });

    // Check which ones will be visible based on default filter (transaction_type = 3)
    const defaultVisibleTransactions = transactions.filter((t: any) =>
      t.finance_type &&
      t.flow_type &&
      t.status === 'actual' &&
      t.transaction_type === '3' // Default filter is Disbursement
    );

    console.log('Summary:');
    console.log(`  Total transactions: ${transactions.length}`);
    console.log(`  With finance_type and flow_type: ${transactions.filter((t: any) => t.finance_type && t.flow_type).length}`);
    console.log(`  Actual status: ${transactions.filter((t: any) => t.status === 'actual').length}`);
    console.log(`  Visible with default filter (type=3): ${defaultVisibleTransactions.length}`);
    console.log('');

    if (defaultVisibleTransactions.length === 0) {
      console.log('⚠️  No transactions will be visible with the default chart filter!');
      console.log('');
      console.log('The chart defaults to showing only transaction type "3" (Disbursement).');
      console.log('Your transactions are:');
      transactions.forEach((t: any) => {
        console.log(`  - Type ${t.transaction_type}`);
      });
      console.log('');
      console.log('You need to change the Transaction Types filter in the chart to see your data.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkActivityTransactions().then(() => {
  console.log('✅ Check complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
