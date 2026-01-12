import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

/**
 * Backfill USD values for transactions that don't have them
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    console.log('[Backfill Transactions USD] Starting backfill process');

    // Get all transactions without USD values
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .is('value_usd', null);

    if (fetchError) {
      console.error('[Backfill Transactions USD] Error fetching transactions:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch transactions',
        details: fetchError.message
      }, { status: 500 });
    }

    if (!transactions || transactions.length === 0) {
      console.log('[Backfill Transactions USD] No transactions need backfilling');
      return NextResponse.json({
        message: 'No transactions need backfilling',
        processed: 0,
        converted: 0,
        failed: 0
      });
    }

    console.log(`[Backfill Transactions USD] Found ${transactions.length} transactions without USD values`);

    const results = {
      processed: 0,
      converted: 0,
      failed: 0,
      alreadyUSD: 0,
      errors: [] as Array<{ id: string; error: string }>
    };

    for (const transaction of transactions) {
      results.processed++;

      try {
        let usdValue = null;

        // If already in USD, just copy the value
        if (transaction.currency === 'USD') {
          usdValue = transaction.value;
          results.alreadyUSD++;
        } else {
          // Convert to USD using the transaction_date
          const conversionDate = new Date(transaction.transaction_date || transaction.created_at);

          const result = await fixedCurrencyConverter.convertToUSD(
            transaction.value,
            transaction.currency,
            conversionDate
          );

          if (result.success && result.usd_amount !== null) {
            usdValue = result.usd_amount;
            results.converted++;
            console.log(`[Backfill Transactions USD] Converted transaction ${transaction.uuid}: ${transaction.value} ${transaction.currency} → $${usdValue} USD`);
          } else {
            results.failed++;
            results.errors.push({
              id: transaction.uuid,
              error: result.error || 'Conversion failed'
            });
            console.warn(`[Backfill Transactions USD] Failed to convert transaction ${transaction.uuid}:`, result.error);
            continue;
          }
        }

        // Update the transaction with USD value
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ value_usd: usdValue })
          .eq('uuid', transaction.uuid);

        if (updateError) {
          results.failed++;
          results.errors.push({
            id: transaction.uuid,
            error: `Update failed: ${updateError.message}`
          });
          console.error(`[Backfill Transactions USD] Error updating transaction ${transaction.uuid}:`, updateError);
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          id: transaction.uuid,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`[Backfill Transactions USD] Error processing transaction ${transaction.uuid}:`, error);
      }
    }

    console.log('[Backfill Transactions USD] Backfill complete:', results);

    return NextResponse.json({
      message: 'Backfill complete',
      ...results
    });

  } catch (error) {
    console.error('[Backfill Transactions USD] Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
