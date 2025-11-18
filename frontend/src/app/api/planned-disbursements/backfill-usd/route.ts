import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

/**
 * Backfill USD values for planned disbursements that don't have them
 * This fixes the "Not converted" issue in the Planned Disbursements table
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    console.log('[Backfill Planned Disbursements USD] Starting backfill process');

    // Get all planned disbursements without USD values
    const { data: disbursements, error: fetchError } = await supabase
      .from('planned_disbursements')
      .select('*')
      .is('usd_amount', null);

    if (fetchError) {
      console.error('[Backfill Planned Disbursements USD] Error fetching disbursements:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch planned disbursements',
        details: fetchError.message
      }, { status: 500 });
    }

    if (!disbursements || disbursements.length === 0) {
      console.log('[Backfill Planned Disbursements USD] No disbursements need backfilling');
      return NextResponse.json({
        message: 'No planned disbursements need backfilling',
        processed: 0,
        converted: 0,
        failed: 0
      });
    }

    console.log(`[Backfill Planned Disbursements USD] Found ${disbursements.length} disbursements without USD values`);

    const results = {
      processed: 0,
      converted: 0,
      failed: 0,
      alreadyUSD: 0,
      errors: [] as Array<{ id: string; error: string; currency?: string; amount?: number; date?: string }>
    };

    for (const disbursement of disbursements) {
      results.processed++;

      try {
        let usdAmount = null;

        // If already in USD, just copy the amount
        if (disbursement.currency === 'USD') {
          usdAmount = disbursement.amount;
          results.alreadyUSD++;
        } else {
          // Convert to USD using the value_date or period_start
          const conversionDate = new Date(disbursement.value_date || disbursement.period_start);

          const result = await fixedCurrencyConverter.convertToUSD(
            disbursement.amount,
            disbursement.currency,
            conversionDate
          );

          if (result.success && result.usd_amount !== null) {
            usdAmount = result.usd_amount;
            results.converted++;
            console.log(`[Backfill Planned Disbursements USD] Converted disbursement ${disbursement.id}: ${disbursement.amount} ${disbursement.currency} → $${usdAmount} USD`);
          } else {
            results.failed++;
            results.errors.push({
              id: disbursement.id,
              error: result.error || 'Conversion failed',
              currency: disbursement.currency,
              amount: disbursement.amount,
              date: disbursement.value_date || disbursement.period_start
            });
            console.warn(`[Backfill Planned Disbursements USD] Failed to convert disbursement ${disbursement.id}:`, result.error);
            continue;
          }
        }

        // Update the disbursement with USD amount
        const { error: updateError } = await supabase
          .from('planned_disbursements')
          .update({ usd_amount: usdAmount })
          .eq('id', disbursement.id);

        if (updateError) {
          results.failed++;
          results.errors.push({
            id: disbursement.id,
            error: `Update failed: ${updateError.message}`,
            currency: disbursement.currency,
            amount: disbursement.amount,
            date: disbursement.value_date || disbursement.period_start
          });
          console.error(`[Backfill Planned Disbursements USD] Error updating disbursement ${disbursement.id}:`, updateError);
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          id: disbursement.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          currency: disbursement.currency,
          amount: disbursement.amount,
          date: disbursement.value_date || disbursement.period_start
        });
        console.error(`[Backfill Planned Disbursements USD] Error processing disbursement ${disbursement.id}:`, error);
      }
    }

    console.log('[Backfill Planned Disbursements USD] Backfill complete:', results);

    return NextResponse.json({
      message: 'Backfill complete',
      ...results
    });

  } catch (error) {
    console.error('[Backfill Planned Disbursements USD] Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}



