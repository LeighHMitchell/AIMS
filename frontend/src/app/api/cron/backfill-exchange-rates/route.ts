import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { convertTransactionToUSD, addUSDFieldsToTransaction } from '@/lib/transaction-usd-helper';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/backfill-exchange-rates
 *
 * Nightly cron that backfills USD conversions for transactions and activity_budgets
 * that are missing them (typically because the FX rate wasn't available when the
 * row was created — e.g. same-day transactions).
 *
 * Planned disbursements are handled by the dedicated cron at
 * /api/cron/backfill-planned-disbursements-usd, which understands future-dated
 * entries.
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
      activity_budgets: { checked: 0, updated: 0, errors: 0 },
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

    // --- Activity Budgets ---
    // Table is `activity_budgets` (not `budgets`) and its USD column is `usd_value`
    // (not `value_usd`). Per migration 20250530000000 it also has exchange_rate_used,
    // usd_conversion_date, and usd_convertible. Mirrors the transactions filter.
    const { data: budgets, error: budgetError } = await supabase
      .from('activity_budgets')
      .select('id, value, currency, value_date, period_start')
      .neq('currency', 'USD')
      .or('usd_convertible.is.false,usd_convertible.is.null,exchange_rate_used.is.null,exchange_rate_used.eq.0')
      .not('value', 'is', null)
      .not('currency', 'is', null)
      .limit(200);

    if (budgetError) {
      console.error('[BackfillXR] Error fetching activity_budgets:', budgetError);
    } else if (budgets && budgets.length > 0) {
      results.activity_budgets.checked = budgets.length;

      for (const budget of budgets) {
        try {
          const valueDate = budget.value_date || budget.period_start;
          if (!valueDate || !budget.value || !budget.currency) continue;

          const usdResult = await convertTransactionToUSD(budget.value, budget.currency, valueDate);

          if (usdResult.success && usdResult.value_usd > 0) {
            const { error: updateError } = await supabase
              .from('activity_budgets')
              .update({
                usd_value: usdResult.value_usd,
                exchange_rate_used: usdResult.exchange_rate_used,
                usd_conversion_date: usdResult.usd_conversion_date,
                usd_convertible: true,
              })
              .eq('id', budget.id);

            if (updateError) {
              console.error(`[BackfillXR] Error updating activity_budget ${budget.id}:`, updateError);
              results.activity_budgets.errors++;
            } else {
              results.activity_budgets.updated++;
            }
          }
        } catch (err) {
          console.error(`[BackfillXR] Error processing activity_budget ${budget.id}:`, err);
          results.activity_budgets.errors++;
        }
      }
    }

    const totalUpdated = results.transactions.updated + results.activity_budgets.updated;

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
