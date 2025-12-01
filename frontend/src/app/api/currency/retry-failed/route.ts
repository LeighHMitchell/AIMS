import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for this operation

interface RetryResult {
  table: string;
  id: string;
  success: boolean;
  error?: string;
  originalAmount?: number;
  currency?: string;
  usdAmount?: number | null;
  exchangeRate?: number | null;
}

/**
 * API endpoint to retry failed currency conversions
 * Processes all records where usd_convertible = false
 * 
 * Can be called:
 * 1. On-demand via POST request
 * 2. Scheduled via cron job (hourly)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const results: RetryResult[] = [];
    let totalProcessed = 0;
    let totalConverted = 0;
    let totalFailed = 0;

    console.log('[Currency Retry] Starting retry of failed conversions...');

    // ================================================================
    // 1. RETRY TRANSACTIONS
    // ================================================================
    console.log('[Currency Retry] Fetching unconverted transactions...');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('uuid, value, currency, value_date, transaction_date')
      .eq('usd_convertible', false)
      .not('exchange_rate_manual', 'eq', true)
      .limit(100); // Process in batches

    if (txError) {
      console.error('[Currency Retry] Error fetching transactions:', txError);
    } else if (transactions && transactions.length > 0) {
      console.log(`[Currency Retry] Found ${transactions.length} transactions to retry`);

      for (const tx of transactions) {
        totalProcessed++;
        const valueDate = tx.value_date || tx.transaction_date;
        
        if (!valueDate) {
          results.push({
            table: 'transactions',
            id: tx.uuid,
            success: false,
            error: 'No valid date for conversion'
          });
          totalFailed++;
          continue;
        }

        try {
          const result = await fixedCurrencyConverter.convertToUSD(
            tx.value,
            tx.currency,
            new Date(valueDate)
          );

          if (result.success && result.usd_amount != null) {
            // Update the transaction
            const { error: updateError } = await supabase
              .from('transactions')
              .update({
                value_usd: result.usd_amount,
                exchange_rate_used: result.exchange_rate,
                usd_conversion_date: new Date().toISOString(),
                usd_convertible: true
              })
              .eq('uuid', tx.uuid);

            if (updateError) {
              throw updateError;
            }

            results.push({
              table: 'transactions',
              id: tx.uuid,
              success: true,
              originalAmount: tx.value,
              currency: tx.currency,
              usdAmount: result.usd_amount,
              exchangeRate: result.exchange_rate
            });
            totalConverted++;
            console.log(`[Currency Retry] ✅ Transaction ${tx.uuid}: ${tx.value} ${tx.currency} → $${result.usd_amount} USD`);
          } else {
            results.push({
              table: 'transactions',
              id: tx.uuid,
              success: false,
              error: result.error || 'Conversion failed'
            });
            totalFailed++;
          }
        } catch (err) {
          console.error(`[Currency Retry] Error converting transaction ${tx.uuid}:`, err);
          results.push({
            table: 'transactions',
            id: tx.uuid,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
          totalFailed++;
        }
      }
    }

    // ================================================================
    // 2. RETRY BUDGETS
    // ================================================================
    console.log('[Currency Retry] Fetching unconverted budgets...');
    const { data: budgets, error: budgetError } = await supabase
      .from('activity_budgets')
      .select('id, value, currency, value_date, period_start')
      .eq('usd_convertible', false)
      .not('exchange_rate_manual', 'eq', true)
      .limit(100);

    if (budgetError) {
      console.error('[Currency Retry] Error fetching budgets:', budgetError);
    } else if (budgets && budgets.length > 0) {
      console.log(`[Currency Retry] Found ${budgets.length} budgets to retry`);

      for (const budget of budgets) {
        totalProcessed++;
        const valueDate = budget.value_date || budget.period_start;
        
        if (!valueDate) {
          results.push({
            table: 'activity_budgets',
            id: budget.id,
            success: false,
            error: 'No valid date for conversion'
          });
          totalFailed++;
          continue;
        }

        try {
          const result = await fixedCurrencyConverter.convertToUSD(
            budget.value,
            budget.currency,
            new Date(valueDate)
          );

          if (result.success && result.usd_amount != null) {
            const { error: updateError } = await supabase
              .from('activity_budgets')
              .update({
                usd_value: result.usd_amount,
                exchange_rate_used: result.exchange_rate,
                usd_conversion_date: new Date().toISOString(),
                usd_convertible: true
              })
              .eq('id', budget.id);

            if (updateError) {
              throw updateError;
            }

            results.push({
              table: 'activity_budgets',
              id: budget.id,
              success: true,
              originalAmount: budget.value,
              currency: budget.currency,
              usdAmount: result.usd_amount,
              exchangeRate: result.exchange_rate
            });
            totalConverted++;
            console.log(`[Currency Retry] ✅ Budget ${budget.id}: ${budget.value} ${budget.currency} → $${result.usd_amount} USD`);
          } else {
            results.push({
              table: 'activity_budgets',
              id: budget.id,
              success: false,
              error: result.error || 'Conversion failed'
            });
            totalFailed++;
          }
        } catch (err) {
          console.error(`[Currency Retry] Error converting budget ${budget.id}:`, err);
          results.push({
            table: 'activity_budgets',
            id: budget.id,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
          totalFailed++;
        }
      }
    }

    // ================================================================
    // 3. RETRY PLANNED DISBURSEMENTS
    // ================================================================
    console.log('[Currency Retry] Fetching unconverted planned disbursements...');
    const { data: disbursements, error: disbError } = await supabase
      .from('planned_disbursements')
      .select('id, amount, currency, value_date, period_start')
      .eq('usd_convertible', false)
      .not('exchange_rate_manual', 'eq', true)
      .limit(100);

    if (disbError) {
      console.error('[Currency Retry] Error fetching planned disbursements:', disbError);
    } else if (disbursements && disbursements.length > 0) {
      console.log(`[Currency Retry] Found ${disbursements.length} planned disbursements to retry`);

      for (const disb of disbursements) {
        totalProcessed++;
        const valueDate = disb.value_date || disb.period_start;
        
        if (!valueDate) {
          results.push({
            table: 'planned_disbursements',
            id: disb.id,
            success: false,
            error: 'No valid date for conversion'
          });
          totalFailed++;
          continue;
        }

        try {
          const result = await fixedCurrencyConverter.convertToUSD(
            disb.amount,
            disb.currency,
            new Date(valueDate)
          );

          if (result.success && result.usd_amount != null) {
            const { error: updateError } = await supabase
              .from('planned_disbursements')
              .update({
                usd_amount: result.usd_amount,
                exchange_rate_used: result.exchange_rate,
                usd_conversion_date: new Date().toISOString(),
                usd_convertible: true
              })
              .eq('id', disb.id);

            if (updateError) {
              throw updateError;
            }

            results.push({
              table: 'planned_disbursements',
              id: disb.id,
              success: true,
              originalAmount: disb.amount,
              currency: disb.currency,
              usdAmount: result.usd_amount,
              exchangeRate: result.exchange_rate
            });
            totalConverted++;
            console.log(`[Currency Retry] ✅ Planned disbursement ${disb.id}: ${disb.amount} ${disb.currency} → $${result.usd_amount} USD`);
          } else {
            results.push({
              table: 'planned_disbursements',
              id: disb.id,
              success: false,
              error: result.error || 'Conversion failed'
            });
            totalFailed++;
          }
        } catch (err) {
          console.error(`[Currency Retry] Error converting planned disbursement ${disb.id}:`, err);
          results.push({
            table: 'planned_disbursements',
            id: disb.id,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
          totalFailed++;
        }
      }
    }

    console.log('[Currency Retry] Completed:', {
      totalProcessed,
      totalConverted,
      totalFailed
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed,
        totalConverted,
        totalFailed,
        timestamp: new Date().toISOString()
      },
      results
    });

  } catch (error) {
    console.error('[Currency Retry] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to retry currency conversions', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check the status of pending conversions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Count pending conversions in each table
    const [txCount, budgetCount, disbCount] = await Promise.all([
      supabase
        .from('transactions')
        .select('uuid', { count: 'exact', head: true })
        .eq('usd_convertible', false)
        .not('exchange_rate_manual', 'eq', true),
      supabase
        .from('activity_budgets')
        .select('id', { count: 'exact', head: true })
        .eq('usd_convertible', false)
        .not('exchange_rate_manual', 'eq', true),
      supabase
        .from('planned_disbursements')
        .select('id', { count: 'exact', head: true })
        .eq('usd_convertible', false)
        .not('exchange_rate_manual', 'eq', true)
    ]);

    return NextResponse.json({
      pending: {
        transactions: txCount.count || 0,
        budgets: budgetCount.count || 0,
        plannedDisbursements: disbCount.count || 0,
        total: (txCount.count || 0) + (budgetCount.count || 0) + (disbCount.count || 0)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Currency Retry] Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check conversion status', details: String(error) },
      { status: 500 }
    );
  }
}


