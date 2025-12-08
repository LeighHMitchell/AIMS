/**
 * Backfill USD Values for Existing Records
 * 
 * This script converts existing budgets, planned disbursements, and FSS forecasts
 * that don't have USD values stored in the database.
 * 
 * Usage: npm run backfill:usd
 */

import { getSupabaseAdmin } from '../src/lib/supabase';
import { fixedCurrencyConverter } from '../src/lib/currency-converter-fixed';

interface ConversionStats {
  total: number;
  converted: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

async function backfillBudgets(): Promise<ConversionStats> {
  const stats: ConversionStats = { total: 0, converted: 0, skipped: 0, failed: 0, errors: [] };
  
  console.log('\n=== Backfilling Activity Budgets ===');
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Could not get Supabase admin client');
    return stats;
  }

  // Get all budgets without USD values (excluding USD budgets)
  const { data: budgets, error: fetchError } = await supabase
    .from('activity_budgets')
    .select('*')
    .is('usd_value', null)
    .neq('currency', 'USD');

  if (fetchError) {
    console.error('❌ Error fetching budgets:', fetchError);
    return stats;
  }

  if (!budgets || budgets.length === 0) {
    console.log('✓ No budgets need conversion');
    return stats;
  }

  stats.total = budgets.length;
  console.log(`Found ${stats.total} budgets to convert`);

  for (const budget of budgets) {
    try {
      console.log(`Converting budget ${budget.id}: ${budget.value} ${budget.currency} on ${budget.value_date}`);
      
      const result = await fixedCurrencyConverter.convertToUSD(
        budget.value,
        budget.currency,
        new Date(budget.value_date)
      );

      if (result.success && result.usd_amount !== null) {
        const { error: updateError } = await supabase
          .from('activity_budgets')
          .update({ usd_value: result.usd_amount })
          .eq('id', budget.id);

        if (updateError) {
          console.error(`  ❌ Failed to update budget ${budget.id}:`, updateError.message);
          stats.failed++;
          stats.errors.push({ id: budget.id, error: updateError.message });
        } else {
          console.log(`  ✓ Converted to $${result.usd_amount} USD`);
          stats.converted++;
        }
      } else {
        console.log(`  ⊘ Could not convert: ${result.error}`);
        stats.skipped++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ Error converting budget ${budget.id}:`, errorMsg);
      stats.failed++;
      stats.errors.push({ id: budget.id, error: errorMsg });
    }
  }

  // Also handle USD budgets (just copy value to usd_value)
  const { data: usdBudgets, error: usdFetchError } = await supabase
    .from('activity_budgets')
    .select('*')
    .is('usd_value', null)
    .eq('currency', 'USD');

  if (!usdFetchError && usdBudgets && usdBudgets.length > 0) {
    console.log(`\nFound ${usdBudgets.length} USD budgets to update`);
    for (const budget of usdBudgets) {
      const { error: updateError } = await supabase
        .from('activity_budgets')
        .update({ usd_value: budget.value })
        .eq('id', budget.id);

      if (updateError) {
        console.error(`  ❌ Failed to update USD budget ${budget.id}:`, updateError.message);
        stats.failed++;
      } else {
        console.log(`  ✓ Set USD value for budget ${budget.id}`);
        stats.converted++;
      }
    }
  }

  return stats;
}

async function backfillDisbursements(): Promise<ConversionStats> {
  const stats: ConversionStats = { total: 0, converted: 0, skipped: 0, failed: 0, errors: [] };
  
  console.log('\n=== Backfilling Planned Disbursements ===');
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Could not get Supabase admin client');
    return stats;
  }

  // Get all disbursements without USD values (excluding USD)
  const { data: disbursements, error: fetchError } = await supabase
    .from('planned_disbursements')
    .select('*')
    .is('usd_amount', null)
    .neq('currency', 'USD');

  if (fetchError) {
    console.error('❌ Error fetching planned disbursements:', fetchError);
    return stats;
  }

  if (!disbursements || disbursements.length === 0) {
    console.log('✓ No planned disbursements need conversion');
    return stats;
  }

  stats.total = disbursements.length;
  console.log(`Found ${stats.total} planned disbursements to convert`);

  for (const disbursement of disbursements) {
    try {
      const valueDate = disbursement.value_date || new Date().toISOString().split('T')[0];
      console.log(`Converting disbursement ${disbursement.id}: ${disbursement.amount} ${disbursement.currency} on ${valueDate}`);
      
      const result = await fixedCurrencyConverter.convertToUSD(
        disbursement.amount,
        disbursement.currency,
        new Date(valueDate)
      );

      if (result.success && result.usd_amount !== null) {
        const { error: updateError } = await supabase
          .from('planned_disbursements')
          .update({ usd_amount: result.usd_amount })
          .eq('id', disbursement.id);

        if (updateError) {
          console.error(`  ❌ Failed to update disbursement ${disbursement.id}:`, updateError.message);
          stats.failed++;
          stats.errors.push({ id: disbursement.id, error: updateError.message });
        } else {
          console.log(`  ✓ Converted to $${result.usd_amount} USD`);
          stats.converted++;
        }
      } else {
        console.log(`  ⊘ Could not convert: ${result.error}`);
        stats.skipped++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ Error converting disbursement ${disbursement.id}:`, errorMsg);
      stats.failed++;
      stats.errors.push({ id: disbursement.id, error: errorMsg });
    }
  }

