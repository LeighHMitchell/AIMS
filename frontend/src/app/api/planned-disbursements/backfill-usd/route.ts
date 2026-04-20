import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { computePlannedDisbursementUsd } from '@/lib/planned-disbursement-usd';

/**
 * Backfill USD values for planned disbursements that don't have them
 * This fixes the "Not converted" issue in the Planned Disbursements table
 */
export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {


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
      return NextResponse.json({
        message: 'No planned disbursements need backfilling',
        processed: 0,
        converted: 0,
        failed: 0
      });
    }


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
        const usdFields = await computePlannedDisbursementUsd({
          amount: disbursement.amount,
          currency: disbursement.currency || 'USD',
          valueDate: disbursement.value_date,
          periodStart: disbursement.period_start,
        });

        if (usdFields.usd_amount == null) {
          // Either future-dated (skip for now, cron will pick up) or genuinely unconvertible.
          results.failed++;
          results.errors.push({
            id: disbursement.id,
            error: usdFields.usd_convertible ? 'Future-dated — skipped' : 'Conversion failed',
            currency: disbursement.currency,
            amount: disbursement.amount,
            date: disbursement.value_date || disbursement.period_start,
          });
          continue;
        }

        if (disbursement.currency === 'USD') {
          results.alreadyUSD++;
        } else {
          results.converted++;
        }

        const { error: updateError } = await supabase
          .from('planned_disbursements')
          .update({
            usd_amount: usdFields.usd_amount,
            exchange_rate_used: usdFields.exchange_rate_used,
            usd_rate_source: usdFields.usd_rate_source,
            usd_conversion_date: usdFields.usd_conversion_date,
            usd_convertible: usdFields.usd_convertible,
          })
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



