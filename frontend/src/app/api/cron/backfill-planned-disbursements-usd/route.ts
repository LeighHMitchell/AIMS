import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { computePlannedDisbursementUsd } from '@/lib/planned-disbursement-usd';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/backfill-planned-disbursements-usd
 *
 * Nightly cron that converts planned disbursements whose FX date has now passed
 * but were saved with usd_amount = NULL (because their value_date was in the future
 * at the time of insert). Only picks up rows where COALESCE(value_date, period_start)
 * <= today so we don't churn over still-future entries.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  const today = new Date().toISOString().split('T')[0];
  const results = { checked: 0, updated: 0, skipped: 0, errors: 0 };

  const { data: disbursements, error } = await supabase
    .from('planned_disbursements')
    .select('id, amount, currency, value_date, period_start')
    .is('usd_amount', null)
    .not('amount', 'is', null)
    .not('currency', 'is', null)
    .or(`value_date.lte.${today},and(value_date.is.null,period_start.lte.${today})`)
    .limit(500);

  if (error) {
    console.error('[BackfillPdUsd] Error fetching disbursements:', error);
    return NextResponse.json({ error: 'Failed to fetch', details: error.message }, { status: 500 });
  }

  if (!disbursements || disbursements.length === 0) {
    return NextResponse.json({ success: true, message: 'Nothing to backfill', results });
  }

  results.checked = disbursements.length;

  for (const pd of disbursements) {
    try {
      const usdFields = await computePlannedDisbursementUsd({
        amount: pd.amount,
        currency: pd.currency || 'USD',
        valueDate: pd.value_date,
        periodStart: pd.period_start,
      });

      if (usdFields.usd_amount == null) {
        results.skipped++;
        continue;
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
        .eq('id', pd.id);

      if (updateError) {
        console.error(`[BackfillPdUsd] Update failed for ${pd.id}:`, updateError);
        results.errors++;
      } else {
        results.updated++;
      }
    } catch (err) {
      console.error(`[BackfillPdUsd] Error processing ${pd.id}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json({ success: true, message: `Updated ${results.updated} planned disbursements`, results });
}