  // Handle USD disbursements
  const { data: usdDisbursements, error: usdFetchError } = await supabase
    .from('planned_disbursements')
    .select('*')
    .is('usd_amount', null)
    .eq('currency', 'USD');

  if (!usdFetchError && usdDisbursements && usdDisbursements.length > 0) {
    console.log(`\nFound ${usdDisbursements.length} USD disbursements to update`);
    for (const disbursement of usdDisbursements) {
      const { error: updateError } = await supabase
        .from('planned_disbursements')
        .update({ usd_amount: disbursement.amount })
        .eq('id', disbursement.id);

      if (updateError) {
        console.error(`  ❌ Failed to update USD disbursement ${disbursement.id}:`, updateError.message);
        stats.failed++;
      } else {
        console.log(`  ✓ Set USD amount for disbursement ${disbursement.id}`);
        stats.converted++;
      }
    }
  }

  return stats;
}

async function backfillForecasts(): Promise<ConversionStats> {
  const stats: ConversionStats = { total: 0, converted: 0, skipped: 0, failed: 0, errors: [] };
  
  console.log('\n=== Backfilling FSS Forecasts ===');
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Could not get Supabase admin client');
    return stats;
  }

  // Get all forecasts without USD values (excluding USD)
  const { data: forecasts, error: fetchError } = await supabase
    .from('fss_forecasts')
    .select('*')
    .is('usd_amount', null)
    .neq('currency', 'USD');

  if (fetchError) {
    console.error('❌ Error fetching FSS forecasts:', fetchError);
    return stats;
  }

  if (!forecasts || forecasts.length === 0) {
    console.log('✓ No FSS forecasts need conversion');
    return stats;
  }

  stats.total = forecasts.length;
  console.log(`Found ${stats.total} FSS forecasts to convert`);

  for (const forecast of forecasts) {
    try {
      const valueDate = forecast.value_date || new Date().toISOString().split('T')[0];
      console.log(`Converting forecast ${forecast.id}: ${forecast.amount} ${forecast.currency} on ${valueDate}`);
      
      const result = await fixedCurrencyConverter.convertToUSD(
        forecast.amount,
        forecast.currency,
        new Date(valueDate)
      );

      if (result.success && result.usd_amount !== null) {
        const { error: updateError } = await supabase
          .from('fss_forecasts')
          .update({ usd_amount: result.usd_amount })
          .eq('id', forecast.id);

        if (updateError) {
          console.error(`  ❌ Failed to update forecast ${forecast.id}:`, updateError.message);
          stats.failed++;
          stats.errors.push({ id: forecast.id, error: updateError.message });
        } else {
          console.log(`  ✓ Converted to $${result.usd_amount} USD`);
          stats.converted++;
        }
      } else {
        console.log(`  ⊘ Could not convert: ${result.error}`);
        stats.skipped++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ Error converting forecast ${forecast.id}:`, errorMsg);
      stats.failed++;
      stats.errors.push({ id: forecast.id, error: errorMsg });
    }
  }

  // Handle USD forecasts
  const { data: usdForecasts, error: usdFetchError } = await supabase
    .from('fss_forecasts')
    .select('*')
    .is('usd_amount', null)
    .eq('currency', 'USD');

  if (!usdFetchError && usdForecasts && usdForecasts.length > 0) {
    console.log(`\nFound ${usdForecasts.length} USD forecasts to update`);
    for (const forecast of usdForecasts) {
      const { error: updateError } = await supabase
        .from('fss_forecasts')
        .update({ usd_amount: forecast.amount })
        .eq('id', forecast.id);

      if (updateError) {
        console.error(`  ❌ Failed to update USD forecast ${forecast.id}:`, updateError.message);
        stats.failed++;
      } else {
        console.log(`  ✓ Set USD amount for forecast ${forecast.id}`);
        stats.converted++;
      }
    }
  }

  return stats;
}

async function backfillTransactions(): Promise<ConversionStats> {
  const stats: ConversionStats = { total: 0, converted: 0, skipped: 0, failed: 0, errors: [] };

  console.log('\n=== Backfilling Transactions ===');
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Could not get Supabase admin client');
    return stats;
  }

  // Get all transactions without USD values (excluding USD)
  const { data: transactions, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .is('value_usd', null)
    .neq('currency', 'USD');

  if (fetchError) {
    console.error('❌ Error fetching transactions:', fetchError);
    return stats;
  }

  if (!transactions || transactions.length === 0) {
    console.log('✓ No transactions need conversion');
    return stats;
  }

  stats.total = transactions.length;
  console.log(`Found ${stats.total} transactions to convert`);

  for (const transaction of transactions) {
    try {
      const valueDate = transaction.value_date || transaction.transaction_date || new Date().toISOString().split('T')[0];
      console.log(`Converting transaction ${transaction.uuid}: ${transaction.value} ${transaction.currency} on ${valueDate}`);

      const result = await fixedCurrencyConverter.convertToUSD(
        transaction.value,
        transaction.currency,
        new Date(valueDate)
      );

      if (result.success && result.usd_amount !== null) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ value_usd: result.usd_amount })
          .eq('uuid', transaction.uuid);

        if (updateError) {
          console.error(`  ❌ Failed to update transaction ${transaction.uuid}:`, updateError.message);
          stats.failed++;
          stats.errors.push({ id: transaction.uuid, error: updateError.message });
        } else {
          console.log(`  ✓ Converted to $${result.usd_amount} USD`);
          stats.converted++;
        }
      } else {
        console.log(`  ⊘ Could not convert: ${result.error}`);
        stats.skipped++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ Error converting transaction ${transaction.uuid}:`, errorMsg);
      stats.failed++;
      stats.errors.push({ id: transaction.uuid, error: errorMsg });
    }
  }

  // Handle USD transactions
  const { data: usdTransactions, error: usdFetchError } = await supabase
    .from('transactions')
    .select('*')
    .is('value_usd', null)
    .eq('currency', 'USD');

  if (!usdFetchError && usdTransactions && usdTransactions.length > 0) {
    console.log(`\nFound ${usdTransactions.length} USD transactions to update`);
    for (const transaction of usdTransactions) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ value_usd: transaction.value })
        .eq('uuid', transaction.uuid);

      if (updateError) {
        console.error(`  ❌ Failed to update USD transaction ${transaction.uuid}:`, updateError.message);
        stats.failed++;
      } else {
        console.log(`  ✓ Set USD value for transaction ${transaction.uuid}`);
        stats.converted++;
      }
    }
  }

  return stats;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   USD Values Backfill Script                 ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  try {
    // Run backfill for each table
    const budgetStats = await backfillBudgets();
    const disbursementStats = await backfillDisbursements();
    const forecastStats = await backfillForecasts();
    const transactionStats = await backfillTransactions();

    // Print summary
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║   BACKFILL SUMMARY                            ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');
    
    const printStats = (name: string, stats: ConversionStats) => {
      console.log(`${name}:`);
      console.log(`  Total:     ${stats.total}`);
      console.log(`  Converted: ${stats.converted} ✓`);
      console.log(`  Skipped:   ${stats.skipped} ⊘`);
      console.log(`  Failed:    ${stats.failed} ❌`);
      if (stats.errors.length > 0) {
        console.log(`  Errors:`);
        stats.errors.forEach(({ id, error }) => {
          console.log(`    - ${id}: ${error}`);
        });
      }
      console.log('');
    };

    printStats('Activity Budgets', budgetStats);
    printStats('Planned Disbursements', disbursementStats);
    printStats('FSS Forecasts', forecastStats);
    printStats('Transactions', transactionStats);

    const totalConverted = budgetStats.converted + disbursementStats.converted + forecastStats.converted + transactionStats.converted;
    const totalFailed = budgetStats.failed + disbursementStats.failed + forecastStats.failed + transactionStats.failed;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Total Converted: ${totalConverted}`);
    console.log(`Total Failed: ${totalFailed}`);
    console.log(`Time Elapsed: ${elapsed}s`);
    console.log('');

    if (totalFailed > 0) {
      console.log('⚠️  Some conversions failed. Check the logs above for details.');
      process.exit(1);
    } else {
      console.log('✅ Backfill completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the script
main();




