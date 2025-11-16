import { getSupabaseAdmin } from '../src/lib/supabase';

async function checkColumn() {
  const supabase = getSupabaseAdmin();

  console.log('Checking if usd_amount column exists in planned_disbursements...');

  // Try to select the column
  const { data, error } = await supabase
    .from('planned_disbursements')
    .select('id, amount, currency, usd_amount')
    .limit(5);

  if (error) {
    console.error('ERROR:', error);
    console.log('\nThe usd_amount column does NOT exist or there is a permission issue.');
    console.log('You need to run the migration in Supabase SQL Editor first.');
    return;
  }

  console.log('SUCCESS: usd_amount column exists!');
  console.log(`\nSample data (${data.length} records):`);
  data.forEach((record: any) => {
    console.log(`  ID: ${record.id}, Amount: ${record.amount} ${record.currency}, USD: ${record.usd_amount ?? 'NULL'}`);
  });

  // Count how many need backfilling
  const { count, error: countError } = await supabase
    .from('planned_disbursements')
    .select('*', { count: 'exact', head: true })
    .is('usd_amount', null);

  if (!countError) {
    console.log(`\n${count} planned disbursements need USD backfilling`);
  }
}

checkColumn().then(() => process.exit(0)).catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
