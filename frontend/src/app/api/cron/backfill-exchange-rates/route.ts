import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { convertTransactionToUSD, addUSDFieldsToTransaction } from '@/lib/transaction-usd-helper';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/backfill-exchange-rates
 *
 * Nightly cron to backfill USD conversions for transactions that are missing
 * exchange rates — typically because the rate wasn't available when the
 * transaction was created (e.g. same-day transactions).
 *
 * Also covers planned disbursements and budgets with missing USD values.
 */
export async function GET(request: NextRequest) {
  try {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const results = {
      transactions: { checked: 0, updated: 0, errors: 0 },
      planned_disbursements: { checked: 0, updated: 0, errors: 0 },
      budgets: { checked: 0, updated: 0, errors: 0 },
    };

    // --- Transactions ---
    // Find transactions missing USD conversion (non-USD currency, no exchange rate or not convertible)
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, value, currency, transaction_date, value_date')
      .neq('currency', 'USD')
      .or('usd_convertible.is.false,usd_convertible.is.null,exchange_rate_used.is.null,exchange_rate_used.eq.0')
      .not('value', 'is', null)
      .not('currency', 'is', null)
      .limit(200);

    if (txError) {
      console.error('[BackfillXR] Error fetching transactions:', txError);
    } else if (transactions && transactions.length > 0) {
      results.transactions.checked = transactions.length;
      console.log(`[BackfillXR] Found ${transactions.length} transactions to backfill`);

      for (const tx of transactions) {
        try {
          const valueDate = tx.value_date || tx.transaction_date;
          if (!valueDate || !tx.value || !tx.currency) continue;

          const usdResult = await convertTransactionToUSD(tx.value, tx.currency, valueDate);

          if (usdResult.success && usdResult.value_usd > 0) {
            const { error: updateError } = await supabase
              .from('transactions')
              .update({
                value_usd: usdResult.value_usd,
                exchange_rate_used: usdResult.exchange_rate_used,
                usd_conversion_date: usdResult.usd_conversion_date,
                usd_convertible: true,
              })
              .eq('id', tx.id);

            if (updateError) {
              console.error(`[BackfillXR] Error updating transaction ${tx.id}:`, updateError);
              results.transactions.errors++;
            } else {
              results.transactions.updated++;
            }
          }
        } catch (err) {
          console.error(`[BackfillXR] Error processing transaction ${tx.id}:`, err);
          results.transactions.errors++;
        }
      }
    }

    // --- Planned Disbursements ---
    const { data: disbursements, error: pdError } = await supabase
      .from('planned_disbursements')
      .select('id, value, currency, period_start')
      .neq('currency', 'USD')
      .or('value_usd.is.null,value_usd.eq.0')
      .not('value', 'is', null)
      .not('currency', 'is', null)
      .limit(200);

    if (pdError) {
      console.error('[BackfillXR] Error fetching planned disbursements:', pdError);
    } else if (disbursements && disbursements.length > 0) {
      results.planned_disbursements.checked = disbursements.length;
      console.log(`[BackfillXR] Found ${disbursements.length} planned disbursements to backfill`);

      for (const pd of disbursements) {
        try {
          const valueDate = pd.period_start;
          if (!valueDate || !pd.value || !pd.currency) continue;

          const usdResult = await convertTransactionToUSD(pd.value, pd.currency, valueDate);

          if (usdResult.success && usdResult.value_usd > 0) {
            const { error: updateError } = await supabase
              .from('planned_disbursements')
              .update({
                value_usd: usdResult.value_usd,
                exchange_rate_used: usdResult.exchange_rate_used,
              })
              .eq('id', pd.id);

            if (updateError) {
              console.error(`[BackfillXR] Error updating planned disbursement ${pd.id}:`, updateError);
              results.planned_disbursements.errors++;
            } else {
              results.planned_disbursements.updated++;
            }
          }
        } catch (err) {
          console.error(`[BackfillXR] Error processing planned disbursement ${pd.id}:`, err);
          results.planned_disbursements.errors++;
        }
      }
    }

    // --- Budgets ---
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select('id, value, currency, period_start')
      .neq('currency', 'USD')
      .or('value_usd.is.null,value_usd.eq.0')
      .not('value', 'is', null)
      .not('currency', 'is', null)
      .limit(200);

    if (budgetError) {
      console.error('[BackfillXR] Error fetching budgets:', budgetError);
    } else if (budgets && budgets.length > 0) {
      results.budgets.checked = budgets.length;
      console.log(`[BackfillXR] Found ${budgets.length} budgets to backfill`);

      for (const budget of budgets) {
        try {
          const valueDate = budget.period_start;
          if (!valueDate || !budget.value || !budget.currency) continue;

          const usdResult = await convertTransactionToUSD(budget.value, budget.currency, valueDate);

          if (usdResult.success && usdResult.value_usd > 0) {
            const { error: updateError } = await supabase
              .from('budgets')
              .update({
                value_usd: usdResult.value_usd,
                exchange_rate_used: usdResult.exchange_rate_used,
              })
              .eq('id', budget.id);

            if (updateError) {
              console.error(`[BackfillXR] Error updating budget ${budget.id}:`, updateError);
              results.budgets.errors++;
            } else {
              results.budgets.updated++;
            }
          }
        } catch (err) {
          console.error(`[BackfillXR] Error processing budget ${budget.id}:`, err);
          results.budgets.errors++;
        }
      }
    }

    const totalUpdated = results.transactions.updated + results.planned_disbursements.updated + results.budgets.updated;
    console.log(`[BackfillXR] Complete. Updated ${totalUpdated} records.`, results);

    return NextResponse.json({
      success: true,
      message: `Backfilled ${totalUpdated} exchange rates`,
      results,
    });
  } catch (error) {
    console.error('[BackfillXR] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
